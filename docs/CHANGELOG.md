# 知识库变更日志（docs Changelog）

> 记录 **LiveRefu 知识库（`docs/`）** 的卷、文章、索引与内容结构变更。
> 工作区级变更仍记根 [`CHANGELOG.md`](../CHANGELOG.md)；本文件只记知识库内容。
> 本文件由根日志的 docs 相关条目迁入；原条目保留原文，版本时间见条目说明。

## [0.1.0] - 2026-10-27 21:13

### 变更

- **Refu Game 001 策划卷迁入项目文档**：`docs/refu-game-001/` → `projects/refu-game-001/docs/design/`；D9/D10 三条历史日志迁入项目 `0.1.5`，时间取 git 提交：变更记录分层 2026-09-14 12:35、D9 采纳 13:08、D9 更名/D10 13:20。
- **知识库目录更名 `doc/` → `docs/`**：`git mv` 整体迁移 566 个文件；同步根 README、AGENTS、rules/tech/tools、design/studio001/projects、网站内容层与 Godot 数据脚本中的根路径引用；`indie/` 内部的项目级 `doc/` 保持不动；`workspace-scope` 的豁免路径改为 `docs`。链接校验 0 失效。

### 新增

- **收编《磷环》Phosphorus Loop**：把未提交的塔防卡牌设计稿纳入 `phosphorus-loop/PhosphorusLoop.md`；核心是“磷不是敌人，流失才是”，三层时间尺度 + 维护力/信任资源。
- **软件生态与产品机会卷**：新增 [`software/`](software/README.md)（产品机会长文 + 3 篇深潜 + 13 篇生态文集 + 10 篇开源协议文集 + 用户目标分析）；`docs/README` 由四卷升为五卷。
- 新增 [`tower-defense/可视化/`](tower-defense/可视化/README.md)：塔防研究卷的**离线可交互图**（自包含 HTML，无外部依赖）——[00 总图索引](tower-defense/可视化/00_总图_研究可视化索引.html)（文档→图关系网）、[01 视觉语法·一屏四问](tower-defense/可视化/01_视觉语法_一屏四问.html)（图层开关实时判定四项关键信息＋1 秒读图自测，含八条画面检查表）、[02 难度标签·可解释难度](tower-defense/可视化/02_难度标签_可解释难度.html)（B/P 滑块 → D、λ=1.35·D³、解析通关率与四档标签，含指标矩阵与远征双口径）、[03 视觉谱系·五种取向](tower-defense/可视化/03_视觉谱系_五种取向.html)；研究卷卷首、美学卷与 AI 卷 README 加入口，策划侧可视化 README 增相关链接。
- 塔防研究卷再增两卷并统一数值口径：
  ① 新增 [`tower-defense/美学卷/`](tower-defense/美学卷/README.md)（5 篇约 10,273 汉字）：视觉语法（一屏四问、俯视与等距取舍、路径四层编码、明度分带与色加形、特效优先级与粒子预算、8 条画面检查表）、复古未来（雷达屏/沙盘/剖面/指挥台四母题、CRT 后处理上限、三件载体分工、单主光与反例）、千禧透明（四层结构×三档透明度、四个系统可视化收益、可读性四保险与 bling 三级、键色 60/25/10/5）、读图效率（1 秒四问测试、字号与对比度口径、裁决顺序、信息密度预算、发布前 10 条验收表）、代表作视觉谱系（五种取向对照）；
  ② 新增 [`tower-defense/AI卷/`](tower-defense/AI卷/README.md)（5 篇约 9,974 汉字）：AI 基准适配性（六个友好属性与四条限制、三类任务、最小可行协议）、复杂度与最优解边界（Suttichaya NP-hard 的准确表述 + Greedy Spiders 对照 + 近似算法）、LLM/RL 进展（TowerMind AAAI-26、IEEE CoG 2024、LiverDefense）、可解释难度（`B/P/D` 三元组、标签协议、五项指标矩阵）、实验协议与 12 条复现清单；
  ③ **数值口径统一**：远征八节点改为"设计表 84.4%→3.6%（23 号文档）／脚本 `--verify-rogue --n 20000` 实测 84.5%→3.8%"并列呈现，论文、数值卷 01/05/06 同步，并注明差异来源（随机种子与样本量，逐点 ≤0.6pp）；论文第九、十一节与附录 B 补入两卷互链，`tower-defense/README` 分卷表与 `docs/README` 卷行同步。 ④ **论文按 AI 文献核对补正**（现 16,170 汉字）：细化 CoG 2024 一行（实验对象为《植物大战僵尸》、PPO 选策略 + 脚本 AI 执行、用于关卡自动化测试、报告成功率），补 TowerMind 的观测形态/战争迷雾/合法动作率/人类基线，补 LiverDefense 与 ITOR 两篇的作者与卷期，新增 5.1 节的三条经典出处（Karp 1972 集合覆盖、Nemhauser-Wolsey-Fisher 1978 贪心近似、Itai 等 1982 网格哈密顿路径），并在 11.3 增列"AI 做关卡测试"这一落地用途。
