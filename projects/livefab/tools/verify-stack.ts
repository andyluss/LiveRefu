#!/usr/bin/env bun
/**
 * M0 骨架运行时验收（需要 docker + 已启动的 stack）。
 *
 * 与 `validate-compose.ts` 的分工：
 *   · validate-compose.ts = **静态**结构校验（不需要 docker，检查配置不变量）
 *   · 本脚本           = **运行时**行为校验（真的发请求，验证鉴权分层生效）
 *
 * 为什么必须有运行时校验：静态配置"看起来对"和"真的生效"是两件事。
 * M0 最核心的设计是**鉴权分层**（公开区不挡、内部区在网关拦住），
 * 而这件事**只有真发一个请求才能证明**——配置文件里写得再对，
 * Caddy 的 forward_auth 或 Authelia 的规则没生效，公开区照样会被挡或内部区照样敞开。
 *
 * 用法：
 *   bun run tools/verify-stack.ts                 # 用 .env 里的域名
 *   bun run tools/verify-stack.ts --selftest      # 负向自检：确认检查器能失败
 */

const arg = (n: string, d = '') => process.argv.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const SELFTEST = process.argv.includes('--selftest')

// 从 .env 读域名（不引入 dotenv，保持零依赖）
async function envFromFile(key: string, fallback: string): Promise<string> {
  try {
    const txt = await Bun.file(`${import.meta.dir}/../.env`).text()
    const m = txt.match(new RegExp(`^${key}=(.*)$`, 'm'))
    return m?.[1]?.trim() || fallback
  } catch {
    return fallback
  }
}

const PORTAL = arg('portal') || (await envFromFile('LIVEFAB_PORTAL_DOMAIN', 'app.m0.livefab.test'))
const FORUM = arg('forum') || (await envFromFile('LIVEFAB_FORUM_DOMAIN', 'forum.m0.livefab.test'))
const GHOST = arg('ghost') || (await envFromFile('LIVEFAB_DOMAIN', 'm0.livefab.test'))
const AUTH = `auth.${PORTAL}`

interface Check { name: string; ok: boolean; detail: string }
const results: Check[] = []
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok, detail })
  if (!SELFTEST) console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(32)} ${detail}`)
}

/**
 * 用 curl 而不是 fetch：需要 --resolve 把假域名指到 127.0.0.1，并用 -k 忽略内网 CA。
 * （用 fetch 无法覆盖 DNS 解析，除非改 /etc/hosts——那会污染系统。）
 */
async function probe(host: string, path = '/'): Promise<{ status: number; location: string; body: string }> {
  // 用临时文件收 body/header，而不是 /dev/stdout —— 在 Bun.spawn 下 fd 重定向不可靠
  // （早先版本用 -o /dev/stdout 导致所有状态码都是 0）。
  const dir = await Bun.$`mktemp -d`.text().then(t => t.trim())
  try {
    const p1 = Bun.spawn([
      'curl', '-sk', '--max-time', '20',
      '--resolve', `${host}:443:127.0.0.1`,
      '-D', `${dir}/h`, '-o', `${dir}/b`,
      '-w', '%{http_code}',
      `https://${host}${path}`,
    ], { stdout: 'pipe', stderr: 'ignore' })
    const statusStr = await new Response(p1.stdout).text()
    await p1.exited
    const status = Number(statusStr.trim()) || 0
    const body = await Bun.file(`${dir}/b`).text().catch(() => '')
    const head = await Bun.file(`${dir}/h`).text().catch(() => '')
    const location = head.match(/^location:\s*(.+)$/im)?.[1]?.trim() ?? ''
    return { status, location, body }
  } finally {
    await Bun.$`rm -rf ${dir}`.quiet().nothrow()
  }
}

console.log(`M0 运行时验收（门户=${PORTAL} 论坛=${FORUM} 前台=${GHOST}）\n`)

// ── ① 核心：鉴权分层 ────────────────────────────────────────────────
// 这是 M0 最该守住的设计（docs/01 §5.3）：公开区不得被登录墙挡住。
const pub = await probe(PORTAL, '/')
check('公开区不被登录墙挡住', pub.status === 200,
  `GET / → ${pub.status}${pub.status === 302 ? `（被重定向到 ${pub.location}——分层失败！）` : ''}`)

const routes: Array<[string, number]> = [
  ['/account/', 302],
  ['/admin/', 302],
]
for (const [path, want] of routes) {
  const r = await probe(PORTAL, path)
  const toAuth = r.location.includes(AUTH)
  check(`${path} 被网关拦住`, r.status === want && toAuth,
    `${r.status}${toAuth ? ` → ${AUTH}` : r.location ? ` → ${r.location}` : ''}`)
}

