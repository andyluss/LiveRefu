# LiveFab · 前店后厂的在线工作室底座

> 卡面：用途＝项目入口 ｜ 依赖：无（它是工作区的公共底座） ｜ 状态：**M0 已真正跑通（全套 8 个容器启动，鉴权分层实测生效）** · 2026-10-03
> 一句话：把工作室**对外的一面**（运营展示、用户沟通）与**对内的一面**（研发管理、分级信息）
> 用一套账号、一个入口串起来，做成"前店后厂"的运转底座。

> 🔀 **已分叉到独立对话开发（2026-10-03）**。本目录保留为**方案与决策的存档**；
> 后续实现不在本会话进行。接手前请先读 [00 决策总表](docs/00_决策总表.md)（L1–L11 待裁决）
> 与 [04 选型文档](docs/04_开源件调研与选型.md)（**逐件事实数据仍待补**——见该文档开头的数据状态说明）。
> 本目录当前**不受后续会话改动影响**，可安全作为基线。

> **当前状态：L1–L11 决策全部已定；M0 已真正跑通**（反代 + 前置鉴权 + 门户占位 + Ghost + NodeBB，共 8 个容器）。
> 两个验收命令：`bun run tools/validate-compose.ts`（静态结构，41 项）与
> `bun run tools/verify-stack.ts`（**运行时行为**，7 项，**须先 `docker compose up`**）。

| 我要…… | 去哪 |
| --- | --- |
| **拍板决策** | [00 决策总表](docs/00_决策总表.md)（L1–L11，含推荐项与依据） |
| 知道 LiveFab 是什么、不是什么 | [01 定位与角色](docs/01_定位与角色.md) |
| 看整体怎么拼、为什么这么拼 | [02 整体架构方案](docs/02_整体架构方案.md) |
| 知道先做什么 | [03 分阶段落地路线](docs/03_分阶段落地路线.md) |
| 看每段具体选哪些开源件 | [04 开源件调研与选型](docs/04_开源件调研与选型.md) |
| 查某个件的版本/许可证/资源占用 | [事实核查](docs/research/01_开源件事实核查.md)（18 类别 + NodeBB/Ghost 专项，含**未核实清单**） |
| 起 M0 骨架 | `cp .env.example .env` → `docker compose -f deploy/compose.yml up -d` |
| 校验 M0 骨架结构 | `bun run tools/validate-compose.ts`（41 项，含 `--selftest`） |
| 校验 M0 运行时行为 | `bun run tools/verify-stack.ts`（7 项，**需 stack 已启动**，含 `--selftest`） |
| **备份** | `bun run backup`（3 个库 + 5 个卷 + 校验和清单） |
| **恢复演练** | `bun run verify:backup`（**真的导进临时库逐表比对**，含 `--selftest`） |

## 一、为什么需要它

工作室现在同时跑着**多个项目**（主线游戏、官网、独立插件、实验项目），
但它们各自用各自的工具：

| 面 | 现状 | 问题 |
| --- | --- | --- |
| 对外展示 | [《未来档案》](../website/README.md) 已有站点；其它项目**没有门面** | 用户不知道你在做什么、做完了什么 |
| 用户沟通 | 主要靠 GitHub Discussions（Giscus） | 账号门槛高、外观受限、**境内可达性存疑** |
| 研发管理 | 全部在 GitHub | 权限粒度有限；将来拉外部协作者时会撞墙 |
| 分级信息 | **不存在** | 内部设计稿、路线图、财务数据**没有地方放**，更没有分级 |

LiveFab 要解决的是**"这些事应该有一个共同的底座"**这个问题。

## 二、本方案的三个核心判断

1. **架构是「门户 + 联邦式套件」，不是"找一个全能件"**
   —— 因为没有开原件能同时做好电商、论坛、工单和 CI（[02 §二](docs/02_整体架构方案.md)）。
2. **身份（IdP）必须最先立**
   —— 先接工具后做统一身份，代价是逐个改数据；先立身份，后续每接一个件只是"改配置"（[02 §三](docs/02_整体架构方案.md)）。
   **反向条件**：若长期只有你一个人用，IdP 是过度设计。
3. **先全集成、零自研；自研只做"门户层"**
   —— 它是唯一没有合适开源件的东西（[L11](docs/00_决策总表.md)）。

## 二·补、已裁决的三条（2026-10-03）

| # | 决策 | 结论 |
| --- | --- | --- |
| **L1** | 放在哪 | `projects/livefab/` 单目录起步（受工作区根规则约束） |
| **L2** | 架构形态 | **门户 + 联邦式套件**——自研薄门户 + 成熟开源件，用 OIDC 统一身份串起来 |
| **L3** | 是否先立身份 | **先立**。因用户明确"会拉外部协作者、且门户会有部分用户登录"，[02 §三](docs/02_整体架构方案.md) 给 L3 加的反向条件（长期单人使用）**不成立** |

