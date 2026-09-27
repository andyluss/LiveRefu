# 《明日档案》· 复古未来主义网站

> 卡面：用途＝项目入口 ｜ 依赖：内容源 [`doc/retro-futurism/`](../../doc/retro-futurism/README.md) + [`doc/punks/`](../../doc/punks/README.md) ｜ 状态：**M0+M1 已交付、M3 除部署外完成、M2 第一阶段代码就绪；已暂停（用户要求"先停"）** · 2026-09-27
> 一句话：把工作区已有的 14 万字复古未来主义知识库，做成一个**可读、可逛、可讨论**的站点——Wiki 承载知识体系、博客承载编辑部写作、画廊承载视觉素材、论坛承载读者讨论。

| 我要…… | 去哪 |
| --- | --- |
| **接手这个项目** | [09 当前状态与交接](docs/09_当前状态与交接.md) ← **从这份开始** |
| **跑起来看看** | `bun install && bun run dev`（或 `bun run build && bun start`） |
| **跑全套验收** | `bun run verify`（一条命令，自带前置编排与清理） |
| **部署到服务器** | [08 部署与备份](docs/08_部署与备份.md)（含目标机 smoke test 清单） |
| 看它长什么样 | [docs/shots/](docs/shots/)（5 张真实渲染截图） |
| 知道 M1 做了什么、怎么验的 | [06 M1 实现记录与验收](docs/06_实现记录_M1.md) |
| **接入讨论区（论坛）** | [07 M2 实现记录](docs/07_实现记录_M2.md)（含 GitHub 侧四步） |
| 知道这站是什么、做多大 | [01 项目概述与范围](docs/01_项目概述与范围.md) |
| 看技术栈选型与版本 | [02 技术栈与选型](docs/02_技术栈与选型.md) |
| 知道站点怎么分区 | [03 信息架构与内容模型](docs/03_信息架构与内容模型.md) |
| 决定数据怎么存、怎么同步 | [04 数据存储与同步方案](docs/04_数据存储与同步方案.md) |
| 知道分几步做 | [05 实施路线图与验收](docs/05_实施路线图与验收.md) |
| 知道哪些是我拍的板 | [00 决策记录](docs/00_决策记录.md)（D1–D10 已裁决） |

## 一、已交付功能

| 栏目 | 路由 | 状态 |
| --- | --- | --- |
| **Wiki 知识库** | `/wiki`、`/wiki/main`、`/wiki/punks`、`/wiki/appendix`、129 篇文章页 | ✅ |
| **全文检索** | ⌘K 弹层 + `/search`（浏览器本地 FTS，无外部服务） | ✅ |
| **博客** | `/blog`、`/blog/**`、`/rss.xml` | ✅ |
| **多媒体画廊** | `/gallery`、`/gallery/[album]`、99 件、灯箱 | ✅（视频待素材） |
| **七纪时间轴** | 首页 + 作为导航入口 | ✅ |
| **SEO** | `/sitemap.xml`、`/robots.txt`、RSS、JSON-LD | ✅ |
| 关于 | `/about` | ✅ |
| **论坛（Giscus）** | `/forum` + 每篇博客的讨论区 | 🟡 代码就绪，**待填 4 个环境变量**（[M2 文档](docs/07_实现记录_M2.md)） |

## 二、验收结果（实测）

**一条命令跑完全部验收**（13 个套件，自带前置编排：起临时实例 + 临时数据库 + Chrome，跑完自动清理）：

```bash
bun run build && bun run verify        # 全套
bun run verify:list                    # 列出套件与依赖
bun run verify --skip=browser          # CI 无头环境：跳过需要浏览器的三项
```

```
通过 13 · 失败 0 · 跳过 0 · 合计 29.7s
```

<details>
<summary>各套件明细（点击展开）</summary>

