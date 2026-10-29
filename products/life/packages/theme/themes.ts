// SPDX-License-Identifier: UNLICENSED
export interface ThemeVariant {
  id: string
  name: string
  mode: 'light' | 'dark'
  vault?: string
  card?: string
}

export interface ThemeFamily {
  id: string
  name: string
  light: string
  dark: string
}

/** 风格族：外观（system/light/dark）只负责选择 light/dark 变体。 */
export const THEMES: ThemeFamily[] = [
  { id: 'paper', name: '纸感 · Paper', light: 'paper', dark: 'night' },
  { id: 'retro', name: 'Retro', light: 'retro-paper', dark: 'retro-crt' },
  { id: 'cassette', name: 'Cassette', light: 'cassette-daylight', dark: 'cassette-amber' },
  { id: 'atompunk', name: 'Atompunk', light: 'atompunk-chrome', dark: 'atompunk-alert' },
  { id: 'material', name: 'Material 3', light: 'material-3', dark: 'material-3-dark' },
  { id: 'tailwind', name: 'Tailwind', light: 'tailwind-paper', dark: 'tailwind' },
  { id: 'carbon', name: 'Carbon', light: 'carbon', dark: 'carbon-night' }
]

/** 变体来源；panel 的两个基础变体不依赖 LiveDSO。 */
export const VARIANTS: ThemeVariant[] = [
  { id: 'paper', name: '纸感 · Light', mode: 'light' },
  { id: 'night', name: '夜间 · Dark', mode: 'dark' },
  { id: 'retro-paper', name: 'Retro / Paper', mode: 'light', vault: 'retro-futurism', card: 'retro-paper' },
  { id: 'retro-crt', name: 'Retro / CRT', mode: 'dark', vault: 'retro-futurism', card: 'retro-crt' },
  { id: 'cassette-daylight', name: 'Cassette / Daylight', mode: 'light', vault: 'cassette-futurism', card: 'cassette-daylight' },
  { id: 'cassette-amber', name: 'Cassette / Amber', mode: 'dark', vault: 'cassette-futurism', card: 'cassette-amber' },
  { id: 'atompunk-chrome', name: 'Atompunk / Chrome', mode: 'light', vault: 'atompunk', card: 'atompunk-chrome' },
  { id: 'atompunk-alert', name: 'Atompunk / Alert', mode: 'dark', vault: 'atompunk', card: 'atompunk-alert' },
  { id: 'material-3', name: 'Material 3 / Light', mode: 'light', vault: 'material-3', card: 'material-3' },
  { id: 'material-3-dark', name: 'Material 3 / Dark', mode: 'dark', vault: 'material-3', card: 'material-3-dark' },
  { id: 'tailwind-paper', name: 'Tailwind / Paper', mode: 'light', vault: 'tailwind', card: 'tailwind-paper' },
  { id: 'tailwind', name: 'Tailwind / Dark', mode: 'dark', vault: 'tailwind', card: 'tailwind' },
  { id: 'carbon', name: 'Carbon / Light', mode: 'light', vault: 'carbon', card: 'carbon' },
  { id: 'carbon-night', name: 'Carbon / Night', mode: 'dark', vault: 'carbon', card: 'carbon-night' }
]

export function familyOf(value: string): ThemeFamily | undefined {
  return THEMES.find(f => f.id === value) || THEMES.find(f => f.light === value || f.dark === value)
}
export function variantOf(family: ThemeFamily, mode: 'light' | 'dark'): string {
  return mode === 'dark' ? family.dark : family.light
}
