# 《明日档案》· 复古未来主义网站 · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循 Keep a Changelog 风格：`新增` / `变更` / `修复` / `移除`。
> 项目结构见 [`README.md`](README.md)；文档入口 [`docs/`](docs/)。内容源（唯一权威）在 [`doc/retro-futurism/`](../../doc/retro-futurism/README.md) 与 [`doc/punks/`](../../doc/punks/README.md)。

## [Unreleased]

### 新增（M3 颜色对比度审计：查出并修掉两处真实无障碍缺陷）

对比度是**唯一可以纯计算判定**的无障碍维度（WCAG 公式确定），应当由机器守住。新增
[`tools/verify-contrast.ts`](tools/verify-contrast.ts)，对 27 个前景/背景组合逐一计算，
**查出两处真实缺陷**：

| 问题 | 原值 | 实测 | 处理 |
| --- | --- | --- | --- |
| `--text-faint` 用于页脚/面包屑/侧栏标签 | `#6b7889` | 在 `bg-elev-2` 上仅 **3.57:1**（AA 需 4.5） | 提亮至 `#808d9f` → 最低 **4.76:1** |
| 交互控件边框 | `--line` `#24303f` | **1.43:1**（1.4.11 需 3:1） | 新增 `--line-strong` `#66727f` → 最低 **3.27:1** |

两处**刻意的判断**，不只是"改到通过"：

1. **`--line` 保留不动，只给交互控件换 `--line-strong`。** 1px 装饰性分隔线不受
   WCAG 1.4.11 约束；把它们也调亮会让界面又脏又吵——那是"为了通过审计而破坏设计"。
2. **提亮 `--text-faint` 后立刻检查层级没被压平。** 只查对比度会漏掉一种退化：
   颜色达标但和相邻层级挤在一起，用户分不出主次。审计里加了**亮度顺序断言**
   （`bg < bg-elev < bg-elev-2`、`text-faint < text-dim < text`、`line < line-strong`）
   与 `text-faint`/`text-dim` 的**最小亮度比 1.15**（当前 1.45）。将来改 token
   若压平层级会直接失败，而不是靠肉眼发现。

同时补了**全局 `:focus-visible` 焦点轮廓**（`--focus` 对三种背景均 ≥3:1）——
早先只有搜索框和灯箱有焦点样式，侧栏与画廊图格等键盘可达元素没有。
无障碍自动检查由 9 项扩到 **10 项**，新增 `focus-indicator`（校验 `:focus-visible`
规则存在且颜色解析为具体值）。实测 **10 项 × 4 页全部通过**，对比度 **27/27 达标**。

### 修复（本轮踩到的两个"检查器自身的坑"）

`focus-indicator` 检查**连错两次**，都记在 [`tools/verify-perf.ts`](tools/verify-perf.ts) 注释里以免重犯：

1. **用 `el.focus()` 再读 outline → 大面积误报。** 原因是正确做法用 `:focus-visible`，
   而 `:focus-visible` **不会**因程序化 `focus()` 而匹配。
2. **改成"读所有元素的 `outlineWidth>0`" → 仍然误报。** 因为**未聚焦时**
   `outline-style` 的计算值就是 `none`，此时 `outline-width/color` 本就没有意义。
   实测证据：构建产物里规则确实存在（`grep` 可查到），且 CDP 显示它已匹配到元素。

最终改为校验两条**真的能抓问题、且不依赖焦点状态**的不变量：
样式表存在 `:focus(-visible)` 描边规则 + 其颜色解析为具体数值
（这能抓住"CSS 变量未定义 / 被作用域规则覆盖导致焦点轮廓消失"这类真实故障）。

### 变更（文档）

- [06 §2.5](docs/06_实现记录_M1.md) 新增「颜色对比度」小节，记录两处缺陷与两个判断。
- [08 §八](docs/08_部署与备份.md) 未做清单移除"对比度"，补入"屏幕阅读器实读"。
- 项目 README 验收数据补对比度一行；目录结构补 `verify-contrast.ts`。
- `package.json` 增补 `verify:contrast`。

### 新增（M3 部署与备份：数据层落地 + 可验证的备份 + 部署配置）

按 [D5](docs/00_决策记录.md) 的 **Bundle A（全自托管 SQLite）** 把数据层真正落地，并把部署与备份做成**可验证**的，详见 [08 部署与备份](docs/08_部署与备份.md)。