```
✓ content-sync     内容/画廊生成物与 doc/ 一致
✓ gallery-sync     画廊条目是否最新
✓ build-artifacts  构建产物完整性（srvx 条件导出等）
✓ contrast         27 个前景/背景组合达 WCAG AA + 视觉层级断言
✓ deploy-config    部署配置静态校验 18 项
✓ backup-drill     备份→篡改→拒绝→恢复 闭环演练（9/9）
✓ site             129/129 篇目 · 25/25 索引页 · 149/149 站内链接
✓ og               OG 图端点 + 版式像素断言（8/8）
✓ urls             RSS/sitemap/OG/canonical 的绝对地址来源与一致性
✓ storage          存储健康 7 项（含外键真的拦截非法引用）
✓ search           全文检索 6/6（真浏览器 CDP）
✓ perf-a11y        限速 LCP 280–324ms · 无障碍 10 项 × 4 页（含负向自检）
✓ giscus           讨论区降级 ✓ / 配置后注入 ✓ / 博客讨论区 ✓
```

</details>

**为什么必须一条命令**：到这个阶段项目已有 12 个验收工具、20+ 个脚本，
但"全部验收通过"离不开人记住一串命令与前置条件（起几个实例、端口多少、
要不要 Chrome、Giscus 要不要配）。**交接给别人或换环境重现时，这份知识就丢了。**

> 三类验收**必须用真浏览器**（CDP），curl 证明不了：搜索是**客户端** FTS；
> Giscus 脚本是**客户端注入**；性能指标只有浏览器能测。

## 三、M0 交付回顾（内容适配层）

M0 的出口判据「91 篇论文能自动变成站点页面且交叉链接可点」**超额达成**（实际 129 篇）。
核心是[内容适配层](tools/sync-content.ts)：把 `doc/` **单向、幂等**转换，**不改源文件一个字节**，
解决源文档三个"不能直接贴上网"的特征：

| 源文档现状 | 问题 | 适配层处理 |
| --- | --- | --- |
| **无 YAML frontmatter**（篇首是 `> 关键词：` / `> 摘要：` 引用块） | Nuxt Content 读不到标题/标签/摘要 | 解析引用块 → 生成规范 frontmatter |
| **交叉引用是纯文本**（`（见 16 末日篇）`） | **点不动**，Wiki 退化为静态阅读器 | 改写为 Markdown 链接；覆盖 6 类写法 |
| 卷属 / 篇序 / slug 只在路径里 | 无法排序、无法生成干净 URL | 由路径与文件名推导，朋克卷转 ASCII slug |

**实测：331 处交叉引用改写、命中率 97.1%**；10 处刻意保留——`（见 1.1）` 是文内小节号
（强行解析会错链到第 1 篇）、`（见第三节）` 是篇内指代。副产品「被引用于（N）」反链区块覆盖 26 篇。

## 三、目录结构

