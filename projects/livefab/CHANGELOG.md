# LiveFab · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循 Keep a Changelog 风格：`新增` / `变更` / `修复` / `移除`。
> 项目结构见 [`README.md`](README.md)；文档入口 [`docs/`](docs/)。

## [Unreleased]

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

### ⚠️ M0 的验证边界（诚实清单）

**已做**：结构校验 29/29 + 负向自检 3/3。
**未做**：**容器从未真正启动过**——本机无可用 Docker 环境（registry 不可达、容器内无外网）。
因此 Authelia 的 PG 连接与密钥生成、Caddyfile 语法、**Ghost 前置保护是否与其会话冲突**、
各件真实内存占用，**全部未验证**。第一次 `docker compose up` 很可能还要修几处。

### 验证（M0 骨架：从"结构断言"推进到"真实工具验证"）

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

### 验证（**M0 真正跑通**：8 个容器启动，鉴权分层实测生效）

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

### 备注

- 本阶段**未创建任何实现代码**（无 compose、无配置），符合"先写方案让我决策"的要求；
- **逐件的版本号、许可证、资源占用等事实数据仍在核实中**——
  [04](docs/04_开源件调研与选型.md) 已明确标注数据待补，并说明**不凭记忆填写**的理由
  （版本/许可证写错比留空更危险，会把决策带偏）；
- 已知未处理：`indie/live-calculator/` 有 2 处既有链接失效（独立仓库、其 `.github/` 被根 `.gitignore` 忽略），
  不属本项目范围。
