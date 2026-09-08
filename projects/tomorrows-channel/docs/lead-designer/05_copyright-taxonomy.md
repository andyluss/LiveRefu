# 05 内容卡版权 Taxonomy（主策划 · M1 第一周锁定）

> 主策划 · 2026-09-08 13:19 · 状态：**主策划职责内产出**（"M0 已定口径"的落地细则，供主程序内容卡 schema 与数值策划 A 字段定义使用）
> 关联基线：GDD [`_shared/gdd-tomorrows-channel.md`](../_shared/gdd-tomorrows-channel.md) §4/§6/§10/§12 第 3 项、M0 评审纪要 [`plans/meetings/20260908-0752-m0-review/000-m0-review-summary.md`](../../plans/meetings/20260908-0752-m0-review/000-m0-review-summary.md)（关键决议 3）、开发计划 [`plans/00-project-plan.md`](../../plans/00-project-plan.md) §四（依赖：版权 taxonomy / content_card 含强制版权字段）、M1 分工 [`plans/progress/20260908-1205-m1-kickoff.md`](../../plans/progress/20260908-1205-m1-kickoff.md)。
> 输入基线：主美术素材库 [`lead-artist/moodboard/README.md`](../lead-artist/moodboard/README.md)（许可体例、许可分布）、主程序回执 [`lead-programmer/04_response-gdd.md`](../lead-programmer/04_response-gdd.md) §4（强制版权字段 source/license/license_url/status）、数值策划 A 开发计划意见（内容卡数值字段 `rarity`/`collect_frag` 插槽）。

---

## 0. 定位与"不推翻"声明

本文**不推翻** M0 已定口径（GDD §12 第 3 项：公版 / CC0 / 自产可入池；CC BY / BY-SA 需署名且须复核可商用性、不作默认入池来源；**复核责任人 = 主策划**；程序侧做"强制版权字段 + schema 校验 + CI"工程闸门）。本文只做三件事：

1. 把"版权类型"落成**可机器校验的取值域枚举**（`copyright.license`），作为 content_card schema 版权字段的枚举前提；
2. 把"入池口径 + 署名 + 可商用性复核边界"逐类说清（哪些默认入池、哪些须复核）；
3. 定义**内容卡版权字段取值规范**（source / license / license_url / status 等）与 **status 状态流转** + **入池门禁规则**，给内容管线与 CI 闸门使用。

> **合规边界声明**：本 taxonomy 是**内部判定口径**，非法律意见。凡涉及"可否商用"的最终裁决，由主策划按素材具体条款复核；条款不明或存疑的，一律按**暂不入池**处理（§6 【待定】）。

---

## 1. 版权类型取值域枚举（`copyright.license`）

| `license` 取值 | 中文 | 是否默认入池 | 是否需署名 | 可商用性复核边界 |
| --- | --- | --- | --- | --- |
| `public_domain` | 公有领域（公版） | ✅ 默认入池 | 不需要（建议保留出处） | 无边界——公版可自由商用（含改编）；仅需核验"确为公版"（出版/作者/地域/进入公版时间） |
| `cc0` | CC0 公有领域贡献 | ✅ 默认入池 | 不需要（惯例建议保留来源） | 无边界——CC0 声明放弃全部权利，可商用；核验授权文件真实性与未误标 |
| `original_own` | 自产（团队创作/程序化生成） | ✅ 默认入池 | 不需要 | 自产作品无第三方版权；**复核边界**：确认无内嵌第三方素材（字体/图片/音源采样/程序化生成所依据的素材均不得含第三方版权） |
| `cc_by` | CC BY（署名） | ⚠️ **非默认入池**——须主策划复核通过 | ✅ **必须署名**（填 `author` + `attribution_text`） | 可商用（不设 NC）但**必须署名**；须核验版本与条款，确认**非** CC BY-NC 变体（NC 不允许商业用途——M1 一律拒绝） |
| `cc_by_sa` | CC BY-SA（署名 + 相同方式共享） | ⚠️ **非默认入池**——须主策划复核通过 | ✅ **必须署名**（填 `author` + `attribution_text`） | 可商用但**衍生作品须同构 CC BY-SA**——游戏内嵌可能触发"同构外溢"，对资产可再授权性有强约束；须主策划逐条评估该资产植入游戏后是否会造成意外传播义务，**默认谨慎** |
| `licensed` | 已授权（合同/单独授权） | ⚠️ **非默认入池**——须主策划复核通过 | 视授权条款（terms 要求则须署名） | **完全看授权条款**（exclusive / non-exclusive、territory、duration、可否二次分发嵌入）；主策划须持有授权凭证并逐条约复核，未书面确认前不入池 |
| `unknown` | 未登记 / 归属不明 | 🚫 **禁止入池** | 无法判定 | 不允许——未经核证不得署名判定；须补登记（转正为具体类型）或换素材，否则拒绝入池 |

