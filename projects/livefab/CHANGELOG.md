# LiveFab · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)
> 与 [tech/changelog-convention.md](../../tech/changelog-convention.md)：
> **Keep a Changelog 类目 + SemVer 版本 + 东八区时间（精确到分）**。
> 项目结构见 [`README.md`](README.md)；文档入口 [`docs/`](docs/)。
>
> **版本时间取自 git 提交时间**（不是事后脑补）——每个版本的时间是该版本最后一个提交的时间。
> 版本与提交的对应见本文件各版本头；对应的 git tag 为 `livefab-v<版本>`。
> 格式由 [`tools/check-changelog.ts`](tools/check-changelog.ts) 校验并接入 pre-commit。

## [未发布]

> 下一轮的改动写在这里；发布时并入新版本号并补上时间。

### 变更（变更日志格式：加版本号与精确到分的时间）

工作区 [R05](../../rules/R05-changelog.md) 早就要求「SemVer 版本 + 东八区日期」，
但本项目**一直没落实**：全部 32 个小节挤在一个 `[Unreleased]` 里、只有日期没有时间、
从未打过 tag、`package.json` 里连 `version` 都没有。想知道"M0 与 M1 各自何时完成"，
只能去翻 `git log` —— 而变更日志本应**独立于人**回答这个问题。

经用户在 [06 变更日志方案选择](docs/06_变更日志方案选择.md) 中裁决，采用**方案甲**：

- **拆成 3 个版本**（时间取自**真实 git 提交**，不是事后脑补）：
  `0.1.0`（提案阶段，10-03 19:43）、`0.2.0`（M0，10-05 20:50）、`0.3.0`（M1，10-05 21:29）；
- **版本头**改为 `## [X.Y.Z] - YYYY-MM-DD HH:mm`（东八区、精确到分）；
- **顺序改为最新在上**（原来是最旧在上，与 R05「时间倒序」相反）；
- **归一 12 个非标准小节标题**（`⚠️ M0 的验证边界`、`发现（…）`、`实测（…）`、
  `一处诚实的局限` 等）到标准类目，描述保留；原 `### 备注` 改为 0.1.0 的尾注（它不是变更条目）；
- `package.json` 补 `version: 0.3.0`；打 tag `livefab-v0.1.0` / `v0.2.0` / `v0.3.0`。

新增 [`tools/check-changelog.ts`](tools/check-changelog.ts) 护栏（并接入 pre-commit），校验 9 项：
版本头格式、`[未发布]` 位置、**时间单调递减**、**每个小节用标准类目**、无空版本段、
时间不在未来，以及最关键的一条 —— **版本号与 git tag 对得上**
（若存在 `livefab-v<版本>`，其时间必须等于该 tag 指向提交的时间）。

> 最后那条是本轮最值钱的：其余几条只保证「格式自洽」，**这条保证「内容不假」** ——
> 它把变更日志与 git 钉在一起，谁事后改了时间都会被发现。

### 新增（统一身份：Authelia 开 OIDC Provider，TOTP 等遗留项清理）

接管 M0/M1 遗留清理项。本轮完成内存实测、过期清单更新、ACME 如实标注，
并**把 Authelia 从"网关鉴权"升级为"统一身份源"**（开 `identity_providers.oidc`），
为 M1 验收「用**同一个账号**发帖」铺路。详见 [07](docs/07_统一身份OIDC进度与阻塞.md)。

**Authelia 侧已完成并实测**：discovery 返回 200、JWKS 返回 RS256 公钥、
配置经真实 Authelia `config validate` 通过。

**★ 顺带更正了一处我先前的错误诊断**：我曾把 `{{ secret }}` 的问题写成
「文件缺失时静默返回空值」——**那是误判**。真因是
**Authelia 的配置模板是实验性过滤器、默认不启用**，于是字面量被当成了值，
数据库密码因此成了那串字面量。启用方式：`--config.experimental.filters template`。

**发现的真实坑（每条都是真启动才暴露）**：
- 注释里的 `{{ }}` 也会被 Go 模板**执行**（我写在注释里的示例把配置搞坏了）
- `--config=...` 等号形式会让容器**起不来**（entrypoint 的 `$1 != "--config"` 判断 → 把参数当命令）
- JWKS 密钥**必须内联为 YAML 块标量**：单引号标量会把 PEM 折成一行、base64 会被当对称密钥、
  文件路径会被当 base64；正解是 `key: |` + `awk` 逐行缩进注入
- `authelia crypto pair rsa generate --directory` **不自动建目录**，不 mkdir 就静默失败
- Bash 里变量后紧跟中文全角字符会被并进变量名（`$VER（` → unbound variable），必须写 `${VER}`
- **删密钥卷 = 数据库作废**：storage 加密密钥一变，Authelia 报
  "encryption key does not appear to be valid for this database" 起不来。
  教训：密钥必须与数据库一起备份（backup.ts 已覆盖该卷）

**NodeBB 侧：阻塞（已精确定位，非猜测）**。插件镜像构建成功、激活与配置写入成功，
但 NodeBB 报 `is active but not installed`、OIDC 路由 404。三层原因：
① 官方镜像用 `VOLUME` 声明 `node_modules` 为**匿名卷**，遮住派生镜像里 COPY 的文件
（镜像里 579 包 vs 卷里 576，差的正是新加的 3 个）；② entrypoint **每次启动都跑 `npm install`**，
按 `package.json` 裁剪多余包；③ 容器只有 internal 网络、**无外网**拉不到包。
三个候选解法已写入 [07 §4.3](docs/07_统一身份OIDC进度与阻塞.md)。

### 变更（内存实测 + 过期清单更新）

- **逐容器实测内存**（连采 3 次取稳定值）：合计约 **764 MiB**，最大项 NodeBB 274 MiB、
  ghost-db 184 MiB（L12 调优后，原 478 MiB）。写入 [README §5.4](README.md)。
