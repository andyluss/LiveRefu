import test from 'node:test'
import assert from 'node:assert/strict'

import { S3Storage } from '../src/s3.ts'

test('S3 storage: SigV4 PUT', async () => {
  let captured: any = null
  const fetchImpl = (async (url: URL | string, init: any) => {
    captured = { url: String(url), init }
    return new Response('', { status: 200 })
  }) as typeof fetch
  const storage = new S3Storage({
    endpoint: 'https://s3.example',
    region: 'test-region',
    bucket: 'bucket',
    accessKeyId: 'AKID',
    secretAccessKey: 'SECRET',
    fetch: fetchImpl,
  })
  const url = await storage.put('a/b.txt', Buffer.from('hello'), 'text/plain')
  assert.equal(url, 'https://s3.example/bucket/a/b.txt')
  assert.equal(captured.init.method, 'PUT')
  assert.match(captured.init.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/test-region\/s3\/aws4_request/)
  assert.match(captured.init.headers['x-amz-content-sha256'], /^[0-9a-f]{64}$/)
})