**枚举稳定原则**：`license` 是**版本无关**的类型枚举（`cc_by` 覆盖 CC BY 2.0/3.0/4.0），**具体版本**由 `license_url`（许可凭证 URL）与 `source`（来源说明）承载，避免版本碎片化撑爆枚举。主美术素材库 `CC BY-SA 2.0/fr`（port 版）归入 `cc_by_sa`，版本见其 `.meta.txt` 的 `许可` 字段/URL。

---

## 2. 默认入池口径汇总

| 档位 | license 集合 | 入池前是否强制主策划人工复核 | 说明 |
| --- | --- | --- | --- |
| **A · 默认入池类** | `public_domain` / `cc0` / `original_own` | 否（建档即预判通过，建议抽查核验 origin） | 内容管线可**直接**走"入池允许"路径；主策划负责抽查来源真实性 |
| **B · 需复核类** | `cc_by` / `cc_by_sa` / `licensed` | **是（必须）** ——须主策划复核通过（status → `approved`） | 复核通过前**禁止入池**；复核项 = 条款可商用性 + 署名完整性 + 同构/嵌入风险 |
| **X · 禁止入池类** | `unknown` | —— | 任何状态都不允许进入发布内容池 |

> **一句话入池口径**：`copyright.license ∈ {public_domain, cc0, original_own}`（默认入池）**或**为 `{cc_by, cc_by_sa, licensed}` 且 **`copyright.status == approved`**（主策划复核通过、署名与条款齐备）；`unknown` 一律不得入池。

**派生口径**（GDD §6/§10 顺延）：
- **影音卡**：优先**程序化生成**（引擎自产 → `original_own`）+ **公版影像**（`public_domain`）；不用第三方带版权影音。
- **图文卡**：doc 卷改写 + 公版图文。改写稿的**授权类型**按改写成品判定——若全部源自公版/CC0 语料改写，作品整体可归于 `public_domain`/`cc0`；若含团队原创写作成分且不依赖第三方素材，可归 `original_own`；`source` 记录改写所依据的原卷，作为溯源。
- **引言卡（今日信号）**：**只用公版 / 自产 / CC0** 短句；CC BY/BY-SA 的典籍引文须署名，M1 暂缓（避免"今日信号"承担署名展示成本）。

---

## 3. 内容卡版权字段规范（schema 视角）

版权块挂在 **content_card** 上（每张卡一个 `copyright` 对象）。字段名沿用主程序约定 `snake_case`（`data/README.md` §三）。

### 3.1 版权字段清单

| 字段 | 类型 | 判定方 | 说明 |
| --- | --- | --- | --- |
| `copyright.source` | string | 主策划 / 内容管线 | **来源说明**（可追溯）：如"Wikimedia Commons（`<file>`）"、"doc 卷 `14_磁带篇` 改写"、"自产（程序化生成）"；必填 |
| `copyright.license` | enum（见 §1） | 主策划 | **版权类型**取值域；必填 |
| `copyright.license_url` | string(uri) | 主策划 | **许可凭证 URL**：指向许可协议 deed 页或承载许可/条款的原始来源页；**外部来源必填**（`source` 非自产时） |
| `copyright.status` | enum（见 §3.3） | 主策划 | **授权/复核状态**；必填 |
| `copyright.author` | string | 主策划 | **作者 / 著作权人**；署名类（`cc_by`/`cc_by_sa`，视 `licensed` 条款）**必填**，其余可选 |
| `copyright.attribution_text` | string | 主策划 | **拟用署名文案**（界面展示用）；署名类必填；为空则界面不展示署名 |
| `copyright.verified_date` | string(date) | 主策划 | **复核日期**；须复核类（`cc_by`/`cc_by_sa`/`licensed`）在 `approved` 时必填 |
| `copyright.reviewer` | string | 主策划 | **复核人**（默认主策划）；须复核类在 `approved` 时必填 |
| `copyright.notes` | string | 主策划 | **备注 / 存疑说明**；`blocked` 时必填（记归属疑点与待核证项） |

