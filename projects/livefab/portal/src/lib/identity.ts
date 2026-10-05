// 从 Caddy 的 forward_auth 注入的请求头里读身份。
//
// ★ 这些头**只有在经过 forward_auth 的路径上才有**（Caddyfile 里配了 copy_headers）。
//   公开路径没有这些头 → 未登录。所以本文件的返回值同时表达了"有没有登录"。
//
// ⚠️ 安全边界：这些头由 Caddy 注入，**不能让外部直接伪造**。
//   前提是：portal 容器只在内网、只被 Caddy 反代（见 deploy/compose.yml 的双网络设计）。
//   若 portal 哪天直接暴露端口，任何人都能伪造 Remote-User ——
//   这也是 compose 里"内部件不发布端口"这条不变量的一部分。

export interface Identity {
  user: string
  name: string
  email: string
  groups: string[]
}

export function readIdentity(headers: Headers): Identity | null {
  const user = headers.get('remote-user')?.trim()
  if (!user) return null
  // Authelia 用逗号分隔多个组
  const groups = (headers.get('remote-groups') ?? '')
    .split(',')
    .map(g => g.trim())
    .filter(Boolean)
  return {
    user,
    name: headers.get('remote-name')?.trim() ?? '',
    email: headers.get('remote-email')?.trim() ?? '',
    groups,
  }
}
