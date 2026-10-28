// SPDX-License-Identifier: Apache-2.0
import type { RGB } from './checks.ts'
import { contrast, parseColor } from './checks.ts'
import type { StyleCard, Vault } from './types.ts'

export interface SkinPair { name: string; ratio: number; min: number; ok: boolean }
export interface SkinAudit {
  id: string
  name: string
  mode: 'light' | 'dark'
  pairs: SkinPair[]
  missingRoles: string[]
  ok: boolean
}

export interface SkinDerived {
  mode: 'light' | 'dark'
  bg: RGB; bgSubtle: RGB;
  surface: RGB; surfaceRaised: RGB; surfaceSunken: RGB; surfaceHover: RGB;
  text: RGB; textMuted: RGB; textSubtle: RGB; textInverse: RGB; textLink: RGB; textVisited: RGB; textDisabled: RGB;
  border: RGB; borderStrong: RGB; borderSubtle: RGB; divider: RGB; focus: RGB;
  action: RGB; actionHover: RGB; actionPressed: RGB; actionDisabled: RGB; onAction: RGB;
  secondaryAction: RGB; onSecondaryAction: RGB; ghostAction: RGB;
  danger: RGB; onDanger: RGB; dangerSubtle: RGB;
  success: RGB; onSuccess: RGB; successSubtle: RGB;
  warning: RGB; onWarning: RGB; warningSubtle: RGB;
  info: RGB; onInfo: RGB; infoSubtle: RGB;
  accent: RGB; accent2: RGB; selection: RGB; codeBg: RGB; codeText: RGB;
  chart1: RGB; chart2: RGB; chart3: RGB; chart4: RGB; chart5: RGB; chart6: RGB;
  missing: string[]
}

export const SKIN_ROLES = [
  'bg', 'bgSubtle', 'surface', 'surfaceRaised', 'surfaceSunken', 'surfaceHover',
  'text', 'textMuted', 'textSubtle', 'textInverse', 'textLink', 'textVisited', 'textDisabled',
  'border', 'borderStrong', 'borderSubtle', 'divider', 'focus',
  'action', 'actionHover', 'actionPressed', 'actionDisabled', 'onAction',
  'secondaryAction', 'onSecondaryAction', 'ghostAction',
  'danger', 'onDanger', 'dangerSubtle',
  'success', 'onSuccess', 'successSubtle',
  'warning', 'onWarning', 'warningSubtle',
  'info', 'onInfo', 'infoSubtle',
  'accent', 'accent2', 'selection', 'codeBg', 'codeText',
  'chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'chart6'
] as const

const DEFAULT_BG = '#0B0F14'
const DEFAULT_SURFACE = '#111823'
const DEFAULT_ACTION = '#4FD1C5'
const DEFAULT_FOCUS = '#8AB4F8'
const DEFAULT_DANGER = '#FF6B35'
const BLACK = parseColor('#0B0F14')!
const WHITE = parseColor('#F6F1E7')!