> **一条新增的设计要求**（来自"部分用户可登录"）：**反代的前置鉴权必须分层**——
> 公开区（官网、博客、公开路线图）**不得**被登录墙挡住，而内部区必须在网关就被拦住。
> 落到选型上：Authelia 的规则要按**路径/host 分域**，不能全站一条规则。

## 三、排期的第一原则

**让"整合"本身先跑通，而不是先追求覆盖率。**

风险不在某个件选错（选错了换掉就是），而在**四段工具都装上了、却各自为政**——
那样得到的是一堆比没有更麻烦的网站。所以 M1 就跨段取件（门户 + IdP + 一个前台件 + 一个沟通件），
结束时它们必须**真的是一个东西**（[03 §一](docs/03_分阶段落地路线.md)）。

## 四、目录结构（规划）

```
projects/livefab/
├── README.md            # 本文件
├── CHANGELOG.md         # 项目日志
└── docs/                # 方案文档（当前阶段全部产出）
    ├── 00_决策总表.md          # ★ L1–L11 待你拍板
    ├── 01_定位与角色.md
    ├── 02_整体架构方案.md
    ├── 03_分阶段落地路线.md
    ├── 04_开源件调研与选型.md   # ★ 逐段对比表与推荐组合
    └── research/
        └── 01_开源件事实核查.md  # ★ 逐件事实（版本/许可证/资源/OIDC）+ 未核实清单
├── .env.example         # 环境变量模板（密钥不入库）
├── deploy/              # ★ M0 骨架
│   ├── compose.yml            # 反代 + Authelia + 门户占位 + Ghost
│   ├── caddy/Caddyfile        # 唯一对外入口；**鉴权分层**写在这里
│   ├── authelia/              # 网关鉴权；规则按 公开/个人/内部 三档
│   └── portal/                # M0 占位页（M1 换 Astro）
├── portal/              # ★ 门户：唯一自研件（Astro SSR，Dockerfile 内构建）
├── backups/             # 备份产物（**不入库**，见 .gitignore）
└── tools/
    ├── validate-compose.ts    # ★ 静态结构校验（47 项 + 负向自检）
    ├── verify-stack.ts        # ★ 运行时行为校验（7 项 + 负向自检）
    ├── backup.ts              # ★ 统一备份（3 库 + 5 卷 + manifest）
    └── verify-backup.ts       # ★ 恢复演练（临时环境 + 逐表比对 + 负向自检）
```

> **落点说明**：现放 `projects/`（受工作区根规则约束）。
> 若你要的是"完全独立、不受工作区规则约束"，应改放 [`../../indie/`](../../indie/README.md)——
> 见 [01 §三](docs/01_定位与角色.md) 的 L1。

## 五、M0 的验证结果（**已真正跑通**）

### 5.1 ✅ 运行时实测：鉴权分层生效

`bun run tools/verify-stack.ts` → **7/7 通过**（真发 HTTPS 请求）：

| 验证项 | 结果 |
| --- | --- |
| **公开区不被登录墙挡住** | ✅ `GET /` → 200 |
| `/account/` 被网关拦住 | ✅ 302 → `auth.app…`（带 `rd=` 参数） |
| `/admin/` 被网关拦住 | ✅ 302 → `auth.app…` |
| 鉴权门户自身可达 | ✅ 200（无"要登录才能登录"死锁） |
| Ghost 前台可达 | ✅ 200 |
| **NodeBB 已过安装器** | ✅ 200，47271 字节真实论坛页 |

**容器状态**：8 个服务全部 Up（authelia / authelia-db / caddy / ghost / ghost-db / nodebb / nodebb-db / portal）。

### 5.2 ✅ 静态校验

`bun run tools/validate-compose.ts` → **41/41**；`--selftest` **3/3 可捕获**。
`bun run tools/verify-stack.ts --selftest` → **4/4 可捕获**。

另外用**真实工具**验证过：`docker compose config`（exit 0）、
`caddy validate`（**Valid configuration**）、`authelia config validate`（**successfully without errors**）。

### 5.3 ⚠️ 真启动才发现的 8 个问题（全部已修）

这一节是 M0 最有价值的部分——**这 8 个问题没有一个能被静态检查发现**：

