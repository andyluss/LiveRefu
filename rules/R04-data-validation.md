# R04 · 数据 schema 校验 · 占位

> 状态：**占位**。本文暂为名目，正文以 [`tech/formalization.md`](../tech/formalization.md) 为准；
> 正式版待 [`lab/formal-system`](../lab/formal-system/README.md) 实验成熟后迁入替换本文件。

## 规则要点（当前）

- 数据表按 schema 契约校验（必填/type/enum/范围），脚本 [`tools/check_data.py`](../tools/check_data.py) / [`tools/check_data.ts`](../tools/check_data.ts)。
- 与 `R03` 一同接入 pre-commit/CI。

## 未来

- 待 `lab/formal-system` 的形式化规则迁入后，替换为含「主选 + 备选 + 判定标准 + 演进历史」的正式版。