- 塔防研究卷扩为三卷，并按新开的网络代理**补做联网事实核查**：
  ① **论文修订**（15,548 汉字）：补入经核查的硬事实（Missile Command 1980-06／Rampart 1990-10 的机制与"prototypical tower defense"出处、Turret Defense 2000-05 与 Sunken Defense 2001-11 的可考最早命名、COM2uS 2007/2008 "Tower Defense" 商标与 2010 发函、Flash Element TD 2007-01-12、Desktop Tower Defense 2007-03-03 的"无预设路径"与 mazing 动机及 1,570 万次游玩、PvZ 主创受魔兽 III mod 启发的反向提问、Kingdom Rush 2011-07-28 Flash 首发与销量口径冲突、Bloons TD 2009 因商标改名、Sanctum/Orcs Must Die! 与 Iron Grip: Warlord 2008、Anomaly 2011-04-08、保卫萝卜 2.5 亿下载、明日方舟收入数据标注二手转述），新增 4.9 词源与命名史、mazing/juggling/hybrid/tower wars 术语、AI 与优化文献表（TowerMind AAAI-26、IEEE CoG 2024、LiverDefense、ITOR 背包建模），并加入一条**引文警告**：FUN 2018 的 Restricted Power 研究的是 Greedy Spiders 而非塔防；
  ② 新增 [`tower-defense/案例卷/`](tower-defense/案例卷/README.md)（4 篇约 9,847 汉字）：Rampart 与 Desktop Tower Defense、PvZ 与 Kingdom Rush、Bloons TD 与 Sanctum/Orcs Must Die!、Anomaly 与明日方舟/保卫萝卜，统一六段模板（档案／七要件拆解／它证明了什么／可迁移做法／来源／互链）；
  ③ 新增 [`tower-defense/数值卷/`](tower-defense/数值卷/README.md)（7 篇约 9,254 汉字）：模型定义与推导（含模型 vs 实测 8 行对照）、八步参数标定、横向对照方法（置信度 A/B/C 与不等价性）、敏感性分析（实跑：γ=2/4 与 cap=2/4 均 FAIL，只有 γ=3 五章全 PASS）、验收与 CI、远征与挑战卡数学校验、建模常见错误；`tower-defense/README`、`docs/README` 卷行与卷首同步。
- 新增研究卷 [`tower-defense/`](tower-defense/README.md)：**《塔防游戏研究：内涵与外延》**（约 1.4 万汉字，单篇论文）——内涵（七个构成要件 + 判据测试表）、外延（家族相似与「要素 × 类型」判定矩阵）、历史谱系（Missile Command / Rampart / 魔兽 III 自定义图 / Desktop Tower Defense / PvZ / Kingdom Rush / Anomaly / 保卫萝卜 / 明日方舟）、形式分析（`B`、`D=(B/B_ref)×(P_ref/P)`、泊松漏怪与胜率函数，附本作五章 94.9%→43.6% 与远征 84.4%→3.6% 实测表）、设计空间与五种亚型、心理（Flow/MDA/损失厌恶/结构随机）、经济与关卡成本、美学与在地化、坏塔防六症状、融合接口与 AI 方向，附录含术语表、文献与资料（含 [Desktop tower defense is NP-hard](https://doi.org/10.1007/978-3-319-60675-0_2) 及理论著作）与 20 条设计检查清单；`README.md` 由三卷更新为四卷并增入口。
- **补上知识库出入口 [`README.md`](README.md)**（此前 `docs/` 没有顶层 README，是上一轮记下的待办）：
  - **为什么需要**：`docs/` 是知识库，读者一进去会看到一堆卷而不知从哪开始；而根 [`README.md`](../README.md) 的"你是哪种读者"**正把非技术维护者指向这里**——没有索引页，友好度就在最后一跳断掉。
  - **做法：纯索引，只指路不重述**。本文只维护"**有哪几卷、入口在哪**"，**卷内清单一律交给各卷自己的卷首**——两处清单必然分叉（这是本工作区反复验证过的模式）。
  - 内容：三卷一览（含规模与入口）+ **按目的分流**（先看全局地图 / 通读主卷 / 只读某个"××朋克" / 离线合订本 / 看某款游戏策划 / 查术语），并写明**题材权威在此、其它部分引用而不复制**。
  - 与豁免的关系：`docs/` 豁免的是**卷内结构与命名**（机器校验不覆盖）；**出入口是给人指路的，本就该有**——两者不冲突。已把 [`rules/README.md`](../rules/README.md) §三 里那条"待办"更新为"已补齐"，避免留下过期陈述。
  - 同步：[`README.md`](../README.md) 的目录表补 `docs/` 一行、读者分流行改为指向索引入口。
