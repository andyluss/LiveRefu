import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INITIAL_STATE, createInitialState, displayText, expressionText, reduce, reduceAll,
  deserializeHistory, serializeHistory, parseHistory, isHistoryEntry, formatNumber,
  applyBinary, applyUnary, entryToText, appendDigit, EMPTY_ENTRY,
} from '../src/core/index.js'

const MAP = {
  '0': { type: 'digit', digit: '0' }, '1': { type: 'digit', digit: '1' },
  '2': { type: 'digit', digit: '2' }, '3': { type: 'digit', digit: '3' },
  '4': { type: 'digit', digit: '4' }, '5': { type: 'digit', digit: '5' },
  '6': { type: 'digit', digit: '6' }, '7': { type: 'digit', digit: '7' },
  '8': { type: 'digit', digit: '8' }, '9': { type: 'digit', digit: '9' },
  '.': { type: 'decimal' }, '+': { type: 'operator', operator: 'add' },
  '-': { type: 'operator', operator: 'sub' }, '*': { type: 'operator', operator: 'mul' },
  '/': { type: 'operator', operator: 'div' }, '=': { type: 'equals' },
  '_': { type: 'negate' }, '<': { type: 'backspace' }, 'A': { type: 'clear' },
  'E': { type: 'clearEntry' }, 'r': { type: 'unary', operator: 'sqrt' },
  'q': { type: 'unary', operator: 'square' }, 'i': { type: 'unary', operator: 'reciprocal' },
  '%': { type: 'unary', operator: 'percent' },
}
function run(script, state = INITIAL_STATE) {
  return reduceAll(state, [...script].map((c) => { if (!MAP[c]) throw new Error(`unknown key ${c}`); return MAP[c] }))
}
function screen(script) { const s = run(script); return { display: displayText(s), expression: expressionText(s) } }

test('initial state is zero and frozen', () => {
  assert.deepEqual(screen(''), { display: '0', expression: '' })
  assert.equal(Object.isFrozen(INITIAL_STATE), true)
  assert.equal(INITIAL_STATE.value, 0)
})

test('digit entry normalizes leading zeros and decimal point', () => {
  for (const [script, expected] of [['000', '0'], ['007', '7'], ['123', '123'], ['.', '0.'], ['.5', '0.5'], ['1.2.3', '1.23'], ['0.50', '0.50']]) {
    assert.equal(displayText(run(script)), expected)
  }
})

test('entry caps at 15 digits', () => {
  assert.equal(displayText(run('9'.repeat(30))), '9'.repeat(15))
  assert.equal(entryToText(appendDigit(EMPTY_ENTRY, '7')), '7')
})

test('basic arithmetic left-to-right', () => {
  assert.equal(displayText(run('2+3=')), '5')
  assert.equal(displayText(run('9-4=')), '5')
  assert.equal(displayText(run('6*7=')), '42')
  assert.equal(displayText(run('10/4=')), '2.5')
  assert.equal(displayText(run('2+3*4=')), '20')
  assert.equal(displayText(run('1+2+3+4=')), '10')
})

test('equals repeats and expression stays readable', () => {
  assert.equal(displayText(run('2+3==')), '8')
  assert.equal(displayText(run('2+3===')), '11')
  assert.equal(expressionText(run('2+3==')), '5 + 3 =')
  assert.equal(displayText(run('5+=')), '10')
})

test('operator replacement does not double-evaluate', () => {
  assert.equal(displayText(run('5+*')), '5')
  assert.equal(expressionText(run('5+*')), '5 ×')
  assert.equal(displayText(run('5+*3=')), '15')
})

test('float noise is formatted away', () => {
  assert.equal(displayText(run('0.1+0.2=')), '0.3')
  assert.equal(displayText(run('1/3*3=')), '1')
})

test('± after operator starts a negative operand', () => {
  assert.equal(displayText(run('5+_')), '-0')
  assert.deepEqual(screen('5+_3='), { display: '2', expression: '5 + -3 =' })
  assert.equal(displayText(run('_5')), '-5')
  assert.equal(displayText(run('_5+2=')), '-3')
})

test('backspace edits input and result', () => {
  assert.equal(displayText(run('123<')), '12')
  assert.equal(displayText(run('1.5<')), '1.')
  assert.equal(displayText(run('12+34=<')), '4')
  assert.equal(displayText(run('5+<')), '5')
})

