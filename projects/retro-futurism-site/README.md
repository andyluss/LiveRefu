# 《明日档案》· 复古未来主义网站

> 卡面：用途＝项目入口 ｜ 依赖：内容源 [`doc/retro-futurism/`](../../doc/retro-futurism/README.md) + [`doc/punks/`](../../doc/punks/README.md) ｜ 状态：**M0 已交付（骨架 + 内容适配层打通）** · 2026-09-27
> 一句话：把工作区已有的 14 万字复古未来主义知识库，做成一个**可读、可逛、可讨论**的站点——Wiki 承载知识体系、博客承载编辑部写作、画廊承载视觉素材、论坛承载读者讨论。

| 我要…… | 去哪 |
| --- | --- |
| **跑起来看看** | `bun install && bun run dev`（或 `bun run build && bun start`） |
| 看它长什么样 | [docs/shots/](docs/shots/)（首页 + Wiki 文章页真实渲染截图） |
| 知道这站是什么、做多大 | [01 项目概述与范围](docs/01_项目概述与范围.md) |
| 看技术栈选型与版本 | [02 技术栈与选型](docs/02_技术栈与选型.md) |
| 知道站点怎么分区 | [03 信息架构与内容模型](docs/03_信息架构与内容模型.md) |
| 决定数据怎么存、怎么同步 | [04 数据存储与同步方案](docs/04_数据存储与同步方案.md) |
| 知道分几步做 | [05 实施路线图与验收](docs/05_实施路线图与验收.md) |
| 知道哪些是我拍的板 | [00 决策记录](docs/00_决策记录.md)（D1–D10 已裁决） |

## 一、M0 已交付（本版）

| # | M0 任务 | 状态 | 说明 |
| --- | --- | --- | --- |
| 0.1 | Bun + Nuxt 工程初始化，锁定版本 | ✅ | Bun 1.4.0 / Nuxt 4.5.2 / Vue 3.5.43，`bun install` + `bun run build` 通过 |
| 0.2 | 接入 Nuxt Content，建 `wiki` 集合 | ✅ | `content.config.ts` 声明 schema（title/volume/order/route/tags…） |
| 0.3 | **内容适配层** `tools/sync-content.ts` | ✅ | 129 篇从 `doc/` 单向生成，含 frontmatter |
| 0.4 | **交叉引用改写器** | ✅ | **331 处改写成可点击链接，命中率 97.1%** |
| 0.5 | 数据存储接通 | 🟡 | bundle A（自托管 SQLite）已定；论坛表结构属 M2 |
| 0.6 | `@nuxt/image` 管线 | 🟡 | 模块已装、sharp 二进制作业已进产物；真实图片接入属 M1 |

**M0 出口判据（[05](docs/05_实施路线图与验收.md) §二）**：*91 篇论文能自动变成站点页面且交叉链接可点* —— **已达成，且超额**（实际 129 篇）。

### 验收结果（实测）

```
篇目 200 检查      : 129/129 OK
索引页 200 检查    : 17/17 OK
站内链接可达性     : 148/148 OK
未改写的「（见 数字…）」: 0 处
```

## 二、内容适配层做了什么（M0 的核心）

源文档有三个"不能直接贴上网"的特征，`tools/sync-content.ts` 逐一解决：

| 源文档现状 | 问题 | 适配层处理 |
| --- | --- | --- |
| **无 YAML frontmatter**（篇首是 `> 关键词：` / `> 摘要：` 引用块） | Nuxt Content 读不到标题/标签/摘要 | 解析引用块 → 生成规范 frontmatter |
| **交叉引用是纯文本**（`（见 16 末日篇）`） | **点不动**，Wiki 退化为静态阅读器 | 改写为 Markdown 链接；覆盖 6 类写法 |
| 卷属 / 篇序 / slug 只在路径里 | 无法排序、无法生成干净 URL | 由路径与文件名推导，朋克卷转 ASCII slug |

**改写覆盖的引用形态**（含易错项）：
`（见 16 末日篇）`、`（见 05、20）`、`（见主卷 08、16）`、`（见本卷 03）`、`（见附录_生物朋克卷）`、
`（见 00 总论 2.2 的四元素）`（后缀小节号保留原文）、以及裸写 `之定义见 00 总论`。

**刻意不转的两类**（保留纯文本，属正确行为）：
- `（见 1.1）`、`（见 2.3）` —— 指向**文内小节**，强行解析会错链到第 1/2 篇；
- `（见第三节）`、`（见下）`、`（见本文第六节）` —— 篇内指代。

**副产品：反向索引**。「被引用于（N）」区块由改写期收集的反链生成——这是纯文件式知识库
优于传统 CMS 的地方（M0 已有 26 篇被引用）。

## 三、目录结构

```
projects/retro-futurism-site/
├── README.md                 # 本文件
├── CHANGELOG.md              # 项目日志
├── docs/                     # 方案文档（6 篇）+ shots/（真实截图）
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
├── content/wiki/             # ★ 生成物：129 篇（main / punks / appendix）
└── tools/
    ├── sync-content.ts       # ★ 内容适配层（doc/ → content/wiki/）
    ├── check-build.ts        # ★ 构建后置：产物完整性（srvx 条件导出补齐）
    └── verify-site.ts        # ★ 验收：全篇目 + 站内链接可达性
```

## 四、运行方式

```bash
cd projects/retro-futurism-site
export PATH="/opt/homebrew/bin:$PATH"   # 本机 Bun 在 /opt/homebrew/bin

bun install
bun run sync:content    # doc/ → content/wiki/（改过 doc/ 或 tools/ 后重跑）
bun run dev             # 开发服务器

bun run build           # 生产构建 + 产物校验（注意：产物要用 bun 运行）
bun start               # 起生产服务
bun run check           # 内容是否最新 + 产物完整性
bun run tools/verify-site.ts --base=http://localhost:3100   # 全量验收
```

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

## 六、下一步（M1）

按 [05 实施路线图](docs/05_实施路线图与验收.md)：Wiki 主干收尾（双向链接展示已就绪）→ 全站搜索 →
博客 → 画廊（接入 `doc/refu-game-001/美术/` 的 99 PNG / 80 SVG）→ 七纪时间轴导航组件 → SEO 套件。

## 七、五个关键设计判断

1. **`doc/` 是唯一内容权威**，站点是呈现层——不复制、不改写正文；
2. **写「内容适配层」而非手工改 doc/**（原因见 §二）；
3. **读优先，写其次**：Wiki/博客/画廊的性能优先于论坛功能深度；
4. **「七纪时间轴」做成全局导航**：画廊按年代筛选与 Wiki 按纪读史共用一个心智模型——这是本站的记忆点；
5. **论坛与内容分家**：文件式内容（Nuxt Content）与关系型社区数据（数据库）分别选型，不强行统一。
