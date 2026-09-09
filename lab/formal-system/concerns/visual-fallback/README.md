# 可视验证面（Visual Verification Surface）—— 人类兜底验证层

> 归属 [`lab/formal-system`](../../README.md)。前置认识：形式化（编译/契约/测试）只能判定
> **可判定**的东西；对文档、创意、设计这类**不可形式化**的产物，用**信息可视化**把它的
> "结构 / 覆盖 / 一致性 / 异常"渲染成图，让**人类用视觉直觉兜底验证**（`tech/formalization.md`
> 已明确"温暖、可久处"只能靠人评审，无法形式化——本层正是那条"人的兜底"路径）。

> **子关注点**：[`evolution-history/`](evolution-history/README.md) —— 一切"演进/时间序"可视化（Git/CHANGELOG/元规则演进史/文档历史）的探讨（当前仅文档）。

## 一、机制（三层协同）

| 层 | 谁在做 | 性质 |
| --- | --- | --- |
| ① 机器判定层 | 编译 / 契约 / 测试 | 确定性（已落地） |
| ② **可视异常面** | 脚本把产物渲染成图，人扫异常 | **本层，兜底** |
| ③ 人工复核账本 | 人登记 `approve / flag + 理由`（已实现，见 §四） | 可追踪、可统计 |

## 二、核心原则（防止"好看但没用"）

1. **只锚定可验证事实**：可视化必须连接真实字段（互链、`【待定】`、git/mtime 变更时间、主题），
   不做主观判断，避免沦为"美丽的假象"。
2. **异常优先**：默认渲染"哪里偏离"，而非全量内容——人类注意力有限。
3. **确定性可复现**：纯 Python 标准库、一键重跑、可入 CI（延续 `tools/check_links.py` 的零依赖哲学）。

## 三、工具：文档健康仪表盘（S1+S2）

```bash
python3 lab/formal-system/concerns/visual-fallback/tools/visual_health.py
```

产出：
- `viz/doc-health.html` —— **自包含**交互仪表盘（图谱 + 异常面板 + 清单），零依赖可离线打开。
- `viz/doc-health.json` —— 机器可读摘要（计数 / 按主题聚合 / 高【待定】Top），供 CI/报告/对话卡片复用。

可视化内容：
- **文档图谱**：节点=md 文档，边=文档间相对链接；节点大小∝活跃度（互链数），主题着色；
  **绿环=已通过(approve) / 橙环=已标记(flag) / 虚线=未复核异常 / 红点=陈旧(>60 天)**。
- **开放问题密度**：每文档 `【待定】`/`【已定】` 计数。
- **异常面板**：孤立文档 / 高【待定】文档 / 陈旧文档，均列出原因，供人工逐条确认。

> 说明：生成物 `<doc-health.html>` 为大体积派生文件，已 gitignore（一键重跑即得）；`*.json`
> 为小体积机器摘要，作为当前快照提交；**`review-ledger.json` 为人工复核账本（持久记录，入库）**。

### 工具 B：跨文档一致性热力图（S3）

```bash
python3 lab/formal-system/concerns/visual-fallback/tools/consistency_heatmap.py            # 生成热力图
python3 lab/formal-system/concerns/visual-fallback/tools/consistency_heatmap.py --self-test  # 自检检测逻辑(统一致/不一致/冲突/未提及)
```

产出 `viz/consistency-heatmap.html` + `.json`。把**同一契约字段**（如 `pomodoro_work`、`focus_max`、
`collect_frag` 的 common/rare/cult→初值映射）在**各文档的具体取值**与**权威源**（`data/tables/*.json`）
对拍成热力矩阵：

> 绿=与权威一致 / 红=不一致(≠权威) / 琥珀=同文档冲突(多值) / 灰=未提及。人类扫一行即可知"哪个契约在哪儿写岔了"。

## 四、人工复核账本（第③层）

`visual_health.py` 算出的每个异常（孤立 / 高【待定】 / 陈旧）都是"**待复核项**"。**人**用
`review_ledger.py` 登记复核结论，写入追加式、可追踪的 `viz/review-ledger.json`；再跑一次仪表盘，
异常即被标注为 `未复核 / 已通过 / 已标记`，并给出**复核覆盖率**。

```bash
python3 lab/formal-system/concerns/visual-fallback/tools/review_ledger.py status   # 先看每个文档的当前复核态
# 登记一条(对异常文档)
python3 lab/formal-system/concerns/visual-fallback/tools/review_ledger.py record \
  --rel <文档相对路径> --verdict approve|flag --reason "<原因>" [--reviewer <人>] [--action "<行动>"]
python3 lab/formal-system/concerns/visual-fallback/tools/review_ledger.py list       # 全部记录(含 时间/人/理由/id)
python3 lab/formal-system/concerns/visual-fallback/tools/review_ledger.py delete <id>  # 更正/撤销
python3 lab/formal-system/concerns/visual-fallback/tools/visual_health.py            # 重跑, 让复核状态并入仪表盘
```

- 账本是**追加式历史**（同文档可多次复核，最新一条=当前态），实现"每条复核留痕、可追溯"。
- 只记录人类的判断（`approve/flag` + 理由）；脚本**不推导、不伪造**结论。
- `visual_health.py --ledger <path>` 可指向其它账本；图谱以描边颜色表达复核态。

## 五、当前实测（2026-09-09 快照）

- **241 文档 / 263 显式互链 / 188 【待定】 / 17 【已定】 / 139 孤立 / 0 陈旧(>60天)**（字面计数，随文档变动）。
- **复核**：异常 179 / 已通过 0 / 已标记 1 / 未复核 178（账本新增"单个文档 23 个【待定】需收敛"一条 flag）。
- **洞察**：开放问题高度集中在**主项目计划与角色文档**（计划 64、图形程序 A 36、主程序 25…）；
  而 `doc/` 知识库正文**几乎无显式互链**——多数文档靠命名约定而非链接组织，因此孤立法很高。
- **人类怎么用**：扫一眼图表即知"该把注意力放哪"——若某块【待定】骤增、某主题孤立、某文档飘红（陈旧），
  就 `record --verdict flag` 登记并填理由，形成可追踪的复核账本。

> **已知边界**：`【待定】/【已定】` 为**字面次数统计**——因此凡是在文中"讨论本机制"的文档
> （如本 README、实验日志 `CHANGELOG.md`）也会因出现这些字样而被计入。这是**启发式信号，非精确审计**；
> 解读时以"真正标了待定的**内容**文档"（主项目计划/角色文档）为准，实验区自身的元文档可忽略。

## 六、后续候选（本层扩展方向）

- ~~S3 跨文档一致性热力图~~（**已实现**，见 §三·工具 B）
- S5 数据不变量图表（配比 / 范围 / 数量）。
- S6 设计/手感复核面（渲染缩略图 + 基调锚点，纯美学兜底）。
