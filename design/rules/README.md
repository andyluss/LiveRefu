# 青橙设计规则 · Rules

> **本目录是青橙设计系统的“可执行规则”**：一条规则一个文件，和决策记录、实现文档分开。
> 状态：**v0.1 草案（格式待你裁决）** ｜ 日期：2026-10-26 ｜ 规则总数：15

## 一、规则格式（v0.1 提案）

每份 `R-NNN-*.md` 使用同一组字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| **ID** | 是 | `R-001`，永不复用 |
| **状态** | 是 | `proposed` / `active` / `deprecated` / `superseded` |
| **级别** | 是 | `MUST`（闸门）/ `SHOULD`（默认遵守）/ `MAY`（允许选择） |
| **范围** | 是 | 适用于哪些介质/产品/文件 |
| **生效** | 是 | 日期；`proposed` 写“待批准” |
| **Owner** | 是 | 设计主控 / 工程 / 用户 |
| **关联** | 否 | D/E 决策、文档、脚本 |

正文固定五节：

1. **规则**：一句可执行的规范；
2. **要求**：编号的 MUST/SHOULD 条款；
3. **验收**：机器命令或人工检查；
4. **例外**：谁批准、期限、登记处；
5. **变更记录**：日期 + 版本 + 变更。

## 二、状态与优先级

- `active`：已生效；违反即闸门失败或评审阻断。
- `proposed`：草案；不阻塞现有实现，批准后转 active。
- `deprecated`：不推荐；保留兼容期。
- `superseded`：被新规则替代；保留链接。
- 冲突时：**用户明确指令 > `design/rules/` > 设计文档 > 习惯**。

## 三、规则索引

| ID | 规则 | 状态 | 级别 | 文件 |
| --- | --- | --- | --- | --- |
| R-001 | 三态主题：系统 / 深色 / 浅色 | **proposed** | MUST | [R-001](R-001-theme-modes.md) |
| R-002 | Token 单一事实来源与三层结构 | active | MUST | [R-002](R-002-token-source.md) |
| R-003 | 语义命名：先角色，后色值 | active | MUST | [R-003](R-003-semantic-naming.md) |
| R-004 | 字阶：UI 5 级 / Editorial 7 级 | active | MUST | [R-004](R-004-type-scale.md) |
| R-005 | 间距、圆角、描边、焦点 | active | MUST | [R-005](R-005-space-shape.md) |
| R-006 | 无障碍是闸门 | active | MUST | [R-006](R-006-accessibility.md) |
| R-007 | 组件契约先于实现 | active | MUST | [R-007](R-007-component-contracts.md) |
| R-008 | 风格卡：换皮肤，不换语法 | active | MUST | [R-008](R-008-style-cards.md) |
| R-009 | 生成物不手改；HUB 由源生成 | active | MUST | [R-009](R-009-generated-artifacts.md) |
| R-010 | 决策记录：D 级 ADR + E 行 | active | SHOULD | [R-010](R-010-decision-records.md) |
| R-011 | 版本、稳定性与弃用窗口 | active | MUST | [R-011](R-011-versioning.md) |
| R-012 | 目录与命名：M1/M2 | active | MUST | [R-012](R-012-directory-naming.md) |
| R-013 | 评审闸门与 Definition of Done | active | MUST | [R-013](R-013-review-gates.md) |
| R-014 | 资产、字体、AI 来源 | active | MUST | [R-014](R-014-assets-provenance.md) |
| R-015 | AI 协作：先读规则，后改视觉 | active | SHOULD | [R-015](R-015-ai-collaboration.md) |

## 四、需要你裁决

1. **格式**：上面的字段 + 五节是否够用？要不要加“反例/迁移”？
2. **R-001 三态主题**：`system / dark / light` 是否作为所有 LRDS 界面面的默认规则？
3. **状态策略**：proposed 规则是否先并行、批准后再转 active？

> 批准后：R-001 转 `active`；规则 README 状态改为 v1.0；需要时把对应检查接进 `design/tools/check.sh`。