- **重写 README 的"未验证"清单**：原 5 项里 2 项已完成、1 项如实标注为本地不可验证；
  新增 TOTP 与 NodeBB 统一账号两条遗留。
- **ACME 证书如实标注为本地不可验证**（内网 CA 与真实 ACME 是两条路径，必须真机验）。

## [0.3.0] - 2026-10-05 21:29

### 新增（M1：统一备份 + 真正的恢复演练）


[docs/03](docs/03_分阶段落地路线.md) 对 M1 的验收原文是**"真的恢复出一个件的数据（不是只配 cron）"**。
理由与项目一贯纪律一致：**未经验证的备份等于没有备份**。

LiveFab 的数据散在 **8 个地方**，漏一个就出事：

| 来源 | 忘了它会怎样 |
| --- | --- |
| PostgreSQL `authelia`（会话/2FA） | 全员被登出、2FA 要重配 |
| PostgreSQL `nodebb`（论坛） | 论坛内容丢失 |
| MySQL `ghost`（内容与会员） | 内容全丢 |
| 卷 `authelia_secretview`（**密钥**） | ⚠️ 恢复后**加密字段解不开**（最隐蔽也最致命） |
| 卷 `caddy_data`（TLS 证书 + 本地 CA） | 证书要重签 |
| 卷 `ghost_content` / `nodebb_data` / `nodebb_config` | 图片、附件、配置丢失 |

新增 [`tools/backup.ts`](tools/backup.ts)：收成一个**自描述**备份集——
每件一个文件 + `manifest.json`（大小、sha256、每张表行数）。
它刻意**只产出、不验证**（"备份跑成功"不等于"备份能用"，验证是另一件事）。

新增 [`tools/verify-backup.ts`](tools/verify-backup.ts)：**恢复演练，实测 36/36 通过**。
做法是真的：跑全新备份 → 校验 8 个产物 sha256 → 起**临时** PG/MySQL（与线上完全隔离）
→ 导入 → **逐表精确 `COUNT(*)`**（不用估算值）与线上比对 → 卷 tar **真的解出来**比对内容
→ 篡改一份备份确认校验会拦。实测：

```
authelia  25 张表 / 34 行     全部一致
nodebb    10 张表 / 1179 行   全部一致
ghost     75 张表 / 1056 行   全部一致
```

### 修复（演练第一次跑就抓到两个真问题，其中一个是**我自己的假通过**）


| # | 问题 | 后果 |
| --- | --- | --- |
| 1 | **`mysqldump` 少了 `--databases`**（dump 里没有 `CREATE DATABASE`/`USE`） | 导进干净实例报 `No database selected`，**MySQL 根本恢复不了** |
| 2 | **检查器在有 0 张表时"通过"了** | `0 === 0` 被判成"表数量一致" → **假通过** |

第 2 条的根因：MySQL 逐表 `COUNT` **漏了 `-D <db>`**，75 张表全部查询失败返回 0 张，
而"线上 0 张 == 恢复后 0 张"让断言通过了。**这正是"一个总是通过的检查器比没有检查器更糟"的实例。**

修法：① `mysqldump` 加 `--databases`；② `COUNT` 带 `-D`；
③ **加"表数非 0"哨兵断言** —— 0 张表意味着"查询坏了"或"库是空的"，
**绝不能与"一致"混为一谈**。

**并做了负向验证**：把 `-D` 去掉、重新引入那个 bug，演练**立刻失败**：

```
✗ ghost：线上表数非 0（哨兵）  ★ 0 张表：查询失败或库为空，不能据此判定一致
```

**演练会失败，所以它可信。** 另 `--selftest` 覆盖"篡改/空 dump/截断 dump"三种坏备份（3/3 可捕获）。

### 新增（M1：门户骨架 —— 真 Astro SSR，替换 M0 的 nginx 占位页）


门户是 [L11](docs/00_决策总表.md) 说的**唯一自研件**（唯一"没有合适开源件"的东西）。
M0 用 nginx 静态占位页；本轮换成**真的 Astro SSR 应用**。

**为什么必须是 SSR**：门户要显示已登录身份，而身份来自 Caddy 的 `forward_auth`
注入的**请求头**（`Remote-User` / `Remote-Groups`）。**请求头只有服务端渲染才读得到**，
静态页面拿不到——这是它必须是 SSR 而不仅是"一个好看的静态页"的实质原因。

- [`portal/`](portal/) —— Astro 7.3.5 + `@astrojs/node` 11.1.6，`output: 'server'`；
  三页：公开首页 `/`、个人中心 `/account/`、内部区 `/admin/`；
  **Dockerfile 多阶段构建**（本机沙箱禁止包管理器写临时目录；且镜像内构建才可复现）。
- [`portal/src/data/services.ts`](portal/src/data/services.ts) —— **把 L4 的五级编码成数据**：
  Authelia 的组 → 级别 → 显示哪些件。每个件还标了 `guard` 字段，写明**实际**由谁防护。
- compose：`portal` 从静态镜像改为 `build: ../portal`，env 注入各件主机名
  （代码不硬编码域名，本地 `*.localhost` 与生产只差一份 env）；**仍然不发布端口**。
- Caddyfile：`/account/*` 与 `/admin/*` 经 `forward_auth` 后反代到 `portal:4321`；
  公开区**仍不经过 forward_auth**（docs/01 §5.3 的硬要求）。

### 变更（验证：门户分级过滤实测 —— `bun run verify` 6 项断言全过）


断言**真的走一遍登录**（调 Authelia 的 `firstfactor` API 拿会话 cookie）再验：

| 账号 | 级别 | 可见件 | 被扣留 |
| --- | --- | ---: | --- |
| `admin` | admin | **6** | 0 |
| `collaborator` | collaborator | **5** | 1（内部区，需 core） |

协作者页面明确写"需要 **core** 级；你当前是 **collaborator** 级"——
**不是静默隐藏，而是告诉他为什么看不到**。

### 变更（门户的两条刻意设计与两条边界）


