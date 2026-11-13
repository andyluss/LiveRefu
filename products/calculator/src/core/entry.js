import { SIGNIFICANT_DIGITS, formatNumber } from './format.js'

export const MAX_ENTRY_DIGITS = SIGNIFICANT_DIGITS
export const EMPTY_ENTRY = Object.freeze({ sign: 1, int: '0', frac: '', hasDot: false })

export function createEntry(sign = 1) {
  return sign === 1 ? EMPTY_ENTRY : Object.freeze({ ...EMPTY_ENTRY, sign: -1 })
}
export function enteredDigitCount(entry) { return entry.int.length + entry.frac.length }
export function entryToText(entry) {
  const body = entry.hasDot ? `${entry.int}.${entry.frac}` : entry.int
  return entry.sign === -1 ? `-${body}` : body
}
export function entryToNumber(entry) {
  const body = entry.hasDot ? `${entry.int}.${entry.frac}` : entry.int
  const parsed = Number.parseFloat(body)
  const magnitude = Number.isNaN(parsed) ? 0 : parsed
  return entry.sign === -1 ? -magnitude : magnitude
}
const ENTRY_PATTERN = /^(-?)(\d+)(?:\.(\d*))?$/
export function parseEntry(text) {
  const match = ENTRY_PATTERN.exec(text)
  if (match === null) return null
  const signPart = match[1]
  const intPart = match[2]
  if (intPart === undefined) return null
  const fracPart = match[3]
  return { sign: signPart === '-' ? -1 : 1, int: intPart, frac: fracPart ?? '', hasDot: fracPart !== undefined }
}
export function entryFromNumber(value) {
  if (!Number.isFinite(value)) return null
  return parseEntry(formatNumber(value))
}
export function appendDigit(entry, digit) {
  if (enteredDigitCount(entry) >= MAX_ENTRY_DIGITS) return entry
  if (entry.hasDot) return { ...entry, frac: entry.frac + digit }
  if (entry.int === '0') return digit === '0' ? entry : { ...entry, int: digit }
  return { ...entry, int: entry.int + digit }
}
export function addDecimalPoint(entry) { return entry.hasDot ? entry : { ...entry, hasDot: true } }
export function toggleSign(entry) { return { ...entry, sign: entry.sign === 1 ? -1 : 1 } }
export function deleteLast(entry) {
  if (entry.frac.length > 0) return { ...entry, frac: entry.frac.slice(0, -1) }
  if (entry.hasDot) return { ...entry, hasDot: false }
  if (entry.int.length > 1) {
    const int = entry.int.slice(0, -1)
    return int === '0' ? EMPTY_ENTRY : { ...entry, int }
  }
  return EMPTY_ENTRY
}
