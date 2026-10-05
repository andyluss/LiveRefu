#!/usr/bin/env bun
/**
 * M0 骨架校验（不需要 Docker）。
 *
 * 为什么必须有这个脚本：**M0 的产物是"配置"，而配置错了通常不报错**——
 * 它只是安静地不生效。典型后果：
 *   · 某个内部件忘了从 internal 网络挪走 → 直接暴露在公网；
 *   · 公开区被整站 forward_auth 挡住 → 公开内容要登录才能看（正是 docs/01 §5.3 禁止的）；
 *   · 内部区漏了 forward_auth → 内部件变成公开的。
 * 这三种都不会在 `docker compose up` 时报错。
 *
 * 本脚本把这些**架构约束变成可断言的不变量**，让它们能被机器守住，
 * 而不是靠"下次记得"。约定与《未来档案》的验收脚本一致：
 * **一个总是通过的检查器比没有检查器更糟** —— 所以每条断言都先确认它能失败（见 --selftest）。
 *
 * 用法：
 *   bun run tools/validate-compose.ts
 *   bun run tools/validate-compose.ts --selftest   # 负向自检：故意破坏，确认能被抓到
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..')
const SELFTEST = process.argv.includes('--selftest')

interface Check { name: string; ok: boolean; detail: string }
const results: Check[] = []
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok, detail })
  if (!SELFTEST) console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(34)} ${detail}`)
}

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

// ─── 读取 ────────────────────────────────────────────────────────────
const COMPOSE = 'deploy/compose.yml'
const CADDY = 'deploy/caddy/Caddyfile'
const AUTHELIA = 'deploy/authelia/configuration.template.yml'

for (const f of [
  COMPOSE, CADDY, AUTHELIA, 'deploy/authelia/users.yml', '.env.example',
  // 门户是**唯一自研件**（L11）：真 Astro SSR 应用，不再是静态占位页
  'portal/Dockerfile', 'portal/package.json', 'portal/astro.config.mjs',
  'portal/src/pages/index.astro', 'portal/src/pages/account/index.astro', 'portal/src/pages/admin/index.astro',
]) {
  check(`文件存在：${f}`, existsSync(join(ROOT, f)))
}
if (results.some(r => !r.ok)) {
  console.error('\n✗ 缺少必要文件，后续断言无法进行')
  process.exit(1)
}

let composeText = read(COMPOSE)
const caddyText = read(CADDY)
const autheliaText = read(AUTHELIA)
const envExample = read('.env.example')

// 负向自检：注入一个"坏"的 compose 来确认断言真的会失败
if (SELFTEST) {
  console.log('负向自检模式：故意破坏每条不变量，确认检查器能抓到\n')
  // ⚠️ 每条变异**显式声明 target**，不再用 label 字符串去猜该测哪份配置。
  //    早先版本用 `label.includes('buffer pool')` 分发，但标签里写的是
  //    `innodb_buffer_pool_size`（下划线）→ 分发到错误的检查器 → 自检误报"漏检"。
  type Target = 'compose' | 'caddy' | 'authelia'
  const mutations: Array<[string, string, Target, (s: string) => string]> = [
    ['内部件不应发布端口', '给 ghost 加 ports', 'compose', s => s.replace(
      '  ghost:\n    image: ghost:5-alpine\n    restart: unless-stopped',
      '  ghost:\n    image: ghost:5-alpine\n    restart: unless-stopped\n    ports:\n      - "2368:2368"')],
    ['只应有一个 PostgreSQL 实例', '再加一个 postgres 实例', 'compose', s => s.replace(
      '  db:\n    image: postgres:16-alpine',
      '  db2:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: x\n      POSTGRES_USER: x\n      POSTGRES_PASSWORD: x\n    networks:\n      - internal\n\n  db:\n    image: postgres:16-alpine')],
    ['未压小 innodb_buffer_pool_size', '错误地压小 buffer pool', 'compose', s => s.replace(
      '      - --performance-schema=OFF',
      '      - --performance-schema=OFF\n      - --innodb-buffer-pool-size=32M')],
    // ⚠️ 用正则匹配**稳定特征**（缩进的 `handle {` + 紧跟 `reverse_proxy portal:`），
    //    不要写死端口/整段文本——已因此失效三次（portal:80 → portal:4321 就断了一次）。
    ['公开区不应被 forward_auth 挡', '给公开区 handle 加 forward_auth', 'caddy',
      s => s.replace(/\n\thandle \{\n\t\treverse_proxy portal:/,
        '\n\thandle {\n\t\tforward_auth authelia:9091 {\n\t\t\turi /api/verify\n\t\t}\n\t\treverse_proxy portal:')],
    ['/admin 不放行 collaborator（防"看不见却进得去"）', '把 collaborator 加回内部区规则', 'authelia',
      s => s.replace("      subject:\n        - 'group:livefab-core'\n      policy: two_factor",
                     "      subject:\n        - 'group:livefab-core'\n        - 'group:livefab-collaborator'\n      policy: two_factor")],
    ['Ghost Content API 开了例外（L5c 依赖）', '把 Content API 也套上鉴权', 'caddy',
      s => s.replace('\thandle /ghost/api/content/* {\n\t\treverse_proxy ghost:2368\n\t}',
                     '\thandle /ghost/api/content/* {\n\t\tforward_auth authelia:9091 {\n\t\t\turi /api/verify\n\t\t}\n\t\treverse_proxy ghost:2368\n\t}')],
    ['会话 cookie 挂在共享父域', '改为逐域各配一个 cookie', 'authelia',
      s => s.replace("      domain: '__COOKIE_DOMAIN__'", "      domain: '__GHOST_DOMAIN__'")],
    ['Authelia 公开路径应 bypass', '把 bypass 改成 two_factor', 'authelia', s => s.replace(
      "- '^/blog(/.*)?$'\n        - '^/roadmap$'\n        - '^/assets/.*$'\n        - '^/favicon\\.ico$'\n      policy: bypass",
      "- '^/blog(/.*)?$'\n        - '^/roadmap$'\n        - '^/assets/.*$'\n        - '^/favicon\\.ico$'\n      policy: two_factor")],
  ]

  let caught = 0
  for (const [label, desc, target, mutate] of mutations) {
    const before = results.length
    if (target === 'compose') runComposeChecks(mutate(composeText))
    else if (target === 'caddy') runCaddyChecks(mutate(caddyText))
    else runAutheliaChecks(mutate(autheliaText))
    const failedNow = results.slice(before).some(r => !r.ok)
    console.log(`  ${failedNow ? '✓ 可捕获' : '✗ 漏检'}  ${label}（${desc}）`)
    if (failedNow) caught++
    results.length = before
  }
  console.log(`\n负向自检：${caught}/${mutations.length} 条不变量可被捕获`)
  if (caught !== mutations.length) {
    console.error('✗ 有断言抓不到违规——检查器本身不可信')
    process.exit(1)
  }
  console.log('✓ 检查器可信（每条不变量都能失败）')
  process.exit(0)
}

// ─── Compose 断言 ────────────────────────────────────────────────────
function runComposeChecks(text: string) {
  // 只取 services: 段，到下一个顶层键（networks:/volumes:）为止。
  // ⚠️ 早先版本直接按缩进切，结果把顶层 networks:/volumes: 也当成了服务——
  //    于是"内部件都挂 internal"这条误报。**校验器自己的 bug 也要靠自检暴露**。
  const servicesSection = text.split(/^services:\s*$/m)[1]?.split(/^\w+:/m)[0] ?? ''
  const services: Record<string, string> = {}
  for (const b of servicesSection.split(/\n  (?=\w[\w-]*:\n)/).slice(1)) {
    const name = b.split(':')[0]!.trim()
    if (name && !name.startsWith('#')) services[name] = b
  }

  // 1) 只有 caddy 能发布端口
  const withPorts = Object.entries(services).filter(([, b]) => /\n    ports:/.test(b)).map(([n]) => n)
  check('只有 caddy 发布端口', withPorts.length === 1 && withPorts[0] === 'caddy',
    withPorts.length ? `发布了端口：${withPorts.join(', ')}` : '没有任何服务发布端口（异常）')

  // 2) 除 caddy 外，所有服务都必须在 internal 网络上
  const notInternal = Object.entries(services)
    .filter(([n]) => n !== 'caddy')
    .filter(([, b]) => !/\n      - internal/.test(b))
    .map(([n]) => n)
  check('内部件都挂在 internal 网络', notInternal.length === 0,
    notInternal.length ? `未挂 internal：${notInternal.join(', ')}` : `${Object.keys(services).length - 1} 个服务已挂`)

  // 3) internal 网络必须标 internal: true（否则内部件能直接出网）
  check('internal 网络标了 internal: true', /\n  internal:\n    driver: bridge\n    internal: true/.test(text),
    '防止内部件直接出网')

  // 4) 每个 image 都要有 restart 策略（M0 的"能自己起来"）
  // 一次性任务不需要 restart 策略（它跑完即退）
  const ONE_SHOT = new Set(['authelia-secrets', 'authelia-prep', 'nodebb-setup'])
  const noRestart = Object.entries(services)
    .filter(([, b]) => /image:/.test(b))
    .filter(([n]) => !ONE_SHOT.has(n))
    .filter(([, b]) => !/restart:/.test(b))
    .map(([n]) => n)
  check('有镜像的服务都设了 restart', noRestart.length === 0,
    noRestart.length ? `缺 restart：${noRestart.join(', ')}` : '（authelia-init 是一次性任务，无镜像常驻）')

  // 5) 关键服务名必须存在（Caddyfile 里引用了它们）
  for (const need of ['caddy', 'authelia', 'portal', 'ghost', 'nodebb', 'nodebb-setup', 'authelia-prep', 'authelia-secrets', 'db']) {
    check(`compose 含服务 ${need}`, Boolean(services[need]))
  }

  // ★ 以下三条都是"真启动才学到"的教训，写成断言防止回退：

  // 6) NodeBB 镜像必须来自 ghcr：Docker Hub 的 nodebb/docker 停在 2023-07 的 v1.19
  const nodebbImg = services['nodebb']?.match(/image:\s*(\S+)/)?.[1] ?? ''
  check('NodeBB 用 ghcr 镜像', nodebbImg.includes('ghcr.io/nodebb/'),
    nodebbImg || '(未找到 nodebb 镜像)')

  // 7) NodeBB 必须用 NODEBB_* 前缀的安装变量（POSTGRES_* 不被识别）
  const usesNodebbPrefix = /NODEBB_DB_HOST:/.test(text) && /NODEBB_ADMIN_USERNAME:/.test(text)
  const usesWrongPrefix = /POSTGRES_HOST:\s*nodebb-db/.test(text)
  check('NodeBB 用 NODEBB_* 安装变量', usesNodebbPrefix && !usesWrongPrefix,
    usesWrongPrefix ? '仍在用 POSTGRES_* 前缀（NodeBB 不识别）' : '与镜像内 envConfMap 一致')

  // 8) 覆盖 entrypoint 的服务必须显式设 CONFIG_DIR
  //    （否则 nodebb setup 把 config.json 写到容器内、不持久，主容器又回安装器）
  const setupBlock = services['nodebb-setup'] ?? ''
  const overridesEntrypoint = /entrypoint:/.test(setupBlock)
  const setsConfigDir = /CONFIG_DIR:\s*\/opt\/config/.test(text)
  check('一次性安装设了 CONFIG_DIR', !overridesEntrypoint || setsConfigDir,
    overridesEntrypoint && !setsConfigDir ? '覆盖了 entrypoint 却没设 CONFIG_DIR' : 'OK')

  // 9) 反代后面必须开 trust_proxy（否则用户 IP 记成反代容器 IP）
  check('NodeBB 开了 trust_proxy', /trust_proxy/.test(text), '反代后端的客户端 IP 正确性')

  // ── 以下为 L12（数据库统一，方案 A+E）不变量 ──────────────────────

  // 10) 只应有一个 PostgreSQL 实例（Authelia 与 NodeBB 共用）
  const pgCount = (text.match(/image:\s*postgres:/g) ?? []).length
  check('只有一个 PostgreSQL 实例', pgCount === 1, `找到 ${pgCount} 个`)

  // 11) 单实例 PG 必须带建第二个库的初始化脚本（官方 POSTGRES_DB 只能建一个库）
  check('PG 有建第二库的初始化脚本',
    /postgres\/init:\/docker-entrypoint-initdb\.d/.test(text),
    '否则 NodeBB 的库不会被创建')

  // 12) MySQL 必须调过内存（方案 E）：performance_schema 关闭 + 日志缓冲回默认
  check('MySQL 关掉 performance_schema', /--performance-schema=OFF/.test(text))
  check('MySQL 的 log_buffer 未偏大', /--innodb-log-buffer-size=16M/.test(text))
  // ★ 但要确认**没有**去压 innodb_buffer_pool_size（那是真实性能关键，压它是错的）
  check('未压小 innodb_buffer_pool_size', !/--innodb-buffer-pool-size/.test(text),
    '它是真实性能关键，不属于"白省的内存"')

  // ── 门户（唯一自研件，L11）不变量 ───────────────────────────────

  // 13) 门户必须是**构建**出来的（真 Astro 应用），不是一个静态镜像
  check('门户经构建产出（非静态镜像）', /portal:[\s\S]{0,400}?build:/.test(text),
    'Astro SSR 应用需要构建步骤')

  // 14) ★ 门户必须**服务端渲染**才能读身份头——所以不能是纯静态托管
  check('门户不发布端口（只在网关后）', !/portal:[\s\S]{0,600}?\n    ports:/.test(text),
    '公开身份头由 Caddy 注入，门户若直接暴露则可被伪造')

  // 15) 构建上下文必须相对 compose 文件目录（deploy/）——写成 ./portal 会变成 deploy/portal
  check('门户构建上下文路径正确', /context:\s*\.\.\/portal/.test(text),
    'compose 的相对路径以 compose 文件所在目录为基准')

  return services
}
runComposeChecks(composeText)

// ─── Caddyfile 断言 ──────────────────────────────────────────────────
function runCaddyChecks(text: string) {
  // 1) 内部区必须有 forward_auth
  const adminBlock = text.match(/handle \/admin\/\* \{([\s\S]*?)\n\t\}/)?.[1] ?? ''
  check('/admin/* 有 forward_auth', /forward_auth\s+authelia:9091/.test(adminBlock),
    adminBlock ? '内部区在网关就被拦住' : '未找到 /admin/* 块')

  // 2) 个人区必须有 forward_auth
  const accountBlock = text.match(/handle \/account\/\* \{([\s\S]*?)\n\t\}/)?.[1] ?? ''
  check('/account/* 有 forward_auth', /forward_auth\s+authelia:9091/.test(accountBlock))

  // 3) ★ 公开区（兜底 handle）**不得**有 forward_auth
  const publicBlock = text.match(/\n\thandle \{\n([\s\S]*?)\n\t\}/)?.[1] ?? ''
  check('公开区未被登录墙挡住', publicBlock !== '' && !/forward_auth/.test(publicBlock),
    publicBlock ? '公开区直接反代门户（分层正确）' : '未找到公开区兜底 handle')

  // 4) 反代目标必须指向 compose 里的服务名
  for (const [svc, target] of [['portal', 'portal:4321'], ['authelia', 'authelia:9091'], ['ghost', 'ghost:2368'], ['nodebb', 'nodebb:4567']] as const) {
    check(`反代指向 ${target}`, text.includes(`reverse_proxy ${target}`), `对应服务 ${svc}`)
  }

  // 5) ★ Ghost 后台必须受保护，**但不能把公开站一起挡住**（docs/01 §5.3）
  const ghostHandle = text.match(/handle \/ghost\/\* \{([\s\S]*?)\n\t\}/)?.[1] ?? ''
  check('/ghost/* 有 forward_auth', /forward_auth\s+authelia:9091/.test(ghostHandle),
    'Ghost 后台必须经网关鉴权')

  // 6) ★ Content API 必须**开例外**：它是 L5c 的 Astro 前端在构建期取内容的接口，
  //    一刀切挡 /ghost/* 会把 headless 整合直接打断。
  const contentHandle = text.match(/handle \/ghost\/api\/content\/\* \{([\s\S]*?)\n\t\}/)?.[1] ?? ''
  check('Ghost Content API 开了例外（L5c 依赖）', contentHandle !== '' && !/forward_auth/.test(contentHandle),
    contentHandle ? '公开可读（只暴露已发布内容）' : '★ 未开例外：Astro 前端将取不到内容')

  // 7) Content API 的 handle 必须**排在 /ghost/* 之前**（Caddy 的 handle 互斥且按顺序匹配）
  const contentIdx = text.indexOf('handle /ghost/api/content/*')
  const ghostIdx = text.indexOf('handle /ghost/*')
  check('Content API 例外排在 /ghost/* 之前', contentIdx > 0 && ghostIdx > 0 && contentIdx < ghostIdx,
    contentIdx < ghostIdx ? '顺序正确' : '★ 顺序错了：会被 /ghost/* 先匹配掉')
}
runCaddyChecks(caddyText)

// ─── Authelia 断言 ───────────────────────────────────────────────────
function runAutheliaChecks(text: string) {
  // 1) 默认拒绝（安全默认值）
  check('默认策略是 deny', /default_policy:\s*deny/.test(text))

  // 2) ★ 公开路径必须 bypass（否则公开区会被挡——docs/01 §5.3）
  const bypassRule = text.match(/resources:\n((?:\s+- .*\n)+)\s+policy: bypass/)?.[1] ?? ''
  const publicPaths = ['^/$', '^/blog(/.*)?$', '^/roadmap$']
  for (const p of publicPaths) {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    check(`公开路径 bypass：${p}`, bypassRule.includes(p) || new RegExp(esc).test(bypassRule))
  }

  // 3) 鉴权门户自身必须 bypass（否则登录页也进不去，死锁）
  const authBypass = /domain: '__AUTH_DOMAIN__'[\s\S]{0,120}?policy: bypass/.test(text)
  check('鉴权门户自身 bypass', authBypass, '防止"要登录才能登录"的死锁')

  // 3b) ★ 域名必须用占位符而非 env 模板——env 模板在 domain 字段**会失效**
  //     （真实 Authelia 报错：could not decode ... to a *url.URL）
  const envInDomain = /domain:\s*'\{\{/.test(text)
  check('domain 未用 {{ env }} 模板', !envInDomain,
    envInDomain ? 'domain 用了 {{ env }}，Authelia 会解析失败' : '用 __PLACEHOLDER__ + 渲染步骤')

  // 3c) reset_password 必须有 jwt_secret 来源。
  //     注意：不能用 disable/enabled（都不是合法键）。
  //     密钥经 AUTHELIA_IDENTITY_VALIDATION_RESET_PASSWORD_JWT_SECRET_FILE 提供，
  //     故这里断言"配置里有 reset_password 段"且"compose 设了对应 *_FILE"。
  const hasResetSection = /identity_validation:\s*\n\s+reset_password:/.test(
    text.replace(/^\s*#.*$/gm, ''))
  check('reset_password 段存在', hasResetSection,
    '（disable/enabled 都不是合法键，必须提供 jwt_secret 来源）')

  // 3d) session.cookies 段必填
  // 去掉注释行再匹配——模板里在 session 与 cookies 之间有说明性注释
  const noComments = text.replace(/^\s*#.*$/gm, '')
  check('session 含必需的 cookies 段', /session:\s*\n\s+cookies:/.test(noComments),
    '真实 Authelia 校验要求此项')

  // 4) 内部区必须限定组 + two_factor
  const adminRule = text.match(/\^\/admin\(\/\.\*\)\?\$'[\s\S]{0,400}?policy: two_factor/)?.[0] ?? ''
  check('/admin 要求 two_factor', adminRule !== '')
  // ★ 内部区**只允许 core**。曾经同时放行 collaborator，那是个真实漏洞：
  //   门户按 L4 把内部区标成 core 级（协作者看不到），网关却放行 → "看不见却进得去"。
  //   所以这里不仅要求有 core，还**明确要求不许出现 collaborator**。
  check('/admin 限定 livefab-core 组', /group:livefab-core/.test(adminRule),
    '不在 core 组里连门都进不去')
  check('/admin 不放行 collaborator（防"看不见却进得去"）',
    !/group:livefab-collaborator/.test(adminRule),
    /group:livefab-collaborator/.test(adminRule)
      ? '★ 放行了 collaborator，但门户对协作者隐藏内部区 → 门户与网关不一致'
      : '与门户的 core 级门槛一致')

  // 4b) ★ Ghost 域的 /ghost/ 规则：放行 core 与 collaborator（与门户对"官网后台"的标注一致）
  const ghostRule = text.match(/domain: '__GHOST_DOMAIN__'[\s\S]{0,300}?policy: (\w+)/)?.[0] ?? ''
  check('Authelia 有 /ghost/ 保护规则', ghostRule !== '', ghostRule ? '限定了组与策略' : '★ 缺规则')
  check('/ghost/ 放行 core 与 collaborator（与门户一致）',
    /group:livefab-core/.test(ghostRule) && /group:livefab-collaborator/.test(ghostRule),
    '门户给"官网后台"标的是 collaborator 级')

  // 4c) ★ cookie 必须挂在**共享父域**上。
  //     真实 Authelia 会拒绝"authelia_url 与 cookie 域不共享作用域"的配置：
  //       session: domain config #2: option 'authelia_url' does not share a cookie scope ...
  //     所以用 __COOKIE_DOMAIN__（父域）而不是逐个域各配一个 cookie。
  check('会话 cookie 挂在共享父域', /domain: '__COOKIE_DOMAIN__'/.test(text),
    '一个 cookie 覆盖所有子域，也只需一个鉴权门户')
  const cookieCount = (text.match(/^\s+- name: livefab_/gm) ?? []).length
  check('只配一个会话 cookie（共享父域方案）', cookieCount === 1,
    cookieCount === 1 ? '' : `配了 ${cookieCount} 个——多域方案已被 Authelia 的作用域校验否决`)

  // 5) 不得把密钥硬编码在版本库里
  const hardcoded = /secret:\s*['"]?[A-Za-z0-9+/=]{16,}/.test(text)
  check('会话密钥未硬编码', !hardcoded, hardcoded ? '发现疑似硬编码密钥' : '密钥经 *_FILE / {{ secret }} 注入')
}
runAutheliaChecks(autheliaText)

// ─── 环境变量一致性 ──────────────────────────────────────────────────
const referenced = new Set<string>()
for (const m of composeText.matchAll(/\$\{(\w+)[:?}]/g)) referenced.add(m[1]!)
for (const m of caddyText.matchAll(/\{\$(\w+)\}/g)) referenced.add(m[1]!)
// ⚠️ 先剥注释：模板的说明文字里含 `{{ env "X" }}` 这种示例，
//    不剥会把它当成真实引用（早先就误报出一个不存在的变量 X）。
for (const m of autheliaText.replace(/^\s*#.*$/gm, '').matchAll(/env "(\w+)"/g)) referenced.add(m[1]!)

const documented = new Set<string>()
for (const m of envExample.matchAll(/^(\w+)=/gm)) documented.add(m[1]!)
for (const m of envExample.matchAll(/^#.*?(\w+)=/gm)) documented.add(m[1]!)

const undocumented = [...referenced].filter(v => !documented.has(v) && !v.startsWith('AUTHELIA_'))
check('引用的环境变量都有文档', undocumented.length === 0,
  undocumented.length ? `.env.example 缺：${undocumented.join(', ')}` : `${referenced.size} 个变量已覆盖`)

// ─── 汇总 ────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ M0 骨架校验未通过：')
  for (const f of failed) console.error(`  · ${f.name} ${f.detail}`)
  process.exit(1)
}
console.log('✓ M0 骨架校验通过（结构层面；未实际启动容器）')
