# 变更日志（Changelog）

> 本文件记录 **LiveRefu · 复古未来知识库与 AI 开发工作室** 工作区根级的变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式与 [SemVer](https://semver.org/) 版本语义；完整书写规格见 [`tech/changelog-convention.md`](tech/changelog-convention.md)；
> 「每次（非琐碎）变更须记录」规则见 [`rules/R05-changelog.md`](rules/R05-changelog.md)。
> 各项目/实验的日志在其各自根目录（如 `projects/tomorrows-channel/CHANGELOG.md`、`lab/formal-system/CHANGELOG.md`）。

## [未发布]

### 新增
- 新增 [`doc/refu-game-001/12_参考_明日方舟设计拆解.md`](doc/refu-game-001/12_参考_明日方舟设计拆解.md)：**竞品参考文档**——《明日方舟》战斗机制（DP/朝向/阻挡/技能时机/地形）、职业三层结构、常驻模式（剿灭/集成战略/危机合约）、成长与商业化拆解，并给出可借鉴清单（DP 节奏、合约卡、Roguelike 规则卡组）、不借鉴清单与关键差异表；第三方数据均标存疑。
- 新增 [`doc/refu-game-001/11_数值框架表.md`](doc/refu-game-001/11_数值框架表.md)：**每卡一表**的数值框架（通用字段、按类型的数值块模板、示例卡表、调参流程），并更新该卷 README 索引。
- 新增 [`doc/refu-game-001/`](doc/refu-game-001/README.md)：**卡片式塔防游戏策划卷**（Refu Game 001）——含决策记录（D1–D8）与游戏概述、卡片规则系统、种族总览（三主族 + 三从族）、塔防核心战斗、卡组与组合、关卡与地图卡、移动端与界面、成长与经济、路线图与融合玩法、术语表，共 12 个文件；确立"全要素卡化、玩法＝规则卡组"的可拆可组设计。
- 新增 [`indie/`](indie/README.md)：**独立项目区**（与工作区主线无关的独立项目）；其子目录默认豁免根目录规则。
- 新增 [`lab/`](lab/README.md)：**实验项目区**（实验性质项目的入口）；其子目录默认豁免根目录规则。
- 新增根 [`rules/`](rules/README.md) **规则目录**：集中收口工作区具体规则；初始为占位规则 **R01**（文档约定）、**R02**（Git 与提交信息约定）、**R03**（相对链接校验）、**R04**（数据 schema 校验）。
- 新增 [`rules/R05-changelog.md`](rules/R05-changelog.md)：要求**每次（非琐碎）变更都写变更日志**；琐碎改动（如改错别字、纯格式）豁免。
- 新增 [`tech/changelog-convention.md`](tech/changelog-convention.md)：变更日志**格式规格**（Keep a Changelog 类目 + SemVer + 东八区日期，面向复杂情形）。
- 新增 [`rules/meta/`](rules/meta/README.md)：把 lab 的**元规则体系**（**M0** 规则组织 / **M1** 文件组织 / **M2** 命名词表 / **M3** 规则演进；**M4 除外**）复制整合进规则目录——含索引 `README.md`、判定配置 `meta-rules-config.json`、可运行检查 `tools/meta_rules_check.ts`（M1+M2 结构）与 `evolution/rule_evolution_check.ts`（M3 演进状态，TS 实现）；lab 原件原样保留为实验源。
- 新增 `indie/dsh-pet-refu/`：**独立 Git 仓库**项目 —— 复古未来风格电子宠物 DeepSeek Harness 插件（当前为规划阶段）；自带协作规范（`CONTRIBUTING.md`）与 Git 钩子，已推送到 [andyluss/dsh-pet-refu](https://github.com/andyluss/dsh-pet-refu)。（独立仓库，不在本仓库内。）
- 新增 `indie/live-rpg/`：**独立 Git 仓库**项目 —— **LiveRPG 活世界工作台**（DeepSeek Harness 插件，v0.1.0）：多世界观「世界包」编辑器 + 图文创作台；含三份原创内置世界观、种子确定性生成的地貌与徽记、命令行工具与 158 个测试用例。自带协作规范与 Git 钩子。（独立仓库，不在本仓库内。）

### 变更
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
