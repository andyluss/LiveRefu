# evolution-history · 演进历史 / 时间序可视化（visual-fallback 的子关注点）

> 属于 [`../README.md`](../README.md)（可视化兜底）的一个**子关注点**：探讨并（未来）实现"**一切演进史 / 时间序**"
> 的信息可视化——把 Git 记录、CHANGELOG、元规则演进历史、文档版本等**随时间变化的事实**渲染成可视面，
> 让人类用**视觉直觉**快速感知"哪里变了、何时变的、为何变、是否健康"。

## 现阶段状态

- **文档 + 首个可视化脚本**：
  - [`evolution-visualization-exploration.md`](evolution-visualization-exploration.md)：**总探讨**——有哪些"演进/时间序"可视化。
  - [`rule_evolution_timeline.ts`](tools/rule_evolution_timeline.ts)：**P1 · 元规则状态阶梯**（TS，node/deno/bun 兼容）。
- 后续按探讨文档的优先级逐项增加（Git 活动图、CHANGELOG 时间线、文档质量演化等）。

## 脚本

**P1 · 元规则状态阶梯**（[`rule_evolution_timeline.ts`](tools/rule_evolution_timeline.ts)）

```bash
node --experimental-strip-types lab/formal-system/concerns/visual-fallback/evolution-history/tools/rule_evolution_timeline.ts
```

读 [`../../meta-rules/M*-*.md`](../../meta-rules/) 的演进历史表，把每条约规则的**状态机轨迹**画成阶梯图（x=版本，y=状态层级）：
产出 `viz/rule-evolution-timeline.html` + `.json`。一眼看出"谁一路升到已定、谁在回退/震荡、谁卡在 proposed"（见 M3 状态机）。

## 范围（什么是"演进/时间序"事实）

- **Git 提交历史**：commit 时间线 / 作者行为 / 文件随时间变化 / 变更密度。
- **CHANGELOG / 日志**：里程碑时间线、版本轨迹、`Added/Changed/Fixed` 趋势。
- **元规则演进历史**：每条规则的 `draft→…→retired` 状态轨迹（见 [`../../meta-rules/M3-rule-evolution.md`](../../meta-rules/M3-rule-evolution.md)）。
- **文档历史**：相对链接、`【待定】/【已定】`、复核账本、文件 mtime 的随时间演变。
- **其它时间序**：里程碑计划 vs 实际、版本/配比曲线等（随项目而定）。

> 与已验证的"文档健康仪表盘 / 一致性热力图"的不同：前者看**当前状态**，本子关注点看**随时间怎么变**。