- **数据层（论坛表结构 + 薄数据访问层）**：新增 [`server/db/schema.ts`](server/db/schema.ts)
  （`users` / `sessions` / `boards` / `threads` / `posts`，含索引与外键）、
  [`server/db/index.ts`](server/db/index.ts)（**唯一的连接点**——Drizzle 抽象方言，
  日后换 Postgres 或接 PocketBase 只改这里）、[`server/db/migrate.ts`](server/db/migrate.ts)
  （迁移执行器，**幂等**，只需 Bun，不需要在生产装 drizzle-kit）、
  [`server/db/migrations/`](server/db/migrations/)（迁移 SQL，**schema 的唯一真相，入库**）。
  连接开启 **WAL**（与 Litestream 配合的前提）与 **`foreign_keys = ON`**
  （SQLite 默认关闭，不开则 schema 里的 `references` 形同虚设）。
- **存储健康检查** [`server/routes/api/health/storage.get.ts`](server/routes/api/health/storage.get.ts)：
  **不是返回 `{ok:true}` 的假健康检查**——它真做一轮读写（写入→读回→删除）、
  检查 WAL 与外键是否真的生效、并**验证外键真的会拦截非法引用**。实测 **7/7 通过**。
  用途：部署 smoke test（[08 §五](docs/08_部署与备份.md)）与恢复演练中验证"恢复出来的库确实可用"。
- **备份脚本** [`tools/backup-db.ts`](tools/backup-db.ts)：用 SQLite 官方推荐的
  **`VACUUM INTO`**（WAL 模式下直接 `cp` 可能漏掉 WAL 里已提交的事务），
  且**每次都验证自己刚产出的备份**——打开产物、跑 `integrity_check`、对比关键表行数；
  验证不通过则改名 `.bad` 并以非零码退出。立场：**未经验证的备份等于没有备份。**
- **备份/恢复演练** [`tools/verify-backup.ts`](tools/verify-backup.ts)：一条完整闭环
  （造数据 → 备份 → 校验行数 → **篡改备份并确认会被拒绝** → 恢复 → 确认恢复库可查询），
  全程在临时目录，不碰真实数据。实测 **9/9 通过**，含反向证明。
- **部署产物** [`deploy/`](deploy/)：[`Caddyfile`](deploy/Caddyfile)（自动 TLS + 反代 +
  媒体静态直送 + 安全响应头）、[`retro-futurism.service`](deploy/retro-futurism.service)
  （systemd，**用 bun 而非 node 启动**，`ReadWritePaths` 只放开数据库目录）、
  [`litestream.yml`](deploy/litestream.yml)（持续复制到 S3 兼容存储，带保留策略与快照间隔）。
- **部署配置静态校验** [`tools/verify-deploy.ts`](tools/verify-deploy.ts)：18 项
  （括号配对、root 为绝对路径、systemd 用 bun、数据库目录在 `ReadWritePaths` 内、
  Litestream YAML 可解析等），实测 **18/18**。
- **`docs/08_部署与备份.md`**：形态图、部署步骤、两条腿备份（Litestream 持续复制 +
  校验快照）、**目标机 smoke test 清单（10 条命令）**、季度恢复演练记录表、**未做清单**。
  文档开头明确划出"**已在本机验证**"与"**未验证（需目标机）**"的边界。

### 修复（M3 实测发现）

- **`new Database(file, { readonly: true })` 在 WAL 库上会失败**：SQLite 只读打开 WAL 数据库
  仍需创建 `-shm` 共享内存文件，目录不可写时 Bun 直接抛
  `SQLITE_CANTOPEN: unable to open database file`——**看起来像"备份损坏"，实际是目录权限**，
  极易误判。已改为"可读写打开 + `PRAGMA query_only = ON`"，效果等价且不依赖目录权限。
- **`VACUUM INTO` 不会创建父目录**，且失败时只报一句 `unable to open database file`，
  容易被误读成"源库打不开"。脚本现已显式建目录，并在失败时打印源库/目标/目录存在性与可写性。
- **`VACUUM INTO` 需要可写连接**：在 `query_only=ON` 的连接上会报
  `attempt to write a readonly database`。现明确区分：备份用可写连接，校验用只读语义连接。