> 说明：`source`/`license`/`license_url`/`status` 为主程序已定的**四个强制版权字段**；本表在其基础上补 `author`/`attribution_text`/`verified_date`/`reviewer`/`notes` 五个**支撑字段**——它们承接"署名要求 + 复核留痕"，是让"需复核类"可合规入池的必要配套（否则 CC BY/BY-SA 的署名要求无处落地）。主程序 schema 若只想先落四个强制字段，可把五个支撑字段设为**可选（optional）**，但**署名类入池门禁（§3.4）会强制它们存在**。

### 3.2 必填 / 条件必填矩阵

| 字段 | 建档必填 | 署名类（cc_by/cc_by_sa）必填 | 复核通过（approved）必填 |
| --- | --- | --- | --- |
| `source` | ✅ | ✅ | ✅ |
| `license` | ✅ | ✅ | ✅ |
| `license_url` | ⚠️ 外部来源必填 | ✅ | ✅ |
| `status` | ✅ | ✅ | ✅ |
| `author` | — | ✅ | ✅ |
| `attribution_text` | — | ✅ | ✅ |
| `verified_date` | — | — | ✅（须复核类） |
| `reviewer` | — | — | ✅（须复核类） |
| `notes` | — | — | `blocked` 时必填 |

### 3.3 `status` 状态流转（状态机）

| `status` 取值 | 中文 | 是否允许入池 | 说明 |
| --- | --- | --- | --- |
| `draft` | 草稿 | 🚫 否 | 建档初填，字段可能不全，未提交复核 |
| `pending_review` | 待复核 | 🚫 否 | 字段齐备，等待主策划人工复核 |
| `approved` | 已通过 | ✅ 是 | 主策划复核通过，**可入池**（还需 license 满足 §2 档位） |
| `rejected` | 已拒绝 | 🚫 否 | 复核不通过（条款不可商用/署名缺失/归属存疑），禁止入池，需换素材或补证重建 |
| `blocked` | 存疑 | 🚫 否 | 归属/条款存疑，暂停入池，主策划介入核证；核证补充可回到 `pending_review` 或 `rejected` |

**合法流转（forward transitions）**：

```
draft ──→ pending_review ──→ approved   (主策划复核通过 → 可入池)
                  │
                  ├──→ rejected         (复核不通过 → 禁止入池)
                  └──→ blocked          (存疑 → 暂停，待核证)
blocked ──→ pending_review              (核证补充后可重提复核)
blocked ──→ rejected                    (核证证实不通过)
rejected ──→ draft                      (更换素材/补证后重建)
approved ──→ blocked                    (事后发现新疑点，回退暂停)
```

> 回退允许：`approved → blocked` 用于**发布后复查发现疑点**的及时回撤（配合 CI 撤回该卡出池）；`approved → rejected` 同样允许（证实不可用）。**禁止**：`approved` 直接回落 `draft`（避免已过审卡被无痕改动）；`license` 在 `approved` 后变更须同步改 `status`（防"换授权不换状态"绕过门禁）。

### 3.4 入池门禁规则（CI 闸门）

**进入"发布内容池"（可被播放器装载、可被玩家读取/收藏）的硬条件**：

```
can_enter_pool(card) =
    card.copyright.status == "approved"
    AND card.copyright.license IN {public_domain, cc0, original_own,
                                   cc_by, cc_by_sa, licensed}
    AND (card.copyright.license NOT IN {cc_by, cc_by_sa}
         IMPLIES true                                    -- 默认入池类无需额外条件(建议抽查 source)
         OR (card.copyright.author != "" AND card.copyright.attribution_text != "")
        )                                               -- 署名类须署名齐备
    AND (card.copyright.license != "licensed"
         OR card.copyright.license_url != "" )          -- licensed 须持授权凭证
```

**门禁规则翻译成人话（给 CI 脚本 / 主程序）**：
1. `status` 必须为 `approved`——`draft/pending_review/rejected/blocked` 一律不许入池；
2. `license` 绝不可是 `unknown`；
3. **默认入池类**（public_domain / cc0 / original_own）：`status == approved` 即可入池（复核人抽查 source）；
4. **署名类**（cc_by / cc_by_sa）：`approved` + `author` 与 `attribution_text` 均非空，才可入池；
5. **licensed**：`approved` + `license_url` 非空（持仓授权凭证），才可入池；
6. 违反任一条件 → CI 报错并**阻止该卡进入发布内容池**（"防漏放"闸门）。

