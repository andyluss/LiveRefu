// LiveFab 门户 · 件注册表
//
// ★ 这是 [L4 分级权限模型] 在**门户层**的落地。
//   完整模型是三层（见 docs/04 §4.4），本文件只管其中一层：
//     身份层（Authelia 的组）→ **本文件把它映射成级别** → 决定门户里显示哪些件
//   真正的"能不能进"由 Authelia 的 access_control 在**网关**决定（第一层）；
//   本文件只决定"门户里给不给你看这个入口"。
//
// ⚠️ 边界（必须说清）：**隐藏链接不是访问控制**。
//   若某个件本身不设防，光在门户里不显示它毫无意义。
//   所以每个件的 `guard` 必须与 Authelia / Caddy 的**实际**规则对应，且不许写好看的假话。
//
// ⚠️ 另一个边界：门户的"级别"只用于**显示**。用户仍可直接访问某件的地址——
//   拦不拦得住取决于网关规则。这正是 docs/04 §4.4 说的：三层缺一会出漏洞。

/** 五级（docs/00 的 L4） */
export type Level = 'public' | 'registered' | 'collaborator' | 'core' | 'admin'

/** 级别高低，用于"至少到某级"的比较 */
const RANK: Record<Level, number> = {
  public: 0,
  registered: 1,
  collaborator: 2,
  core: 3,
  admin: 4,
}

/** Authelia 的组 → 级别。组名必须与 deploy/authelia/users.yml 一致 */
export function levelOf(groups: string[], authenticated: boolean): Level {
  if (!authenticated) return 'public'
  if (groups.includes('livefab-admin')) return 'admin'
  if (groups.includes('livefab-core')) return 'core'
  if (groups.includes('livefab-collaborator')) return 'collaborator'
  return 'registered'
}

export function atLeast(level: Level, required: Level): boolean {
  return RANK[level] >= RANK[required]
}

/** 各件的主机名。由页面从环境变量解析后传入（不在数据层猜） */
export interface Hosts {
  portal: string
  /** 鉴权门户（Authelia） */
  auth: string
  /** 前台件（Ghost） */
  ghost: string
  /** 沟通件（NodeBB） */
  forum: string
}

export interface Service {
  name: string
  what: string
  url: (h: Hosts) => string
  /** 至少需要哪一级才**在门户里显示**这个入口 */
  minLevel: Level
  /** 实际由谁防护——⚠️ 诚实标注，与真实规则对应 */
  guard: string
  status: 'ready' | 'planned'
}

export const SERVICES: Service[] = [
  {
    name: '官网与博客',
    what: '对外内容：工作室介绍、文章、会员订阅',
    url: h => `https://${h.ghost}/`,
    minLevel: 'public',
    guard: '公开可读；后台用 Ghost 自持账号',
    status: 'ready',
  },
  {
    name: '社区论坛',
    what: '讨论区：板块、帖、回复',
    url: h => `https://${h.forum}/`,
    minLevel: 'public',
    guard: '公开可读；发帖用 NodeBB 自持账号',
    status: 'ready',
  },
  {
    name: '个人中心',
    what: '我的身份、我所在的分组',
    url: h => `https://${h.portal}/account/`,
    minLevel: 'registered',
    guard: 'Authelia one_factor（登录即可）',
    status: 'ready',
  },
  {
    name: '鉴权门户',
    what: '管理自己的密码与双因素设备',
    url: h => `https://${h.auth}/`,
    minLevel: 'registered',
    guard: 'Authelia 自身',
    status: 'ready',
  },
  {
    name: '官网后台',
    what: '写文章、管会员、看订阅',
    url: h => `https://${h.ghost}/ghost/`,
    minLevel: 'collaborator',
    guard: '⚠️ Ghost 不支持 OIDC，仍用它自带账号（M1 待收口）',
    status: 'ready',
  },
  {
    name: '内部区',
    what: '看板、文档、密钥等内部件的入口（M2 起接入）',
    url: h => `https://${h.portal}/admin/`,
    minLevel: 'core',
    guard: 'Authelia two_factor + livefab-core 组',
    status: 'planned',
  },
]