- `tools/verify-deploy.ts` 的 `root` 指令匹配**误把中文注释里的"root"一词当指令**
  （本项目注释里恰好写了「root 指向的目录…」）。已改为跳过注释行。
- `.gitignore` 收紧：`*.db` / `*.db-shm` / `*.db-wal` / `data/` / `backups/`
  （迁移 SQL 仍入库）。
- `package.json` 增补 `db:generate` / `db:migrate` / `db:backup` / `db:verify-backup` / `verify:deploy`。

### 变更（文档）

- 新增 [`docs/08_部署与备份.md`](docs/08_部署与备份.md)（含**目标机 smoke test 清单**与
  **"本机已验证 / 未验证"的边界声明**）。
- 项目 README：交付功能表补"部署"入口；验收数据补存储 7/7、备份演练 9/9、部署静态校验 18/18；
  目录结构补 `server/db`、`deploy/` 与三个新工具。

### 新增（M2 第一阶段：Giscus 讨论区就绪 + M1 性能/无障碍实测补齐）

**M2 第一阶段（D4「先 Giscus 后自建」的 Giscus 段）已交付，代码就绪、待填 4 个环境变量即可上线**，详见 [07 M2 实现记录](docs/07_实现记录_M2.md)：

- [`app/components/GiscusComments.vue`](app/components/GiscusComments.vue)：Giscus 客户端注入，
  `dark_dimmed` 主题对齐站点暗色基调，`data-lang="zh-CN"`，`data-mapping="specific"` 按 `term` 分串；
  **未配置时降级为可执行的配置说明**而非空白/报错——站点在未接入讨论区时依然完整可用。
- [`app/pages/forum/index.vue`](app/pages/forum/index.vue)：两段式路线说明 + **切换触发条件**
  + 综合讨论区（`term=forum:general`）；并如实标注"Giscus 依赖 GitHub、**境内可达性存疑**"这一风险。
- 博客每篇文章挂独立讨论串（`term=blog:<路径>`），互不串台。
- [`nuxt.config.ts`](nuxt.config.ts) 增 `runtimeConfig.public.giscus`（读 `NUXT_PUBLIC_GISCUS_*`）；
  新增 [`.env.example`](.env.example) 说明四个变量与申请步骤。
- 新增 [`tools/verify-giscus.ts`](tools/verify-giscus.ts)：真浏览器验三种情形——
  **未配置降级 ✓ / 配置后注入且参数正确 ✓ / 博客讨论区 ✓**。
  **并明确写出该脚本"不能证明"的部分**：用占位 `repoId` 走通注入路径，
  **未**验证真实 GitHub 仓库与 Discussions 的端到端可用性。

**M1 遗留的性能与无障碍实测已补齐**（此前如实标为"待做、不声称通过"）：

- 新增 [`tools/verify-perf.ts`](tools/verify-perf.ts)，用 CDP 而非 Lighthouse
  （验收口径只要 LCP/CLS 两个浏览器原生指标，引入 Lighthouse 及其依赖不划算）。
  **关键：测量必须限速**——本机 localhost 下 LCP 只有 60–100ms，那个数字**不能用来判断 < 2.5s 目标**（等于没测）；
  脚本模拟 **4× CPU 降速 + 1.6 Mbps / 150ms RTT**，实测 **LCP 280–324ms、CLS ≤ 0.0003**（阈值 2500ms / 0.1）。
- **无障碍**：9 项"页面上下文可判定"的检查 × 4 页全部通过（alt、恰好一个 h1、标题不跳级、
  按钮/链接可访问名称、`<html lang>`、`<main>` 地标、id 不重复、无正数 tabindex）。
- **无障碍检查器带负向自检**（`--selftest`）：注入故意违规的 DOM 确认会报错（**5/5 违规可捕获**）。
  理由：**一个永远返回"通过"的检查器比没有检查器更糟**——它给人虚假的安全感。
- [05 路线图](docs/05_实施路线图与验收.md) 验收清单第 5、6 项由"⏳ 待 M3"改为"✅ 实测通过"，
  并注明"不构成完整 WCAG 审计"。

### 修复（M2 实测发现）