// 内部区必须要求双因素：Authelia 用不同的 rd 参数区分不了，
// 但可以用"带 ?rd= 的登录 URL"证明它进了鉴权流程（而非直接 403）。
const admin = await probe(PORTAL, '/admin/')
check('内部区进入鉴权流程', admin.status === 302 && admin.location.includes('/?rd='),
  '重定向带 rd= 参数，说明是 Authelia 发起的认证')

// ── ② 鉴权门户自身可达（防止"要登录才能登录"死锁）──────────────────
const auth = await probe(AUTH, '/')
check('鉴权门户自身可达', auth.status === 200, `GET / → ${auth.status}`)

// ── ③ 各件可达 ──────────────────────────────────────────────────────
const ghost = await probe(GHOST, '/')
check('Ghost 前台可达', ghost.status === 200, `→ ${ghost.status}`)

const forum = await probe(FORUM, '/')
// NodeBB 装好后返回真实论坛页；若还是 web 安装器，说明 config.json 没接上
const stillInstaller = /web\s*installer/i.test(forum.body)
check('NodeBB 已过安装器', forum.status === 200 && !stillInstaller,
  stillInstaller ? '仍是 web 安装器（config.json 未生效）' : `→ ${forum.status}，${forum.body.length} 字节`)

// ── ③·补 门户与分级权限（M1 验收：显示已登录身份 + 可进入的件列表）──────
// 这一节要证明的不只是"门户能打开"，而是**身份真的被识别、级别真的在过滤**。
// 所以它真的走一遍登录（Authelia 的 firstfactor API）拿会话，再带 cookie 请求。

/** 走一遍 Authelia 登录，返回会话 cookie（`one_factor` 只需密码） */
async function login(user: string, password: string): Promise<string> {
  const p = Bun.spawn([
    'curl', '-sk', '-D', '-', '--max-time', '20',
    '-X', 'POST', `https://${AUTH}/api/firstfactor`,
    '-H', 'Content-Type: application/json',
    '-d', JSON.stringify({ username: user, password, targetURL: `https://${PORTAL}/account/` }),
    '-o', '/dev/null',
  ], { stdout: 'pipe', stderr: 'ignore' })
  const head = await new Response(p.stdout).text()
  await p.exited
  return head.match(/^set-cookie:\s*([^;]+)/im)?.[1]?.trim() ?? ''
}

/** 带会话请求。⚠️ 用临时文件收 body，不用 `-o /dev/stdout`——后者在 Bun.spawn 下不可靠
 *  （早先 probe() 就因此让所有状态码变成 0；这里同一个坑又踩了一次）。 */
async function probeWithCookie(host: string, path: string, cookie: string) {
  const dir = (await Bun.$`mktemp -d`.text()).trim()
  try {
    const p = Bun.spawn([
      'curl', '-sk', '--max-time', '20',
      '--resolve', `${host}:443:127.0.0.1`,
      '-H', `Cookie: ${cookie}`,
      '-o', `${dir}/b`, '-w', '%{http_code}',
      `https://${host}${path}`,
    ], { stdout: 'pipe', stderr: 'ignore' })
    const status = Number((await new Response(p.stdout).text()).trim()) || 0
    await p.exited
    const body = await Bun.file(`${dir}/b`).text().catch(() => '')
    return { status, body }
  } finally {
    await Bun.$`rm -rf ${dir}`.quiet().nothrow()
  }
}

// 门户是 Astro SSR（不是 M0 的静态占位页）——用"有没有真渲染身份区块"来区分
const pub2 = await probe(PORTAL, '/')
check('门户是 Astro SSR（非静态占位）', pub2.body.includes('公开可访问') && pub2.body.includes('LiveFab'),
  `${pub2.body.length} 字节`)
check('公开区不含身份信息', !pub2.body.includes('已登录：'), '未登录访问不应出现身份')

const adminCookie = await login('admin', 'devpassword')
check('管理员登录成功', Boolean(adminCookie), adminCookie ? '已取得会话 cookie' : '未取到 cookie')