test('CE clears entry while AC clears calculation', () => {
  assert.deepEqual(screen('5+3E'), { display: '0', expression: '5 +' })
  assert.equal(displayText(run('5+3E2=')), '7')
  assert.deepEqual(screen('5+3=A'), { display: '0', expression: '' })
})

test('unary operations and pending operator', () => {
  assert.equal(displayText(run('9r')), '3')
  assert.equal(expressionText(run('9r')), '√(9)')
  assert.equal(displayText(run('7q')), '49')
  assert.equal(displayText(run('4i')), '0.25')
  assert.deepEqual(screen('2+9r'), { display: '3', expression: '2 + √(9)' })
  assert.equal(displayText(run('2+9r=')), '5')
})

test('percent semantics', () => {
  assert.equal(displayText(run('200+10%=')), '220')
  assert.equal(displayText(run('200-10%=')), '180')
  assert.equal(displayText(run('200*10%=')), '20')
  assert.equal(displayText(run('200/10%=')), '2000')
  assert.equal(displayText(run('50%')), '0.5')
})

test('errors carry reasons and recover by digit/clear', () => {
  assert.deepEqual(screen('5/0='), { display: 'Error', expression: '除数不能为 0' })
  assert.deepEqual(screen('_9r'), { display: 'Error', expression: '该数不在函数定义域内' })
  assert.equal(displayText(run('5/0=+')), 'Error')
  assert.deepEqual(screen('5/0=7'), { display: '7', expression: '' })
  assert.deepEqual(screen('5/0=A'), { display: '0', expression: '' })
})

test('load sets a value without a synthetic history row', () => {
  const loaded = reduce(run('2+3='), { type: 'load', value: -12.5 })
  assert.equal(displayText(loaded), '-12.5')
  const exp = reduce(INITIAL_STATE, { type: 'load', value: 1e21 })
  assert.equal(displayText(exp), '1e+21')
})

test('history records, recalls and survives AC', () => {
  const state = run('2+3=')
  assert.equal(state.history.length, 1)
  assert.equal(state.history[0].expression, '2 + 3 =')
  assert.equal(state.history[0].result, '5')
  const recalled = reduce(state, { type: 'recall', id: state.history[0].id })
  assert.equal(displayText(recalled), '5')
  const cleared = reduce(state, { type: 'clear' })
  assert.equal(cleared.history.length, 1)
  const wiped = reduce(state, { type: 'clearHistory' })
  assert.equal(wiped.history.length, 0)
})

test('history parsing rejects bad data and keeps latest limit', () => {
  assert.deepEqual(parseHistory(null), [])
  assert.deepEqual(parseHistory([{ id: 'bad' }]), [])
  assert.equal(isHistoryEntry({ id: 1, expression: '1 + 1 =', result: '2', value: 2, error: null }), true)
  const many = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, expression: '1 + 1 =', result: '2', value: 2, error: null }))
  assert.equal(parseHistory(many).length, 50)
  assert.equal(parseHistory(many).at(-1).id, 60)
})

test('history serialization round-trips and tolerates corruption', () => {
  const h = [{ id: 1, expression: '2 + 2 =', result: '4', value: 4, error: null }]
  assert.deepEqual(deserializeHistory(serializeHistory(h)), h)
  assert.deepEqual(deserializeHistory('{oops'), [])
  assert.deepEqual(deserializeHistory(null), [])
})

test('formatting uses fixed notation before extreme bounds', () => {
  assert.equal(formatNumber(0.0000001), '0.0000001')
  assert.equal(formatNumber(0.000000001), '0.000000001')
  assert.equal(formatNumber(1e-10), '1e-10')
  assert.equal(formatNumber(1e15), '1e+15')
  assert.equal(formatNumber(123.4500), '123.45')
})

test('binary/unary failures are Result values, not thrown exceptions', () => {
  assert.deepEqual(applyBinary('div', 1, 0), { ok: false, error: 'divide-by-zero' })
  assert.deepEqual(applyUnary('sqrt', -1), { ok: false, error: 'domain' })
  assert.deepEqual(applyUnary('reciprocal', 0), { ok: false, error: 'divide-by-zero' })
  assert.deepEqual(applyBinary('add', 1, 2), { ok: true, value: 3 })
})

test('createInitialState can restore a tape without a restore action', () => {
  const h = [{ id: 9, expression: '1 + 1 =', result: '2', value: 2, error: null }]
  const s = createInitialState(h)
  assert.equal(s.history.length, 1)
  assert.equal(s.history[0].id, 9)
})
