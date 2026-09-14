# R04 · 数据 schema 校验（已定 · 已落地）

**一句话**：数据表（`data/tables/*.json`）须符合其 **schema 契约**（`data/schema/*.schema.json`）——必填字段 / type / enum / 范围 / 嵌套 `copyright`——由 `tools/check_data.*` **机器校验**。

## 一、目标

把"数据结构约定"从文档/注释变成**机器可判定的契约**，在提交/合入前拦下非法数据（越上限 / 低于下限 / 类型错 / 负值 / 缺字段）。

## 二、规则条款（主选）

1. **契约先行**：每类数据表有对应 `*.schema.json`，声明必填字段、`type`（integer/string/number/boolean/object/array）、`enum`、`min`/`max`、嵌套 `copyright`。
2. **可机器校验**：校验脚本 [`tools/check_data.py`](../tools/check_data.py)（纯标准库）/ [`tools/check_data.ts`](../tools/check_data.ts)。
3. **接入**：pre-commit 钩子（暂存涉及 `data/` 表时）+ CI（提交后兜底），与 [R03](R03-link-validation.md) 同属两道闸门。
4. **范围**：本规则**只管数据契约校验**；形式化验证的其它层次（接口契约扫描、Godot 加载检查、需求模型）属技术路线，不在本规则内——见技术详解。

## 三、备选（被放弃的选项）

| 备选 | 为何不为主选 | 代价 |
| --- | --- | --- |
| 只靠文档/注释约定 | 无机器验证 | 改名/改结构静默断裂 |
| 只校验类型、不校验范围 | 覆盖不足 | 非法值漏过 |
| 引入重型形式化框架 | 成本高、超出"可判定"边界 | 过度设计 |

## 四、判定标准

- `python3 tools/check_data.py`（或 TS 版）退出码 `0`。
- 非法数据（越上限 / 低于下限 / 类型错 / 负值）应以**非零退出**被拒。

## 五、自检问题

> "我改的数据，schema 契约同意吗？校验器跑过了吗？"

## 六、技术详解

- 形式化验证的现状、边界与演进路线：[`tech/formalization.md`](../tech/formalization.md)（**技术详解**）。
  其中「数据契约 → schema 校验」（层次 1）的**规则权威在本文件**；Godot 加载检查、GDScript 边界、层次 2/4/5 路线均为技术文档，不属本规则条款。

## 七、演进历史

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `proposed` | 立名目（占位）：登记 R04，正文暂以 `tech/formalization.md` 为准 | 建立根 `rules/` 目录 |
| v2 | 2026-09-14 | `accepted.applied` | **转正**：范围**限定为「数据 schema 校验」**（层次 1）；`formalization.md` 其余内容留 `tech/` 作技术文档；有校验工具，状态标 `applied` | 用户要求 R 系列转正；R04 只管数据 schema 校验 |