1. **故意不做静默降级**：`/account/` 与 `/admin/` 只应在经过网关鉴权后被访问。
   若读不到身份头，说明 Caddy 的 `forward_auth` 或 `copy_headers` 坏了——
   页面**显式报"未能识别身份 / 属于配置故障"**，而不是假装成"请先登录"。
   后者会把一个配置错误伪装成正常流程。
2. **隐藏链接不是访问控制**：门户的级别只决定"显不显示入口"，
   真正拦不拦得住由 **Authelia 在网关**决定。两者必须一致，
   否则就是"看得见但进不去"或**"看不见却进得去"**。所以每个件都标了 `guard` 写明实际防护。

**边界**：身份头由 Caddy 注入，前提是门户**只在内网、只被 Caddy 反代**。
若门户直接暴露端口，任何人都能伪造 `Remote-User`——已写成断言（门户不发布端口）。

### 修复（其他）


- **又踩了一次 compose 相对路径的坑**：`build.context: ./portal` 会解析成 `deploy/portal`
  （相对路径以 compose 文件所在目录为基准），改为 `../portal` 并写了断言防止回退。
- **又踩了一次 `-o /dev/stdout` 的坑**：新写的 `probeWithCookie` 用了这个不可靠写法
  （早先 `probe()` 就因此让状态码全变 0），导致门户断言全错。已改为临时文件写法。
- **校验器同步**：文件清单换成 Astro 门户产物；新增 3 条门户不变量
  （经构建产出 / 不发布端口 / 构建上下文路径正确），静态校验 **47 → 55/55**。
- **变异字符串第三次失效**：`portal:80 → portal:4321` 让"公开区被挡"那条变异匹配不上，
  自检误报漏检。已改为**用正则匹配稳定特征**（缩进的 `handle {` + `proxy portal:`），
  不再写死端口或整段文本。

### 修复（权限漏洞：门户说"你看不到"，网关却"放你进去"）


做 M1 第 ③ 项（角色映射端到端验证）时，实测发现**门户与网关对"谁能进内部区"的判断不一致**：

| 位置 | 说法 |
| --- | --- |
| 门户（[`portal/src/data/services.ts`](portal/src/data/services.ts)） | 内部区需要 **core** 级 → **协作者看不到入口** |
| Authelia 规则（`deploy/authelia/configuration.template.yml`） | `/admin/*` 放行 `livefab-core` **与 `livefab-collaborator`** → **协作者进得去** |

**这正是 [docs/04 §4.4](docs/04_开源件调研与选型.md) 自己写下的"看不见却进得去"**——
门户做得再对，只要网关比它宽，分级就是假的。而协作者能进 `/admin/*`
意味着他能看到密钥、全项目看板等 core 级内容。

**修法**：Authelia 的 `/admin/*` 规则**收紧为只允许 `livefab-core`**。
协作者该有的内部权限是 L4 原文说的"**被指派项目的议题与文档**"，
那是**按项目收窄**的路径，M2 接入看板/文档时再单独开——
而不是像之前那样给一个"全部内部件"的通用门。

### 变更（验证：协作者能进 A、不能进 C）


判据的关键是**区分三种结果**（只看"不是 200 就算被拒"是不够的）：

| 结果 | 含义 |
| --- | --- |
| **403 Forbidden** | 组不匹配，**权限拒绝**（这才是"不能进 C"） |
| **302 → 鉴权页** | 组**通过了**，只差第二因素（说明组门是开着的） |
| 200 | 完全放行 |

若把 302 也算作"被拒"，这个验收就**证明不了任何关于分组的事**——
它会把"只是还没输 2FA"误判成"权限不足"。

实测（`bun run verify`，新增 6 项，共 **22/22** 通过）：

| 账号 | A 区 `/account/` | C 区 `/admin/` |
| --- | --- | --- |
| `collaborator` | **200** | **403**（组不匹配） |
| `admin`（在 core 组） | 200 | **302** 进 2FA（组门开着） |

### 新增（门户与网关的**交叉一致性**校验）


这是本轮最有价值的一条断言——**它本可以自动发现上面那个漏洞**：

> 门户"可用列表"里有没有某个件，必须与网关"放不放行"一致。

实测把漏洞临时放回去，它**立刻报错且提示具体**：

```
✗ C 区：协作者被拒（403，非仅仅缺 2FA）  ★ 302 —— 组门是开的！协作者只是缺 2FA，改完 2FA 就能进：权限漏洞
✗ 门户与网关一致：协作者两边都拿不到内部区  门户不显示、网关放行 → ★ 不一致
```

### 修复（我的检查逻辑也不精确——被自己的交叉校验逼出来的）


交叉校验第一次跑就误报不一致。查下来**不是产品的问题，是我的判断写错了**：
协作者页面上**也**会出现"内部区"三个字——但它在**"需要更高权限"**那一节里（解释为什么看不到）。
我对整页 `includes('内部区')`，于是把"被扣留"误判成"可用"。

已加 `availableSection()`，**只取"你可以进入的件"那一节**再判断。
教训与前面几次一致：**判断可见性必须限定在正确的范围内**，否则会出现"看起来在检查、其实在瞎猜"。

### 新增（M1 第 ④ 项：收口 Ghost 后台）


M0 阶段 Ghost 后台（`/ghost/`）直接对外，本轮收进网关。

**两条都踩过、都不能走的错路**：

| 做法 | 后果 |
| --- | --- |
| **整站 `forward_auth`** | Ghost 公开站**在同一个域**上 → 官网也变成"要登录才能看"，**违反 docs/01 §5.3** |
| **一刀切挡 `/ghost/*`** | 把 **Content API**（`/ghost/api/content/`）一起挡了 → **[L5c](docs/00_决策总表.md) 的 Astro 前端取不到内容**，headless 整合直接断掉 |

正确做法：**只挡后台、给 Content API 开例外**。
⚠️ Caddy 的 `handle` 互斥且按顺序匹配，故 Content API 那条**必须排在前面**——已写成断言。

