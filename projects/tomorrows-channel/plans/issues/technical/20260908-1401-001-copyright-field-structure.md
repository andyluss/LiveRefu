# 问题：版权字段结构口径分歧（顶层 vs 嵌套 copyright 对象）

> 状态：**open**（未解，待主程序/主策划 reconcile）
> 发现：2026-09-08 14:01 · 发现人：数值策划 A
> 类型：technical · 优先级：**高**（阻塞 content-pool schema / CI 门禁冻结）

## 现象 / 问题描述

内容卡的**版权字段结构**存在两处口径分歧：

- **数值侧契约**（`data/schema/content_card.schema.json` + 卡池数据 `data/tables/content_card.json`）：采用**顶层** `source / license / license_url / status`（4 个强制字段，另带 `author`/`notes` 支撑）。
- **主策划版权 taxonomy**（`docs/lead-designer/05_copyright-taxonomy.md` §4.2）：建议**嵌套** `copyright` 对象，含 `copyright.source / .license / .license_url / .status`（4 强制）+ `author / attribution_text / verified_date / reviewer / notes`（5 支撑字段，承接署名/复核留痕）。

卡池数据（`cbe1927`）按数值侧契约用了**顶层形式**（`license=original_own` 等），与主策划 taxonomy 的嵌套形式不一致。

## 影响 / 卡点

- 主程序冻结**完整 content-pool schema** 时需二选一，否则 schema 校验与 CI 门禁无法统一；
- 若选了嵌套 `copyright`，需改现有：`content_card.schema.json`、`content_card.json`（卡池 3 卡）、`content_card_numerics.schema.json` 的字段引用；
- 涉及主策划重复字段角色（复核人/日期、署名要求落地）与数值侧槽位，需明确责任归属。

## 尝试 / 参考

- 数值侧契约：`data/schema/content_card.schema.json`（顶层 4 强制 + 字段说明）
- 主策划 taxonomy：`docs/lead-designer/05_copyright-taxonomy.md` §2 字段规范（嵌套 9 字段）、§3.4 入池门禁
- 主程序回执：`docs/lead-programmer/04_response-gdd.md` §4（强制版权字段 source/license/license_url/status）

## 解决方向 / 需求

- **需主策划 + 主程序 reconcile**：统一结构（推荐嵌套 `copyright` 对象，因其能落地"署名 + 复核留痕"这一主策划合规强制要求；顶层四字段不足以承载署名类入池门禁）。
- 定案后：主程序更新 content-pool schema；主策划核对 copyright taxonomy；数值策划 A 调整卡池数据字段（若需嵌套）并保持 rarity/collect_frag 数值位不变。
- 参考决策记录：`docs/lead-designer/05_copyright-taxonomy.md`（M0 已定口径的落地细则）。

## 变更记录

- 2026-09-08 14:01：登记。
