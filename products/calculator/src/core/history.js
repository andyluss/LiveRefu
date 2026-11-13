export const HISTORY_LIMIT = 50
const ERROR_CODES = Object.freeze(['divide-by-zero', 'domain', 'overflow'])
function isErrorCode(value) { return typeof value === 'string' && ERROR_CODES.includes(value) }
export function isHistoryEntry(value) {
  if (typeof value !== 'object' || value === null) return false
  const c = value
  return typeof c.id === 'number' && Number.isFinite(c.id) &&
    typeof c.expression === 'string' && typeof c.result === 'string' &&
    (c.value === null || (typeof c.value === 'number' && Number.isFinite(c.value))) &&
    (c.error === null || isErrorCode(c.error))
}
export function parseHistory(input, limit = HISTORY_LIMIT) {
  if (!Array.isArray(input)) return []
  return input.filter(isHistoryEntry).slice(-limit).map((entry) => ({ ...entry }))
}
export function serializeHistory(history) { return JSON.stringify(history) }
export function deserializeHistory(raw, limit = HISTORY_LIMIT) {
  if (raw === null || raw === '') return []
  try { return parseHistory(JSON.parse(raw), limit) } catch { return [] }
}
