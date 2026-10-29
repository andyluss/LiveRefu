// SPDX-License-Identifier: UNLICENSED
import type { LifeEntry } from './types.ts'

export const iso = (d: Date): string => d.toISOString().slice(0, 10)
export const today = (): string => iso(new Date())
export const lastDays = (n = 14): string[] => Array.from({ length: n }, (_, i) => iso(new Date(Date.now() - (n - 1 - i) * 86400000)))
export const minutesLabel = (minutes: number): string => {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60)
  return h ? `${h}h ${m}m` : `${m}m`
}
export const avg = (values: number[]): number => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)
export const byDate = (entries: LifeEntry[], dates: string[]): Map<string, LifeEntry[]> => {
  const map = new Map<string, LifeEntry[]>(dates.map(d => [d, []]))
  for (const e of entries) if (map.has(e.date)) map.get(e.date)!.push(e)
  return map
}
export const chartOf = (entries: LifeEntry[], fn: (e: LifeEntry) => number, days = 14): number[] => {
  const map = byDate(entries, lastDays(days))
  return lastDays(days).map(d => sum((map.get(d) || []).map(fn)))
}
export const streak = (entries: LifeEntry[]): number => {
  const dates = new Set(entries.map(e => e.date))
  let count = 0
  const cursor = new Date()
  for (;;) {
    const key = iso(cursor)
    if (!dates.has(key)) break
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}
export const weekEntries = (entries: LifeEntry[]): LifeEntry[] => {
  const since = iso(new Date(Date.now() - 6 * 86400000))
  return entries.filter(e => e.date >= since)
}
export const monthEntries = (entries: LifeEntry[]): LifeEntry[] => {
  const month = today().slice(0, 7)
  return entries.filter(e => e.date.startsWith(month))
}
export const seedDate = (offset: number): string => iso(new Date(Date.now() - offset * 86400000))
export const durationMinutes = (sleepAt: string, wakeAt: string): number => {
  if (!sleepAt || !wakeAt) return 0
  const [sh, sm] = sleepAt.split(':').map(Number)
  const [wh, wm] = wakeAt.split(':').map(Number)
  let minutes = wh * 60 + wm - (sh * 60 + sm)
  if (minutes < 0) minutes += 1440
  return minutes
}
