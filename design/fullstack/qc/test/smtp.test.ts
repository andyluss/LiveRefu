import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createMailer } from '../src/mail.ts'

test('SMTP transport: 最小会话', async () => {
  let transcript = ''
  const server = net.createServer(socket => {
    socket.write('220 test.local\r\n')
    let data = ''
    let inData = false
    socket.on('data', chunk => {
      data += chunk.toString('utf8')
      let index
      while ((index = data.indexOf('\r\n')) >= 0) {
        const line = data.slice(0, index)
        data = data.slice(index + 2)
        transcript += line + '\n'
        if (inData) {
          if (line === '.') {
            inData = false
            socket.write('250 queued\r\n')
          }
          continue
        }
        if (line.startsWith('EHLO')) socket.write('250-test.local\r\n250 OK\r\n')
        else if (line.startsWith('MAIL FROM')) socket.write('250 ok\r\n')
        else if (line.startsWith('RCPT TO')) socket.write('250 ok\r\n')
        else if (line === 'DATA') { inData = true; socket.write('354 go\r\n') }
        else if (line === 'QUIT') { socket.write('221 bye\r\n'); socket.end() }
      }
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as net.AddressInfo).port
  const dir = mkdtempSync(join(tmpdir(), 'qc-smtp-'))
  try {
    const mailer = createMailer({ transport: 'smtp', host: '127.0.0.1', port, secure: false, from: 'a@test.local' }, dir)
    await mailer.send({ to: 'b@test.local', subject: 'Hi', text: 'Body' })
    assert.match(transcript, /MAIL FROM:<a@test.local>/)
    assert.match(transcript, /RCPT TO:<b@test.local>/)
    assert.match(transcript, /Subject: Hi/)
    assert.match(transcript, /Body/)
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
    rmSync(dir, { recursive: true, force: true })
  }
})
