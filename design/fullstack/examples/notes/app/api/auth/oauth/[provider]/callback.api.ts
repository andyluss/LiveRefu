import { redirect } from '../../../../qc.ts'

export async function GET(ctx: any) {
  const provider = ctx.params.provider
  const code = ctx.url.searchParams.get('code') ?? ''
  const state = ctx.url.searchParams.get('state') ?? ''
  const redirectUri = `${ctx.url.origin}/api/auth/oauth/${provider}/callback`
  const result = await ctx.auth!.oauthCallback(provider, code, state, redirectUri)
  ctx.setCookie!(result.cookie)
  return redirect('/')
}
