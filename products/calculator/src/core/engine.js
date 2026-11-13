import { applyBinary, applyUnary } from './arithmetic.js'
import { EMPTY_ENTRY, addDecimalPoint, appendDigit, createEntry, deleteLast, entryFromNumber, entryToNumber, entryToText, toggleSign } from './entry.js'
import { ERROR_DETAIL, ERROR_LABEL } from './errors.js'
import { formatNumber } from './format.js'
import { HISTORY_LIMIT } from './history.js'
import { BINARY_SYMBOL, UNARY_LABEL } from './labels.js'

const DIGIT_PATTERN = /^[0-9]$/
export function isDigit(value) { return DIGIT_PATTERN.test(value) }

export function createInitialState(history = []) {
  return Object.freeze({
    phase: 'result', value: 0, entry: null, pending: null, repeat: null,
    error: null, expression: '', history,
  })
}
export const INITIAL_STATE = createInitialState()

function describePending(pending) {
  return `${formatNumber(pending.operand)} ${BINARY_SYMBOL[pending.operator]}`
}
function describeBinaryExpression(left, operator, right) {
  return `${formatNumber(left)} ${BINARY_SYMBOL[operator]} ${formatNumber(right)}`
}
function describeUnary(operator, operand) {
  const operandText = formatNumber(operand)
  return operator === 'percent' ? `${operandText}%` : `${UNARY_LABEL[operator]}(${operandText})`
}
function fail(state, error, expression) {
  return { ...state, entry: null, pending: null, repeat: null, error, expression }
}
function startEntry(state, entry) {
  if (entry === null) return state
  if (state.pending !== null) {
    return { ...state, entry, phase: 'input', repeat: null, expression: describePending(state.pending) }
  }
  return { ...clearCalculation(state), entry, phase: 'input' }
}
function inputDigit(state, digit) {
  if (state.entry !== null) return { ...state, entry: appendDigit(state.entry, digit) }
  return startEntry(state, appendDigit(EMPTY_ENTRY, digit))
}
function inputDecimal(state) {
  if (state.entry !== null) return { ...state, entry: addDecimalPoint(state.entry) }
  return startEntry(state, addDecimalPoint(EMPTY_ENTRY))
}
function backspace(state) {
  if (state.entry !== null) return { ...state, entry: deleteLast(state.entry) }
  if (state.phase !== 'result') return state
  const entry = entryFromNumber(state.value)
  if (entry === null) return state
  return { ...state, entry: deleteLast(entry), phase: 'input', repeat: null, expression: '' }
}
function negate(state) {
  if (state.entry !== null) return { ...state, entry: toggleSign(state.entry) }
  if (state.phase === 'operator') return { ...state, entry: createEntry(-1), phase: 'input' }
  const entry = entryFromNumber(state.value)
  if (entry === null) return { ...state, value: -state.value }
  return { ...state, entry: toggleSign(entry), phase: 'input', repeat: null, expression: '' }
}
function inputOperator(state, operator) {
  if (state.entry !== null) {
    const operand = entryToNumber(state.entry)
    if (state.pending !== null) {
      const folded = applyBinary(state.pending.operator, state.pending.operand, operand)
      const expression = describeBinaryExpression(state.pending.operand, state.pending.operator, operand)
      if (!folded.ok) return fail(state, folded.error, expression)
      const pending = { operand: folded.value, operator }
      return { ...state, value: folded.value, entry: null, pending, repeat: null, phase: 'operator', expression: describePending(pending) }
    }
    const pending = { operand, operator }
    return { ...state, value: operand, entry: null, pending, repeat: null, phase: 'operator', expression: describePending(pending) }
  }
  if (state.phase === 'operator' && state.pending !== null) {
    const pending = { ...state.pending, operator }
    return { ...state, pending, expression: describePending(pending) }
  }
  const pending = { operand: state.value, operator }
  return { ...state, pending, repeat: null, phase: 'operator', expression: describePending(pending) }
}
function equals(state) {
  if (state.pending !== null) {
    const { operand: left, operator } = state.pending
    const right = state.entry !== null ? entryToNumber(state.entry) : state.value
    const result = applyBinary(operator, left, right)
    const expression = `${describeBinaryExpression(left, operator, right)} =`
    if (!result.ok) return record(fail(state, result.error, expression), expression, ERROR_LABEL, null, result.error)
    return record({ ...state, value: result.value, entry: null, pending: null, repeat: { operand: right, operator }, phase: 'result', expression }, expression, formatNumber(result.value), result.value, null)
  }
  if (state.entry !== null) {
    const value = entryToNumber(state.entry)
    return { ...state, value, entry: null, pending: null, repeat: null, phase: 'result', expression: '' }
  }
  if (state.repeat !== null) {
    const { operand, operator } = state.repeat
    const result = applyBinary(operator, state.value, operand)
    const expression = `${describeBinaryExpression(state.value, operator, operand)} =`
    if (!result.ok) return record(fail(state, result.error, expression), expression, ERROR_LABEL, null, result.error)
    return record({ ...state, value: result.value, phase: 'result', expression }, expression, formatNumber(result.value), result.value, null)
  }
  return state
}
function applyUnaryAction(state, operator) {
  const operand = state.entry !== null ? entryToNumber(state.entry) : state.value
  const label = describeUnary(operator, operand)
  const expression = state.pending !== null ? `${describePending(state.pending)} ${label}` : label
  const result = applyUnary(operator, operand)
  if (!result.ok) return fail(state, result.error, expression)
  return { ...state, value: result.value, entry: null, repeat: null, phase: 'result', expression }
}
function applyPercent(state) {
  const operand = state.entry !== null ? entryToNumber(state.entry) : state.value
  const pending = state.pending
  const expression = pending !== null ? `${describePending(pending)} ${formatNumber(operand)}%` : `${formatNumber(operand)}%`
  const base = pending !== null && (pending.operator === 'add' || pending.operator === 'sub')
    ? applyBinary('mul', pending.operand, operand / 100)
    : applyUnary('percent', operand)
  if (!base.ok) return fail(state, base.error, expression)
  return { ...state, value: base.value, entry: null, repeat: null, phase: 'result', expression }
}
function clearEntry(state) {
  if (state.entry !== null) return { ...state, entry: EMPTY_ENTRY }
  return clearCalculation(state)
}
function clearCalculation(state) {
  return { ...INITIAL_STATE, history: state.history }
}
function record(state, expression, result, value, error) {
  const id = (state.history.at(-1)?.id ?? 0) + 1
  return { ...state, history: [...state.history, { id, expression, result, value, error }].slice(-HISTORY_LIMIT) }
}
function recall(state, id) {
  const entry = state.history.find((item) => item.id === id)
  if (entry === undefined || entry.value === null) return state
  const recalled = entryFromNumber(entry.value)
  if (recalled === null) return { ...clearCalculation(state), value: entry.value, phase: 'result' }
  return { ...clearCalculation(state), entry: recalled, phase: 'input' }
}
export function reduce(state, action) {
  if (state.error !== null) {
    switch (action.type) {
      case 'clearHistory': return { ...state, history: [] }
      case 'recall': return recall(state, action.id)
      case 'clear':
      case 'backspace': return clearCalculation(state)
      case 'digit':
      case 'decimal': return reduce(clearCalculation(state), action)
      default: return state
    }
  }
  switch (action.type) {
    case 'digit': return inputDigit(state, action.digit)
    case 'decimal': return inputDecimal(state)
    case 'operator': return inputOperator(state, action.operator)
    case 'equals': return equals(state)
    case 'negate': return negate(state)
    case 'backspace': return backspace(state)
    case 'clearEntry': return clearEntry(state)
    case 'clear': return clearCalculation(state)
    case 'clearHistory': return { ...state, history: [] }
    case 'recall': return recall(state, action.id)
    case 'load': {
      if (!Number.isFinite(action.value)) return state
      const loaded = entryFromNumber(action.value)
      return { ...clearCalculation(state), value: action.value, entry: loaded, phase: loaded === null ? 'result' : 'input' }
    }
    case 'unary': return action.operator === 'percent' ? applyPercent(state) : applyUnaryAction(state, action.operator)
    default: return state
  }
}
export function reduceAll(state, actions) { return actions.reduce(reduce, state) }
export function displayText(state) {
  if (state.error !== null) return ERROR_LABEL
  if (state.entry !== null) return entryToText(state.entry)
  return formatNumber(state.value)
}
export function expressionText(state) {
  if (state.error !== null) return ERROR_DETAIL[state.error]
  return state.expression
}