- **Giscus 挂载点 id 用 `Math.random()` 导致脚本静默不注入**：SSR 渲染出的 id 与客户端 hydration
  时算出的 id 不同，`onMounted` 里 `getElementById` 返回 `null`，注入被静默跳过。
  **症状极具迷惑性**——构建与类型检查全过、页面看着正常、讨论区永远空白、无任何报错。
  已改用 Nuxt 的 `useId()`（SSR/CSR 一致的稳定 id）。
  教训：**任何同时用于 SSR 输出与客户端查询的标识符都不能是随机的**；
  这类 bug 只有真正在浏览器里查 DOM 才能发现（curl 只能看到挂载点存在）。
- `package.json` 增补 `verify:perf` / `verify:giscus` 脚本。

### 变更（文档）

- 新增 [`docs/07_实现记录_M2.md`](docs/07_实现记录_M2.md)：两段式落点、GitHub 侧四步、切换条件、
  实测验收（含"能证明/不能证明"的边界）、境内可达性风险、随机 id 之坑、未完成项。
- 项目 README 增补验收数据（性能/无障碍/Giscus 三项）与"三类验收都必须用真浏览器"的说明。

### 新增（M1 主体交付：搜索 / 博客 / 画廊 / 七纪时间轴 / SEO）

对照 [05 路线图](docs/05_实施路线图与验收.md) 的 M1 范围，本轮交付六项；详见 [06 M1 实现记录与验收](docs/06_实现记录_M1.md)。

- **全文检索**（落实 D9）：[`app/components/SearchDialog.vue`](app/components/SearchDialog.vue) +
  [`app/composables/useSiteSearch.ts`](app/composables/useSiteSearch.ts) + `/search` 页。
  `useSearchCollection` 在**浏览器本地**建 FTS 索引，**零外部搜索服务**；首次真正检索才 `init()`，
  输入 250ms 去抖。⌘K / Ctrl+K 唤起，非输入态按 `/` 亦可。弹层含焦点陷阱、↑↓ 选择、Enter 跳转、
  命中高亮。**验收：真浏览器（CDP）实测 6/6 关键词有结果**（含大小写不敏感 `Anemoia`）。
  → 新增 [`tools/verify-search.ts`](tools/verify-search.ts)：服务端 curl 只能证明页面 200，
  **证明不了检索能出结果**，必须真在页面里输入并读取结果。
- **博客**：`content.config.ts` 新增 `blog` 集合（title/description/date/tags/cover/author/draft）；
  `/blog` 列表（按日期倒序 + 标签客户端筛选）、`/blog/**` 详情（正文渲染 + JSON-LD `BlogPosting`）；
  两篇种子文章（《为什么把 14 万字论文做成网站》《七纪分期：为什么我们把「纪元」同时用作导航和分类》）。
- **多媒体画廊**：`gallery` 集合（credit **必填**）+ [`tools/sync-gallery.ts`](tools/sync-gallery.ts)
  生成 **99 条**条目、8 个专辑；`/gallery` 专辑总览 + `/gallery/[album]` 瀑布流（CSS `columns`）
  + 自研灯箱 [`GalleryGrid.vue`](app/components/GalleryGrid.vue)（键盘 ←→/ESC、焦点陷阱、滚动锁、
  来源与版权展示、打开原图）。
  **素材不复制进站点**：新增 [`server/routes/media/[...].get.ts`](server/routes/media/[...].get.ts)，
  把 `/media/**` 只读映射到 `doc/`，带 MIME 推断与 7 天缓存，并做目录穿越防护
  （实测 `/media/../../etc/passwd` → 404；`/media/%2e%2e%2f…` → **403**）。
- **七纪时间轴**（D8 的记忆点）：[`app/components/EraTimeline.vue`](app/components/EraTimeline.vue) +
  [`app/assets/eras.ts`](app/assets/eras.ts)，数据取自论文集总论 §2.1 原表（含「对应篇目」列）。
  **不是装饰而是入口**：每个纪链到该纪代表篇目的正文。附原作者限定：「分期的是想象的技术，不是真实历史」。
- **SEO**：`/rss.xml`（32 条 item）、`/sitemap.xml`（148 条 url）、`public/robots.txt`；
  [`app/composables/useStructuredData.ts`](app/composables/useStructuredData.ts) 注入 JSON-LD
  （Wiki 篇 `ScholarlyArticle`、博客 `BlogPosting`，含 `isPartOf`/`publisher`）。
- **`/about`** 页：内容来源、编辑部与引用规范、素材版权、技术说明。
- **首页**升级：加入七纪时间轴、最新博客、画廊件数与搜索入口（各栏目卡片不再是"建设中"占位）。

