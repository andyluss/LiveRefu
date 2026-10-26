import type { OAuthProvider } from './auth.ts'

export function githubProvider(clientId: string, clientSecret: string): OAuthProvider {
  return {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    clientId,
    clientSecret,
    scope: 'read:user user:email',
  }
}

export function googleProvider(clientId: string, clientSecret: string): OAuthProvider {
  return {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    clientId,
    clientSecret,
    scope: 'openid email profile',
  }
}
