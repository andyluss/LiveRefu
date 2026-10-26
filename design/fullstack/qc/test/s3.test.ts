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
  assert.ok(captured.init.headers['x-amz-checksum-sha256'])

  const signed = storage.presignGet('a/b.txt', 600)
  assert.match(signed, /X-Amz-Signature=[0-9a-f]{64}/)
  assert.match(signed, /X-Amz-Expires=600/)

  captured = null
  await storage.delete('a/b.txt')
  assert.equal(captured.init.method, 'DELETE')
  assert.match(captured.init.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKID\//)

  const calls: string[] = []
  const multipartFetch = (async (input: URL | string, init: any) => {
    calls.push(`${init.method} ${String(input)}`)
    if (init.method === 'POST' && String(input).includes('uploads')) return new Response('<UploadId>u1</UploadId>', { status: 200 })
    if (init.method === 'PUT') return new Response('', { status: 200, headers: { etag: '"e1"' } })
    return new Response('', { status: 200 })
  }) as typeof fetch
  const multipart = new S3Storage({
    endpoint: 'https://s3.example', region: 'test-region', bucket: 'bucket',
    accessKeyId: 'AKID', secretAccessKey: 'SECRET', fetch: multipartFetch,
  })
  const uploadId = await multipart.createMultipart('big.bin')
  assert.equal(uploadId, 'u1')
  const etag = await multipart.uploadPart('big.bin', uploadId, 1, Buffer.from('part'))
  assert.equal(etag, '"e1"')
  await multipart.completeMultipart('big.bin', uploadId, [{ partNumber: 1, etag }])
  await multipart.abortMultipart('big.bin', uploadId)
  assert.equal(calls.length, 4)

  const large = await multipart.uploadLarge('large.bin', Buffer.from('0123456789'), { partSize: 5, concurrency: 2 })
  assert.match(large, /large.bin$/)
})
