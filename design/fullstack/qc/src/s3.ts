import { createHash, createHmac } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
  presignGet(key: string, expiresSeconds = 3600): string {
    const endpoint = this.config.endpoint.replace(/\/$/, '')
    const url = new URL(`${endpoint}/${this.config.bucket}/${pathEncode(key)}`)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    const params: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(Math.min(604800, Math.max(1, expiresSeconds))),
      'X-Amz-SignedHeaders': 'host',
    }
    const canonicalQuery = Object.keys(params).sort().map(name => `${encode(name)}=${encode(params[name])}`).join('&')
    const canonicalRequest = ['GET', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hashHex(canonicalRequest)].join('\n')
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, dateStamp), this.config.region), 's3'), 'aws4_request')
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
    return `${url.toString()}?${canonicalQuery}&X-Amz-Signature=${signature}`
  }

  async delete(key: string): Promise<void> {
    const endpoint = this.config.endpoint.replace(/\/$/, '')
    const url = new URL(`${endpoint}/${this.config.bucket}/${pathEncode(key)}`)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = hashHex('')
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    }
    const signedHeaders = Object.keys(headers).sort()
    const canonicalHeaders = signedHeaders.map(name => `${name}:${headers[name].trim()}\n`).join('')
    const canonicalRequest = ['DELETE', url.pathname, '', canonicalHeaders, signedHeaders.join(';'), payloadHash].join('\n')
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hashHex(canonicalRequest)].join('\n')
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, dateStamp), this.config.region), 's3'), 'aws4_request')
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`
    const response = await (this.config.fetch ?? fetch)(url, { method: 'DELETE', headers })
    if (!response.ok) throw new Error(`S3 DELETE ${response.status}`)
  }

  private async signedRequest(method: string, key: string, query: Record<string, string>, body: Buffer, type?: string): Promise<Response> {
    const endpoint = this.config.endpoint.replace(/\/$/, '')
    const url = new URL(`${endpoint}/${this.config.bucket}/${pathEncode(key)}`)
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = hashHex(body)
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    }
    if (type) headers['content-type'] = type
    if (this.config.sessionToken) headers['x-amz-security-token'] = this.config.sessionToken
    const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    const canonicalQuery = Object.keys(query).sort().map(name => `${encode(name)}=${encode(query[name])}`).join('&')
    const signedHeaders = Object.keys(headers).sort()
    const canonicalHeaders = signedHeaders.map(name => `${name}:${headers[name].trim()}\n`).join('')
    const canonicalRequest = [method, url.pathname, canonicalQuery, canonicalHeaders, signedHeaders.join(';'), payloadHash].join('\n')
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hashHex(canonicalRequest)].join('\n')
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, dateStamp), this.config.region), 's3'), 'aws4_request')
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`
    const target = `${url.origin}${url.pathname}${canonicalQuery ? `?${canonicalQuery}` : ''}`
    return (this.config.fetch ?? fetch)(target, { method, headers, body })
  }

  async createMultipart(key: string, type = 'application/octet-stream'): Promise<string> {
    const response = await this.signedRequest('POST', key, { uploads: '' }, Buffer.alloc(0), type)
    if (!response.ok) throw new Error(`S3 multipart create ${response.status}`)
    const text = await response.text()
    const match = text.match(/<UploadId>([^<]+)<\/UploadId>/)
    if (!match) throw new Error('S3 multipart 响应缺少 UploadId')
    return match[1]
  }

  async uploadPart(key: string, uploadId: string, partNumber: number, data: Buffer): Promise<string> {
    const response = await this.signedRequest('PUT', key, { partNumber: String(partNumber), uploadId }, data, 'application/octet-stream')
    if (!response.ok) throw new Error(`S3 multipart part ${response.status}`)
    const etag = response.headers.get('etag')
    if (!etag) throw new Error('S3 multipart 缺少 ETag')
    return etag
  }

  async completeMultipart(key: string, uploadId: string, parts: Array<{ partNumber: number; etag: string }>): Promise<void> {
    const body = `<CompleteMultipartUpload>${parts.map(part => `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${part.etag.replace(/"/g, '&quot;')}</ETag></Part>`).join('')}</CompleteMultipartUpload>`
    const response = await this.signedRequest('POST', key, { uploadId }, Buffer.from(body), 'application/xml')
    if (!response.ok) throw new Error(`S3 multipart complete ${response.status}`)
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    const response = await this.signedRequest('DELETE', key, { uploadId }, Buffer.alloc(0))
    if (!response.ok) throw new Error(`S3 multipart abort ${response.status}`)
  }

  async uploadLarge(key: string, data: Buffer, options: { partSize?: number; concurrency?: number; retries?: number; checkpointPath?: string } = {}): Promise<string> {
    const partSize = Math.max(1, options.partSize ?? 8 * 1024 * 1024)
    const concurrency = Math.max(1, options.concurrency ?? 3)
    const retries = Math.max(0, options.retries ?? 2)
    const checkpoint = options.checkpointPath
    let uploadId = ''
    const done = new Map<number, string>()

    if (checkpoint && existsSync(checkpoint)) {
      const saved = JSON.parse(readFileSync(checkpoint, 'utf8')) as { uploadId: string; parts: Array<{ partNumber: number; etag: string }> }
      uploadId = saved.uploadId
      for (const part of saved.parts) done.set(part.partNumber, part.etag)
    } else {
      uploadId = await this.createMultipart(key)
    }

    const total = Math.max(1, Math.ceil(data.length / partSize))
    const numbers = Array.from({ length: total }, (_, i) => i + 1).filter(n => !done.has(n))
    let cursor = 0
    const save = () => {
      if (!checkpoint) return
      writeFileSync(checkpoint, JSON.stringify({ uploadId, parts: [...done].map(([partNumber, etag]) => ({ partNumber, etag })) }, null, 2))
    }
    const worker = async () => {
      while (cursor < numbers.length) {
        const partNumber = numbers[cursor++]
        const start = (partNumber - 1) * partSize
        const chunk = data.subarray(start, Math.min(data.length, start + partSize))
        let lastError: unknown
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const etag = await this.uploadPart(key, uploadId, partNumber, chunk)
            done.set(partNumber, etag)
            save()
            lastError = null
            break
          } catch (error) {
            lastError = error
            if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 200 * 2 ** attempt))
          }
        }
        if (lastError) throw lastError
      }
    }
    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, numbers.length || 1) }, () => worker()))
      await this.completeMultipart(key, uploadId, [...done].map(([partNumber, etag]) => ({ partNumber, etag })).sort((a, b) => a.partNumber - b.partNumber))
      if (checkpoint) rmSync(checkpoint, { force: true })
      return `${this.config.endpoint.replace(/\/$/, '')}/${this.config.bucket}/${pathEncode(key)}`
    } catch (error) {
      if (!checkpoint) await this.abortMultipart(key, uploadId).catch(() => null)
      throw error
    }
  }

}
