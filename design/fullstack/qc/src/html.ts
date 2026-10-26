/** 最小 HTML 模板：自动转义；raw() 才允许不转义。 */
export class SafeHtml {
  value: string
  constructor(value: string) { this.value = value }
  toString(): string {
    return this.value
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function raw(value: string): SafeHtml {
  return new SafeHtml(String(value))
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === false) return ''
  if (value instanceof SafeHtml) return value.value
  if (Array.isArray(value)) return value.map(renderValue).join('')
  return escapeHtml(String(value))
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? ''
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i])
    out += strings[i + 1] ?? ''
  }
  return new SafeHtml(out)
}