function mix(a: RGB, b: RGB, pct: number): RGB {
  const p = Math.max(0, Math.min(100, pct)) / 100
  return { r: a.r * p + b.r * (1 - p), g: a.g * p + b.g * (1 - p), b: a.b * p + b.b * (1 - p), a: 1 }
}
function lum(rgb: RGB): number {
  const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b)
}
function on(rgb: RGB): RGB { return contrast(BLACK, rgb) >= contrast(WHITE, rgb) ? BLACK : WHITE }
function ensure(rgb: RGB, bg: RGB, min: number, fallback: RGB): RGB { return contrast(rgb, bg) + 0.005 >= min ? rgb : fallback }
function hex(rgb: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(rgb.r)}${c(rgb.g)}${c(rgb.b)}`
}

export function resolveSkinColor(vault: Vault, value: string | undefined): RGB | null {
  if (!value) return null
  if (value.startsWith('#')) return parseColor(value)
  const token = vault.tokens.get(value)
  const resolved = token?.resolvedValue
  return typeof resolved === 'string' ? parseColor(resolved) : null
}

/** Resolve the 50 semantic roles, deriving safe fallbacks for old 6-role cards. */
export function deriveSkin(vault: Vault, card: StyleCard): SkinDerived {
  const roles = (card.roles || {}) as Record<string, string | undefined>
  const palette = (card.colors || []).map(c => resolveSkinColor(vault, c)).filter((c): c is RGB => !!c)
  const missing: string[] = []
  const role = (key: string, fallback: RGB): RGB => {
    if (roles[key]) {
      const c = resolveSkinColor(vault, roles[key])
      if (c) return c
      missing.push(key)
    }
    return fallback
  }
  const bg = role('bg', parseColor(DEFAULT_BG)!)
  const surface = role('surface', palette[1] || palette[0] || bg)
  const mode = card.mode || (lum(bg) > 0.45 ? 'light' : 'dark')
  const text = role('text', on(bg))
  const action = role('action', palette[3] || palette[2] || parseColor(DEFAULT_ACTION)!)
  const focus = ensure(role('focus', parseColor(DEFAULT_FOCUS)!), surface, 3, text)
  const danger = role('danger', parseColor(DEFAULT_DANGER)!)
  const success = role('success', action)
  const warning = role('warning', focus)
  const info = role('info', action)
  const secondaryAction = role('secondaryAction', surface)
  const muted = role('textMuted', mix(text, bg, 85))
  return {
    mode,
    bg,
    bgSubtle: role('bgSubtle', mix(text, bg, 4)),
    surface,
    surfaceRaised: role('surfaceRaised', mix(text, surface, mode === 'light' ? 4 : 8)),
    surfaceSunken: role('surfaceSunken', mix(text, bg, 4)),
    surfaceHover: role('surfaceHover', mix(text, surface, 8)),
    text,
    textMuted: muted,
    textSubtle: role('textSubtle', mix(text, bg, 70)),
    textInverse: role('textInverse', on(surface)),
    textLink: role('textLink', ensure(action, bg, 4.5, text)),
    textVisited: role('textVisited', mix(action, text, 35)),
    textDisabled: role('textDisabled', mix(text, bg, 45)),
    border: role('border', mix(text, surface, 70)),
    borderStrong: role('borderStrong', mix(text, surface, 85)),
    borderSubtle: role('borderSubtle', mix(text, surface, 40)),
    divider: role('divider', mix(text, surface, 30)),
    focus,
    action,
    actionHover: role('actionHover', mix(text, action, 12)),
    actionPressed: role('actionPressed', mix(bg, action, 20)),
    actionDisabled: role('actionDisabled', mix(action, bg, 55)),
    onAction: role('onAction', on(action)),
    secondaryAction,
    onSecondaryAction: role('onSecondaryAction', on(secondaryAction)),
    ghostAction: role('ghostAction', text),
    danger,
    onDanger: role('onDanger', on(danger)),
    dangerSubtle: role('dangerSubtle', mix(danger, bg, 12)),
    success,
    onSuccess: role('onSuccess', on(success)),
    successSubtle: role('successSubtle', mix(success, bg, 12)),
    warning,
    onWarning: role('onWarning', on(warning)),
    warningSubtle: role('warningSubtle', mix(warning, bg, 12)),
    info,
    onInfo: role('onInfo', on(info)),
    infoSubtle: role('infoSubtle', mix(info, bg, 12)),
    accent: role('accent', action),
    accent2: role('accent2', danger),
    selection: role('selection', mix(action, bg, 35)),
    codeBg: role('codeBg', mix(text, bg, 5)),
    codeText: role('codeText', text),
    chart1: role('chart1', action),
    chart2: role('chart2', focus),
    chart3: role('chart3', danger),
    chart4: role('chart4', success),
    chart5: role('chart5', warning),
    chart6: role('chart6', info),
    missing: [...new Set(missing)]
  }
}

export function auditSkin(vault: Vault, card: StyleCard): SkinAudit {
  const s = deriveSkin(vault, card)
  const pairs: SkinPair[] = []
  const add = (name: string, fg: RGB, bg: RGB, min: number) => {
    const ratio = contrast(fg, bg)
    pairs.push({ name, ratio: Math.round(ratio * 100) / 100, min, ok: ratio + 0.005 >= min })
  }
  add('text/surface', s.text, s.surface, 4.5)
  add('text/bg', s.text, s.bg, 4.5)
  add('textMuted/surface', s.textMuted, s.surface, 4.5)
  add('textMuted/bg', s.textMuted, s.bg, 4.5)
  add('textMuted/sunken', s.textMuted, s.surfaceSunken, 4.5)
  add('textLink/bg', s.textLink, s.bg, 4.5)
  add('onAction/action', s.onAction, s.action, 4.5)
  add('focus/surface', s.focus, s.surface, 3)
  add('focus/bg', s.focus, s.bg, 3)
  add('border/surface', s.border, s.surface, 3)
  return { id: card.id, name: card.name, mode: s.mode, pairs, missingRoles: s.missing, ok: pairs.every(p => p.ok) && s.missing.length === 0 }
}

export function skinTokens(vault: Vault, card: StyleCard): Record<string, string> {
  const s = deriveSkin(vault, card)
  const map: Record<string, RGB> = {
    'bg-base': s.bg,
    'bg-subtle': s.bgSubtle,
    'bg-surface': s.surface,
    'bg-surface-raised': s.surfaceRaised,
    'bg-surface-sunken': s.surfaceSunken,
    'bg-surface-hover': s.surfaceHover,
    'text-primary': s.text,
    'text-secondary': s.textMuted,
    'text-muted': s.textSubtle,
    'text-inverse': s.textInverse,
    'text-link': s.textLink,
    'text-visited': s.textVisited,
    'text-disabled': s.textDisabled,
    'border-subtle': s.border,
    'border-strong': s.borderStrong,
    'border-muted': s.borderSubtle,
    'divider': s.divider,
    'focus-ring': s.focus,
    'action-primary': s.action,
    'action-hover': s.actionHover,
    'action-pressed': s.actionPressed,
    'action-disabled': s.actionDisabled,
    'action-on-primary': s.onAction,
    'action-secondary': s.secondaryAction,
    'action-on-secondary': s.onSecondaryAction,
    'action-ghost': s.ghostAction,
    'feedback-danger': s.danger,
    'feedback-on-danger': s.onDanger,
    'feedback-danger-subtle': s.dangerSubtle,
    'feedback-success': s.success,
    'feedback-on-success': s.onSuccess,
    'feedback-success-subtle': s.successSubtle,
    'feedback-warning': s.warning,
    'feedback-on-warning': s.onWarning,
    'feedback-warning-subtle': s.warningSubtle,
    'feedback-info': s.info,
    'feedback-on-info': s.onInfo,
    'feedback-info-subtle': s.infoSubtle,
    'accent': s.accent,
    'accent-2': s.accent2,
    'selection': s.selection,
    'code-bg': s.codeBg,
    'code-text': s.codeText,
    'chart-1': s.chart1,
    'chart-2': s.chart2,
    'chart-3': s.chart3,
    'chart-4': s.chart4,
    'chart-5': s.chart5,
    'chart-6': s.chart6
  }
  const tokens: Record<string, string> = {}
  for (const [key, value] of Object.entries(map)) tokens[`--dso-sys-color-${key}`] = hex(value)
  tokens['--dso-shadow'] = s.mode === 'light' ? '0 24px 70px rgba(60,45,20,.16)' : '0 24px 70px rgba(0,0,0,.38)'
  return tokens
}
