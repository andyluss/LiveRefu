import net from 'node:net'
import tls from 'node:tls'

export interface SmtpConfig {
  host: string
  port: number
  secure?: boolean
  user?: string
  pass?: string
  from: string
}

interface Reply { code: number; text: string }

function reader(socket: net.Socket | tls.TLSSocket) {
  let buffer = ''
  const queue: string[] = []
  let waiter: ((line: string) => void) | null = null
  socket.on('data', chunk => {
    buffer += chunk.toString('utf8')
    let index
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, '')
      buffer = buffer.slice(index + 1)
      if (waiter) {
        const resolve = waiter
        waiter = null
        resolve(line)
      } else {
        queue.push(line)
      }
    }
  })
  return {
    async line(): Promise<string> {
      if (queue.length) return queue.shift()!
      return new Promise(resolve => { waiter = resolve })
    },
    async reply(): Promise<Reply> {
      const lines: string[] = []
      while (true) {
        const line = await this.line()
        lines.push(line)
        if (line.length >= 4 && line[3] === ' ') break
      }
      return { code: Number(lines[0].slice(0, 3)), text: lines.join('\n') }
    },
  }
}

function expect(reply: Reply, codes: number[], step: string): void {
  if (!codes.includes(reply.code)) throw new Error(`SMTP ${step} 失败: ${reply.code} ${reply.text}`)
}

export async function sendSmtp(message: { to: string; subject: string; text: string }, config: SmtpConfig): Promise<void> {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port })
    : net.connect({ host: config.host, port: config.port })
  const r = reader(socket)
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once(config.secure ? 'secureConnect' : 'connect', resolve)
      socket.once('error', reject)
    })
    expect(await r.reply(), [220], 'greeting')
    socket.write('EHLO localhost\r\n')
    expect(await r.reply(), [250], 'EHLO')
    if (config.user && config.pass) {
      socket.write('AUTH LOGIN\r\n')
      expect(await r.reply(), [334], 'AUTH LOGIN')
      socket.write(Buffer.from(config.user).toString('base64') + '\r\n')
      expect(await r.reply(), [334], 'AUTH user')
      socket.write(Buffer.from(config.pass).toString('base64') + '\r\n')
      expect(await r.reply(), [235], 'AUTH pass')
    }
    socket.write(`MAIL FROM:<${config.from}>\r\n`)
    expect(await r.reply(), [250], 'MAIL FROM')
    socket.write(`RCPT TO:<${message.to}>\r\n`)
    expect(await r.reply(), [250, 251], 'RCPT TO')
    socket.write('DATA\r\n')
    expect(await r.reply(), [354], 'DATA')
    const body = [
      `From: ${config.from}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.text.replace(/\n/g, '\r\n').replace(/^\./gm, '..'),
      '.',
      '',
    ].join('\r\n')
    socket.write(body)
    expect(await r.reply(), [250], 'message')
    socket.write('QUIT\r\n')
    await r.reply().catch(() => null)
  } finally {
    socket.end()
    socket.destroy()
  }
}
