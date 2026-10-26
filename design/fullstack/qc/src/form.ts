import { ValidationError } from './validate.ts'

export function formValues(form: FormData | null | undefined, names: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const name of names) {
    const value = form?.get(name)
    out[name] = value instanceof File ? value.name : String(value ?? '')
  }
  return out
}

export function formErrors(error: unknown): Record<string, string> {
  if (error instanceof ValidationError) return error.fields
  return { _: error instanceof Error ? error.message : '表单提交失败' }
}

export function formError(error: unknown, key: string): string {
  return formErrors(error)[key] ?? ''
}
