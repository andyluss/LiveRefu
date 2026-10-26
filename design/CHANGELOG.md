# 设计系统变更日志（Design System Changelog）

> 记录 **LiveRefu Design System（LRDS）** 自身的版本变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/)；
> 时间一律东八区、精确到分（规则见 [`../rules/R06-time.md`](../rules/R06-time.md)）。
> **工作区级**变更仍记根 [`CHANGELOG.md`](../CHANGELOG.md)；本文件只记设计系统发布与决策包。
> 版本标签建议：`design-v<版本>`（与 `workspace-v<版本>` 分开）。

## [未发布]

### 新增

- **青橙全栈 P12 核心**：S3 presign/delete、OAuth refresh token；9/9 测试；`20_P12实现记录`。
- **青橙全栈 P11 核心**：`qc pack` 预编译包（`dist/index.mjs`/`dist/cli.mjs`）、`qc new` 通过 `@qingcheng/qc` 包导入；`19_P11实现记录`。
- **青橙全栈 P10 核心**：S3 兼容存储（SigV4 PUT）、OAuth PKCE（S256）；9/9 测试；`18_P10实现记录`。
- **青橙全栈 P9 核心**：SMTP transport、`Storage`/`LocalStorage`/`MemoryStorage`、开发自动刷新、CI 模板；8/8 测试；`17_P9实现记录`。
- **青橙全栈 P8 核心 + 文档分区**：OAuth 通用路由、GitHub/Google 预设；全栈文档迁入 `docs/design/` 与 `docs/implementation/`，新增 `docs/README.md`；7/7 测试；`16_P8实现记录`。
- **青橙全栈 P7 核心**：OAuth/OIDC adapter（state/token/userinfo/session）、API 邮件 transport、可注入 fetch；6/6 测试；`15_P7实现记录`。
- **青橙全栈 P6 核心**：邮箱验证、异步 StandardSchema、`formValues/formErrors`、第二个 dogfood `examples/bookmarks`；notes 3/3 + bookmarks 1/1；`14_P6实现记录`。
- **青橙全栈 P5 核心**：mailer（console/file/memory）、密码重置（token 哈希/一次性/清 session）、`/forgot`、`/reset`、StandardSchema `fromStandard`、上传 `saveUpload`；3/3 测试；`13_P5实现记录`。
- **青橙全栈 P4 运维核心**：`x-request-id` + JSON 日志、`qc db backup/restore`、Docker/Compose 部署模板；`12_P4实现记录`。
- **青橙全栈 P3 核心**：esbuild bundle（`dist/server.mjs`）、`qc start` 自动识别 bundle、`qc start dist`、`Action.onError` 表单错误回填、内置 `/health`；新增 esbuild 0.25.12 devDependency；2/2 测试 + bundle smoke；`11_P3实现记录`。
- **青橙全栈 P2**：auth（session/scrypt/CSRF/角色）、表单校验、安全头、限流、2MiB 请求体上限；notes 升级为注册/登录/个人笔记/删除/退出；2 个集成测试通过；`10_P2实现记录`。
- **青橙全栈 P1 骨架落地**：`qc/`（Node 原生 HTTP + node:sqlite + 文件路由 + page/action + HTML 模板 + 迁移 + CLI）与 `examples/notes/`；2 个集成测试通过；`qc doctor/start/build` 已 smoke；P2 auth/打包待做。
- **新增青橙全栈（QC Stack）技术框架提案**：`design/fullstack/` 9 篇文档（理念/架构/应用契约/Web 实现/多端/路线/依赖治理/决策清单）；`D-018` 待决策；拍板前不写代码。
- **青橙十问 × 未来残片试评审**：新增 [`docs/13`](docs/13_青橙十问_未来残片试评审.md)；桌面试评审，识别“照料型势力吃亏”“受影响的人缺席”两项红旗；`D-017` 完成。
- **D-011 青橙理念体系**：9 篇（00–08）全部完稿（第三批：06 多世界语法、07 边界、08 青橙十问）；新增 [`philosophy/`](philosophy/README.md) 索引与 [`D-011` 记录](docs/decisions/D-011-philosophy-series.md)；`design/ref/` 增加参考索引并纳入 M1 子关注点；`design/TODO` 第二批与第三批均完成；下一步用真实项目过「青橙十问」。
- **决策记录制度落地（E19）**：新增 [`decisions/README.md`](docs/decisions/README.md) 与 [`D-003` 样例](docs/decisions/D-003-five-layer-model.md)；`D-014` 完成；`00 决策总表` 升 v1.2。
- **暂定中文名“青橙设计”（E20）**：`README` / D2 / HUB 使用该暂定名；代码与资产名仍为 `LRDS`，不替代公开品牌名。
- **新增 [决策记录制度草案](docs/proposals/20261022-1326-决策记录制度草案.md)**：盘点工作区现有决策实践（design/mainline/LiveFab/website/实现裁决/discussions/M0/M3），给出 A/B/C/D 四种方案与推荐 C 混合制；`D-014` 转“草案中”。
- **决策总表升级 v1.1**：新增 **E01–E18 执行决策**，与 D1–D10 战略决策分层；E 表按时间排序，只列选择、状态与详据链接；`design/TODO.md` 新增 **D-014 决策记录制度完善**。
- **新增 [12 设计系统入门](docs/12_设计系统入门.md)**：面向初学者的设计系统长文，覆盖 token / 组件 / 模式 / 风格卡 / 治理 / 无障碍 / 失败模式 / AI / 最小启动清单；非规范正文。
- **HUB 新增「演进」Tab**：未来 → 现在 → 过去纵向主列 + 右侧 6 个指标列（token / 风格卡 / 契约 / 产品 / 介质 / 无障碍），按时间点对齐；主列保留事件标签；未来目标明确标注“非承诺”。
- **新增 [`TODO.md`](TODO.md)：设计系统专属待办**——App kit / 组件 / Archive 亮色 / 打印实体 / HUB / 无障碍 / 发布的 13 项清单，含等待拍板与最近完成；根 [`TODO.md`](../TODO.md) 只保留非设计跨项目事项。
- **新增 [`HUB.html`](HUB.html)：设计系统一页式可视化总览**，由 [`tools/build_hub.ts`](tools/build_hub.ts) 从 token / 组件 / 文档 / 产品源码生成；含总览、Token 色板与字阶、风格卡、组件采用矩阵、产品截图、验收闸门、决策与文档索引。生成器自检 4/4，`build_hub --check` 已接入 `check.sh`。
- **App kit 起步（v0.3）**：新增平台无关 [`tokens/dist/app/tokens.json`](tokens/dist/app/tokens.json)（20 个语义色、UI 5 级字阶、控件/触控/图标尺寸、间距/圆角/描边/动效、无障碍阈值）；生成物 7 → **8 个**。
- 新增 [`kits/app/README.md`](kits/app/README.md)（iOS/Android 消费方式 + 12 项验收清单）与 [`docs/11_App_kit_v0.2.md`](docs/11_App_kit_v0.2.md)。
- **状态**：尚无真实 App 消费者；不声称已接入/已验收。

