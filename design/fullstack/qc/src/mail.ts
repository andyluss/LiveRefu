import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { nowIso } from './time.ts'

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
  transport: 'console' | 'file' | 'memory'
  from: string
  file?: string
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