| # | 问题 | 后果 | 修法 |
| --- | --- | --- | --- |
| 1 | **compose 相对路径基准搞错**：写成 `./deploy/authelia/…`，但相对路径以 **compose 文件所在目录**为基准 → 变成 `deploy/deploy/…` | 容器起不来 | 改为 `./authelia/…` |
| 2 | **不能把文件挂进 `:ro` 卷挂载点内部** | `read-only file system` | users.yml 改挂 `/users/` |
| 3 | **Authelia 的 `{{ env }}` 不能用于 domain/URL 字段** | 整个 access_control 规则失效 | 加 `authelia-prep` 渲染步骤（sed 占位符） |
| 4 | **`{{ secret }}` 在文件缺失时静默返回空值**，`config validate` 仍报成功 | 数据库密码变空 → 运行时才 `password authentication failed` | 改用官方 `AUTHELIA_*_FILE` 环境变量 |
| 5 | **同一密钥不能有两处来源**（配置 `{{ secret }}` + `*_FILE`） | fatal: `already defined in other configuration sources` | 密钥**唯一来源**＝环境变量 |
| 6 | **`AUTHELIA_NOTIFIER_SMTP_PASSWORD_FILE` 会让它以为配了 SMTP** | 与 filesystem notifier 冲突 | 不设该变量 |
| 7 | **NodeBB 镜像不在 Docker Hub**：`nodebb/docker` 废弃在 2023-07 的 v1.19 | 拉到三年前的版本 | 用 `ghcr.io/nodebb/nodebb:4.16` |
| 8 | **NodeBB 只认 `NODEBB_*` 前缀**；且**覆盖 entrypoint 必须自设 `CONFIG_DIR`** | 一直停在 web 安装器（不报错） | 改用 `NODEBB_*` + 显式 `CONFIG_DIR` |

另外两个小项：Caddy 用假域名时 ACME 必然失败 → 加 `LIVEFAB_LOCAL_CERTS` 开关；
NodeBB 在反代后必须开 `trust_proxy`，否则**用户 IP 记成反代容器 IP**（NodeBB 自己在日志里警告了）。

> **还有一个是"我的检查器自己的 bug"**：`verify-stack.ts` 的负向自检最初写的是
> "用真实请求模拟破坏"，但那两个探针**并没有真的破坏任何东西**
> （`/account/` 本来就是受保护路径，断言自然通过）→ 自检误报 1/2 漏检。
> 已改为**给断言喂已知坏输入**，直接验证断言逻辑（现 4/4 可捕获）。

### 5.4 ❌ 仍未验证

| 未验证项 | 为什么 |
| --- | --- |
| **真实登录流程**（含 TOTP 双因素、组权限区分） | 需人工在浏览器操作；自动化只能证明"被正确拦住" |
| 各件**真实内存占用** | 尚未逐容器测量（下一步该做） |
| **Ghost 前置保护是否与其会话冲突** | M1 的验收项（见 [04 §1.4](docs/04_开源件调研与选型.md)） |
| 生产域名下的 ACME 证书 | 本地用了内网 CA；真实域名未测 |
| 备份/恢复 | M1 范围 |

## 五·补、本地怎么访问（**踩过的坑**）

### 5.5.1 为什么 `.test` 域名在浏览器里打不开

M0 最初用的域名是 `app.m0.livefab.test`。**curl 能通、浏览器打不开**——原因是：

> 本机开了**网络代理**，代理把这些域名解析成了 **fake-IP（`198.18.0.x` 段）**，
> 而不是 `127.0.0.1`。于是请求被送去代理，永远到不了本地 Caddy。
> （`curl` 之所以能通，是因为我用 `--resolve` 强制指到了 127.0.0.1——**这只是绕过了问题，没解决它**。）

实测对照：

```
getent hosts app.m0.livefab.test  →  198.18.0.32      ← 代理 fake-IP，连不上
curl http://app.m0.livefab.test/  →  000（连不上）
curl http://app.localhost/        →  308（连上了 Caddy）← *.localhost 不经过 DNS
```

### 5.5.2 解法：用 `*.localhost` 域名

**`*.localhost` 由操作系统/浏览器直接解析到 `127.0.0.1`**（RFC 6761），
**不经过 DNS，所以不受代理影响**。已把本地默认域名改为：

| 用途 | 地址 |
| --- | --- |
| 门户 | **https://app.localhost** |
| 鉴权门户 | **https://auth.app.localhost** |
| 前台（Ghost） | **https://m0.localhost** |
| 论坛（NodeBB） | **https://forum.localhost** |

生产环境把 `.env` 里的三个 `*_DOMAIN` 换成真实域名即可（并把 `LIVEFAB_LOCAL_CERTS` 留空）。

### 5.5.3 证书警告怎么办