```
projects/retro-futurism-site/
├── README.md                 # 本文件
├── CHANGELOG.md              # 项目日志
├── docs/                     # 文档 10 篇（00 决策 … 09 交接）+ shots/（真实截图）
├── nuxt.config.ts            # Nuxt 配置（content / image / 主题 CSS）
├── content.config.ts         # ★ wiki 集合 schema
├── app/
│   ├── assets/theme.css      # ★ 原子时代配色 + 可关闭的 CRT 质感
│   ├── assets/wiki-nav.json      # ★ 生成物：导航树
│   ├── assets/wiki-backrefs.json # ★ 生成物：反链索引
│   ├── components/           # WikiSidebar / WikiVolumeIndex
│   ├── composables/useCrt.ts # CRT 开关（localStorage 记忆）
│   ├── layouts/default.vue
│   └── pages/                # index / wiki/** / blog / gallery / forum
├── content/
│   ├── wiki/                 # ★ 生成物：129 篇（main / punks / appendix）
│   ├── gallery/              # ★ 生成物：99 条画廊条目（8 个专辑）
│   └── blog/                 # 手写博客文章
├── server/
│   ├── db/
│   │   ├── schema.ts         # ★ Drizzle schema（users/sessions/boards/threads/posts）
│   │   ├── index.ts          # ★ 薄数据访问层（唯一的连接点，便于日后换库）
│   │   ├── migrate.ts        # ★ 迁移执行器（幂等，只需 Bun）
│   │   └── migrations/       # ★ 迁移 SQL（schema 的唯一真相，必须入库）
│   └── routes/
│       ├── media/[...].get.ts        # ★ /media/** → 只读暴露 doc/ 下素材（含穿越防护）
│       ├── api/health/storage.get.ts # ★ 存储健康检查（真做读写 + 外键验证）
│       ├── og.png.get.ts             # ★ OG 分享图（1200×630，带强缓存）
│       ├── rss.xml.ts                # RSS 2.0
│       └── sitemap.xml.ts            # sitemap
├── server/utils/og-render.ts # ★ OG 图渲染器（SVG→PNG，复用产物里的 sharp）
├── deploy/                   # ★ 部署产物（见 docs/08）
│   ├── Caddyfile             # 反代 + 自动 TLS + 静态媒体
│   ├── retro-futurism.service# systemd 单元（必须用 bun 启动）
│   └── litestream.yml        # 持续备份到对象存储
├── tools/
│   ├── sync-content.ts       # ★ 内容适配层（doc/ → content/wiki/）
│   ├── sync-gallery.ts       # ★ 画廊条目生成（doc/美术 → content/gallery/）
│   ├── check-build.ts        # ★ 构建后置：产物完整性（srvx 条件导出补齐）
│   ├── backup-db.ts          # ★ 备份 + **自校验**（未验证的备份等于没有备份）
│   ├── verify-site.ts        # ★ 验收：全篇目 + 索引页 + 站内链接可达性
│   ├── verify-search.ts      # ★ 验收：真浏览器（CDP）测全文检索
│   ├── verify-perf.ts        # ★ 验收：限速下的 LCP/CLS + 无障碍（含负向自检）
│   ├── verify-contrast.ts    # ★ 验收：WCAG 对比度 + 视觉层级守卫（纯计算）
│   ├── verify-og.ts          # ★ 验收：OG 分享图（像素级断言版式约束）
│   ├── verify-giscus.ts      # ★ 验收：讨论区降级与注入（真浏览器）
│   ├── verify-urls.ts        # ★ 验收：绝对地址来源（防硬编码域名）
│   ├── verify-backup.ts      # ★ 验收：备份→篡改→拒绝→恢复 闭环演练
│   ├── verify-storage.ts     # ★ 验收：存储健康 7 项（独立断言，防假绿灯）
│   ├── verify-deploy.ts      # ★ 验收：部署配置静态校验
│   └── verify-all.ts         # ★ **全量验收编排器**（起前置 + 跑 12 套件 + 自动清理）
```

## 四、运行方式

```bash
cd projects/retro-futurism-site
export PATH="/opt/homebrew/bin:$PATH"   # 本机 Bun 在 /opt/homebrew/bin

bun install
bun run sync:all        # doc/ → content/wiki/ + content/gallery/（改过 doc/ 或 tools/ 后重跑）
bun run dev             # 开发服务器

bun run build           # 生产构建 + 产物校验（注意：产物要用 bun 运行）
bun start               # 起生产服务
bun run check           # 内容/画廊是否最新 + 产物完整性

# 验收（需要服务已起在 3100；后两项需要开着 remote-debugging 的 Chrome）
bun run tools/verify-site.ts   --base=http://localhost:3100
bun run tools/verify-search.ts --base=http://localhost:3100 --cdp=http://127.0.0.1:9222
bun run tools/verify-perf.ts   --base=http://localhost:3100 --cdp=http://127.0.0.1:9222 --selftest
bun run tools/verify-giscus.ts --base=http://localhost:3100 --base-configured=http://localhost:3101 --cdp=http://127.0.0.1:9222
```

> `verify-giscus` 需要**两个实例**：一个未配置（3100）验降级、一个带
> `NUXT_PUBLIC_GISCUS_*`（3101）验注入。配置见 [`.env.example`](.env.example)。

## 五、实测踩到的三个 Bun × Nuxt 坑（重要）

这三条都是 M0 实测发现、已在代码里处理，详见 [02 技术栈与选型](docs/02_技术栈与选型.md)：

1. **产物必须用 Bun 运行，不能用 Node**。
   Bun 下构建时 Nuxt 自动选中 Bun 运行时预设，产物里含 `import { Database } from 'bun:sqlite'`
   （`@nuxt/content` 检测 `process.versions.bun` 来选 SQLite 连接器）。
   → **构建用 Bun，运行也必须用 Bun**（`bun start`）。用 Node 跑会报 `ERR_UNSUPPORTED_ESM_URL_SCHEME: 'bun:'`。

