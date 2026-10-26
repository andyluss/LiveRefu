# 变更日志（Changelog）

> 本文件记录 **LiveRefu · 复古未来知识库与项目开发区** 工作区根级的变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式与 [SemVer](https://semver.org/) 版本语义；完整书写规格见 [`tech/changelog-convention.md`](tech/changelog-convention.md)；
> 「每次（非琐碎）变更须记录」规则见 [`rules/R05-changelog.md`](rules/R05-changelog.md)。
> 各项目/实验的日志在其各自根目录（如 `projects/tomorrows-channel/CHANGELOG.md`、`lab/formal-system/CHANGELOG.md`）。
>
> **版本时间取自 git 提交时间**（不是事后脑补）——每个版本的时间是该版本内最后一个提交的时间。
> 对应的 git tag 为 `workspace-v<版本>`；格式由 [`tools/check_changelog.ts`](tools/check_changelog.ts) 校验并接入 pre-commit。
> 本文件曾长期只有一个 `[未发布]` 且**小节顺序是乱的**；已按每节正文定位到的真实提交时间重排并分版。



## [未发布]

### 变更
- **[`AGENTS.md`](AGENTS.md) 新增「七、网络与代理」**：联网前先检测代理（环境变量 → 常见本地端口 7897/7890/1087/1080/8080/8888/6152/10808）；**走代理只用一次性参数**（`git -c http.proxy=…` / `curl --proxy` / `npm` 用前置环境变量），**禁止写进全局配置**（代理随时会被关，写死会变成"没网也连不上"的持久故障）；代理失败时**先去代理再试一次，两次都不行就停下并告知用户**（错误原文 + 代理地址 + 已试过的两种方式）；并记下"远端操作可能部分成功，失败后先 `ls-remote` 核对再补动作"这条实测教训。原「七、本文件的变更」顺延为「八」。
- 生成物与一次性代理的取舍：内置 `web_fetch` / `web_search` **无法指定代理**，其失败而命令行可用时改用 `curl --proxy` 抓取。
- **元规则 M1/M2 的判定配置为新目录留出入口**：[`rules/meta/tools/config-projects-mainline.json`](rules/meta/tools/config-projects-mainline.json) 增加 `cards` 子关注点配置（`projects/mainline/cards/` 自带 README，按 M1 属"可自成一体"的子关注点），并把点文件（`.gitignore`）纳入命名白名单——原先的正则要求首字符为字母数字，会把点文件判为"根目录未声明文件"。

### 新增

- [`design/HUB.html`](design/HUB.html) 新增「演进」Tab：未来 → 现在 → 过去的纵向主列 + 右侧 6 个指标列（token / 风格卡 / 契约 / 产品 / 介质 / 无障碍），按时间点对齐；主列保留事件标签；未来目标标注“非承诺”。
- **青橙全栈 P2**：auth（session/scrypt/CSRF/角色）、表单校验、安全头、限流、2MiB 请求体上限；notes 升级为注册/登录/个人笔记/删除/退出；2 个集成测试通过；`10_P2实现记录`。
- **青橙全栈 P1 骨架落地**：`design/fullstack/qc/`（Node 原生 HTTP + node:sqlite + 文件路由 + page/action + HTML 模板 + 迁移 + CLI）与 `examples/notes/`；2 个集成测试通过；P2 auth/打包待做。
- **新增青橙全栈（QC Stack）技术框架提案**：`design/fullstack/` 9 篇文档（理念/架构/应用契约/Web 实现/多端/路线/依赖治理/决策清单）；`D-018` 待决策；拍板前不写代码。
- **青橙十问 × 未来残片试评审**：新增 [`design/docs/13`](design/docs/13_青橙十问_未来残片试评审.md)；桌面试评审，识别“照料型势力吃亏”“受影响的人缺席”两项红旗；`D-017` 完成。
- **青橙设计理念体系（D-011）**：9 篇（00–08）全部完稿（第三批：06 多世界语法、07 边界、08 青橙十问）；新增 `design/philosophy/`、`D-011` 记录与 `design/ref/README.md`；`design/TODO` 第二批与第三批均完成；下一步用真实项目过「青橙十问」。
- **设计系统决策记录制度落地**：新增 `design/docs/decisions/README.md` 与 D3 样例；`D-014` 完成；`00 决策总表` v1.2。
- **设计系统暂定中文名“青橙设计”**：README / D2 / HUB 更新；代码名仍为 `LRDS`，不替代公开品牌名。
- **新增 [设计系统决策记录制度草案](design/docs/proposals/20261022-1326-决策记录制度草案.md)**：盘点工作区现有决策实践，给出 A/B/C/D 四种方案与推荐 C 混合制；`design/TODO.md` 的 D-014 转“草案中”。
- **设计系统决策总表 v1.1**：新增 E01–E18 执行决策，与 D1–D10 战略决策分层；E 表按时间排序、只列选择/状态/详据；`design/TODO.md` 新增 D-014 决策记录制度完善。
- **新增 [design/docs/12_设计系统入门.md](design/docs/12_设计系统入门.md)**：面向初学者的设计系统长文，覆盖 token / 组件 / 模式 / 风格卡 / 治理 / 无障碍 / 失败模式 / AI / 最小启动清单；非规范正文。
- **新增 [`design/TODO.md`](design/TODO.md)：设计系统专属待办**——App kit / 组件 / Archive 亮色 / 打印实体 / HUB / 无障碍 / 发布的 13 项清单，含等待拍板与最近完成；根 TODO 只保留非设计跨项目事项。
- **新增根 [`TODO.md`](TODO.md)：工作区跨项目顶级待办入口**——P0/P1/P2、维护规则；当前仅列 T-001 网站部署运行时；设计系统条目见 `design/TODO.md`。
- **新增根 [`AGENTS.md`](AGENTS.md)：本工作区 AI 协作硬规范**——只要本次回答有提交，回答最开头必须列提交表（SHA / 提交信息 / author time / 分支 / 推送 / 备注），即使只有一条；同时约定提交、变更日志、tag、推送与失败报告。
- 根 [`README.md`](README.md) 增加 `design/` 入口与 [`design/HUB.html`](design/HUB.html) 链接（读者分流 + 目录表 + 工作区说明）。
- **新增 [`design/HUB.html`](design/HUB.html)：设计系统一页式可视化总览**：由 [`design/tools/build_hub.ts`](design/tools/build_hub.ts) 从 token / 组件 / 文档 / 产品源码生成，含总览、Token 色板与字阶、风格卡、组件采用矩阵、产品截图、验收闸门、决策与文档索引；生成器自检 4/4，`build_hub --check` 已接入 `check.sh`，HUB 不会被静默写旧。
- **设计系统 v0.3 · App kit 起步**：新增平台无关 [`design/tokens/dist/app/tokens.json`](design/tokens/dist/app/tokens.json)（20 色 / 5 级字阶 / 触控与尺寸 / 无障碍阈值）与 [iOS/Android 规范](design/kits/app/README.md)；生成物 7 → 8。**尚无真实 App 消费者**，不声称已接入/已验收。记录见 [`design/docs/11_App_kit_v0.2.md`](design/docs/11_App_kit_v0.2.md)。

### 变更

- **R06 时间规则 v3**：完成项取完成提交 author time；一条目跨多提交时拆条或取最后提交并注明范围；时间命令显式 `TZ=Asia/Shanghai` + `--date=format`，弃用依赖机器时区的 `format-local`。
- **TODO 瘦身**：根/设计 TODO 移除「最近完成」段；完成项直接在总表改 `已完成`，不再维护完成日志；根/设计 README、AGENTS 同步。
- **设计文档可读性**：`design/docs/exceptions.md` 的「已收口」表补齐原「当前例外」全部字段（违反/理由/替代方案/Owner/到期/状态）与收口时间/方式；`design/TODO.md` 移除「最近完成」段，完成项改为在总表改状态。
- **收敛待办**：根 TODO 中设计系统相关条目（T-002–T-010、设计拍板、设计完成项）全部迁入 [`design/TODO.md`](design/TODO.md)；根表只保留 T-001 网站运行时与设计入口，不再复制细节。
- `design/tools/build_tokens.ts` 增加 App JSON 导出；`build_tokens --check` 现在校验 8 个生成物。
- 根 [`README.md`](README.md) 的“开发 / 维护者 / 与 AI 协作”入口加入 [`AGENTS.md`](AGENTS.md)，并增加 AI 代理先读提示。
- [`design/README.md`](design/README.md) 与 [`design/HUB.html`](design/HUB.html) 增加 `design/TODO.md` 入口；根 [`TODO.md`](TODO.md) 注明设计系统明细位置。
- 根 [`README.md`](README.md) 增加 [`TODO.md`](TODO.md) 的读者入口与目录表项；[`AGENTS.md`](AGENTS.md) 增加“开始任务前先看 TODO、完成/新增/阻塞时同步更新”。
- [`AGENTS.md`](AGENTS.md) 增加“**Git 推送一次失败即放弃**”：不连续重试，提交表标“推送失败”并给出重试命令。
- [`design/HUB.html`](design/HUB.html) 支持“系统 / 亮色 / 暗色”三态主题切换（记忆到 `localStorage`）；亮色为 HUB 查看器主题，不是新的产品风格卡。
- **补记设计系统 v0.1.0**：把原先并入 0.2.0 的 v0.1 条目拆成独立 `[0.1.0]` 版本段，并补打 `design-v0.1.0` tag（指向 v0.1 提交 `e91985d`）。

## [0.5.0] - 2026-10-21 13:50 · 设计系统 v0.2 与组件落地

### 变更
- **设计系统 v0.2 第二阶段追加**：`check.sh` 增加组件契约闸门（五节 / token / 裸值 / 状态）。
- **设计系统 v0.2 第三阶段**：`check.sh` 增加组件产物一致与使用审计；网站搜索框焦点从 `--teal` 改为 `--focus`。
- **设计系统 v0.2 第二阶段**：`design/tools/check.sh` 增加明日频道风格卡对账；`design/` 纳入 M1/M2 闸门（block 9 个关注点）。
- **设计系统 v0.2 的闸门与生成调整**：`check_no_raw_values` 受检面由 `theme.css` 扩到整个网站 app；Web 生成按产品拆为 `future-archive.css` / `livefab.css`；LiveFab 不再复制 token，焦点色改为独立蓝。
- **设计系统四道闸门接入 pre-commit 与 CI**：暂存涉及 `design/`、网站主题/生成 token 或游戏 `game/data/tokens.json` 时，自动跑 `bash design/tools/check.sh`（结构 / 对比度 / 裸色值 / 生成物，均含自检）；CI 另加网站 `verify-contrast.ts` 一步。这样“改了 token 忘了生成”或“业务代码又写裸色值”会在提交前被拦住。
- [`tools/hooks/pre-commit`](tools/hooks/pre-commit) 的 CHANGELOG 校验新增 `design/CHANGELOG.md` → `design-v` 标签前缀，使设计系统版本与 git tag 对齐（与根 `workspace-v`、各项目前缀同一机制）。
- **[`tools/hooks/pre-commit`](tools/hooks/pre-commit) 新增一步：HUB 页面与工程对账**（触发条件：改动 `projects/mainline/HUB.html` 或它的数据来源——数据表 / `run.sh` / 用例表）。
  - 动机：给人看的汇总页里的数字**必然过期**，而"页面写 120 卡、实际已 150 卡"这类偏差此前**没有任何检查会发现**；现在它会拦截提交。
  - 实现要点：核对来源**从工程现读**（数据表 `entries`、`run.sh` 的闸门步数、`case_list.gd` 的用例数），**推导不出即判失败**（不静默跳过），同一数字在页面出现多次则**逐个核对**。

### 新增
- **新增 [`design/`](design/README.md) 设计系统立项决策包**：建立工作区级设计系统（LRDS）的定位、原则、决策队列与治理提案——[README](design/README.md) + [D1–D10 决策总表](design/docs/00_决策总表.md) + [现状盘点](design/docs/01_现状盘点.md)（四套视觉定义已分叉，含 focus 色复用、`--line` 误用等合规缺陷）+ [系统架构](design/docs/02_系统架构.md)（五层模型、`ref`/`sys`/`product` 三层 token、单一事实源与生成管线）+ [治理与运营](design/docs/03_治理与运营.md) + [落地路线](design/docs/04_落地路线.md) + [设计系统日志](design/CHANGELOG.md)。**状态：D1–D10 全部待用户裁决，尚未开始 token 与实现。** 同时在元规则覆盖清单 [`workspace-scope.json`](rules/meta/tools/workspace-scope.json) 中登记为 `pending`（`v0.1` 补 M1/M2 配置后转 `block`），缺口明示而非隐形。
- **设计系统 v0.1 地基落地（两个试点已接入，外观基本不变）**：186 个三层 token（`ref` 61 / `sys` 92 / `product` 33）+ 生成器 + 四道闸门（结构 / 对比度与层级 / 裸色值 / 生成物无 diff，均带 `--self-test`）；[《未来档案》](design/kits/web/README.md) 的 `theme.css` 与 [《未来残片》](design/kits/godot/README.md) 的 `game/data/tokens.json` 改为消费生成物，网站 `bun run build`、游戏 `check_tokens.py` / `run.sh contrast` / `run.sh theme` 全部通过。唯一有意的视觉变化：网站 `--focus` 从强调青改为独立蓝，修掉“焦点=强调色”的缺陷。实现记录与债务见 [`design/docs/05_实现记录_v0.1.md`](design/docs/05_实现记录_v0.1.md)。
- **设计系统 v0.2 第一阶段（网站全量 token 化 + LiveFab 接入）**：网站 app（主题 + `GalleryGrid` / `SearchDialog` / `gallery/index`）的遮罩、阴影、高亮改用 8 个新增 alpha/overlay token，26 个 CSS/Vue/TS 文件裸色值归零；LiveFab 门户新增 `product.livefab` 风格卡、删除 11 个内联色值并改为 import 生成 CSS；Web 生成拆为 `future-archive.css` / `livefab.css`。网站 `bun run build`、LiveFab `bun run build`、网站对比度 27/27、设计四道闸门全绿。记录见 [`design/docs/06_实现记录_v0.2.md`](design/docs/06_实现记录_v0.2.md)。
- **设计系统 v0.2 第二阶段（治理收口）**：《明日频道》磁带皮肤登记为 `SC-TOMORROWS-CHANNEL-TAPE-v1`（9 色 + 色温/光比/装饰参数），新增 `.tres` ↔ token 对账闸门（7/7 自检）；[`design/` 的 M1/M2](rules/meta/tools/workspace-scope.json) 从 `pending` 转 `block`（新增 [`config-design.json`](rules/meta/tools/config-design.json)，实测 67 合规 / 0 违规），工作区纳入闸门的关注点 8 → 9。风格卡登记见 [`design/docs/07_风格卡登记.md`](design/docs/07_风格卡登记.md)。
- **设计系统 v0.2 第二阶段追加：3 个组件契约（draft）**：[button](design/components/button.md) / [form-field](design/components/form-field.md) / [panel](design/components/panel.md)，五节 + token 清单；新增 [`check_component_contracts.ts`](design/tools/check_component_contracts.ts)（6/6 自检，检查五节、token、裸值、状态）；新增 `sys.size.*` 尺寸 token，token 总数 215 → 229。**只写契约，不建组件库**。
- **设计系统 v0.2 第三阶段：共享 Web 组件层与渐进接入**：[`design/kits/web/components.css`](design/kits/web/components.css) 提供 `.lr-button` / `.lr-panel` / `.lr-field`；生成副本接入[网站](projects/website/app/assets/components.generated.css)与 [LiveFab](projects/livefab/portal/src/assets/components.generated.css)；网站 4 文件 / 12 处 button、6 文件 / 22 处 panel、搜索框 1 处 field，LiveFab 1 处 button + 1 处 panel。新增 [`build_web_kit.ts`](design/tools/build_web_kit.ts)（3/3）、[`check_component_usage.ts`](design/tools/check_component_usage.ts)（4/4）与[组件预览图](design/kits/web/preview.png)。**渐进接入，不建组件库**；完整视觉/键盘走查待做。
- **设计系统 v0.2 产品走查（真实渲染 + Tab）**：网站首页 / Wiki 列表 / 搜索弹窗 / LiveFab 首页 4 个页面、53 步 Tab、**0 个缺失可见焦点**；截图与报告在 [`design/docs/shots/`](design/docs/shots/)，结论见 [`design/docs/09_产品走查_v0.2.md`](design/docs/09_产品走查_v0.2.md)。运行发现网站构建产物在本机 Bun 1.4.0 下触发 NAPI 崩溃（SIGABRT），改用 Node 完成走查；部署运行时需复核。
- **设计系统 v0.2 第四阶段：皮肤收口**：卡片圆角 6 → 8px（EX-20261021-02 resolved）；新增 `lr-button--technical` / `--outline` 变体；删除网站 `.deco-btn` / `.card` 与 LiveFab `.cta` / `ul.svc li` 的重复基础皮肤；修复 `white-space: nowrap` 误加 panel 的回归；重跑 4 页 / 53 步 Tab / 0 缺失焦点。记录见 [`design/docs/10_皮肤收口_v0.2.md`](design/docs/10_皮肤收口_v0.2.md)。
- 新增 [`doc/tower-defense/可视化/`](doc/tower-defense/可视化/README.md)：塔防研究卷的**离线可交互图**（自包含 HTML，无外部依赖）——[00 总图索引](doc/tower-defense/可视化/00_总图_研究可视化索引.html)（文档→图关系网）、[01 视觉语法·一屏四问](doc/tower-defense/可视化/01_视觉语法_一屏四问.html)（图层开关实时判定四项关键信息＋1 秒读图自测，含八条画面检查表）、[02 难度标签·可解释难度](doc/tower-defense/可视化/02_难度标签_可解释难度.html)（B/P 滑块 → D、λ=1.35·D³、解析通关率与四档标签，含指标矩阵与远征双口径）、[03 视觉谱系·五种取向](doc/tower-defense/可视化/03_视觉谱系_五种取向.html)；研究卷卷首、美学卷与 AI 卷 README 加入口，策划侧可视化 README 增相关链接。
- 塔防研究卷再增两卷并统一数值口径：
  ① 新增 [`tower-defense/美学卷/`](doc/tower-defense/美学卷/README.md)（5 篇约 10,273 汉字）：视觉语法（一屏四问、俯视与等距取舍、路径四层编码、明度分带与色加形、特效优先级与粒子预算、8 条画面检查表）、复古未来（雷达屏/沙盘/剖面/指挥台四母题、CRT 后处理上限、三件载体分工、单主光与反例）、千禧透明（四层结构×三档透明度、四个系统可视化收益、可读性四保险与 bling 三级、键色 60/25/10/5）、读图效率（1 秒四问测试、字号与对比度口径、裁决顺序、信息密度预算、发布前 10 条验收表）、代表作视觉谱系（五种取向对照）；
  ② 新增 [`tower-defense/AI卷/`](doc/tower-defense/AI卷/README.md)（5 篇约 9,974 汉字）：AI 基准适配性（六个友好属性与四条限制、三类任务、最小可行协议）、复杂度与最优解边界（Suttichaya NP-hard 的准确表述 + Greedy Spiders 对照 + 近似算法）、LLM/RL 进展（TowerMind AAAI-26、IEEE CoG 2024、LiverDefense）、可解释难度（`B/P/D` 三元组、标签协议、五项指标矩阵）、实验协议与 12 条复现清单；
  ③ **数值口径统一**：远征八节点改为"设计表 84.4%→3.6%（23 号文档）／脚本 `--verify-rogue --n 20000` 实测 84.5%→3.8%"并列呈现，论文、数值卷 01/05/06 同步，并注明差异来源（随机种子与样本量，逐点 ≤0.6pp）；论文第九、十一节与附录 B 补入两卷互链，`tower-defense/README` 分卷表与 `doc/README` 卷行同步。 ④ **论文按 AI 文献核对补正**（现 16,170 汉字）：细化 CoG 2024 一行（实验对象为《植物大战僵尸》、PPO 选策略 + 脚本 AI 执行、用于关卡自动化测试、报告成功率），补 TowerMind 的观测形态/战争迷雾/合法动作率/人类基线，补 LiverDefense 与 ITOR 两篇的作者与卷期，新增 5.1 节的三条经典出处（Karp 1972 集合覆盖、Nemhauser-Wolsey-Fisher 1978 贪心近似、Itai 等 1982 网格哈密顿路径），并在 11.3 增列"AI 做关卡测试"这一落地用途。
- 塔防研究卷扩为三卷，并按新开的网络代理**补做联网事实核查**：
  ① **论文修订**（15,548 汉字）：补入经核查的硬事实（Missile Command 1980-06／Rampart 1990-10 的机制与"prototypical tower defense"出处、Turret Defense 2000-05 与 Sunken Defense 2001-11 的可考最早命名、COM2uS 2007/2008 "Tower Defense" 商标与 2010 发函、Flash Element TD 2007-01-12、Desktop Tower Defense 2007-03-03 的"无预设路径"与 mazing 动机及 1,570 万次游玩、PvZ 主创受魔兽 III mod 启发的反向提问、Kingdom Rush 2011-07-28 Flash 首发与销量口径冲突、Bloons TD 2009 因商标改名、Sanctum/Orcs Must Die! 与 Iron Grip: Warlord 2008、Anomaly 2011-04-08、保卫萝卜 2.5 亿下载、明日方舟收入数据标注二手转述），新增 4.9 词源与命名史、mazing/juggling/hybrid/tower wars 术语、AI 与优化文献表（TowerMind AAAI-26、IEEE CoG 2024、LiverDefense、ITOR 背包建模），并加入一条**引文警告**：FUN 2018 的 Restricted Power 研究的是 Greedy Spiders 而非塔防；
  ② 新增 [`tower-defense/案例卷/`](doc/tower-defense/案例卷/README.md)（4 篇约 9,847 汉字）：Rampart 与 Desktop Tower Defense、PvZ 与 Kingdom Rush、Bloons TD 与 Sanctum/Orcs Must Die!、Anomaly 与明日方舟/保卫萝卜，统一六段模板（档案／七要件拆解／它证明了什么／可迁移做法／来源／互链）；
  ③ 新增 [`tower-defense/数值卷/`](doc/tower-defense/数值卷/README.md)（7 篇约 9,254 汉字）：模型定义与推导（含模型 vs 实测 8 行对照）、八步参数标定、横向对照方法（置信度 A/B/C 与不等价性）、敏感性分析（实跑：γ=2/4 与 cap=2/4 均 FAIL，只有 γ=3 五章全 PASS）、验收与 CI、远征与挑战卡数学校验、建模常见错误；`tower-defense/README`、`doc/README` 卷行与卷首同步。
- 新增研究卷 [`doc/tower-defense/`](doc/tower-defense/README.md)：**《塔防游戏研究：内涵与外延》**（约 1.4 万汉字，单篇论文）——内涵（七个构成要件 + 判据测试表）、外延（家族相似与「要素 × 类型」判定矩阵）、历史谱系（Missile Command / Rampart / 魔兽 III 自定义图 / Desktop Tower Defense / PvZ / Kingdom Rush / Anomaly / 保卫萝卜 / 明日方舟）、形式分析（`B`、`D=(B/B_ref)×(P_ref/P)`、泊松漏怪与胜率函数，附本作五章 94.9%→43.6% 与远征 84.4%→3.6% 实测表）、设计空间与五种亚型、心理（Flow/MDA/损失厌恶/结构随机）、经济与关卡成本、美学与在地化、坏塔防六症状、融合接口与 AI 方向，附录含术语表、文献与资料（含 [Desktop tower defense is NP-hard](https://doi.org/10.1007/978-3-319-60675-0_2) 及理论著作）与 20 条设计检查清单；`doc/README.md` 由三卷更新为四卷并增入口。
- **补上知识库出入口 [`doc/README.md`](doc/README.md)**（此前 `doc/` 没有顶层 README，是上一轮记下的待办）：
  - **为什么需要**：`doc/` 是知识库，读者一进去会看到一堆卷而不知从哪开始；而根 [`README.md`](README.md) 的"你是哪种读者"**正把非技术维护者指向这里**——没有索引页，友好度就在最后一跳断掉。
  - **做法：纯索引，只指路不重述**。本文只维护"**有哪几卷、入口在哪**"，**卷内清单一律交给各卷自己的卷首**——两处清单必然分叉（这是本工作区反复验证过的模式）。
  - 内容：三卷一览（含规模与入口）+ **按目的分流**（先看全局地图 / 通读主卷 / 只读某个"××朋克" / 离线合订本 / 看某款游戏策划 / 查术语），并写明**题材权威在此、其它部分引用而不复制**。
  - 与豁免的关系：`doc/` 豁免的是**卷内结构与命名**（机器校验不覆盖）；**出入口是给人指路的，本就该有**——两者不冲突。已把 [`rules/README.md`](rules/README.md) §三 里那条"待办"更新为"已补齐"，避免留下过期陈述。
  - 同步：[`README.md`](README.md) 的目录表补 `doc/` 一行、读者分流行改为指向索引入口。

### 变更
- **元规则覆盖收口：`report` 与 `pending` 双双归零——工作区不再有"没被检查、也没被说明"的关注点**。`block` 由 3 个扩到 **8 个**，另加 **4 个写在明处的豁免**：
  - 新转正四个：`tools/`（11 合规）、`projects/livefab`（21）、`projects/website`（34）；`doc/` 与 `studio001/` 按用户裁决**明确定为豁免**（理由与推翻条件见 [`rules/README.md`](rules/README.md) §三）。
  - **实测结论：这些"欠账"全部是配置精度的产物，不是真结构债**。最典型的是 `projects/website` 的 6 条里有 3 条是**被 gitignore 的生成物目录**（`.data`/`.output`/`backups`）。
  - 写配置时踩到并记录一个易错点：**`skip_prefixes`（点开头）只过滤文件、不过滤目录**——所以 `.output` 这类**点目录必须显式写进 `skip_dirs`**，否则会被判"未知类型目录"。
  - **`tools/` 有一条真缺口并已修**：它按 M1 应有出入口 `README.md` 而没有。新增 [`tools/README.md`](tools/README.md)（工具清单 + 跑法 + "检查器必须自检"的硬要求），并把 [`tech/README.md`](tech/README.md) 里那份重复的工具表**改为指向它**——两处列表必然分叉。
  - **顺带发现（待办）**：`doc/` 缺少顶层 `README.md`（出入口）。按 M1 本应有一个，这是它被豁免后**已知且接受**的缺口；但根 [`README.md`](README.md) 的"你是哪种读者"正把非技术读者指向 `doc/`，**那里没有索引页会让人迷路**——建议后续补一个纯索引的 `doc/README.md`（不改任何卷的内容）。

### 变更
- **元规则覆盖首批转正：`block` 由 2 个关注点扩到 5 个**（[`workspace-scope.json`](rules/meta/tools/workspace-scope.json)）：新增 `tech/`（10 合规）、`projects/tomorrows-channel`（29）、`projects/refu-game-001`（18）——各写了**专门判定配置**，实测 **0 违规**。这三个此前只有通用配置，写了忠实配置后一次达标（**"实测 0 违规"是转正的前置条件**，不是转正后的期望）。
  - 写配置时发现检查器的一个**易错点并记录**：类型目录**不是完全不透明的叶子**——它会被**再查一层文件命名**。因此 `tech/references/`（放数据与资产，非文档）必须给它**单独的命名规则**（`doc_naming.references`），否则 `gh_meta.jsonl`、`visualization-edf21c0f.html` 这类文件会被误判为"命名不合规"。
  - 另记一条：命名正则匹配的是**含扩展名的完整文件名**，写 `^[a-z0-9-]+$` 会漏掉 `.md`（本次即因此先报 5 条假阳性，已改为 `\.md$`）。
  - `report` 剩余 5 个：`tools/`（2）、`doc/`（粗估 332）、`studio001/`（2）、`projects/livefab`（2）、`projects/website`（6）——**欠账数字保持可见**。

### 变更
- **修正 `tech/changelog-convention.md` 的模板与示例**（用户直接修改）：结构模板与完整示例里的版本头 `## [1.2.0] - 2026-09-09` / `## [2.0.0] - 2026-09-09` 补上时分（`2026-09-09 10:11`），与 §五 的格式规定一致——**示例若不合规，抄示例的人必然写出不合规的日志**。已核实：纳入范围内的版本头现已**全部**精确到分（残留的只到日期者仅在被豁免的 `indie/dsh-pet-refu/` 与第三方 `node_modules/`）。

### 修复
- **"变更日志规则"自身的时间表述与实现矛盾**（审计发现，属"照文档写会被自己的闸门拒"那一类）：
  - [`tech/changelog-convention.md`](tech/changelog-convention.md) 的版本条目头写的是 `## [<版本>] - <YYYY-MM-DD>`（**只到日期**），而 [`tools/check_changelog.ts`](tools/check_changelog.ts) 的自测用例名字就叫"缺时分…**旧格式必须被拒**"，8 份实际日志**全都**带 `HH:MM`——**文档描述的正是闸门会拒绝的格式**。已改为 `YYYY-MM-DD HH:MM`（4 处）。
  - 同一文档**从未写明**"版本头时间必须等于该版本 tag 指向提交的**作者时间**"这条核心机制——而它正是这两轮提交被拦下的原因。新增 **§九 版本头时间 ↔ 标签（机器校验）**：写明取作者时间（`%ad`）、正常流程（先定时间 → `GIT_AUTHOR_DATE` 提交 → 立刻打 tag），以及**为什么允许"最新版本暂时没有标签"**（标签必须指向已存在的提交，而版本头是"本次提交要引入的版本"）。
  - 顺带修掉该文档**两个「七」重号**（"示例"与"哪些变更写进根日志"），后者renumber 为「十」。

### 变更
- **时间规则三处收敛到单一事实来源**（此前 R06 与 M2 重复表述，**且重复已经产生了冲突**）：
  - [R05](rules/R05-changelog.md) 条款 2：由"**东八区日期**"改为"**东八区、精确到分**"并指向 [R06](rules/R06-time.md)；按 R05 §二.5 在演进历史补 v3 行。
  - [M2](rules/meta/M2-naming-vocabulary.md)：时间的**精度/来源/时区/同分钟冲突**改为**指向 R06**（本文只保留"命名的形状"）。**修正 §二.3 原先"时间一律用系统 `date`"**——它与 R06 冲突且不完整：已提交的产物应以 **git 提交时间**为准，那才是可复算的事实。补演进历史 v3。
  - [R06](rules/R06-time.md)：**补"时间戳 vs 指向性日期"的区分**——前者（该产物自身何时产生）必须到分，后者（叙述里引用某天发生的事）保持日期即可。
    **这条区分是实测逼出来的**：不补则"只写日期即不合规"会把日志里 **45 处**正常的叙述性引用（如"（2026-10-03）分叉到独立开发"）判为违规——**规则一旦不可执行，就会被当作耳边风**。同时把"文档日期凭印象写成 09-07/09-09、实际提交 09-08"的**真实案例**并入立规依据。补演进历史 v2。

### 新增
- **元规则 M1+M2 的机器校验从"只覆盖 `rules/` 与 `lab/`"扩到工作区各关注点**（[`rules/meta/tools/workspace-scope.json`](rules/meta/tools/workspace-scope.json) + [`meta_rules_scope.ts`](rules/meta/tools/meta_rules_scope.ts)，接入 pre-commit 与 CI）：
  - **为什么必须做**：此前 M1/M2 只有两处写了判定配置，于是"**在项目里另立一套命名不会被任何检查发现**"——2026-10-08 的讨论记录命名与 M2 冲突，就是这么漏过去的。
  - **为什么不一次全开**：实测用通用配置跑 `projects/` 会产出上百条**因配置不全而来的假阳性**（如子关注点没给子配置时，其内所有目录都被判"未知类型目录"）。**闸门一旦变成噪声，人就开始绕过它——比不查更糟。** 故分四级：`block`（纳入闸门，必须 0 违规）/ `report`（只报告不拦截，欠账可见）/ `pending`（尚未配置）/ `exempt`（按 rules/README §三 豁免）。
  - **当前覆盖**：`block` = `rules/`、`projects/mainline/`（后者实测 **44 合规 / 0 违规**，具备纳入条件）；`report` = `tech/`、`tools/`、`doc/`（欠账粗估 332 条，需专门配置）、`studio001/`、`livefab`、`tomorrows-channel`、`refu-game-001`、`website`；`exempt` = `indie/`、`lab/`。
  - **执行器的一条防假通过设计**：从检查器输出里**取不到违规数时返回 `null` 而非 `0`**，block 条目取不到数即判失败（自检里有这条负向用例）——否则"检查器崩了"会被当成"没有违规"。
  - 缺口写进 [`rules/README.md`](rules/README.md) **§3.1**（"机器校验的实际覆盖"），并给出推进方式：**一次只开一个关注点，且开之前先确认它是干净的**。
  - 负向自检 **7/7**。

### 新增
- **新增根规则 [R06 · 时间与时间戳约定](rules/R06-time.md)**（`accepted.active`）：**时间一律东八区、精确到分、不得脑内手写**。这是"时间"这件事的**总规则**，后续时间类新约定一律追加进本文（故取名 `R06-time.md`，而不是 `time-precision`）：
  - **来源二选一**：已提交产物 → **git 提交时间**（可复算）；正在新建的文件 → **系统时钟**。两者不一致时**以提交时间为准，改文件名而不改提交**（提交历史是事实，命名是可修正的表述）。
  - **格式三处各自固定**：正文 `YYYY-MM-DD HH:MM`｜文件名（时事件）`YYYYMMDD-HHMM-关键词`｜同分钟多件加 `-NNN-` 序号。文件名用 `HHMM` 是**有意与正文不同**（无冒号：Windows 非法字符、URL 需转义，且可直接排序）。
  - **写明一处已知例外**：规则演进表与变更日志表格的日期列保持 `YYYY-MM-DD`——该列由 [M3 检查器](rules/meta/evolution/rule_evolution_check.ts) 按固定正则解析，加了时分反而会让整行**被静默跳过**。
  - **依据**：用户要求"添加一条关于时间的规则到根，把时间尽量精确到分等等都写进去"；汇总自 [M2 §二.2–3](rules/meta/M2-naming-vocabulary.md) 的既有要求并升级为总规则。**两次实测教训**：① 变更日志版本时间曾"事后脑补"，与标签指向的提交对不上，那条校验形同虚设；② 讨论记录只用日期，同一天 9 次讨论**无法排序**。
- **新增时间戳命名闸门 [`tools/check_time_naming.ts`](tools/check_time_naming.ts)**（R06 的机器校验，接入 pre-commit + CI）：
  - **覆盖**：`projects/mainline/docs/discussions/` 与 `**/plans/**`。**只守"看起来像时间戳的文件"**，不要求目录下所有文件都带时间戳——实测 `plans/**` 里**合法地混着** `00-project-plan.md`（编号式）、`_meeting-template.md`（模板）、`000-…-summary.md` 等；要求它们都带时间戳是错的。
  - **两类判定**：① 格式必须是 `YYYYMMDD-HHMM-关键词`（能抓住"写成 `2026-09-30_主题.md` 旧形态"这类回归）；② 语义——**文件名时间不得晚于首次提交时间**（不许"向后写"），未提交的新文件只查格式。
  - **刻意不要求"日期相同"**：文件可以先写、稍后提交（实测 `20260906-1534-milestone-plan.md` 在 09-08 才提交）；把合法情形变成假失败比漏报更糟。差距超一天时**提示**而不判失败。
  - 负向自检 **13/13**；另用"临时造一个旧式文件名"实测它能拦下。

### 变更
- **根目录整理（面向非技术维护者）**：按 [M1 §四](rules/meta/M1-file-organization.md)（跨关注点的素材 → 技术侧）把两处根级技术杂物归位，并给根 README 加**读者分流**：
  - `gh_meta.jsonl`（GitHub 仓库元数据抓取结果）→ [`tech/references/`](tech/references/README.md)。它**全库 0 处引用**，是 2026-10-03 随网站工作遗留在根的孤儿数据文件。
  - 根 `viz/` → 归档其快照进 [`tech/references/visualization-edf21c0f.html`](tech/references/visualization-edf21c0f.html)，**移除根 `viz/` 目录**。
    **核实清楚了一处此前的误判**：根 `viz/` **不是**当前可视化管线的输出目录——活的输出在 `lab/formal-system/concerns/visual-fallback/viz/`，且那里**自带 `.gitignore`（`*.html`）**；根 `viz/` 是**旧布局遗留**，其内容无人引用。因此**没有**给根 `viz/` 加 ignore 规则（那会是一条指向不存在目录的死配置），而是按"M1 跨关注点素材"归档。**归档而非删除**的理由：`gh_meta.jsonl` 可重取，但那份 HTML 快照**不一定能原样重建**。
  - 根 [`README.md`](README.md) 新增「**〇、先看这里：你是哪种读者**」：按"产品/非技术维护者""参与某个项目""开发/维护者"三类给出**该看哪些、可以忽略哪些**。**根目录不追求条目最少，而是每类人都能一眼找到入口并知道哪些与自己无关**——把技术目录藏起来反而让人找不到规则，所以做法是**导览而非隐藏**。
  - 同步：新增 [`tech/references/README.md`](tech/references/README.md)（说明两份素材的来源与"不承载约定"的定位）、[`tech/README.md`](tech/README.md) 索引与工具表、[`projects/mainline/docs/02_资产盘点与杠杆.md`](projects/mainline/docs/02_资产盘点与杠杆.md) 的资产登记。
- **合规审计（顺带做，结论记录在案）**：8 份变更日志（9/9 或 8/8）、元规则 M1+M2 / M3 / M4、链接校验**全部通过**。发现并纠正的**唯一一处规则冲突**是讨论记录命名与 M2 不一致（见 `projects/mainline` 日志）。

### 修复
- **补上两个"闸门其实没在守"的漏洞（都来自上一轮搬家的实测）**：
  - **① pre-commit 的链接闸门不覆盖重命名**。它用 `--diff-filter=ACM` 选暂存文件，`R`（重命名）被排除——于是上一轮搬动 327 个文件时，**只有 17 个 Markdown 进入校验**，而且**确实漏掉过一条错链**（`future-debris/CHANGELOG.md` 里的 `../../docs/…`，被我手动跑全量校验时抓到）。改为 `--diff-filter=ACMR`（`--name-only` 对重命名给出的是**新路径**，那正是要校验的对象）。**已用可逆探针实测**：同一处重命名，`ACMR` 收录、`ACM` 为空。
  - **② "版本号与 git tag 对得上"对新版本提交天然不可满足**。tag 必须指向一个**已存在**的提交，而版本头是"本次提交要引入的版本"——提交前必无 tag，于是**每次版本提交都被 pre-commit 拦下**；而 `tech/changelog-convention.md` 里**从未写过这套流程**（无章可循）。抽出纯函数 `tagAllowance`：**最新版本允许暂缺 tag**（提交后立刻打即可），**更早的版本必须都有 tag 且时间一致**——后者才是这条校验真正要守的（防止版本头与历史脱钩）。新增 3 条负向自测（最新缺失应通过 / 更早缺失必拒 / 时间不符必拒），自检 12/12。

### 变更
- **主线项目 future-debris 的八道闸门接入 CI**（此前**完全没进 CI**——`verify.yml` 只对《明日频道》做 Godot 加载检查）：
  - 给 `run.sh check` 加 `--python-only` / `--godot-only` **分流**：闸门 1–3 只需 python3，闸门 4–8 只需 godot。于是 CI 可以**python 门在 runner 上跑、godot 门在 Godot 容器里跑**，而容器（`barichello/godot-ci`）**不需要装 python3**。
  - 两条 CI 命令**都走项目自己的 `run.sh`**，不在 workflow 里复制任何检查逻辑——否则 CI 与本地会慢慢分叉。
  - `run.sh` 靠**上溯查找 `.git`** 定位工作区根（不数 `..` 层数），因此挂载到 `/app` 后自动把 `HOME` 指到可写目录。
  - **诚实标注**：容器那一步**未在本地验证**（本地 docker 守护进程未运行、无法拉镜像试跑），已在 workflow 注释里写明"首次失败优先查哪两点"。
- **主线项目目录归位：`projects/future-debris/` → `projects/mainline/future-debris/`（工作区结构级）**。原先"主线项目"横跨两个目录——`projects/mainline/`（策划与决策空间）与 `projects/future-debris/`（可运行实现），本文件此前也记过这处别扭。本次按用户裁决定为**"纲领 + 具体项目"两层**：
  - **`projects/mainline/` 是纲领**（不是某一款具体游戏）：**决策历史长期留存、可容纳多个具体项目**；**具体项目是它的子目录、按代号命名**——因此 `future-debris/` 作为项目目录仍符合 [`rules/R01`](rules/R01-docs-convention.md)/[08 §三](projects/mainline/docs/08_共同语言与命名.md) 的"项目目录 = `projects/<代号>/`"，而 `mainline/` 本身不是项目故不受此约束。
  - **用户给出的理由（决定性）**：*未来有一定可能会换一个其它具体项目作为新主线项目的具体项目，但主线项目的决策历史之类的文档还需要保留*。
  - **规模与校验**：`git mv` 移动 **327 个受跟踪文件**（全部识别为重命名，历史保留）；**改写 147 处相对链接**（源在树内 90、源在树外 57），按"移动前解析 → 映射 → 从新位置重算相对路径"统一处理，改写后目标**零缺失**；全量链接校验 **3519 条内部链接、0 条因本次搬家失效**。
  - **顺带**：`tools/hooks/pre-commit` 的 CHANGELOG 路径映射同步到新路径；根 [`README.md`](README.md) 项目表两行（路径 + 早已过期的描述）；`mainline/README.md` 修正两处自相矛盾陈述（"这里现在没有代码"/"仍未写代码"——实现早已到 S4）；修掉 `board_system.gd` 注释里一条**此前就是坏的**链接；删除 `future-debris/.build`（231 MB 可重建缓存，目录由 236 MB 回到 4.5 MB）。
  - **发现（未改，待裁决）**：① pre-commit 用 `--diff-filter=ACM` 选暂存文件，**重命名（R）的文件被排除**，于是"搬家"这类改动的链接校验覆盖不完整（本次靠手动跑全量校验补上）；② 该步的"版本号与 git tag 对得上"对**新版本提交天然不可满足**（tag 必须指向尚不存在的提交），且约定文档未写明流程——本次以"手动跑全闸门 → 提交 → 立刻打 tag → 复验"完成。

### 变更
- **给 6 份子项目日志补齐 git 标签（85 个），把关正式覆盖"版本-标签一致性"**。上一轮统一了格式与版本号，但只有根与 LiveFab 有标签，于是**最值钱的那条校验（版本头时间必须等于标签指向提交的时间）只覆盖了 2/9 份**。本次补齐：
  - `website-v`（28）、`future-debris-v`（19）、`formal-system-v`（18）、`mainline-v`（9）、`tomorrows-channel-v`（6）、`refu-game-001-v`（5），合计 **85 个**；根与 LiveFab 的 6 个标签此前已有。
  - 每个版本的时间都能在全仓库历史上找到**恰好同分钟的提交**（0 个落空），标签就打在它上面——所以这条校验是**真的在验证**，不是自说自话。
  - pre-commit 第 6 步加上"文件 → tag 前缀"的映射，于是每次提交都会跑这条校验，不再只覆盖 2 份。

- **`indie/*` 三个项目明确不改**（用户裁决）：它们是**独立仓库**（各自的 `.git` 与远程，根 `.gitignore` 排除），日志格式与版本号由各自维护；统一格式的前提"用本仓库历史定版本时间"对它们不成立。

### 变更
- **子项目变更日志统一到方案甲，并给没版本号的补了版本**。原先全工作区有**两套格式**：子项目用 `## [0.1.0] · 2026-09-16 · 描述`（中点分隔、只有日期），而根与 LiveFab 已用方案甲 `## [X.Y.Z] - YYYY-MM-DD HH:mm`。本次统一 **7 份**：
  - `projects/website`（28 个版本）、`lab/formal-system`（18）、`projects/refu-game-001`（5）、`projects/tomorrows-channel`（6）、另加迁移新建的 `projects/future-debris`（19）、`projects/mainline`（9）、`projects/livefab`（原有版本头补上时分）。
  - **没版本号的按真实提交时间补号**：原先挤在 `[Unreleased]` 里的内容，逐节用 `git log -S` 定位引入提交、按时间正序编版本（无既有版本时从 `0.1.0` 起、按 MINOR 递增）。原 `[Unreleased]` 里若有叙述性子块（`已知限制`、`设计取舍`），保留原样不强行归类。
  - 版本头保留原有的 `· 描述`（如 `## [0.1.0] - 2026-09-16 12:51 · M1 垂直切片可玩`），校验器相应放宽。
- **pre-commit 把关扩到全部被跟踪的 CHANGELOG**（动态发现，新项目自动纳入），不再只覆盖根与 LiveFab。校验器为此做了三处**有记录的放宽**：类目接受中英两种写法；时间允许并列（同一提交写多节是常态）；"每个 `###` 都得是类目"降为"**每个版本至少一个类目小节**"，再降为"**文件至少一个类目小节**"——因为那批老日志普遍夹着叙述性子标题，层层放宽的过程已写进代码注释，免得以后被误当成强约束。
- **⚠️ 三处我自己造成并已修的问题**：
  1. **迁移时凭空造了时间**：`indie/*` 其实是**独立 git 仓库**（根 `.gitignore` 排除），我在根仓库里跑 `git log` 查不到历史，于是给它填了 `2026-09-13 00:00` 这种假值。已从子仓库恢复原文件，**假时间不留在库里**。
  2. **一次编辑写坏了两个文件**：转换脚本加 `cwd` 参数后 `pathlib.Path(rel)` 读到了错误路径，把**根日志的内容写进了两个 indie 文件**。两者在各自仓库里被跟踪，已 `git checkout` 恢复；根日志经查完好。
  3. **又一次"插错位置"**（累计第五次）：把整个第 6 步插进了步骤 2 的缺失分支里，形成一份**死代码副本**。已从 HEAD 恢复后只替换活跃那份。**那份死代码副本已于 2026-10-05 清除**（步骤 2 内、原本不可达；删掉 27 行后全文只剩一份 `check_changelog()` 定义，实测钩子仍正常触发并通过）。

> 下一轮的改动写在这里；发布时并入新版本号并补上时间。

### 变更
- **把根日志里属于子项目的条目迁入各自的项目日志，并建立把关**。根日志此前混着大量单项目内容（`projects/future-debris`、`projects/mainline`、《明日档案》、`refu-game-001`、LiveFab……），同一件事在根与项目日志两处出现，两边都可能过期。本次按**主导路径引用**判定归属，迁出 **33** 节：
  - `projects/future-debris` 19 节、`projects/mainline` 9 节（后者是**新建**——"主线项目"横跨"策划与决策空间"与"游戏本身"两个目录）、`projects/website` 3 节、`projects/livefab` 1 节、`projects/refu-game-001` 1 节；
  - 迁入内容**一字未改**，只在每节标题后补上**原提交时间**，统一放在各项目日志的 `## [从工作区根日志迁入]` 段里；
  - 根日志只保留 5 节工作区级变更。`0.2.0` 的内容全部迁出而成为空版本，已删除，随之成为孤儿的 `workspace-v0.2.0` 标签也一并删除。
  - **⚠️ 迁移引入并修掉了一个真问题**：内容换目录后**相对链接深度变了**，一次性产生 **247 处失效链接**（原来相对仓库根写的链接，搬到 `projects/<x>/` 下就多错两级）。已统一补 `../../` 修正，校验归零。
- **建立未来把关**：[`tools/check_changelog.ts`](tools/check_changelog.ts) 新增 `--assert-workspace-level`，检查根日志里是否有"只写某一个子项目"的条目；pre-commit 对根日志默认开启。判定标准与**能力边界**写进 [`tech/changelog-convention.md` §七](tech/changelog-convention.md)（新增第七节）。负向自检 7 → **9** 条。

### 新增

- **变更日志规格收口到工作区根：加版本号与精确到分的时间，并把校验器提为工作区级工具**。根 `CHANGELOG.md` 此前与 LiveFab 一样，只有**一个 `[未发布]`**、且**小节顺序是乱的**（按每节正文用 `git log -S` 定位真实提交时间后发现：同一文件里 09-14 与 10-03 的条目相邻）。本次：
  - 按每节正文定位到的**真实提交时间**重排为时间倒序，并切成 4 个版本：
    `0.4.0`（10-05 变更日志方案）、`0.3.0`（10-03 项目格局变化）、`0.2.0`（10-01 主线项目 S4）、`0.1.0`（09-30 及更早：基座与 S1–S3）；
  - 版本头改为 `## [X.Y.Z] - YYYY-MM-DD HH:mm`（东八区）；打 `workspace-v0.1.0`～`v0.4.0` 四个标签；
  - 把校验器从 `projects/livefab/tools/check-changelog.ts` **提升为工作区级** [`tools/check_changelog.ts`](tools/check_changelog.ts)，加 `--file` 与 `--tag-prefix` 两个参数，于是同一份实现能校验根与各项目的日志；
  - pre-commit 第 6 步随之改为**通用**：暂存涉及根或 LiveFab 的 CHANGELOG 时分别校验。

- **★ 顺带修掉钩子里 8 处潜伏的 `unbound variable`**。这 8 处都是同一个坑：`$VAR` 后面紧跟中文全角字符时，bash 会把全角字符也并进变量名 —— 而**这个坑我上一轮才在 `docs/07 §3.6` 里记录过，这次又在钩子里踩了一遍**。更值得记的是：钩子里原本就有 **7 处**（`$LINK_SCRIPT，`、`$DATA_SCRIPT，` 等），它们只在"对应脚本文件缺失"那条分支才会执行，所以一直潜伏没人发现。而那恰恰是最需要清晰报错的时候 —— 真触发时得到的是一句 `unbound variable`，且钩子以**错误的理由**失败。已统一改为 `${VAR}`。

## [0.4.0] - 2026-10-05 22:00

### 新增

- **pre-commit 钩子新增第 6 步：LiveFab 变更日志格式与版本-标签一致性校验**。暂存涉及 `projects/livefab/CHANGELOG.md` 时触发，交 `projects/livefab/tools/check-changelog.ts`（该脚本刻意只用 node 内置模块，以便被钩子用 `node --experimental-strip-types` 直接跑——Bun 专有的 `import.meta.dir` / `Bun.spawnSync` 已替换为 `import.meta.dirname` / `execFileSync`）。校验 9 项，其中最值钱的一条是**版本号与 git tag 对得上**：若存在 `livefab-v<版本>` 标签，版本头时间必须等于该标签指向提交的时间——**其余几条只保证"格式自洽"，这条保证"内容不假"**。已做负向验证：把 `0.3.0` 的时间谎报 30 分钟，校验精确报出 `livefab-v0.3.0: 文档 2026-10-05 21:59 ≠ git 2026-10-05 21:29`。

## [0.3.0] - 2026-10-03 17:48

### 变更

- **LiveFab 方案已分叉到独立对话开发（2026-10-03）**；[`projects/livefab/`](projects/livefab/README.md) 保留为**方案与决策存档**，后续实现不在本会话进行，可安全作为基线。**[`projects/website/`](projects/website/README.md) 的后续开发仍在本会话进行**（用户说明）。同轮把 website 的交接文档同步至 v0.2：§三 由「待申请配置」改写为「Giscus 已完成」，并记录唯一遗留项（`NUXT_PUBLIC_SITE_URL` 为空）。

## [0.1.0] - 2026-09-30 22:05

### 变更

- **`studio/` 更名 `studio001/` 并搁置（开发策略转向）**：原"模拟人类组织 / 虚拟角色"的 AI 开发工作室更名为 [`studio001/`](studio001/README.md)，**保留作历史资料、不再使用/更新**；工作区开发策略调整为**由项目方直接结合 AI 开发**（不依赖虚拟角色分工）。同步更新全工作区引用（根 `README.md`、`rules/`（R01/R02/README/meta-M1）、`tech/`、`projects/tomorrows-channel/`、`indie/`、`lab/`、`doc/refu-game-001/` 及工具脚本 `tools/check_links.*`、lab 的 visual-fallback 扫描目录），[`studio001/README.md`](studio001/README.md) 增搁置标注；链接校验 0 失效、规则/元规则检查 0 违规。
- **D9 更名与 D10 定案，并补三份卡表产出**：`doc/refu-game-001/` 的"合约卡"对外更名为**挑战卡**（旧称保留于文档备注）；新增 [`13_卡表_挑战卡样例.md`](doc/refu-game-001/13_卡表_挑战卡样例.md)（首发 5 张挑战卡 + 奖励系数）、[`14_卡表_铁砧联邦核心12卡.md`](doc/refu-game-001/14_卡表_铁砧联邦核心12卡.md)（主族核心 12 卡 + 羁绊）；`00_决策记录` 增补 D10（编辑器与 UGC：先内测后开放）并升至 v1.2；[`06_关卡与地图卡`](doc/refu-game-001/06_关卡与地图卡.md) 与 [`09_路线图与融合玩法`](doc/refu-game-001/09_路线图与融合玩法.md) 同步编辑器策略与版本路线；README 与术语表补索引。
- **采纳 D9「合约卡」（自选难度修饰卡组）**：`doc/refu-game-001/` 的 [`06_关卡与地图卡`](doc/refu-game-001/06_关卡与地图卡.md) 新增"合约卡"规范（字段/示例/约束/复用价值），[`09_路线图与融合玩法`](doc/refu-game-001/09_路线图与融合玩法.md) 增加"向赛季与排行榜延伸"与版本路线调整，[`00_决策记录`](doc/refu-game-001/00_决策记录.md) 增补 D9 并更新修订记录至 v1.1；思路参考《明日方舟》危机合约（见 [`12_参考_明日方舟设计拆解`](doc/refu-game-001/12_参考_明日方舟设计拆解.md)）。
- **确立变更记录分层方案（C）**：根 `CHANGELOG.md` 为唯一权威；`doc/refu-game-001/` 仅契约类文档（`00_决策记录`、`02_卡片规则系统`、`11_数值框架表`）维护文末「修订记录」小表；细粒度历史交由 `git log -- <文件>`，错别字/格式不记（R05 琐碎豁免）。该约定写入该卷 README 的写作约定节，并为三篇契约文档补「修订记录」表。
- 根 [`README.md`](README.md) 增加 `indie/`、`lab/`、`rules/` 的目录说明与导览行；`lab/` 入口改为指向其自身的 README。
- 根 `README.md` 改写「约定豁免」说明：明确列出被豁免的具体规则（R01–R05）。
- [`tech/README.md`](tech/README.md) 更新：实验性技术规则成熟后的回流目标由 `tech/` 改为根 `rules/`。
- 新增本变更日志（本文件）与「每次变更须记录」约定（R05）。
- **提交信息描述统一改用简体中文**：在 [`tech/git-convention.md`](tech/git-convention.md) 明确「描述用中文、`type`/`scope` 等功能性标记保持英文」；并将既有（本会话）的英文提交描述改写为中文（仅改消息，不改文件内容/作者/日期）。
- [`indie/README.md`](indie/README.md) 子目录表新增 `dsh-pet-refu/` 入口（原为「暂无」占位）。
- [`indie/README.md`](indie/README.md) 子目录表新增 `live-rpg/` 入口。
- 根 `.gitignore` 新增忽略 `indie/dsh-pet-refu/`：独立子仓库由自身 Git 与远程管理，父仓库忽略而非提交，避免误存为 gitlink（嵌入式仓库）。
- 根 `.gitignore` 新增忽略 `indie/live-rpg/`：同上，独立子仓库由自身 Git 管理。
- [`rules/README.md`](rules/README.md) 索引改为两族：**具体规则 R 系列** + **元规则 M 系列**（`rules/meta/`）。
- 根 [`README.md`](README.md) 的 `rules/` 目录说明、导览行与「约定豁免」同步更新（豁免范围含元规则 M0–M3）。
- **R 系列具体规则转正**：R01–R05 由「占位」升级为**权威条款**——正文迁入 `rules/R*.md`，采用元规则 M3 模板（标题标状态 + 演进历史；R03/R04=`accepted.applied`，R01/R02/R05=`accepted.active`，见 [`rules/README.md`](rules/README.md)）。
- [`tech/`](tech/README.md) 对应文档降为**技术详解 / 实施说明**（非规则权威，分工保留）；各文档文首标注「规则权威」链接，`tech/README` 增「对应规则」列。
- **R04 范围限定**为「数据 schema 校验」（层次 1）；`formalization.md` 的 Godot 加载检查 / GDScript 边界 / 路线留 `tech/` 作技术文档。
- 演进检查 [`rules/meta/evolution/rule_evolution_check.ts`](rules/meta/evolution/rule_evolution_check.ts) 由只扫 `M*-*.md` 扩展为**同时扫 `R*-*.md`**；[`M0`](rules/meta/M0-rule-governance.md)（`tech/` 定位）与 [`M3`](rules/meta/M3-rule-evolution.md)（检查范围）同步更新并各追加演进历史。
- **规则检查接入 pre-commit 与 CI**：本地钩子 [`tools/hooks/pre-commit`](tools/hooks/pre-commit) 新增第 4 项——暂存涉及 `rules/` 时运行 [`meta_rules_check.ts`](rules/meta/tools/meta_rules_check.ts)（M1+M2 结构）与 [`rule_evolution_check.ts`](rules/meta/evolution/rule_evolution_check.ts)（M3 演进，覆盖 M 与 R）；CI [`.github/workflows/verify.yml`](.github/workflows/verify.yml) 增加对应两步。相关说明同步至 [`tech/hooks-readme.md`](tech/hooks-readme.md)、[`tech/README.md`](tech/README.md)、[`rules/README.md`](rules/README.md)、[`rules/meta/README.md`](rules/meta/README.md) 与 `install_hooks.sh` 提示。
- **配置远端并推送**：`origin` = `https://github.com/andyluss/LiveRefu`（`main` 已推送并跟踪，`pre-cc-rewrite` 标签一并推送）；CI [`.github/workflows/verify.yml`](.github/workflows/verify.yml) 自此在 push/PR 时实际触发。
- 更正「本仓库暂未配置远端」的过时说明：同步更新 [`tech/docs-convention.md`](tech/docs-convention.md)、[`tech/hooks-readme.md`](tech/hooks-readme.md) 与 CI workflow 顶部注释（并订正 CI 链接校验命令为 `tools/check_links.ts`）。

### 修复

- 修复 CI 中 Godot 步骤引用**不存在的 Action**（`addnab/action-run-docker`）、致整条 workflow 在 "Set up job" 即失败、所有检查步骤均不执行的问题：改为用 runner 自带 `docker run` 直接跑官方镜像（不依赖第三方 Action）。**并订正镜像**：原 `ghcr.io/godotengine/godot:4.7-mono` 在镜像仓库不存在（pull 失败，exit 125），改用实际存在的 `barichello/godot-ci:4.7.2`（项目为 GDScript、Godot 4.7，无需 mono）。
- 修复 fresh clone 下的失效链接（本地因文件存在而漏检、CI 才暴露）：[`indie/README.md`](indie/README.md) 与 [`CHANGELOG.md`](CHANGELOG.md) 指向被 gitignore 的独立子仓库文件（`indie/dsh-pet-refu/`、`indie/live-rpg/`）的相对链接，改为**外部仓库地址 / 纯文本**（这些文件不随本仓库分发）。
- 修复 CI 链接校验在「刷新可视面」之前运行、把生成物 `viz/index.html`（被 gitignore）判为失效的问题：将 `hub.ts --run` 步骤**前移**到链接校验之前。
- CI 动作升级：`actions/checkout@v4`、`actions/setup-node@v4` → **`@v5`**，消除 Node 20 弃用警告。