### 修复（M1 实测发现）

- **服务端查询必须用 `@nuxt/content/server` 的 `queryCollection(event, name)`**：
  `/rss.xml` 与 `/sitemap.xml` 初次实现用客户端版 `queryCollection('blog')`，**两个端点均 500**
  （`TypeError: undefined is not an object (evaluating 'event.node.req')`）。根因是客户端版**不接收 event**，
  在 Nitro 路由里内容层取不到请求上下文。**同名函数、同样链式 API，只在是否传 event 上有区别，
  构建期不一定报错、是运行时 500**——易反复踩，已记入 [06 §4.1](docs/06_实现记录_M1.md)。
- **画廊标题重复**：地图动态文件名 `MAP-ANV-02_双路并行_动画.png` 去前缀后四张图**标题完全相同**，
  画廊里无法区分。已从「地图」专辑建立 `地图 ID → 中文名` 映射作限定词，
  现标题为「双闸峡谷 · 双路并行 · 动画」等，**全站 0 重复标题**。
  这类问题不会让构建失败，只会让页面"对但没用"——**必须实际看渲染结果**。
- [`tools/sync-gallery.ts`](tools/sync-gallery.ts) 的 `displayName` 增加地图名限定逻辑；
  `package.json` 增补 `sync:gallery` / `sync:all` / `check:build` / `verify:site` / `verify:search` 脚本。

### 变更（文档）

- 新增 [`docs/06_实现记录_M1.md`](docs/06_实现记录_M1.md)：M1 交付清单、实测验收、四个技术决定、两个坑、**未完成项诚实清单**。
- [05 路线图](docs/05_实施路线图与验收.md)：§3.1 加实施结果指针；§3.2 验收清单补「实测」列，
  **性能与无障碍审计如实标为待 M3，不声称通过**。
- 项目 README 重写（已交付功能表、验收数据、目录结构、运行方式、M2/M3 去向、坑与备忘）。

### 新增（方案文档 —— 立项阶段，尚无实现代码）

> 注：本条目记录**立项轮**的产出；该轮的"无实现代码"状态已由下方 M0 条目取代。

**背景**：工作区已有 **265 个 Markdown、约 170 万字符**的复古未来主义内容存量（论文集 91 篇 / 约 14.1 万汉字、
朋克五卷 53 篇、99 PNG / 80 SVG / 47 PDF 视觉素材），但**缺少一个面向读者的门面**。立项新增本项目，
把存量内容做成**可读、可逛、可讨论**的站点：Wiki 承载知识体系、博客承载编辑部写作、画廊承载视觉素材、论坛承载读者讨论。

技术主线按用户指定：**Web + Bun + Vue + Nuxt**。本阶段**只产出方案文档，不写实现代码**，以便先决策。

- 新增项目 [`projects/retro-futurism-site/`](README.md)（暂名《明日档案》，命名候选见 [D1](docs/00_决策记录.md)），
  含项目 README 与 `docs/` 六篇方案文档；
- [`docs/00_决策记录.md`](docs/00_决策记录.md)：**D1–D10 十项待裁决决策**，每项给出推荐项、理由、代价与备选
  （命名 / 内容权威 / 技术栈版本 / 论坛形态 / **数据存储与同步** / 部署 / 鉴权 / 视觉 / 搜索 / 内容同步方式）；
- [`docs/01_项目概述与范围.md`](docs/01_项目概述与范围.md)：**存量资产盘点**（摸清"瓶颈不是写什么，而是怎么组织与检索"）、
  目标读者、M1 范围与明确不做项、7 条可验收成功判据、命名候选；
- [`docs/02_技术栈与选型.md`](docs/02_技术栈与选型.md)：**实测版本总表**（Bun 1.4.0 / Nuxt 4.5.2 / Vue 3.5.43 /
  Nuxt Content 3.16.1 / Nuxt UI 4.11.2 / Tailwind 4.3.3 / @nuxt/image 2.1.0 / PhotoSwipe 5.4.4 / Drizzle 0.45.3 等，
  均于 2026-09-27 实测自 npm registry 与本机环境，非记忆值）；三个分叉的论证（内容引擎 / 组件库 / 论坛数据层）；
  **Bun×Nuxt 兼容性风险与三项必验点及回退方案**；视觉与多媒体实现要点；版本锁定与升级策略；
