function finite(value) {
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, error: 'overflow' }
}
const DIVIDE_BY_ZERO = Object.freeze({ ok: false, error: 'divide-by-zero' })
const DOMAIN_ERROR = Object.freeze({ ok: false, error: 'domain' })

export function applyBinary(operator, left, right) {
  switch (operator) {
    case 'add': return finite(left + right)
    case 'sub': return finite(left - right)
    case 'mul': return finite(left * right)
    case 'div': return right === 0 ? DIVIDE_BY_ZERO : finite(left / right)
    default: throw new Error(`unknown operator: ${operator}`)
  }
}

export function applyUnary(operator, operand) {
  switch (operator) {
    case 'sqrt': return operand < 0 ? DOMAIN_ERROR : finite(Math.sqrt(operand))
    case 'square': return finite(operand * operand)
    case 'reciprocal': return operand === 0 ? DIVIDE_BY_ZERO : finite(1 / operand)
    case 'percent': return finite(operand / 100)
    default: throw new Error(`unknown operator: ${operator}`)
  }
}