2. **`srvx` 的条件导出会被 Nitro 追踪漏掉**。
   `srvx` 的 `exports` 按运行时暴露多个适配器，Nitro 用 @vercel/nft 只复制了 `node.mjs`；
   而 `ipx`（`@nuxt/image` 默认 IPX）运行时要 `import('srvx')`，Bun 命中 `bun` 条件去要
   `dist/adapters/bun.mjs` —— 文件不在产物里，于是 `Cannot find package 'srvx'` 启动失败。
   → [`tools/check-build.ts`](tools/check-build.ts) 在构建后按 `exports` 清单校验并补齐（当前补 14 个文件）。

3. **构建与运行必须在同一运行时**。
   上两条是同一个根因的两面：`bun install` 的扁平布局 + 运行时条件导出 + Nitro 的文件追踪
   三者叠加。**结论：统一用 Bun，并在构建后校验产物**。

## 六、下一步（**项目已暂停**）

> ⏸ **用户要求"先停"（2026-09-27）**。完整交接见 **[09 当前状态与交接](docs/09_当前状态与交接.md)** ——
> 那份文档说明：做到哪了、还缺什么、由谁决定、接手第一件事做什么。

**剩余项都不是代码问题，各差一个外部条件：**

| 待办 | 差什么 | 详见 |
| --- | --- | --- |
| M2 第一阶段：讨论区上线 | 去 GitHub 申请四个 `NUXT_PUBLIC_GISCUS_*` 值（约 5 分钟） | [07 §2.1](docs/07_实现记录_M2.md)、[09 §三](docs/09_当前状态与交接.md) |
| M2 第二阶段：站内自建论坛与账号 | 你的判断（境内可达性）与约 1.5–2 周排期 | [00 D4](docs/00_决策记录.md)、[07 §三](docs/07_实现记录_M2.md) |
| M3：部署 smoke test | 一台目标机（本地容器方案已实测排除） | [08 §三/§五](docs/08_部署与备份.md)、[09 §四](docs/09_当前状态与交接.md) |
| 视觉深化 / 监控告警 | 设计方向 / 目标机 | [09 §七](docs/09_当前状态与交接.md) |

> 已排除"用本地容器自己验部署"这条路并留了实测依据：本机 OrbStack + Docker 可用，
> 但 Docker Hub 不可达、容器内无外网，装不了 Bun 与 CJK 字体。

## 七、五个关键设计判断

1. **`doc/` 是唯一内容权威**，站点是呈现层——不复制、不改写正文；
2. **写「内容适配层」而非手工改 doc/**（原因见 §四）；
3. **读优先，写其次**：Wiki/博客/画廊的性能优先于论坛功能深度；
4. **「七纪时间轴」做成全局导航**：画廊按年代筛选与 Wiki 按纪读史共用一个心智模型——这是本站的记忆点；
5. **论坛与内容分家**：文件式内容（Nuxt Content）与关系型社区数据（数据库）分别选型，不强行统一。

## 八、坑与备忘

**M0**（详见 [02 §3.2](docs/02_技术栈与选型.md)）：产物必须用 Bun 运行 / `srvx` 条件导出漏追踪 / 构建与运行须同运行时。

**M1**（详见 [06 §四](docs/06_实现记录_M1.md)）：

1. **服务端查询必须用 `@nuxt/content/server` 的 `queryCollection(event, name)`**。
   客户端版不接收 event，在 Nitro 路由里会 `TypeError: event.node.req` 而 500。
   同名函数、同样链式 API，只在是否传 event 上有区别——**构建期不一定报错，是运行时 500**。
2. **画廊标题重复**：地图动态文件名去掉前缀后四张图同名。已用「地图 ID → 中文名」映射做限定词，
   现全站 0 重复标题。这类问题不会让构建失败，**必须实际看渲染结果**。

**M2**（详见 [07 §六](docs/07_实现记录_M2.md)）：

3. **Giscus 挂载点 id 不能用 `Math.random()`**：SSR 与客户端算出的 id 不同，
   `getElementById` 返回 `null`，脚本**静默不注入**——页面看着正常、讨论区永远空白、无任何报错。
   已改用 `useId()`。**教训：任何同时用于 SSR 输出与客户端查询的标识符都不能是随机的。**