### 变更

- **时间与例外表可读性**：`docs/exceptions.md` 的「已收口」表补齐原「当前例外」全部字段，并追加收口时间/方式；`design/TODO.md` 移除「最近完成」段，完成项改为在总表改状态。
- **待办收敛**：`design/TODO.md` 成为设计系统唯一明细与状态来源；根 TODO 设计条目迁入，移除“根 TODO”映射列；补充产品发布完成项。
- [`build_tokens.ts`](tools/build_tokens.ts) 增加 `buildAppJson`；`build_tokens --check` 现在检查 8 个产物。
- **HUB 支持三态主题**：右上角切换“系统 / 亮色 / 暗色”，记忆到 `localStorage`；亮色是 HUB 查看器主题（暖纸色），不是新的产品风格卡或设计系统亮色模式。
- **补记 `[0.1.0]` 版本段并补打 `design-v0.1.0`**：原 v0.1 条目曾并入 0.2.0，现按版本拆分；0.1.0 时间取 v0.1 提交 `e91985d` 的提交时间。

## [0.2.0] - 2026-10-21 13:50 · v0.2 治理、组件与皮肤收口

> **v0.2 第一到第四阶段：网站/LiveFab 全量 token 化、明日频道风格卡、M1/M2 block、组件契约与共享 Web 组件层、8px 皮肤收口、产品走查。**

