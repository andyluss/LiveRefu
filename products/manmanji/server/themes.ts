// SPDX-License-Identifier: UNLICENSED
export interface ProductTheme {
  id: string
  name: string
  mode: 'light' | 'dark'
  vault?: string
  card?: string
}

/** 产品主题白名单。带 vault/card 的由 tools/build-themes.ts 从 LiveDSO 生成。 */
export const THEMES: ProductTheme[] = [
  { id: 'paper', name: '纸感 · Paper', mode: 'light' },
  { id: 'night', name: '夜间 · Night', mode: 'dark' },
  { id: 'retro-paper', name: 'Retro / Paper', mode: 'light', vault: 'retro-futurism', card: 'retro-paper' },
  { id: 'retro-crt', name: 'Retro / CRT', mode: 'dark', vault: 'retro-futurism', card: 'retro-crt' },
  { id: 'cassette-amber', name: 'Cassette / Amber', mode: 'dark', vault: 'cassette-futurism', card: 'cassette-amber' },
  { id: 'atompunk', name: 'Atompunk', mode: 'light', vault: 'atompunk', card: 'atompunk' },
  { id: 'material-dark', name: 'Material 3 / Dark', mode: 'dark', vault: 'material-3', card: 'material-3-dark' },
  { id: 'tailwind-paper', name: 'Tailwind / Paper', mode: 'light', vault: 'tailwind', card: 'tailwind-paper' },
  { id: 'carbon-night', name: 'Carbon / Night', mode: 'dark', vault: 'carbon', card: 'carbon-night' }
]