> **职责边界重申**：CI 门禁是**程序侧的"防漏放"闸门**，只校验字段存在性与枚举合法性；**它不裁决内容是否真的可商用**——可商用性由主策划在复核（`pending_review → approved`）时判定。程序永不"替"主策划放行，只保证"未经放行不放行"。

---

## 4. 接口约定（给主程序 / 数值策划 A）

### 4.1 字段权责：程序强制 vs 主策划判定

| 层面 | 强制方 | 内容 |
| --- | --- | --- |
| **结构强制** | 主程序 | `copyright` 对象存在；`source`/`license`/`status` 必填；`license` 与 `status` 的 enum 取值合法（schema 校验）；`license_url` 在外部来源必填；署名类 `author`/`attribution_text` 必填 |
| **门禁强制** | 主程序 | §3.4 的入池条件（CI 脚本校验）；`approved` 且 license 合规才允许进入发布内容池 |
| **语义判定** | 主策划 | `license` 到底属哪一类（素材真实授权）；`status` 何时流转（复核通过/拒绝/存疑）；`source` 真伪；`author`/`attribution_text` 内容正确性；可商用性取舍 |
| **数值插槽** | 数值策划 A | 内容卡数值字段 `rarity`（enum: `common/rare/cult`）、`collect_frag`；**不触碰 `copyright` 块结构**，只提供相邻数值位（数值策划 A 开发计划意见 §3·3） |

> **给主程序的提示**：`copyright` 块的校验逻辑由**主策划出语义契约（本 §）**，主程序按契约编码 schema + CI。`content_card` 的其余结构字段（id/type/channel/title/body/media 等）由主程序 + 数值策划 A 在 schema 冻结时确定；本文只负责**版权块**语义，不越界定义整张卡结构。

### 4.2 content_card 版权块 JSON Schema 参考片段

> 语义契约（参考）。正式 schema 文件由数值策划 A / 主程序据此冻结（`data/schema/`），主策划不代写表结构。

```json
"copyright": {
  "type": "object",
  "required": ["source", "license", "status"],
  "properties": {
    "source":          { "type": "string", "minLength": 1 },
    "license":         { "type": "string",
                         "enum": ["public_domain","cc0","cc_by","cc_by_sa",
                                  "original_own","licensed","unknown"] },
    "license_url":     { "type": "string", "format": "uri" },
    "status":          { "type": "string",
                         "enum": ["draft","pending_review","approved",
                                  "rejected","blocked"] },
    "author":          { "type": "string" },
    "attribution_text":{ "type": "string" },
    "verified_date":   { "type": "string", "format": "date" },
    "reviewer":        { "type": "string" },
    "notes":           { "type": "string" }
  },
  "allOf": [
    { "if":   { "properties": { "license": { "enum": ["cc_by","cc_by_sa"] } } },
      "then": { "required": ["author","attribution_text"] } },
    { "if":   { "properties": { "license": { "const": "licensed" } } },
      "then": { "required": ["license_url"] } }
  ]
}
```

> `format: "date"` / `format: "uri"` 依赖校验库支持；不支持则改为 `pattern` 校验或由 CI 脚本单独核验（主程序设计 schema 时判断）。

### 4.3 命名对齐与数值策划 A 插槽关系

- `content_card` 顶层字段名 `snake_case`（依 `data/README.md` §三）；版权块即 `copyright`。
- 数值策划 A 只为内容卡提供 `rarity`/`collect_frag` 两个相邻数值位，**不动 `copyright` 块结构**（数值策划 A 开发计划意见 §3·3：版权字段为程序强制，数值侧只提供数值位、不给表）。
- CI 门禁所校验的"入池允许"与数值策划 A 的"稀有度/碎片初值"**互不干扰**：版权门禁管**能不能上有**，数值管**标注与奖励**。

---

## 5. 与主美术素材库 license 命名映射（对齐）

主美术素材库（moodboard/README.md §五）许可分布：CC BY-SA 4.0 / CC BY-SA 3.0 / CC BY-SA 2.0 / CC BY-SA 2.0-fr / CC BY 2.0 / CC BY 3.0 / CC0 / Public domain。映射到本 taxonomy 枚举：