### 新增

- **v0.2 第二阶段（2026-10-21）：明日频道风格卡登记 + `design/` M1/M2 转 `block`。**
  - 新增 [`tokens/products/tomorrows-channel.tape.tokens.json`](tokens/products/tomorrows-channel.tape.tokens.json)：`SC-TOMORROWS-CHANNEL-TAPE-v1`，9 色 + 色温/光比/装饰参数；产品 token 总数 53 → 62。
  - 新增 [`tools/check_tomorrows_channel_skin.ts`](tools/check_tomorrows_channel_skin.ts)：`.tres` ↔ token 对账（9 色 + 6 光照/装饰，7/7 自检）。
  - 新增 [`docs/07_风格卡登记.md`](docs/07_风格卡登记.md)：四张风格卡的 ID、源、投影、对账方式。
  - 新增 [`config-design.json`](../rules/meta/tools/config-design.json)：`design/` 的 M1/M2 配置，实测 59 合规 / 0 违规。
- **v0.2 第二阶段追加（2026-10-21）：3 个组件契约（draft）。**
  - 新增 [`components/button.md`](components/button.md)、[`components/form-field.md`](components/form-field.md)、[`components/panel.md`](components/panel.md)：五节 + token 清单，覆盖 default/focus/disabled 等状态。
  - 新增 [`tools/check_component_contracts.ts`](tools/check_component_contracts.ts)：五节齐全、token 存在、无裸色/裸尺寸；自检 6/6。
  - 新增尺寸 token `sys.size.control.{sm,md,lg}` / `sys.size.touch.min` / `sys.size.icon.{sm,md,lg}`；token 总数 215 → 229。
- **v0.2 第三阶段（2026-10-21）：共享 Web 组件层与渐进接入。**
  - 新增 [`kits/web/components.css`](kits/web/components.css)：`.lr-button` / `.lr-panel` / `.lr-field`，只引用 token；新增 [`kits/web/preview.html`](kits/web/preview.html) 与真实渲染图 [`preview.png`](kits/web/preview.png)。
  - 新增 [`tools/build_web_kit.ts`](tools/build_web_kit.ts)（3/3 自检）与 [`tools/check_component_usage.ts`](tools/check_component_usage.ts)（4/4 自检）。
  - 网站 4 文件 / 12 处 button、6 文件 / 22 处 panel、1 处 field；LiveFab 1 处 button + 1 处 panel；**渐进接入**，产品皮肤保留。
- **v0.2 第四阶段（2026-10-21）：皮肤收口。**
  - 新增 `lr-button--technical` / `lr-button--outline` 两个产品驱动变体；button 契约与预览同步。
  - 卡片圆角 6 → **8px**（`--radius` = `--lr-radius-panel`）；`.card` 基础表面交给 `.lr-panel`；删除 `.deco-btn` / `.cta` / `ul.svc li` 的重复基础皮肤。
  - 新增 [`docs/10_皮肤收口_v0.2.md`](docs/10_皮肤收口_v0.2.md)；EX-20261021-02 resolved。
  - 重新走查 4 页 / 53 步 Tab / 0 缺失焦点；过程中发现并修复 `white-space: nowrap` 误加到 `.lr-panel--interactive` 的回归。
  - [`check_component_contracts.ts`](tools/check_component_contracts.ts) 扩到组件 CSS，自检 8/8。
- **v0.2 产品走查（2026-10-21）。**
  - 新增 [`tools/capture_products.ts`](tools/capture_products.ts)（2/2 自检）：真实页面全页截图 + Tab 焦点序列 + `Meta+K` 搜索弹窗。
  - 4 个页面（网站首页 / Wiki 列表 / 搜索弹窗 / LiveFab 首页）、53 步 Tab、**0 个缺失可见焦点**；截图与报告在 [`docs/shots/`](docs/shots/)，结论见 [`docs/09_产品走查_v0.2.md`](docs/09_产品走查_v0.2.md)。
  - 运行发现：网站构建产物在本机 Bun 1.4.0 下触发 NAPI 崩溃（SIGABRT），改用 Node 完成走查；部署运行时需复核。
