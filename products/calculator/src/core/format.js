export const SIGNIFICANT_DIGITS = 15
export const DEFAULT_PRECISION = SIGNIFICANT_DIGITS
export const EXPONENTIAL_UPPER_BOUND = 1e15
export const EXPONENTIAL_LOWER_BOUND = 1e-9

export function trimTrailingZeros(text) {
  if (!text.includes('.')) return text
  return text.replace(/\.?0+$/, '')
}

export function formatNumber(value, precision = DEFAULT_PRECISION) {
  if (!Number.isFinite(value)) return 'Error'
  if (value === 0) return '0'
  const rounded = Number(value.toPrecision(precision))
  if (rounded === 0) return '0'
  const magnitude = Math.abs(rounded)
  if (magnitude >= EXPONENTIAL_UPPER_BOUND || magnitude < EXPONENTIAL_LOWER_BOUND) {
    const [mantissa = '', exponent = ''] = rounded.toExponential(precision - 1).split('e')
    return `${trimTrailingZeros(mantissa)}e${exponent}`
  }
  const exponent = Math.floor(Math.log10(magnitude))
  const decimals = Math.max(0, Math.min(precision - 1 - exponent, 100))
  return trimTrailingZeros(rounded.toFixed(decimals))
}
