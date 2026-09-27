# 《明日档案》· 复古未来主义网站 · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循 Keep a Changelog 风格：`新增` / `变更` / `修复` / `移除`。
> 项目结构见 [`README.md`](README.md)；文档入口 [`docs/`](docs/)。内容源（唯一权威）在 [`doc/retro-futurism/`](../../doc/retro-futurism/README.md) 与 [`doc/punks/`](../../doc/punks/README.md)。

## [Unreleased]

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