### 修复（一个真实约束：Authelia 的 cookie 必须挂在共享父域）


最初给 Ghost 域单独配会话 cookie，**真实 Authelia 直接报错**：

```
session: domain config #2 (domain 'm0.localhost'):
  option 'authelia_url' does not share a cookie scope with domain 'm0.localhost'
```

Authelia 要求 `authelia_url` 与 cookie 的 domain **共享 cookie 作用域**，
而当时 Ghost 在 `m0.localhost`、鉴权门户在 `auth.app.localhost`——不同源。

**解法：各件放到同一父域的子域下，cookie 挂父域**（本地 `livefab.localhost`，
生产如 `livefab.com`）。于是**一个 cookie 覆盖全部、只需要一个鉴权门户**——
这正是"统一身份"该有的样子。域名结构已在 [README §五·补·五](README.md) 列表说明。

### 新增（顺带补上邮件：Ghost 登录本来会失败）


收口过程中发现 **Ghost 的登录失败**——它要发登录通知邮件而邮件没配：

```
Failed to send email. Please check your site configuration and try again.
```

加了 **Mailpit**（本地邮件捕获器，极小）并把 Ghost 指向它。
之后 Ghost 启用**登录验证码**（6 位邮件验证），Mailpit 能捕获，完整登录链可走通。
这也让 M2 的"邮件送达"提前有了本地环境。

另把 NodeBB 的安装脚本改为**同步 `url`**：它的 `config.json` 里 url 是安装时写死的，
改域名不同步的话会生成指向旧域名的链接（邮件、分享、跳转全错）。

### 变更（验证：`bun run verify` 共 30/30）


| 场景 | 结果 |
| --- | --- |
| `/ghost/` 无会话 | **302** → 鉴权门户 |
| Ghost **公开站** `/` | **200**（未被登录墙挡住） |
| **Content API** | **401**（到了 Ghost 自身，非网关 302） |
| `/ghost/` 无分组注册用户（新增 `viewer` 账号） | **403** 被拒 |
| `/ghost/` 协作者 | **200**（与门户对"官网后台"的标注一致） |
| 过网关后 Ghost 后台应用 | **200**，`ghost-admin` 正常加载 |

### 变更（一处诚实的局限：Ghost 会话链）


自动验收**没有**断言"用 curl 走完 Ghost 自己的会话后能读 `/users/me/`"。
尝试过：session 创建成功、邮件验证码提交返回 200 OK，但后续 Admin API 仍 403。
**这是用 curl 复现浏览器会话链的局限，不是网关冲突**——判据是：

> 带网关会话请求 Ghost 的 Admin API 时，返回的是 **Ghost 自己的 JSON 错误**，
> 而**不是 302 跳鉴权**。后者才说明两层在打架。

所以自动验收测的是**网关的透明性**（可靠且对应验收目标），
完整 Ghost 会话链的关键节点由人工确认。

### 变更（静态校验同步：56 → 63/63，自检 6 → 8/8）


新增断言：`/ghost/*` 有 forward_auth、Content API 开了例外、**例外排在 `/ghost/*` 之前**、
Authelia 有 `/ghost/` 规则且放行 core+collaborator（与门户一致）、
**会话 cookie 挂在共享父域**、**只配一个 cookie**。每一条都配了变异并确认可捕获。

## [0.2.0] - 2026-10-05 20:50

### 新增（M0 骨架：反代 + 前置鉴权 + 门户占位 + Ghost）


用户要求"可以起草 M0 的 compose 骨架"。交付 [`deploy/`](deploy/)：

- [`compose.yml`](deploy/compose.yml)：caddy（唯一对外入口）+ authelia（网关鉴权）+ authelia-db（PG）
  + authelia-init（一次性任务，**自动生成密钥到数据卷**，避免把密钥写进 `.env` 再提交）
  + portal（nginx 占位）+ ghost + ghost-db（MySQL 8）。
  **双网络设计**：`edge`（只有 caddy 连外网）与 `internal`（**标 `internal: true` 防内部件出网**）。
- [`caddy/Caddyfile`](deploy/caddy/Caddyfile)：**鉴权分层就写在这里**——
  公开区**不经过 forward_auth**，`/account/*` 与 `/admin/*` 在网关就被拦住。
- [`authelia/configuration.yml`](deploy/authelia/configuration.template.yml)：默认 `deny`，
  规则按 公开（bypass）/ 个人（one_factor）/ 内部（two_factor + 限定组）三档。
- [`authelia/users.yml`](deploy/authelia/users.yml)：占位用户，**组名直接对应 L4 的分级**
  （`livefab-admin` / `livefab-core` / `livefab-collaborator`）。
- `.env.example`、`.gitignore`、`deploy/portal/index.html`。

### 新增（M0 骨架的结构校验器，带负向自检）


[`tools/validate-compose.ts`](tools/validate-compose.ts)：把三条**错了也不报错**的架构约束
变成可断言的不变量——**M0 的产物是配置，而配置错了通常不报错，只是安静地不生效**：

1. 只有 caddy 发布端口，其余件只在 `internal` 网络且该网络标了 `internal: true`；
2. **鉴权分层**：公开区不得经 `forward_auth`，`/account/*` 与 `/admin/*` 必须被网关拦住，
   且 `/admin/*` 限定 livefab 组 + 要求双因素；
3. 默认 `deny` + 鉴权门户自身 `bypass`（防"要登录才能登录"的死锁）。

**实测 29/29 通过**；并带 `--selftest` **负向自检（3/3 可捕获）**——
故意给 ghost 加 ports、给公开区加 forward_auth、把公开路径的 bypass 改成 two_factor，
检查器都抓到了。理由同《未来档案》：**一个总是通过的检查器比没有检查器更糟**。

> **顺带修掉校验器自己的两个 bug**（都靠真跑一遍才暴露）：
> ① 解析 compose 时按缩进切块，把顶层 `networks:`/`volumes:` 也当成了服务 →
> "内部件都挂 internal"误报；② `authelia-init` 是一次性任务，被误判为"缺 restart 策略"。

