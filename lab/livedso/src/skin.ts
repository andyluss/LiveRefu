// SPDX-License-Identifier: Apache-2.0
import type { RGB } from './checks.ts'
import { contrast, parseColor } from './checks.ts'
import type { StyleCard, Vault } from './types.ts'

export interface SkinColor { hex: string; rgb: RGB }
export interface SkinPair { name: string; ratio: number; min: number; ok: boolean }
export interface SkinAudit {
  id: string
  name: string
  mode: 'light' | 'dark'
  pairs: SkinPair[]
  missingRoles: string[]
  ok: boolean
}

const DEFAULT_BG = '#0B0F14'
const DEFAULT_SURFACE = '#111823'
const DEFAULT_TEXT = '#F3EDE1'
const DEFAULT_ACTION = '#4FD1C5'
const DEFAULT_FOCUS = '#8AB4F8'
const DEFAULT_DANGER = '#FF6B35'

function hex(rgb: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(rgb.r)}${c(rgb.g)}${c(rgb.b)}`
}
function mix(a: RGB, b: RGB, pct: number): RGB {
  const p = Math.max(0, Math.min(100, pct)) / 100
  return { r: a.r * p + b.r * (1 - p), g: a.g * p + b.g * (1 - p), b: a.b * p + b.b * (1 - p), a: 1 }
}
function lum(rgb: RGB): number {
  const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b)
}
const BLACK = parseColor('#0B0F14')!
const WHITE = parseColor('#F6F1E7')!
function on(rgb: RGB): RGB { return contrast(BLACK, rgb) >= contrast(WHITE, rgb) ? BLACK : WHITE }
function ensure(rgb: RGB, bg: RGB, min: number, fallback: RGB): RGB { return contrast(rgb, bg) + 0.005 >= min ? rgb : fallback }

export function resolveSkinColor(vault: Vault, value: string | undefined): RGB | null {
  if (!value) return null
  if (value.startsWith('#')) return parseColor(value)
  const token = vault.tokens.get(value)
  const resolved = token?.resolvedValue
  return typeof resolved === 'string' ? parseColor(resolved) : null
}
function color(value: RGB | null, fallback: RGB): RGB { return value || fallback }
function hexOf(rgb: RGB): string { return hex(rgb) }

/** Derive the 6 base roles into a complete, contrast-safe skin token set. */
export function deriveSkin(vault: Vault, card: StyleCard): {
  mode: 'light' | 'dark'
  bg: RGB; surface: RGB; raised: RGB; sunken: RGB
  text: RGB; muted: RGB; subtle: RGB
  line: RGB; lineStrong: RGB
  action: RGB; onAction: RGB; focus: RGB; danger: RGB; success: RGB; warning: RGB
  missing: string[]
} {
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
  const bg = color(resolveSkinColor(vault, roles.bg), parseColor(DEFAULT_BG)!)
  const paletteSurface = palette[1] || palette[0] || bg
  const surface = color(resolveSkinColor(vault, roles.surface), paletteSurface)
  const mode = card.mode || (lum(bg) > 0.45 ? 'light' : 'dark')
  const text = color(resolveSkinColor(vault, roles.text), on(bg))
  const action = color(resolveSkinColor(vault, roles.action), palette[3] || palette[2] || parseColor(DEFAULT_ACTION)!)
  const focus = color(resolveSkinColor(vault, roles.focus), parseColor(DEFAULT_FOCUS)!)
  const danger = color(resolveSkinColor(vault, roles.danger), parseColor(DEFAULT_DANGER)!)
  return {
    mode,
    bg, surface,
    raised: role('surfaceRaised', mix(text, surface, mode === 'light' ? 4 : 8)),
    sunken: role('surfaceSunken', mix(text, bg, 4)),
    text,
    muted: role('textMuted', mix(text, bg, 85)),
    subtle: role('textSubtle', mix(text, bg, 50)),
    line: role('border', mix(text, surface, 70)),
    lineStrong: role('borderStrong', mix(text, surface, 85)),
    action,
    onAction: role('onAction', on(action)),
    focus: ensure(focus, surface, 3, text),
    danger,
    success: role('success', action),
    warning: role('warning', focus),
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
  add('textMuted/surface', s.muted, s.surface, 4.5)
  add('textMuted/bg', s.muted, s.bg, 4.5)
  add('textMuted/sunken', s.muted, s.sunken, 4.5)
  add('onAction/action', s.onAction, s.action, 4.5)
  add('focus/surface', s.focus, s.surface, 3)
  add('border/surface', s.line, s.surface, 3)
  return { id: card.id, name: card.name, mode: s.mode, pairs, missingRoles: s.missing, ok: pairs.every(p => p.ok) && s.missing.length === 0 }
}

export function skinTokens(vault: Vault, card: StyleCard): Record<string, string> {
  const s = deriveSkin(vault, card)
  return {
    '--dso-sys-color-bg-base': hexOf(s.bg),
    '--dso-sys-color-bg-surface': hexOf(s.surface),
    '--dso-sys-color-bg-surface-raised': hexOf(s.raised),
    '--dso-sys-color-bg-sunken': hexOf(s.sunken),
    '--dso-sys-color-text-primary': hexOf(s.text),
    '--dso-sys-color-text-secondary': hexOf(s.muted),
    '--dso-sys-color-text-muted': hexOf(s.subtle),
    '--dso-sys-color-action-primary': hexOf(s.action),
    '--dso-sys-color-action-on-primary': hexOf(s.onAction),
    '--dso-sys-color-focus-ring': hexOf(s.focus),
    '--dso-sys-color-feedback-danger': hexOf(s.danger),
    '--dso-sys-color-feedback-success': hexOf(s.success),
    '--dso-sys-color-feedback-warning': hexOf(s.warning),
    '--dso-sys-color-line-subtle': hexOf(s.line),
    '--dso-sys-color-line-strong': hexOf(s.lineStrong),
    '--dso-shadow': s.mode === 'light' ? '0 24px 70px rgba(60,45,20,.16)' : '0 24px 70px rgba(0,0,0,.38)'
  }
}
