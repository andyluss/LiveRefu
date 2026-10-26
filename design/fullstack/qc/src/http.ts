export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, message: string, code = 'HTTP_ERROR') {
    super(message)
    this.status = status
    this.code = code
    this.name = 'HttpError'
  }
}

export function notFound(message = '页面不存在'): never {
  throw new HttpError(404, message, 'NOT_FOUND')
}

export function unauthorized(message = '需要登录'): never {
  throw new HttpError(401, message, 'UNAUTHORIZED')
}

export function forbidden(message = '没有权限'): never {
  throw new HttpError(403, message, 'FORBIDDEN')
}

export function badRequest(message = '请求无效'): never {
  throw new HttpError(400, message, 'BAD_REQUEST')
}

export function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { location } })
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}