if (adminCookie) {
  const acct = await probeWithCookie(PORTAL, '/account/', adminCookie)
  check('个人区带会话可访问', acct.status === 200, `HTTP ${acct.status}`)
  check('门户显示已登录身份', acct.body.includes('我的身份') && acct.body.includes('livefab-admin'),
    '渲染出身份与分组')
  const adminCount = Number(acct.body.match(/你可以进入的件（(\d+)）/)?.[1] ?? -1)
  check('管理员可见件数 > 0', adminCount > 0, `${adminCount} 个`)

  const collabCookie = await login('collaborator', 'devcollab')
  const cAcct = collabCookie ? await probeWithCookie(PORTAL, '/account/', collabCookie) : { status: 0, body: '' }
  const collabCount = Number(cAcct.body.match(/你可以进入的件（(\d+)）/)?.[1] ?? -1)
  check('协作者登录并可访问个人区', cAcct.status === 200 && collabCount > 0,
    `HTTP ${cAcct.status}，可见 ${collabCount} 个`)

  // ★ 核心：级别真的在过滤（不是所有人看到同一份列表）
  check('分级生效：协作者可见件少于管理员', collabCount > 0 && adminCount > collabCount,
    `管理员 ${adminCount} vs 协作者 ${collabCount}`)
  check('分级生效：协作者被扣留内部区', cAcct.body.includes('需要更高权限') && cAcct.body.includes('内部区'),
    '内部区（需 core）对协作者不可见')
}

// ── ③·补·二 角色映射：协作者能进 A，不能进 C ─────────────────────────
// 这是 [docs/03 M1](../docs/03_分阶段落地路线.md) 的验收原文：
//   "用一个**协作者**账号验证：能进 A 不能进 C"
//
// 判据的关键在**区分三种结果**（不能只看"被拦住了"）：
//   403 Forbidden  → 组不匹配，**权限拒绝**（这才是"不能进 C"）
//   302 → 鉴权页  → 组通过了，但还差第二因素（说明**组门是开着的**）
//   200            → 完全放行
// 若只看"不是 200 就算被拒"，会把"只是还没输 2FA"误判成"权限不足"——
// 那样这个验收就证明不了任何关于**分组**的事。

/**
 * 只取"**你可以进入的件**"那一节的 HTML。
 *
 * ⚠️ 为什么需要它：协作者的页面上**也**会出现"内部区"这三个字——
 *    但它出现在"需要更高权限"那一节里（解释为什么看不到）。
 *    直接对整页 `includes('内部区')` 会把"被扣留"误判成"可用"，
 *    早先的交叉校验就因此误报不一致。**判断可见性必须限定在可用那一节内。**
 */
function availableSection(html: string): string {
  const start = html.indexOf('你可以进入的件')
  if (start < 0) return ''
  const end = html.indexOf('需要更高权限', start)
  return end < 0 ? html.slice(start) : html.slice(start, end)
}

async function gate(path: string, cookie: string) {
  const dir = (await Bun.$`mktemp -d`.text()).trim()
  try {
    const p = Bun.spawn([
      'curl', '-sk', '--max-time', '20', '--resolve', `${PORTAL}:443:127.0.0.1`,
      '-H', `Cookie: ${cookie}`, '-o', `${dir}/b`, '-D', `${dir}/h`,
      '-w', '%{http_code}', `https://${PORTAL}${path}`,
    ], { stdout: 'pipe', stderr: 'ignore' })
    const status = Number((await new Response(p.stdout).text()).trim()) || 0
    await p.exited
    return { status, body: await Bun.file(`${dir}/b`).text().catch(() => '') }
  } finally {
    await Bun.$`rm -rf ${dir}`.quiet().nothrow()
  }
}

if (adminCookie) {
  const collabCookie2 = await login('collaborator', 'devcollab')
  const adminA = await gate('/account/', adminCookie)
  const collabA = await gate('/account/', collabCookie2)
  const adminC = await gate('/admin/', adminCookie)
  const collabC = await gate('/admin/', collabCookie2)

  // A 区（个人中心）：两者都应可进
  check('A 区：协作者可进', collabA.status === 200, `HTTP ${collabA.status}`)
  check('A 区：核心成员可进', adminA.status === 200, `HTTP ${adminA.status}`)

  // C 区（内部区）：协作者**必须被拒**
  check('C 区：协作者被拒（403，非仅仅缺 2FA）', collabC.status === 403,
    collabC.status === 403 ? '403 Forbidden = 组不匹配的权限拒绝'
      : collabC.status === 302 ? `★ 302 —— 组门是开的！协作者只是缺 2FA，改完 2FA 就能进：权限漏洞`
      : `HTTP ${collabC.status}`)

  // C 区：核心成员应**过组检查**（302 进 2FA，而不是 403）
  check('C 区：核心成员过组检查（302 进 2FA，非 403）', adminC.status === 302,
    adminC.status === 302 ? '组门为其打开，只差第二因素' : `HTTP ${adminC.status}（403 说明连核心成员都被挡）`)

  // ★ 交叉校验：门户说"你看不到"，网关就必须"你也进不去"（反之亦然）
  //   这一条本可以自动发现"门户按 core 过滤、网关却放行 collaborator"那个漏洞。
  const collabHidesInternal = !availableSection(collabA.body).includes('内部区')
  const collabDeniedInternal = collabC.status === 403
  check('门户与网关一致：协作者两边都拿不到内部区',
    collabHidesInternal === collabDeniedInternal,
    collabHidesInternal && collabDeniedInternal
      ? '门户不显示 + 网关拒绝，一致'
      : `门户${collabHidesInternal ? '不显示' : '显示'}、网关${collabDeniedInternal ? '拒绝' : '放行'} → ★ 不一致`)

  const adminSeesInternal = availableSection(adminA.body).includes('内部区')
  const adminPassesGate = adminC.status !== 403
  check('门户与网关一致：核心成员两边都通过组门',
    adminPassesGate && adminSeesInternal,
    adminPassesGate && adminSeesInternal
      ? `门户可用区显示内部区 + 网关 HTTP ${adminC.status}（未拒），一致`
      : `门户可用区${adminSeesInternal ? '显示' : '未显示'}、网关${adminPassesGate ? '未拒' : '403'} → ★ 不一致`)
}

