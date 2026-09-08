# 问题：版权字段结构口径分歧（顶层 vs 嵌套 copyright 对象）

> 状态：**resolved**（已定案 2026-09-08：采用**嵌套 copyright 对象**）
> 发现：2026-09-08 14:01 · 发现人：数值策划 A
> 类型：technical · 优先级：**高**（阻塞 content-pool schema / CI 门禁冻结）
> 定案：2026-09-08（数值策划 A 作为协调者，代表**主策划 + 主程序**口径统一；见「## 裁决 / 定案」）

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

## 裁决 / 定案（resolved）

**定案：采用嵌套 `copyright` 对象**（主策划/主程序口径统一，数据侧落地）。

**依据**：主策划权威口径 `docs/lead-designer/05_copyright-taxonomy.md` §2/§4 已明确——版权块**挂在 `content_card` 上、每卡一个 `copyright` 对象**，以承载"署名要求（`author`/`attribution_text`）+ 复核留痕（`verified_date`/`reviewer`/`notes`）"。顶层 `source/license/license_url/status` 四字段仅能表达"授权类型+状态"，**不足以支撑 §3.4 署名类（`cc_by`/`cc_by_sa`）与 `licensed` 的入池门禁**（须作者/署名文案/复核人/日期齐备），而这是"需复核类可合规入池"的强制配套。故以主策划 taxonomy 为语义契约，采用嵌套对象。

**落地（本问题执行）**：

1. `data/schema/content_card.schema.json`：版权字段由顶层四字段**改为嵌套 `copyright` 对象**（4 强制 `source`/`license`/`license_url`/`status` + 5 支撑 `author`/`attribution_text`/`verified_date`/`reviewer`/`notes`，字段名 `snake_case`）；数值侧仅保留 `rarity`/`collect_frag` 槽，`copyright` 块语义注明引用主策划 taxonomy。
2. `data/schema/content_card_numerics.schema.json`：保持"只提供数值槽、不改版权块结构"，字段引用同步为嵌套 `copyright`。
3. `data/tables/content_card.json`：3 张卡版权字段**改为嵌套 `copyright` 对象**；`license` 取主策划枚举 `original_own`，`status=approved`，`author` 用来源 `doc 卷`；`rarity`/`collect_frag` 数值位**不变**（common=3 / rare=5 / cult=8）。
4. `data/README.md` §二/§三：版权字段约定同步改为嵌套 `copyright` 对象。

**待办（交主程序，标注【待定】）**：主程序 content-pool schema 尚未冻结——若其包含版权字段，应按本裁决采用嵌套 `copyright` 对象（`data/schema/content_card.schema.json` 已给出可引用结构 + 主策划 taxonomy §4.2 语义契约）；`license` 版本无关枚举、`status` 状态机与 §3.4 CI 入池门禁以主策划 taxonomy 为准。数值侧只提供数值位、不触碰版权块。

**效果**：卡池 3 卡均为 `original_own`/`approved`（默认入池 A 档），无需人工复核即可入池；嵌套结构为后续 CC BY/BY-SA 署名类入池预留了 `author`/`attribution_text`/`verified_date`/`reviewer` 承载。

## 变更记录

- 2026-09-08 14:01：登记。
- 2026-09-08：**定案为嵌套 `copyright` 对象**（主策划/主程序口径统一）→ 状态 `open → resolved`；落地 `data/schema/content_card.schema.json`、`data/tables/content_card.json`（3 卡嵌套化）、`data/README.md` 版权约定，数值位不变。主程序 content-pool schema 冻结时引用本裁决（见「裁决 / 定案」）。
