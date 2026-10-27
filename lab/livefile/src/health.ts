import type { ArchiveIndex, ArchiveItem, HealthResult, Issue } from './types.ts'
import { retentionAudit } from './retention.ts'

function daysSince(date?: string): number | null {
  if (!date) return null
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / 86_400_000)
}
function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 ** 2).toFixed(1)} MB`
}

export function healthCheck(index: ArchiveIndex): HealthResult {
  const issues: Issue[] = []
  const push = (issue: Issue): void => { issues.push(issue) }
  const seen = new Map<string, ArchiveItem>()

  for (const item of index.items) {
    if (!item.hasMeta) { push({ code: 'item.unmanaged', severity: 'warn', path: item.path, message: `${item.title} 没有 sidecar 元数据（来源/许可/时间不可追溯）。` }); continue; }
    if (!item.source) push({ code: 'item.source', severity: 'warn', path: item.path, message: `${item.title} 没有来源。` })
    if (!item.license) push({ code: 'item.license', severity: 'warn', path: item.path, message: `${item.title} 没有许可。` })
    if (!item.retention) push({ code: 'item.retention', severity: 'warn', path: item.path, message: `${item.title} 没有保留期限。` })
    if (seen.has(item.sha256)) push({ code: 'item.duplicate', severity: 'warn', path: item.path, message: `${item.title} 与 ${seen.get(item.sha256)?.title} 内容完全相同。` })
    else seen.set(item.sha256, item)
  }

  for (const r of retentionAudit(index)) {
    if (r.status === 'overdue') push({ code: 'retention.overdue', severity: 'warn', path: r.item.path, message: `${r.item.title} 的保留期已过（${r.expires}）；需要复核/续期。` })
    else if (r.status === 'due') push({ code: 'retention.due', severity: 'warn', path: r.item.path, message: `${r.item.title} 的保留期将在 ${r.expires} 到期。` })
    else if (r.status === 'invalid') push({ code: 'retention.invalid', severity: 'warn', path: r.item.path, message: `${r.item.title} 的保留策略无法解析：${r.policy}` })
  }

  const backup = index.backup
  const backupAge = daysSince(backup.lastBackup)
  if (backupAge == null) push({ code: 'backup.missing', severity: 'error', message: '没有备份记录。' })
  else if (backupAge > 90) push({ code: 'backup.stale', severity: 'warn', message: `上次备份是 ${backupAge} 天前；建议至少每 90 天一次。` })
  if (backup.verified === false) push({ code: 'backup.unverified', severity: 'error', message: '备份未验证。' })
  if (!backup.locations || backup.locations.length < 2) push({ code: 'backup.offsite', severity: 'warn', message: '只有一份/没有异地副本；不满足 3-2-1。' })
  const restoreAge = daysSince(backup.lastRestoreTest)
  if (restoreAge == null) push({ code: 'backup.restore', severity: 'warn', message: '没有恢复演练记录。' })
  else if (restoreAge > 365) push({ code: 'backup.restore', severity: 'warn', message: `上次恢复演练是 ${restoreAge} 天前；建议每年一次。` })

  const inh = index.inheritance
  if (!inh.custodian) push({ code: 'inherit.missing', severity: 'warn', message: '没有指定档案保管人。' })
  const reviewAge = daysSince(inh.lastReviewed)
  if (reviewAge != null && reviewAge > 180) push({ code: 'inherit.stale', severity: 'warn', message: `继承/保管安排已 ${reviewAge} 天未复核。` })

  for (const error of index.errors) push({ code: 'meta.parse', severity: 'error', message: error })

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warn').length
  const infos = issues.filter(i => i.severity === 'info').length
  const score = Math.max(0, Math.min(100, 100 - errors * 14 - warnings * 4))
  return { issues, errors, warnings, infos, score }
}

export function catalog(index: ArchiveIndex, health: HealthResult): string {
  const sections = index.timeline.map(y => `## ${y.year}\n\n${y.items.map(i => `### ${i.title}\n\n- 类型：${i.type}\n- 日期：${i.created}\n- 来源：${i.source || '—'}\n- 许可：${i.license || '—'}\n- 集合：${i.collections.join('、') || '—'}\n- 标签：${i.tags.join('、') || '—'}\n- 保留：${i.retention || '—'}\n- 文件：\`${i.path}\`\n\n${i.preview ? i.preview.slice(0, 800) : ''}`).join('\n\n')}`).join('\n\n')
  return `# ${index.root.split('/').pop()} · 档案目录\n\n> 生成于 ${new Date().toISOString()}。本地生成，不上传。\n\n## 概览\n\n- 条目：${index.items.length}\n- 集合：${index.collections.length}\n- 健康分：${health.score}/100\n- 备份：${index.backup.lastBackup || '—'}\n- 保管人：${index.inheritance.custodian || '—'}\n\n## 健康\n\n${health.issues.map(i => `- **${i.severity.toUpperCase()}** ${i.message}`).join('\n') || '- 没有发现问题。'}\n\n${sections}\n`
}

export function manifest(index: ArchiveIndex): string {
  return JSON.stringify({
    root: index.root.split('/').slice(-2).join('/'),
    generated: new Date().toISOString(),
    backup: index.backup,
    inheritance: index.inheritance,
    collections: index.collections,
    items: index.items.map(i => ({
      id: i.id, title: i.title, type: i.type, created: i.created, source: i.source, license: i.license,
      collections: i.collections, tags: i.tags, retention: i.retention, person: i.person, public: i.isPublic,
      size: i.size, sha256: i.sha256, path: i.path
    }))
  }, null, 2) + '\n'
}

export function backupReport(index: ArchiveIndex, health: HealthResult): string {
  const b = index.backup
  return `# 备份与继承报告\n\n## 备份\n\n- 上次备份：${b.lastBackup || '—'}${daysSince(b.lastBackup) != null ? `（${daysSince(b.lastBackup)} 天前）` : ''}\n- 位置：${(b.locations || []).join('、') || '—'}\n- 已验证：${b.verified === true ? '是' : b.verified === false ? '否' : '未记录'}\n- 上次恢复演练：${b.lastRestoreTest || '—'}${daysSince(b.lastRestoreTest) != null ? `（${daysSince(b.lastRestoreTest)} 天前）` : ''}\n- 备注：${b.note || '—'}\n\n## 继承\n\n- 保管人：${index.inheritance.custodian || '—'}\n- 备份共管：${index.inheritance.backupCustodian || '—'}\n- 访问范围：${index.inheritance.access || '—'}\n- 密钥保管：${index.inheritance.keyCustodian || '—'}\n- 上次复核：${index.inheritance.lastReviewed || '—'}\n- 条件：${index.inheritance.condition || '—'}\n\n## 健康\n\n${health.issues.map(i => `- **${i.severity.toUpperCase()}** ${i.message}`).join('\n') || '- 没有发现问题。'}\n\n## 恢复演练清单\n\n- [ ] 从备份恢复到一个空目录\n- [ ] 校验文件数/hash\n- [ ] 打开 3 个关键文件（证件/票据/照片）\n- [ ] 记录失败项并补备份\n- [ ] 每年至少一次\n\n> 这是技术检查清单，不是法律遗嘱。正式的继承/授权需要法律文件。\n`
}

export function formatBytes(n: number): string { return bytes(n) }