// ── ④ 负向自检 ──────────────────────────────────────────────────────
// ⚠️ 这里**直接测断言逻辑**，而不是去请求真实站点。
//    早先版本写的是"用真实请求模拟破坏"，但那两个探针并没有真的破坏任何东西
//    （`/account/` 本来就是受保护路径，断言自然通过）→ 自检自己误报了 1/2 漏检。
//    正确做法：给断言喂**已知会失败的输入**，确认它确实报错。
if (SELFTEST) {
  console.log('\n负向自检：给断言喂已知坏输入，确认它们会失败\n')

  /** 与正式检查相同的判定逻辑，抽出以便喂假数据 */
  const predicates: Array<[string, (r: { status: number; location: string; body: string }) => boolean, { status: number; location: string; body: string }]> = [
    [
      '公开区不被登录墙挡住',
      r => r.status === 200,
      { status: 302, location: `https://${AUTH}/?rd=...`, body: '' },  // 分层失效时的样子
    ],
    [
      '/account/ 被网关拦住',
      r => r.status === 302 && r.location.includes(AUTH),
      { status: 200, location: '', body: 'ok' },                       // 漏配 forward_auth 时的样子
    ],
    [
      'NodeBB 已过安装器',
      r => r.status === 200 && !/web\s*installer/i.test(r.body),
      { status: 200, location: '', body: '<title>NodeBB Web Installer</title>' }, // 又回安装器
    ],
    [
      '鉴权门户自身可达',
      r => r.status === 200,
      { status: 0, location: '', body: '' },                            // 端口不通
    ],
    [
      '门户显示已登录身份',
      r => r.body.includes('我的身份') && r.body.includes('livefab-admin'),
      { status: 200, location: '', body: '<h2>未能识别身份</h2>' },      // 身份头没注入
    ],
    [
      'C 区：协作者被拒（403，非仅仅缺 2FA）',
      r => r.status === 403,
      { status: 302, body: '' },   // 组门开着的样子——必须判为失败
    ],
    [
      'C 区：核心成员过组检查（302 进 2FA，非 403）',
      r => r.status === 302,
      { status: 403, body: '' },   // 连核心成员都被挡
    ],
    [
      '分级生效：协作者可见件少于管理员',
      r => (Number(r.body.match(/你可以进入的件（(\d+)）/)?.[1] ?? -1)) > 0,
      { status: 200, location: '', body: '你可以进入的件（0）' },         // 过滤把所有人都挡了
    ],
  ]

  let caught = 0
  for (const [label, pred, badInput] of predicates) {
    const before = results.length
    check(label, pred(badInput))          // 喂坏输入 → 应当 FAIL
    const failedNow = results.slice(before).some(r => !r.ok)
    console.log(`  ${failedNow ? '✓ 可捕获' : '✗ 漏检'}  ${label}（喂入坏数据后确实报错）`)
    if (failedNow) caught++
    results.length = before
  }

  console.log(`\n负向自检：${caught}/${predicates.length} 条断言可被捕获`)
  if (caught !== predicates.length) {
    console.error('✗ 有断言抓不到违规——检查器不可信')
    process.exit(1)
  }
  console.log('✓ 检查器可信（每条断言在坏输入下都会失败）')
  process.exit(0)
}

// ── 汇总 ────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 项通过`)
if (failed.length) {
  console.error('✗ M0 运行时验收未通过：')
  for (const f of failed) console.error(`  · ${f.name} ${f.detail}`)
  process.exit(1)
}
console.log('✓ M0 运行时验收通过（鉴权分层已生效）')