- **v0.2 第一阶段（2026-10-21）：网站全量颜色 token 化 + LiveFab 接入。**
  - 新增 [`tokens/products/livefab.tokens.json`](tokens/products/livefab.tokens.json)（12 个颜色）；`product.*` 总数 53。
  - Web 生成拆为每产品一份：[`dist/web/future-archive.css`](tokens/dist/web/future-archive.css)、[`dist/web/livefab.css`](tokens/dist/web/livefab.css)；不再有共享的 `tokens.css`。
  - 网站产品层新增 8 个 alpha/overlay token（`scanline` / `vignette` / `overlayStrong` / `overlayPanel` / `overlaySearch` / `shadow` / `surfaceDeep` / `onWarning`），支持 `#RRGGBBAA`。
  - 网站 `GalleryGrid.vue` / `SearchDialog.vue` / `gallery/index.vue` 与 `theme.css` 的遮罩、阴影、高亮全部改用 token；网站 app 裸色值 0 处（26 个文件）。
  - LiveFab 门户改为 `import tokens.generated.css`，删除 11 个内联色值。
  - 新增 [`docs/06_实现记录_v0.2.md`](docs/06_实现记录_v0.2.md)。

### 变更

- **`design/` 的 M1/M2 从 `pending` 转 `block`**：工作区纳入闸门的关注点 8 → 9；缺口不再以 `pending` 挂在明处。
- **风格卡对账纳入 `check.sh`**：除四道通用闸门外，新增明日频道 `.tres` 对账。
- **组件契约纳入 `check.sh`**：五节、token、裸值、状态四项检查（6/6 自检）。
- **共享组件层纳入 `check.sh`**：组件产物一致（3/3）+ 使用审计（4/4）+ 组件 CSS 校验（8/8）。
- **网站搜索框焦点改为 `--focus`**：去掉最后一处 `--teal` 焦点。
- **v0.2 第四阶段**：网站卡片采用 8px 面板圆角；技术/描边按钮改为组件变体；产品侧重复基础皮肤删除；重跑截图 + Tab 走查。
- **v0.2：裸色值闸门扩大到整个网站 app**（`.vue` / `.ts` / `.css`，26 个文件），不再只查 `theme.css`；`--all` 仍对游戏脚本只报告。
- **v0.2：LiveFab 不再复制 token**：`product.livefab` 成为独立风格卡，门户消费 `livefab.css`；两个 Web 产品的旧变量别名各自独立，避免 `--bg` 互相覆盖。

### 修复

- **LiveFab `--focus` 不再复用强调色**：焦点描边由 `--teal-bright` 改为独立蓝 `#8AB4F8`，只在键盘焦点时可见。

### 备注

- **v0.2 未做**：打印/实体、母品牌命名、全组件库。App kit 在 v0.3 起步（见 `[未发布]`）。债务与收口计划见 [10 §五](docs/10_皮肤收口_v0.2.md)。

## [0.1.0] - 2026-10-21 12:43 · 地基与两个试点

> v0.1 地基：三层 token、生成器、四道闸门、网站与《未来残片》两个试点。
> 此版本当时未单独记入日志；2026-10-21 补记并打 `design-v0.1.0`。

### 新增

