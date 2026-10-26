import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { nowIso } from './time.ts'
import { sendSmtp } from './smtp.ts'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export interface Mailer {
  send: (message: MailMessage) => Promise<void>
  messages?: MailMessage[]
}

export interface MailConfig {
  transport: 'console' | 'file' | 'memory' | 'api' | 'smtp'
  from: string
  file?: string
  endpoint?: string
  token?: string
  host?: string
  port?: number
  secure?: boolean
  user?: string
  pass?: string
}

export function createMailer(config: MailConfig, appRoot: string): Mailer {
  if (config.transport === 'memory') {
    const messages: MailMessage[] = []
    return {
      messages,
      async send(message) {
        messages.push(message)
      },
    }
  }
  if (config.transport === 'smtp') {
    if (!config.host || !config.port) throw new Error('mail.smtp 需要 host/port')
    return {
      async send(message) {
        await sendSmtp(message, {
          host: config.host!,
          port: config.port!,
          secure: config.secure,
          user: config.user,
          pass: config.pass,
          from: config.from,
        })
      },
    }
  }
  if (config.transport === 'api') {
    if (!config.endpoint) throw new Error('mail.api 需要 endpoint')
    return {
      async send(message) {
        const response = await fetch(config.endpoint!, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(config.token ? { authorization: `Bearer ${config.token}` } : {}),
          },
          body: JSON.stringify({ from: config.from, ...message }),
        })
        if (!response.ok) throw new Error(`mail API ${response.status}`)
      },
    }
  }
  if (config.transport === 'file') {
    const file = resolve(appRoot, config.file ?? 'data/mail.log')
    mkdirSync(dirname(file), { recursive: true })
    return {
      async send(message) {
        appendFileSync(file, JSON.stringify({ ...message, at: nowIso() }) + '\n')
      },
    }
  }
  return {
    async send(message) {
      console.log(`[qc mail] to=${message.to} subject=${message.subject}`)
      console.log(message.text)
    },
  }
}