本地证书由 **Caddy 的本地 CA** 签发，浏览器默认不信任，会显示"不安全"。
两个选择：

**① 直接点"继续访问"**（最省事；本地开发够用）。

**② 把 Caddy 根证书装进系统信任**（一次操作，之后不再警告）：

```bash
# ① 先从 Caddy 容器里导出根证书（该文件不入库——它机器特定、卷重建后会变）
mkdir -p deploy/caddy/ca
docker cp livefab-caddy-1:/data/caddy/pki/authorities/local/root.crt deploy/caddy/ca/root.crt

# ② 装进系统信任
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  deploy/caddy/ca/root.crt
```

> 该证书是 **Caddy Local Authority**，**只对你的本机有效**（私钥在 Caddy 数据卷里）。
> 若换机器或清空 `caddy_data` 卷，需要重新导出并信任。

### 5.5.4 `.env` 里的域名是可换的

| 变量 | 本地开发 | 生产 |
| --- | --- | --- |
| `LIVEFAB_PORTAL_DOMAIN` | `app.localhost` | 真实域名 |
| `LIVEFAB_DOMAIN` | `m0.localhost` | 真实域名 |
| `LIVEFAB_FORUM_DOMAIN` | `forum.localhost` | 真实域名 |
| `LIVEFAB_LOCAL_CERTS` | `local_certs` | **留空**（走 ACME） |

