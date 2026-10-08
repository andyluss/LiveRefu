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