- [`docs/03_信息架构与内容模型.md`](docs/03_信息架构与内容模型.md)：站点地图、四类内容集合 schema（wiki / blog / gallery / forum）、
  导航与检索设计、URL 与 SEO 约定、视觉方向；
  **含三项源文档结构实测结论**：① 主卷 21 篇**无 YAML frontmatter**（篇首用 `> 关键词：` / `> 摘要：` 引用块）；
  ② **交叉引用是纯文本**（`（见 16 末日篇）`）**点不动**；③ 卷属/篇序/slug 需由路径与文件名推导。
  据此提出**「内容适配层」**方案（`tools/sync-content.ts` 构建期单向转换 + 交叉引用改写 + 反向"被引用于"索引），
  并论证了"手工改 doc/"与"直接复制 doc/"两个备选为何不取；
- [`docs/04_数据存储与同步方案.md`](docs/04_数据存储与同步方案.md)：**按用户要求先出分析再决策**。
  把"数据存储"拆成四类数据（内容 / 社区 / 媒体 / 同步）分别分析，指出**真正开放的只有"社区数据"一项**；
  对比 SQLite 自托管 / Turso / 自托管 PG / Supabase / Neon / **PocketBase** / D1 / headless CMS 八条路线；
  给出**四套内部自洽的 bundle**（A 全自托管 SQLite｜B PocketBase 单二进制｜C 云 Postgres + 对象存储｜D libSQL 嵌入式副本），
  按 8 维度（加权合计 15）打分：**A 4.53 ＞ B 4.07 ＞ D 3.53 ＞ C 3.20**，主推荐 **A**、次推荐 **B**，
  并把抉择点收敛为一句话（"愿意花 1.5–2 周自建认证换零锁定，还是引入第二个服务换时间"）；
  另提出**务实折中**（选 A 但加薄数据访问层 `server/utils/db.ts`，使"今天的简单选择不变成明天的锁定"）；
  把含糊的"同步"**拆成五个独立问题**（内容同步 / 数据备份 / 客户端离线 / 多实例 / 实时推送），
  明确**首版只做前两个**，并论证 PWA / RxDB / ElectricSQL / Yjs 等本地优先方案属**为不存在的问题引入真实复杂度**；
  给出成本估算（A/B 约 $6–11/月最低）、风险登记与备份验证口径（**季度恢复演练**）；
- [`docs/05_实施路线图与验收.md`](docs/05_实施路线图与验收.md)：M0–M4 里程碑、逐里程碑验收清单、
  7 条风险登记册（R1 Bun×Nuxt 兼容为首位）、M1 的 DoD 勾选表；
  **M0 出口判据定为"91 篇论文能自动变成站点页面且交叉链接可点"，做不到就不进 M1**。

### 变更（决策裁决 + M0 交付：内容适配层打通，129 篇上线）

**决策**：用户答复「按推荐项来」，[D1–D10](docs/00_决策记录.md) **全部裁决**，决策记录由"待裁决"转为 v1.0「已裁决」。
其中 **D5 定为 Bundle A（全自托管 SQLite）**、D4 为「先 Giscus 后自建」两段式、D6 单机自托管、D8 可关闭的 CRT。

**M0 交付（骨架 + 内容适配层打通）**，M0 出口判据「91 篇论文能自动变成站点页面且交叉链接可点」**超额达成**：

- **工程骨架**：Bun 1.4.0 + Nuxt 4.5.2 + Vue 3.5.43 + `@nuxt/content` 3.16.1 + `@nuxt/image` 2.1.0，
  版本精确锁定（非 `^`）；`content.config.ts` 声明 `wiki` 集合 schema；采用 Nuxt 4 的 `app/` 目录结构。