- **三层 token 源**（186 个）：[`tokens/core/ref.tokens.json`](tokens/core/ref.tokens.json)（61）、[`tokens/core/sys.tokens.json`](tokens/core/sys.tokens.json)（92）、[`tokens/products/future-archive.tokens.json`](tokens/products/future-archive.tokens.json)（15）、[`tokens/products/future-debris.atomic.tokens.json`](tokens/products/future-debris.atomic.tokens.json)（18）；[`tokens/schema/tokens.schema.json`](tokens/schema/tokens.schema.json)。
- **生成器与闸门**：[`tools/token_lib.ts`](tools/token_lib.ts)、[`tools/build_tokens.ts`](tools/build_tokens.ts)（8/8 自检）、[`tools/check_tokens.ts`](tools/check_tokens.ts)（7/7）、[`tools/check_contrast.ts`](tools/check_contrast.ts)（7/7，68 组对比度 + 7 组层级 + 3 组 focus 分离）、[`tools/check_no_raw_values.ts`](tools/check_no_raw_values.ts)（v0.1 5/5；v0.2 8/8，含 rgba 与 GDScript 注释处理）、[`tools/check.sh`](tools/check.sh)。
- **生成物**：`tokens/dist/web/tokens.css`、`tokens/dist/godot/tokens.json`、`tokens/dist/docs/tokens.md`；产品副本 `projects/website/app/assets/tokens.generated.css`、`projects/mainline/future-debris/game/data/tokens.json`。
- **介质包说明**：[`kits/web/README.md`](kits/web/README.md)、[`kits/godot/README.md`](kits/godot/README.md)。
- **实现记录与例外**：[`docs/05_实现记录_v0.1.md`](docs/05_实现记录_v0.1.md)、[`docs/exceptions.md`](docs/exceptions.md)（EX-20261021-01 网站组件裸色值、EX-20261021-02 网站 6px 圆角）。

### 变更

- **四道闸门接入根 pre-commit 与 CI**：暂存涉及 `design/`、网站 `theme.css` / `tokens.generated.css` 或游戏 `game/data/tokens.json` 时自动跑 `bash design/tools/check.sh`；CI 另加网站 `verify-contrast.ts`。
- **D1–D10 全部裁决**（用户：按推荐执行，D2/D5 确认；暂不用设计工具；实体后定；v0.1 外观不变）；[`docs/00_决策总表.md`](docs/00_决策总表.md) 转为 v1.0 并新增裁决记录。
- **网站试点**：`projects/website/app/assets/theme.css` 删除裸色值，旧变量名由生成物别名提供；`nuxt.config.ts` 在主题前加载 `tokens.generated.css`；`tools/verify-contrast.ts` 改为从生成物解析 token。
- **游戏试点**：`projects/mainline/future-debris/game/data/tokens.json` 改为生成物，schema 与取值不变；`check_tokens.py`、`run.sh contrast`、`run.sh theme` 全部通过。

### 修复

- **网站 `--focus` 不再复用强调色**：由 `#57D8C8`（= `--teal-bright`）改为独立蓝 `#8AB4F8`。这是 v0.1 唯一有意的视觉变化，只在键盘焦点时可见。

### 备注

- v0.1 的 `check_no_raw_values` 只查已迁移表面（5/5）；v0.2 扩到整个网站 app（8/8）。
- v0.1 的 `tokens/dist/web/tokens.css` 在 v0.2 拆为 `future-archive.css` / `livefab.css`。
- EX-20261021-01 / EX-20261021-02 在 v0.1 登记，v0.2 收口。

## [0.0.1] - 2026-10-21 12:26 · 立项决策包

### 新增

- **2026-10-21 · 设计系统立项决策包（v0.1 决策阶段）**
  - 新增 [`README.md`](README.md)：定位、原则、决策队列、拟议结构、与既有资产的关系。
  - 新增 [`docs/00_决策总表.md`](docs/00_决策总表.md)：D1–D10 全部待裁决，附推荐、代价、依赖关系与“最小拍板集”。
  - 新增 [`docs/01_现状盘点.md`](docs/01_现状盘点.md)：四套视觉定义的对照与七个真问题（含 focus 色复用、`--line` 误用等合规缺陷）。
  - 新增 [`docs/02_系统架构.md`](docs/02_系统架构.md)：五层模型、三层 token（`ref`/`sys`/`product`）、单一事实来源、生成管线、八道闸门、介质包。
  - 新增 [`docs/03_治理与运营.md`](docs/03_治理与运营.md)：角色与权限、单向门/双向门、DP 流程、设计闸门、版本策略、AI 协作约定。
  - 新增 [`docs/04_落地路线.md`](docs/04_落地路线.md)：P0–P5 阶段、`v0.1` 范围、双试点、Definition of Done、风险与停止条件。
  - **状态**：全部待用户裁决；尚未开始 token 与实现。

### 变更

- 无。

### 弃用

- 无。

### 移除

- 无。

### 修复

- 无。

### 安全

- 无。
