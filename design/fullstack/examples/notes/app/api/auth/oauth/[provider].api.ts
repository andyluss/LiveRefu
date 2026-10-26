import { redirect } from '../../../qc.ts'

export function GET(ctx: any) {
  const provider = ctx.params.provider
  const redirectUri = `${ctx.url.origin}/api/auth/oauth/${provider}/callback`
  return redirect(ctx.auth!.oauthStart(provider, redirectUri).toString())
}
