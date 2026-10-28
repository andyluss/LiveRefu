// SPDX-License-Identifier: Apache-2.0
import type { ArchiveIndex, ArchiveItem } from './types.ts'

export interface RetentionStatus {
  item: ArchiveItem
  policy: string
  expires: string | null
  daysLeft: number | null
  status: 'permanent' | 'none' | 'active' | 'due' | 'overdue' | 'invalid'
}

function addYears(date: string, years: number): string | null {
  const d = new Date(date + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  d.setUTCFullYear(d.getUTCFullYear() + years)
  return d.toISOString().slice(0, 10)
}

export function retentionStatus(item: ArchiveItem): RetentionStatus {
  const policy = (item.retention || '').trim()
  if (!policy) return { item, policy, expires: null, daysLeft: null, status: 'none' }
  if (/^(permanent|永久)$/i.test(policy)) return { item, policy, expires: null, daysLeft: null, status: 'permanent' }
  let expires: string | null = null
  const exact = policy.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (exact) expires = exact[1]!
  const rel = policy.match(/^(\d+)\s*(y|year|years|年|m|month|months|月)$/i)
  if (rel && item.created) {
    const n = Number(rel[1])
    const unit = rel[2]!.toLowerCase()
    const d = new Date(item.created + 'T00:00:00Z')
    if (!Number.isNaN(d.getTime())) {
      if (unit.startsWith('y') || unit === '年') expires = addYears(item.created, n)
      else {
        d.setUTCMonth(d.getUTCMonth() + n)
        expires = d.toISOString().slice(0, 10)
      }
    }
  }
  if (!expires) return { item, policy, expires: null, daysLeft: null, status: 'invalid' }
  const daysLeft = Math.ceil((new Date(expires + 'T00:00:00Z').getTime() - Date.now()) / 86_400_000)
  return { item, policy, expires, daysLeft, status: daysLeft < 0 ? 'overdue' : daysLeft <= 90 ? 'due' : 'active' }
}

export function retentionAudit(index: ArchiveIndex): RetentionStatus[] {
  return index.items.map(retentionStatus).filter(x => x.status === 'overdue' || x.status === 'due' || x.status === 'invalid')
}
