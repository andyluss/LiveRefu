import { HttpError } from './http.ts'

export type Schema<T> = { parse: (input: unknown) => T }

export class ValidationError extends HttpError {
  fields: Record<string, string>
  constructor(fields: Record<string, string>) {
    super(422, '表单校验失败', 'VALIDATION_ERROR')
    this.fields = fields
  }
}

type StringOptions = {
  min?: number
  max?: number
  email?: boolean
  optional?: boolean
  label?: string
}

export function string(options: StringOptions = {}): Schema<string> {
  return {
    parse(input) {
      const value = input === undefined || input === null ? '' : String(input)
      if (!value && options.optional) return ''
      if (!value) throw new ValidationError({ _: `${options.label ?? '字段'}不能为空` })
      if (options.min !== undefined && value.length < options.min) {
        throw new ValidationError({ _: `${options.label ?? '字段'}至少 ${options.min} 个字符` })
      }
      if (options.max !== undefined && value.length > options.max) {
        throw new ValidationError({ _: `${options.label ?? '字段'}最多 ${options.max} 个字符` })
      }
      if (options.email && !/^\S+@\S+\.\S+$/.test(value)) {
        throw new ValidationError({ _: '邮箱格式无效' })
      }
      return value
    },
  }
}

export function object<T extends Record<string, Schema<any>>>(shape: T): Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }> {
  return {
    parse(input) {
      if (typeof input !== 'object' || input === null) throw new ValidationError({ _: '请求体必须是对象' })
      const source = input as Record<string, unknown>
      const out: Record<string, unknown> = {}
      const errors: Record<string, string> = {}
      for (const [key, schema] of Object.entries(shape)) {
        try {
          out[key] = schema.parse(source[key])
        } catch (error) {
          if (error instanceof ValidationError) errors[key] = error.fields._ ?? error.message
          else throw error
        }
      }
      if (Object.keys(errors).length) throw new ValidationError(errors)
      return out as any
    },
  }
}
