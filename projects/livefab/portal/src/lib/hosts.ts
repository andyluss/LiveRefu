// 各件的主机名。从环境变量读，**不在数据层硬编码**——
// 这样本地（*.localhost）与生产（真实域名）只差一份 env，代码不用改。
//
// 与 deploy/compose.yml 里传给 portal 的那几个变量一一对应。
import type { Hosts } from '../data/services'

export function readHosts(): Hosts {
  return {
    portal: process.env.PORTAL_HOST || 'app.localhost',
    auth: process.env.AUTH_HOST || 'auth.app.localhost',
    ghost: process.env.GHOST_HOST || 'm0.localhost',
    forum: process.env.FORUM_HOST || 'forum.localhost',
  }
}
