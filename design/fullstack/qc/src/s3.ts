import { createHash, createHmac } from 'node:crypto'
import type { Storage } from './storage.ts'

export interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  fetch?: typeof fetch
}

function hashHex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest()
}

function pathEncode(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

export class S3Storage implements Storage {
  config: S3Config
  constructor(config: S3Config) {
    this.config = config
  }

  async put(key: string, data: Buffer, type: string): Promise<string> {
    const endpoint = this.config.endpoint.replace(/\/$/, '')
    const url = new URL(`${endpoint}/${this.config.bucket}/${pathEncode(key)}`)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = hashHex(data)
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'content-type': type || 'application/octet-stream',
    }
    if (this.config.sessionToken) headers['x-amz-security-token'] = this.config.sessionToken
    const signedHeaders = Object.keys(headers).sort()
    const canonicalHeaders = signedHeaders.map(name => `${name}:${headers[name].trim()}\n`).join('')
    const canonicalRequest = [
      'PUT',
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders.join(';'),
      payloadHash,
    ].join('\n')
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hashHex(canonicalRequest)].join('\n')
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, dateStamp), this.config.region), 's3'), 'aws4_request')
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`

    const fetchImpl = this.config.fetch ?? fetch
    const response = await fetchImpl(url, { method: 'PUT', headers, body: data })
    if (!response.ok) throw new Error(`S3 PUT ${response.status}`)
    return url.toString()
  }
}
