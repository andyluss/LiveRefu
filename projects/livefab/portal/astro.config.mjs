// LiveFab 门户 · Astro 配置
//
// 为什么用 SSR（output: 'server'）而不是纯静态：
//   门户要显示**已登录身份**，而身份来自 Caddy 的 forward_auth 注入的请求头
//   （Remote-User / Remote-Groups / …）。**请求头只有服务端渲染才读得到**，
//   静态页面拿不到。这是 [L5c] 选 Astro 后必须用 SSR 的原因。
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: '0.0.0.0', port: 4321 },
  // 本地用自签证书经 Caddy 反代，Astro 自身只跑 HTTP
  vite: { server: { allowedHosts: true } },
})