### 变更（决策与调研）


**用户决策（2026-10-03）**：
- **L5 → Ghost**（理由：功能全，日后再看情况换 Payload）；
- **L5c（新增）→ 整合 Astro**；
- **L6 → 论坛优先 NodeBB**，要求 **JS/TS 技术栈**，待评估后拍板；
- **L7 → 先用 GitHub**（C 段自托管整体推迟）；
- **L4 / L8 / L9 / L10 / L11 → 按推荐**。
除 L6 外全部已回写 [00 决策总表](docs/00_决策总表.md)（v0.4）。

**L5c 的整合模式**（[04 §1.2·补](docs/04_开源件调研与选型.md)）：
**Ghost headless + Astro 构建期经 Content API 取数**（Astro 官方有
[Ghost 集成指南](https://docs.astro.build/en/guides/cms/ghost/)）。
这样既用 Ghost 的后台与会员能力，又保住 [L2](docs/00_决策总表.md) 的"薄门户 + 自有前端"。

**NodeBB 专项核查**（[research §八](docs/research/01_开源件事实核查.md)）：
- 在"要 JS/TS"约束下，**NodeBB 是本批唯一符合的论坛**（Flarum/Discourse/HumHub/phpBB 都是 PHP/Ruby）；
- v4.16.1（**2026-10-02，核查当日发版**，本批最活跃）；GPL-3.0；Node.js + **MongoDB 默认，也支持 PG/Redis**；
  官方**有 Caddy 反代文档**；v4 起内置 **ActivityPub 联邦**；
- ★ **修正前轮结论**：NodeBB **有厂商维护的通用 OIDC 插件**
  （`nodebb-plugin-fusionauth-oidc` 2.0.0、BSD-2、仓库 2026-07 仍更新）——
  先前"无可靠 SSO 路径"的说法不准确；
- ⚠️ 一个坑：npm 上的 `nodebb` 包是 **2016 年的 1.4.0**，看它会得出"已停更"的**错误结论**。

**⚠️ 一个必须说清的约束（L5 选 Ghost 后暴露）**：
**Ghost 不原生支持 OIDC**（后台邮箱密码、会员走 magic link），详见
[research §九](docs/research/01_开源件事实核查.md)。据此把"支持 OIDC"
**从"所有件都要满足"降级为"内部件尽量满足 + 为不满足者准备网关方案"**——
因为面向外部的产品，登录**是产品功能的一部分**，不是可替换的基础设施。
M0 先让 Ghost 直连（含 `/ghost/`）以跑通整合，**M1 必须收口**（见 [04 §1.4](docs/04_开源件调研与选型.md)）。

### 变更（M0 的验证边界：诚实清单）


**已做**：结构校验 29/29 + 负向自检 3/3。
**未做**：**容器从未真正启动过**——本机无可用 Docker 环境（registry 不可达、容器内无外网）。
因此 Authelia 的 PG 连接与密钥生成、Caddyfile 语法、**Ghost 前置保护是否与其会话冲突**、
各件真实内存占用，**全部未验证**。第一次 `docker compose up` 很可能还要修几处。

### 变更（验证：M0 骨架从「结构断言」推进到「真实工具验证」）


上一轮 M0 只做了自写的结构断言（正则匹配），并诚实标注"容器从未启动过"。
本轮把**凡本机能验的都验了**，拿到了四项真实证据：

| 验证项 | 工具 | 结果 |
| --- | --- | --- |
| **compose 语法与变量解析** | **`docker compose config`（真实 Compose v5.1.2 解析器）** | ✅ exit 0，变量全部正确解析 |
| **`authelia-init` 密钥生成脚本** | **真实 Linux 容器内执行**（离线 `--network=none`） | ✅ 生成 6 个密钥，格式正确 |
| **密钥格式** | 逐文件检查 | ✅ 88 字节 = 64 随机字节的 base64，**无换行**，可解回 64 字节 |
| **脚本幂等性** | **连跑两次** | ✅ 第二次不重新生成 |

**其中"幂等性"是本轮最有价值的发现**：密钥生成脚本若每次启动都重新生成，
会导致**每次重启都把用户登出**（session 密钥变了）——这是很隐蔽的故障，
**读代码看不出来，只能靠真的跑两次**。

另**修正了一处我自己的偷懒**：上一轮的脚本末尾写了 `chown ... || true`，
这会把 chown 的失败**掩盖掉**（正是我一贯反对的"假绿灯"）。
本轮去掉 `|| true` 单独验证：`chown EXIT=0`，且容器内确为 `uid=0(root)`，故该行安全。

**仍未验证（本机环境不允许，非代码问题）**：
**Docker registry 不可达**（`registry-1.docker.io` 连接超时）→ **拉不到任何镜像**，
故容器一起启动、Authelia 加载配置、**Caddyfile 语法**、Ghost 前置保护与会话的冲突、
真实内存占用，**全部未验证**。另试过 npm 分发的 `caddy`/`authelia` 包，
**沙箱禁止写临时目录（EPERM）**。
→ 结论：**目前 Caddyfile 只有结构断言、没有语法验证**，这是 M0 最明确的残留风险。

### 变更（验证：**M0 真正跑通** —— 8 个容器启动、鉴权分层实测生效）


上一轮 M0 只有静态断言 + "容器从未启动过"。本轮网络代理可用后**真的把整套跑起来了**，
结果**真启动立刻抓出 8 个静态检查完全发现不了的问题**（全部已修）：

| # | 问题 | 后果 |
| --- | --- | --- |
| 1 | **compose 相对路径基准搞错**：`./deploy/authelia/…` 相对的是 **compose 文件所在目录**，变成 `deploy/deploy/…` | 容器起不来 |
| 2 | 文件**不能挂进 `:ro` 卷挂载点内部** | `read-only file system` |
| 3 | **Authelia 的 `{{ env }}` 不能用于 domain/URL 字段** | 整个 access_control 规则失效 |
| 4 | **`{{ secret }}` 在文件缺失时静默返回空值**，`config validate` 仍报成功 | 运行时才 `password authentication failed` |
| 5 | 同一密钥不能有两处来源（配置 `{{ secret }}` + `*_FILE`） | fatal: `already defined in other configuration sources` |
| 6 | `AUTHELIA_NOTIFIER_SMTP_PASSWORD_FILE` 会让它以为配了 SMTP | 与 filesystem notifier 冲突 |
| 7 | **NodeBB 镜像不在 Docker Hub**（`nodebb/docker` 废弃在 2023-07 的 v1.19） | 拉到三年前的版本 |
| 8 | **NodeBB 只认 `NODEBB_*` 前缀**；覆盖 entrypoint 必须自设 `CONFIG_DIR` | 一直停在 web 安装器，不报错 |

另两项：Caddy 用假域名时 ACME 必然失败 → 加 `LIVEFAB_LOCAL_CERTS` 开关（内网 CA）；
NodeBB 在反代后必须开 `trust_proxy`，否则**用户 IP 记成反代容器 IP**（NodeBB 自己在日志里警告）。

**运行时验收**（新增 [`tools/verify-stack.ts`](tools/verify-stack.ts)，真发 HTTPS 请求）→ **7/7 通过**：
公开区 `GET /` → **200（未被登录墙挡住）**；`/account/` 与 `/admin/` → **302 跳转鉴权门户**；
鉴权门户自身 200（无"要登录才能登录"死锁）；Ghost 200；**NodeBB 200、47271 字节真实论坛页**。

**静态校验**：`validate-compose.ts` **41/41**（新增 4 条"真启动才学到"的断言）；
并用**真实工具**验证：`docker compose config`(exit 0)、`caddy validate`(**Valid configuration**)、
`authelia config validate`(**successfully without errors**)。

### 修复（**我自己的检查器**的一个 bug——被它的负向自检抓出来）


`verify-stack.ts` 的负向自检最初写成"用真实请求模拟破坏"，但那两个探针
**并没有真的破坏任何东西**（`/account/` 本来就是受保护路径，断言自然通过）→
自检误报 **1/2 漏检**。已改为**给断言喂已知坏输入**、直接验证断言逻辑 → 现 **4/4 可捕获**。

> 这条本身值得记：**负向自检如果设计错了，会给出虚假的信心**。
> 原来那个写法看起来在自检，实际什么也没测。

### 变更（决策）


**L6 裁决：选 NodeBB**（用户："先选 NodeBB，以后看情况可换"）。
另澄清 **JS/TS 只是偏好、不绝对** → 基础设施（Caddy/Authelia）用 Go 不构成问题，
L3 的 Authelia 选型无需调整。**至此 L1–L11 全部已裁决**（[00 决策总表](docs/00_决策总表.md) v0.5）。

[research §十](docs/research/01_开源件事实核查.md) 记录了 NodeBB 的两个分发陷阱：
Docker Hub 镜像废弃（正确在 ghcr.io）、npm 包停在 2016——**渠道与直觉不一致**。

### 修复（本地访问：`.test` 域名在浏览器打不开）


用户反馈"访问不了 https://app.m0.livefab.test/"。**根因找到了，而且不是我原先以为的"没配 /etc/hosts"**：

> 本机开了**网络代理**，代理把这个域名解析成 **fake-IP（`198.18.0.x` 段）**，
> 而不是 `127.0.0.1` → 请求被送去代理，永远到不了本地 Caddy。
> （`curl` 之所以能通，是因为我用 `--resolve` 强制指到了 127.0.0.1 —— **那只是绕过问题，不是解决它**。）

**修法**：本地默认域名改用 **`*.localhost`**。它由操作系统/浏览器直接解析到 `127.0.0.1`（RFC 6761），
**不经过 DNS，因此不受代理影响**。实测对照：

```
getent hosts app.m0.livefab.test  →  198.18.0.32     ← 代理 fake-IP
curl http://app.m0.livefab.test/  →  000（连不上）
curl http://app.localhost/        →  308（连上了 Caddy）
```

改后实测：`app.localhost` / `auth.app.localhost` / `m0.localhost` / `forum.localhost`
**四个地址全部 200**，运行时验收 **7/7** 仍通过。

同时：导出了 Caddy 本地根证书到 `deploy/caddy/ca/root.crt`，并在 README 给出装进系统信任的命令
（不想装就点"继续访问"，本地开发够用）。README 新增 **§五·补 本地怎么访问**，
`.env.example` 补上说明与 localhost 默认值。

### 新增（数据库统一方案：含实测内存与三个件的硬约束）


用户提问"数据库是如何搞的，能否统一，给我建议让我选"。新增
[`docs/05_数据存储统一方案.md`](docs/05_数据存储统一方案.md) 与决策点 **L12**。

**现状**：三个数据库容器、两个引擎 —— `authelia-db`(PG 16, 26 MiB)、
`nodebb-db`(PG 16, 27 MiB)、`ghost-db`(MySQL 8.4, **469 MiB**)。全套空载约 971 MiB，
**MySQL 一家占 48%**。（数字来自 `docker stats` 实测，非官方估算。）

**关键结论：无法全部统一到一个引擎**，因为三个件的数据库支持是硬约束且**互斥**：

| 件 | 支持 | 依据（已核实） |
| --- | --- | --- |
| **Ghost** | MySQL 8 / SQLite，**不支持 PostgreSQL** | 官方变更记录 *"Dropping Support for PostgreSQL"*；镜像内只有 `mysql2`+`sqlite3` |
| **NodeBB** | MongoDB / PostgreSQL / Redis，**不支持 MySQL** | 镜像内 `src/database/` 只有 mongo/postgres/redis |
| **Authelia** | PG / MySQL / MariaDB / SQLite 都可 | 用真实 v4.39.28 校验 `storage.mysql` 配置通过 |

→ **Ghost 与 NodeBB 的数据库集合没有交集**，只有 Authelia 能两边走。

**给出五个方案与收益**（A 合并两个 PG，省约 26 MiB；B Ghost 改 SQLite，**省约 469 MiB** 但有取舍；
C 保持现状；D 全放 MySQL **不可行**；E 调小 MySQL 内存，需实测）。
**我的建议是 A + E**：A 稳、E 可逆，而 B 会改变 Ghost 存储形态并牵动备份策略，
应等确需省那 469 MiB 时再决定。**等用户裁决**。

### 变更（L12 裁决 A+E 并实施：数据库统一 + MySQL 内存调优）


用户裁决 **A + E**，已实施并实测。详见 [`docs/05_数据存储统一方案.md`](docs/05_数据存储统一方案.md)。

**A：两个 PostgreSQL 合并为一个实例**（一个 `db` 容器，`authelia` 与 `nodebb` 两个独立库/用户）。
第二个库必须自己写脚本建——官方镜像的 `POSTGRES_DB` 只能建一个库
（新增 [`deploy/postgres/init/01-create-nodebb.sh`](deploy/postgres/init/01-create-nodebb.sh)）。

> ⚠️ **修正我原先的估计**：我在方案里说 A "省约 26 MiB"，**实测只有约 15 MiB**
> （两实例 53 MiB → 合并后 38 MiB）。原因是**一个 PG 服务两个库并不会省下整个实例的开销**，
> 省下的只是重复的基线内存。**所以 A 的真实价值是"少一个容器要备份/升级/监控"，不是省内存。**

**E：MySQL 内存调优（这才是省得动的地方）**。依据实测基线定位可压项——
`innodb_log_buffer_size` 竟高达 **64 MiB**（官方默认 16 MiB），且 `performance_schema` 开着：

| 参数 | 前 | 后 |
| --- | --- | --- |
| `performance_schema` | ON | **OFF** |
| `innodb_log_buffer_size` | 64M | **16M** |
| `max_connections` | 151 | **50** |
| `table_open_cache` | 4000 | **400** |
| `innodb_buffer_pool_size` | 128M | **128M（刻意不动）** |

**实测（连采 5 次取范围）**：MySQL **469–478 MiB → 171–190 MiB，省约 290–300 MiB**。
这是干净的同类对比（同容器同负载）。**全套合计**约 971 → 约 705 MiB，
但要说清：这不是纯收益——期间 Ghost 与 Authelia 自己也涨了（栈跑久了状态更多），
所以**只有 MySQL 那一行是可靠结论**。

⚠️ 特别说明：**刻意不动 `innodb_buffer_pool_size`**——它是真实性能关键，
压它会让查询变慢，**不属于"白省的内存"**。这条也写成了断言，防止将来被误压。

**验证**：`verify-stack` **7/7**（Ghost 用**读库**页面 `/rss/`、`/sitemap.xml` 验证）、
`validate-compose` **41→47/47**（新增 5 条 L12 不变量）。

### 变更（发现：隔离网络的一个真实取舍 —— Ghost 更新检查失败）


调优后查看 Ghost 日志发现 `ERROR queryAaaa ESERVFAIL updates.ghost.org`。**实测确认根因**：

```
ghost 容器（只在 internal 网络）  → 解析失败：EAI_AGAIN
caddy 容器（有 edge 网络）        → 解析成功
```

即 **`internal: true` 网络阻断了出网——这正是我们为隔离刻意设计的**，
Ghost 的"检查更新"因此失败并记一条错误。**这是取舍不是 bug**：

| 选择 | 得到 | 失去 |
| --- | --- | --- |
| **保持隔离**（当前，建议） | 内部件无法出网 → 攻击面更小、不会意外外泄数据 | 收不到更新提示（日志有噪音） |
| 给 Ghost 单独放行出网 | 能收到更新提示 | 削弱隔离，且"只给一个件开口"日后易失控 |

站点功能完全正常（所有页面 200）。**未找到官方"关闭更新检查"的开关**——
检索到的资料多关于该检查的隐私/数据收集，而非如何禁用；故记为"未找到，非不存在"。

### 修复（**我的校验器自己的第二个 bug**——又是被它的负向自检抓出来的）


给 L12 新增断言后，负向自检报"漏检 1 条"。查下来**不是断言写错，而是自检的"分发逻辑"写错**：
它用 `label.includes('buffer pool')` 决定该测哪份配置，而标签里写的是
`innodb_buffer_pool_size`（**下划线**）→ 分发到错误的检查器 → 误报漏检。

已改为**每条变异显式声明 target**（`'compose' | 'caddy' | 'authelia'`），不再靠标签字符串猜。
现 **5/5 可捕获**。

> 这是本项目**第二次**由负向自检抓出"检查器自身"的缺陷
> （第一次是 `verify-stack.ts` 那个"用真实请求假装破坏、其实什么也没破坏"的自检）。
> **两次都说明：负向自检的价值恰恰在于它会拷问检查器本身。**

## [0.1.0] - 2026-10-03 19:43

### 新增（立项方案文档 —— 阶段 P0，尚无实现代码）


**背景**：工作室已同时跑着多个项目（主线游戏、官网、独立插件、实验项目），但**没有公共底座**——
对外展示只有《未来档案》一个门面、用户沟通主要靠 GitHub Discussions、
研发管理全在 GitHub、**分级信息根本无处安放**。LiveFab 要解决的就是"这些事该有一个共同底座"。

本阶段**只产出方案文档，不写实现代码**，以便先决策（用户要求"给一些方案，写成文档，然后让我决策"）。

- 新增项目 [`projects/livefab/`](README.md)，含项目 README 与 `docs/` 五篇方案文档；
- [00 决策总表](docs/00_决策总表.md)：**L1–L11 十一项待裁决**，每项给出推荐项、依据、影响面与状态，
  并画出**依赖关系**（L2 是总开关；L3 必须先于 L5/L6/L7），以及**本方案刻意不回答的**（域名采购、财务系统等）；
- [01 定位与角色](docs/01_定位与角色.md)：一句话定位（前店后厂的四段：店 / 柜台 / 厂 / 档案室）、
  **明确不是什么**（不是官网替代、不是游戏的一部分、不是一个自研大平台）、L1 落点建议
  （`projects/livefab/` 起步、何时该迁 `indie/`）、与既有资产的"**复用纪律不复用内容**"原则、
  以及**四个影响范围的待澄清问题**；
- [02 整体架构方案](docs/02_整体架构方案.md)：**L2 三个候选的完整对比**——
  一站式平台（不推荐：无全能件 + 高锁定）、**门户 + 联邦式套件（推荐）**、最小起步
  （论证它是排期策略而非架构）；**L3 为什么身份必须最先立**（先接工具后做统一身份的代价推演）
  并给出**反向条件**（长期单人使用则 IdP 是过度设计）；四类横切件定位；L8 部署与资源预算
  （含诚实说明：上表是量级而非实测，具体值需选定后实测）；
  以及给所有件的**五条横向约束**（OIDC / 许可证 / 可导出 / 中文 / 活跃度）；
- [03 分阶段落地路线](docs/03_分阶段落地路线.md)：**排期第一原则——让"整合"本身先跑通**
  （风险不在选错件，而在四段装上了却各自为政）；M0–M4 范围与可演示验收；
  M1 刻意**不碰 C 段研发管理**并写明理由与 **M3 的启动门槛**；
  **每个里程碑的"可暂停"设计**（沿用主线已验证的做法，停在任一点都不留半成品债务，
  并点明"迁到一半"是这类项目最典型的债务）；
- [04 开源件调研与选型](docs/04_开源件调研与选型.md)：**七条评价标准**（其中 OIDC 支持与许可证为**否决项**）、
  四段各自的能力范围与**已知强约束**、**分级权限三层模型**（IdP 组 / 应用内角色 / 内容密级，
  并论证"三层缺一会出漏洞"）、以及**形态层面的推荐组合六条**。

### 变更（L1–L3 裁决 + 逐件选型数据补齐）


**用户决策（2026-10-03）**：L1、L2、L3 **均按推荐项裁决**，并答复四个待澄清问题。
决策已回写 [00 决策总表](docs/00_决策总表.md)（v0.2）与 [01 §五](docs/01_定位与角色.md)：

- **L1** → 放 `projects/livefab/`（受工作区根规则约束）；
- **L2** → **门户 + 联邦式套件**；
- **L3** → **先立 IdP**。**关键**：用户明确「会包括外部协作者，甚至部分用户」，
  使 [02 §三](docs/02_整体架构方案.md) 给 L3 加的反向条件（长期单人使用则过度设计）**不成立** ——
  故 L3 有依据，不是过度设计；
- **澄清**：光谱**不含**财务/合同/人事（范围不变）；**门户会有部分用户登录看部分东西** ——
  由此推出**一条新增设计要求**：**反代的前置鉴权必须分层**（公开区不得被登录墙挡住、
  内部区必须在网关拦住），落到选型即 Authelia 规则须按路径/host 分域。

**逐件选型数据补齐**（用户要求"逐件数据你下轮自己补"）：

- 新增 [`docs/research/01_开源件事实核查.md`](docs/research/01_开源件事实核查.md)：
  **18 个类别、123 条工具条目**的逐件事实（版本 / 许可证 / 自托管 / 资源 / 中文 / **OIDC** / 活跃度），
  外加**未核实清单**（明确标注哪些数据没查到、不得据此决策）与方法可信度说明。
  核查方式：并行探针（每类一个、只回结构化事实），运行上限受控。
- [`docs/04 选型`](docs/04_开源件调研与选型.md) 由 v0.1 升到 **v0.2**，填入数据与推荐组合。

**本次核查改变了两处关键判断**（这是补数据最大的价值）：

1. **A 段首选由 Directus 改为 Payload CMS**。Directus 12 起
   ① 整体改为 **MSCL-1.0-GPL**（源码可见、禁止竞品商业化、四年后转 GPL-3.0）；
   ② **SSO 移出免费档**并加许可证强制校验。对要做商业交付的底座，这是**法律约束**而非功能阉割。
2. **IdP 首选定为 Authelia** 而非 Keycloak：Authelia 是候选里唯一"**已获 OpenID 官方认证** +
   单二进制轻量"的，且与 Traefik/Caddy 的前置鉴权有官方集成；Keycloak 协议最全但 JVM 栈最重。

**另写死了三条"现在不做"**（避免过度设计）：

- **授权引擎（OpenFGA）现在不上**——五级权限用"组 + 角色"够用，触发条件是出现"项目 × 密级 × 时间"三维规则；
- **IM 很可能不该自建**——贴近用户意味着去用户在的地方，而不是把用户拉进你的系统；
- **电商整段推迟**——最重、坑最多，且展示+沟通阶段没有它也能运转。

**同时明确列出**：M1 候选清单（Caddy + Authelia / Payload / Discourse 或 HumHub / Restic / Uptime Kuma）、
各推迟项及其**触发条件**、以及**三类数据缺失**（反馈投票 / 状态页 / 邮件送达）不得据此决策。

> **阶段说明**
>
> - 本阶段**未创建任何实现代码**（无 compose、无配置），符合"先写方案让我决策"的要求；
> - **逐件的版本号、许可证、资源占用等事实数据仍在核实中**——
>   [04](docs/04_开源件调研与选型.md) 已明确标注数据待补，并说明**不凭记忆填写**的理由
>   （版本/许可证写错比留空更危险，会把决策带偏）；
> - 已知未处理：`indie/live-calculator/` 有 2 处既有链接失效（独立仓库、其 `.github/` 被根 `.gitignore` 忽略），
>   不属本项目范围。