改完域名后需 `docker compose ... up -d --force-recreate`（域名在启动时渲染进 Authelia 配置，
不会自动热更新——见 [§5.3](#53--真启动才发现的-8-个问题全部已修) 第 3 条）。

## 五·补·二、备份与恢复演练（M1）

### 为什么"配了 cron"不算数

[docs/03](docs/03_分阶段落地路线.md) 对 M1 的验收原文是：
**"真的恢复出一个件的数据（不是只配 cron）"**。

理由与本项目一贯的纪律一致：**未经验证的备份等于没有备份**。
一个每天生成、看起来正常的备份文件，完全可能是**空的、损坏的、或少了一整个库的**——
而这些只有**真的导进一个干净环境并比对数据**才能发现。

### LiveFab 的数据散在 8 个地方，漏一个就出事

| 来源 | 内容 | 忘了它会怎样 |
| --- | --- | --- |
| PostgreSQL `authelia` | 会话 / 双因素状态 | 全员被登出、2FA 要重配 |
| PostgreSQL `nodebb` | 论坛帖子 | 论坛内容丢失 |
| MySQL `ghost` | 站点内容与会员 | 内容全丢 |
| 卷 `authelia_secretview` | **密钥** | ⚠️ 恢复后**加密字段解不开**（最隐蔽、最致命） |
| 卷 `caddy_data` | TLS 证书 + 本地 CA（含私钥） | 证书要重签 |
| 卷 `ghost_content` | 上传的图片 / 主题 | 图片全丢 |
| 卷 `nodebb_data` / `nodebb_config` | 上传附件 / 论坛配置 | 附件与配置丢失 |

`bun run backup` 把它们收进一个**自描述**的备份集：每件一个文件 + `manifest.json`
（大小、sha256、每张表的行数）。

### 恢复演练：真的导进去逐表比对

`bun run verify:backup` → **36/36 通过**，做的是：

1. 跑一次全新备份；
2. 校验 manifest 里 8 个产物的 sha256（先确认**没被改动**）；
3. 起**临时**的 PostgreSQL / MySQL 容器（与线上完全隔离，绝不碰线上数据）；
4. 把 dump 导进去，逐表用**精确 `COUNT(*)`**（不用估算值）与线上比对；
5. 把卷的 `tar.gz` **真的解出来**，比对文件清单与关键内容；
6. 篡改一份备份，确认完整性校验会拦。

实测比对结果：

```
authelia  25 张表 / 34 行     全部一致
nodebb    10 张表 / 1179 行   全部一致
ghost     75 张表 / 1056 行   全部一致
```

### ⚠️ 这个演练第一次跑就抓到两个真问题（其中一个是我自己的假通过）

| # | 问题 | 后果 |
| --- | --- | --- |
| 1 | **`mysqldump` 少了 `--databases`**，dump 里没有 `CREATE DATABASE`/`USE` | 导进干净实例报 `No database selected`，**MySQL 根本恢复不了** |
| 2 | **我的检查器在有 0 张表时"通过"了** | `0 === 0` 被判为"表数量一致" → **假通过** |

第 2 条尤其值得记：根因是 MySQL 的逐表 `COUNT` **漏了 `-D <db>` 参数**，
75 张表全部查询失败返回 0 张，而"线上 0 张 == 恢复后 0 张"让断言通过了。
**这正是"一个总是通过的检查器比没有检查器更糟"的实例。**

修法：① `mysqldump` 加 `--databases`；② `COUNT` 带 `-D`；
③ **加"表数非 0"哨兵断言**——0 张表意味着"查询坏了"或"库是空的"，**绝不能与"一致"混为一谈**。

**并做了负向验证**：把 `-D` 参数去掉、重新引入那个 bug，演练**立刻失败**：

```
✗ ghost：线上表数非 0（哨兵）  ★ 0 张表：查询失败或库为空，不能据此判定一致
```

**演练会失败，所以它可信。**

## 五·补·三、门户（M1：显示已登录身份 + 可进入的件列表）

门户是 [L11](docs/00_决策总表.md) 说的**唯一自研件**——因为它是唯一"没有合适开源件"的东西。

### 为什么它必须是 SSR（不能是静态页）

门户要显示**已登录身份**，而身份来自 Caddy 的 `forward_auth` 注入的**请求头**
（`Remote-User` / `Remote-Groups` / …）。**请求头只有服务端渲染才读得到**，
静态页面拿不到。所以它是真 Astro SSR 应用（`output: 'server'` + `@astrojs/node`），
不是一组静态文件——这也是它从 M0 的 nginx 占位页换成 Astro 的**实质原因**。

### 分级（L4）在门户层怎么落地

把 [L4 的五级](docs/04_开源件调研与选型.md) 编码成数据（[`portal/src/data/services.ts`](portal/src/data/services.ts)）：

```
Authelia 的组  →  级别            →  门户里显示哪些件
livefab-admin      admin              全部
livefab-core       core               除管理员专属外全部
livefab-collaborator  collaborator    公开 + 个人 + 前台后台（**看不到内部区**）
（已登录无组）      registered        公开 + 个人中心
（未登录）         public            只有公开件
```

**实测的级别过滤**（自动验收，见下）：

| 账号 | 级别 | 可见件 | 被扣留 |
| --- | --- | ---: | --- |
| `admin` | admin | **6** | 0 |
| `collaborator` | collaborator | **5** | 1（内部区，需 core） |

协作者页面上会明确写：**"需要 core 级；你当前是 collaborator 级"**——
不是静默隐藏，而是告诉他为什么看不到。

### ⚠️ 两条必须说清的边界

1. **隐藏链接不是访问控制。** 门户的级别只决定"显不显示入口"；
   真正拦不拦得住由 **Authelia 在网关**决定。两者必须一致，
   否则就是"看得见但进不去"或"**看不见却进得去**"。
   所以每个件都标了 `guard` 字段，写明**实际**由谁防护（见数据文件）。
2. **身份头不能被伪造。** 它们由 Caddy 注入，前提是**门户只在内网、只被 Caddy 反代**。
   若门户哪天直接暴露端口，任何人都能伪造 `Remote-User` ——
   这正是 compose 里"内部件不发布端口"这条不变量的一部分，也已写成断言。

### 故意不做静默降级

`/account/` 与 `/admin/` **只会在经过网关鉴权后**被访问。如果这两页读不到身份头，
说明 Caddy 的 `forward_auth` 或 `copy_headers` 配置坏了——**页面会显式报"未能识别身份 / 属于配置故障"**，
而不是假装成"请先登录"。后者会把一个配置错误伪装成正常流程。

### 自动验收（`bun run verify`，共 16 项）

门户相关的 6 项**是真的走一遍登录**（调 Authelia 的 `firstfactor` API 拿会话）再断言：

```
✓ 门户是 Astro SSR（非静态占位）
✓ 公开区不含身份信息            ← 未登录访问不应出现身份
✓ 管理员登录成功                已取得会话 cookie
✓ 个人区带会话可访问            HTTP 200
✓ 门户显示已登录身份            渲染出身份与分组
✓ 分级生效：协作者可见件少于管理员   管理员 6 vs 协作者 5
✓ 分级生效：协作者被扣留内部区     内部区（需 core）对协作者不可见
```

## 六、与工作区其它部分的关系

- **是底座，不是产品**：主线游戏（[`../mainline/`](../mainline/README.md)、[`../future-debris/`](../future-debris/README.md)）
  与官网（[`../website/`](../website/README.md)）都是它**服务**的对象；
- **复用纪律、不复用内容**：复用《未来档案》的对比度闸门、验收编排器思路、设计 token；
  **不复用**它的内容管线（[03 §四](docs/03_分阶段落地路线.md)）；
- **体例沿用**主线项目的提案方式：一条建议一个文件 + 决策总表 + 不回删原文。