| 素材库 `.meta` 许可 | 本 taxonomy `license` | 备注 |
| --- | --- | --- |
| `Public domain` | `public_domain` | 公版 |
| `CC0` | `cc0` | 公有领域贡献 |
| `CC BY 2.0 / 3.0` | `cc_by` | 非默认入池，须复核 + 署名 |
| `CC BY-SA 2.0 / 2.0-fr / 3.0 / 4.0` | `cc_by_sa` | 非默认入池，须复核 + 署名 + 同构评估 |
| （无 `CC BY-NC*`） | —— | 素材库未含 NC 变体；**若未来引入 NC，一律按"不可商用"拒绝入池** |

> 素材库定位为**内部风格参考 / 情绪板 / 方向沟通**（主美术 README §四），**不应未经合规处理直接用作发布资源**——即素材库参考图不因"已收录"就自动可入池；本文档门禁对**所有来源**一视同仁（含素材库图），复用时须走同一 copyright 块登记 + 复核。

---

## 6. 【待定】汇总

| # | 待定项 | 说明 | 判定方 |
| --- | --- | --- | --- |
| 1 | **`cc_by` 具体条款是否允许商用** | CC BY 原则上可商用，但部分素材可能存在"仅用于非商业/编辑用途"的平台附加条款；须逐张看 `license_url` + `source` 的实际条款再定。**M1 默认谨慎**：未逐张复核前按不可入池处理 | 主策划 |
| 2 | **`cc_by_sa` 游戏内嵌的同构外溢风险** | CC BY-SA 要求衍生作品同构——把该素材嵌入游戏后，是否导致整个游戏/频道资产被迫以 CC BY-SA 再授权，需主策划+法务口径评估。**M1 倾向不引入 BY-SA 进正式资产**（可留作风格参考） | 主策划 |
| 3 | **个别素材归属存疑**（如《Floral Shoppe》封面母题替换） | 蒸汽波频道素材补充需以**公有领域雕塑照**替代有版权封面母题（主美术回执 §6）；个别图片作者字段为空的须**回源站核补**（主美术 README §四）后才可判定 | 主策划（口径）+ 主美术（核证） |
| 4 | **`unknown` 素材的分类与处置** | 未登记素材是"补登记"还是"直接拒绝"，M1 阶段需定：建议**拒绝入池**、但保留档案待主美术补证 | 主策划 |
| 5 | **授权合同（`licensed`）的模板与承载** | 单独授权/合同素材需有**授权凭证承载载体**（是否沿用 `data/` 目录、是否需 `licenses/` 子目录存合同）——程序侧需给一个落位 | 主程序 + 主策划 |
| 6 | **`license_url` 是否改为 "凭证附件 + 链接" 双承载** | 部分授权可能无公开 URL（合同授权）；需支持 `license_url` 或本地凭证路径二选一 | 主程序 |

> 以上【待定】**不阻塞** M1 schema 落地——`copyright` 块字段、枚举、门禁先冻结（影响面最小），具体素材的逐张裁决在内容管线铺量时由主策划按本条逐一复核。

---

## 7. 协作请求

- **主程序**：按 §4.1 编码 `copyright` 块的 schema 校验 + §3.4 的 CI 入池门禁；确认 §6-5/6-6 的授权凭证承载载体；`content_card` 其余结构字段与版权块并列即可，版权块结构以本文为语义契约。
- **数值策划 A**：为 `content_card` 提供 `rarity`/`collect_frag` 数值插槽，**不触碰 `copyright` 块结构**（数值侧不裁决版权）。
- **主美术**：素材库复用走统一 copyright 登记 + 复核门禁；存疑素材（作者为空、母题替代）按 §6-3 先回源核证。

---

## 变更记录

- 2026-09-08 13:19：本主策划职责内产出——将 GDD §12 第 3 项"M0 已定口径"落地为内容卡版权 taxonomy：版权类型枚举（7 类）+ 默认入池口径（A/B/X 三档）+ 版权字段规范（source/license/license_url/status + 5 支撑字段）+ status 状态机（5 态）+ CI 入池门禁规则；并定义"程序强制 / 主策划判定"接口约定，供主程序 schema 与数值策划 A 字段定义使用。**未推翻 M0 已定结论**，仅作落地细则。