- **内容适配层 [`tools/sync-content.ts`](tools/sync-content.ts)**（M0 核心）：把 `doc/` **单向、幂等**转换为
  `content/wiki/`，**不改源文件一个字节**。解决源文档三个"不能直接贴上网"的特征：
  ① **无 YAML frontmatter**（篇首是 `> 关键词：` / `> 摘要：` 引用块）→ 解析为规范 frontmatter；
  ② **交叉引用是纯文本**（`（见 16 末日篇）` 点不动）→ 改写为 Markdown 链接；
  ③ 卷属/篇序/slug 只在路径里 → 由路径与文件名推导，朋克卷转 ASCII slug。
  **实测：129 篇（主卷 21 + 朋克五卷 45 + 附录七卷 63）、改写 331 处交叉引用、命中率 97.1%。**
  改写覆盖 6 类写法（含 `（见主卷 08、16）`、`（见本卷 03）`、`（见 00 总论 2.2 的四元素）`、裸写 `之定义见 00 总论`）；
  **刻意保留两类**：文内小节号 `（见 1.1）`（强行解析会错链到第 1 篇）与篇内指代 `（见第三节）`。
  同步生成**反链索引**（26 篇被引用）与**导航树**（主卷四段分组 + 朋克五卷 + 附录七卷）为 JSON 资产。
- **站点页面**：首页、`/wiki` 总目录、`/wiki/main` 主卷（四段结构）、`/wiki/punks`、`/wiki/appendix`、
  各分卷索引页（`/wiki/punks/atompunk` 等 12 个）、129 篇文章页；文章页含侧栏导航树、面包屑、标签、
  本篇目录（TOC）、上下篇、**「被引用于（N）」反向链接区块**；`/blog`、`/gallery`、`/forum` 为 M1/M2 占位页。
- **主题 [`app/assets/theme.css`](app/assets/theme.css)**（D8 落地）：原子时代配色（深空蓝/青绿/奶油黄/镀铬银）+
  **可关闭的 CRT 质感**（纯 CSS 扫描线与暗角，无 WebGL）；开关状态入 `localStorage`；
  全站尊重 `prefers-reduced-motion`；正文对比度按 WCAG AA 取色。
- **产物校验 [`tools/check-build.ts`](tools/check-build.ts)**：构建后置步骤，已接入 `bun run build`。
- **验收 [`tools/verify-site.ts`](tools/verify-site.ts)**：全量遍历并校验。
  **结果：篇目 129/129 OK、索引页 17/17 OK、站内链接 148/148 OK、未改写的篇号引用 0 处。**
- **证据**：[`docs/shots/`](docs/shots/) 两张真实渲染截图（首页、Wiki 文章页）。

### 修复（M0 实测发现并解决的三个 Bun × Nuxt 约束）

三条**同根**（`bun install` 扁平布局 + 包的条件导出 + Nitro 文件追踪），均已落进代码并写入
[02 技术栈与选型 §3.2](docs/02_技术栈与选型.md) 与项目 README §五：

1. **产物必须用 Bun 运行**：Bun 下构建时 Nuxt 选 Bun 运行时预设，产物含 `import { Database } from 'bun:sqlite'`
   （`@nuxt/content` 依据 `process.versions.bun` 选 SQLite 连接器）。用 Node 跑会报
   `ERR_UNSUPPORTED_ESM_URL_SCHEME: Received protocol 'bun:'`。→ 新增 `bun start`，构建与运行统一用 Bun。
2. **`srvx` 条件导出被 Nitro 追踪漏掉**：其 `exports` 按运行时暴露多个适配器，@vercel/nft 只复制了
   `node.mjs`；而 `ipx`（`@nuxt/image` 默认 IPX）运行时要 `import('srvx')`，Bun 命中 `bun` 条件去要
   `dist/adapters/bun.mjs` → 启动即 `Cannot find package 'srvx'`。
   → `check-build.ts` 按 `exports` 清单校验并补齐（**当前补 14 个文件**）。
3. **连接器由构建运行时决定**：Node 下重建仍含 `bun:sqlite`，证明不能靠"混用运行时"绕过，必须统一。

> 顺带确认：**无需 `better-sqlite3`** —— Bun 内置 `bun:sqlite` 直接支撑 Nuxt Content，
> 这消除了 M0 原计划的 V2/V3 风险点。`sharp` 亦通过（产物含 darwin-arm64 二进制）。

### 备注

- 本轮已创建实现代码，项目状态由"方案阶段"转为 **M0 已交付**，下一步进 M1（博客 / 画廊 / 搜索）；
- 实现期实测对 D3/D5/D6 的细化反馈已记入 [00 决策记录](docs/00_决策记录.md)「M0 实测对决策的反馈」；
- 本机环境备忘：**Bun 1.4.0 位于 `/opt/homebrew/bin/bun`**（不在默认 PATH 中，需显式加入）；
  **产物必须用 `bun .output/server/index.mjs` 运行**，不可用 `node`。

