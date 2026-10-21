# 设计系统例外登记

> 规则见 [03 治理与运营 §五](03_治理与运营.md)：**允许例外，但不允许静默；例外有 owner、有到期日。**
> 到期未收口 = 阻塞该产品下一次设计评审。不能靠“再续一个季度”无限续命。

## 当前例外

（暂无 active 例外。）

## 已收口

> 已收口表保留登记时的**全部字段**（产品/位置、违反什么、理由、替代方案、Owner、到期、状态），末尾追加 `收口时间` 与 `怎么收口的`，便于对照“当初怎么登记、后来怎么解决”。

| ID | 产品 / 位置 | 违反了什么 | 理由 | 替代方案 / 收口计划 | Owner | 到期 | 状态 | 收口时间 | 怎么收口的 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **EX-20261021-01** | 《未来档案》`GalleryGrid.vue`、`SearchDialog.vue`、`pages/gallery/index.vue` | 业务代码出现裸色值（`#hex` / `rgba()`），未走 token | 这些是遮罩、阴影、搜索高亮的 alpha 色；v0.1 的 token 模型只支持 6 位 hex，没有 alpha/overlay 语义 | v0.2 补 `sys.color.overlay.scrim` / `overlay.panel` / `shadow` / `onWarning`（8 位 hex 或 alpha token），迁移后删除本例外 | 设计主控 | **2027-01-31** | resolved | **2026-10-21 13:04** | 产品层补 8 个 alpha/overlay token（`scanline` / `vignette` / `overlayStrong` / `overlayPanel` / `overlaySearch` / `shadow` / `surfaceDeep` / `onWarning`），8 位 hex 与 `rgba()` 等价；`theme.css` 一并迁移；网站 app 全量裸色值检查通过。见 [06](06_实现记录_v0.2.md)。 |
| **EX-20261021-02** | 《未来档案》`app/assets/theme.css` | 圆角 `6px` 不在系统 4/8 阶梯内 | v0.1 要求“外观基本不变”，不把圆角改动混进 token 迁移；6px 是现有视觉的一部分 | v0.2 做一次视觉评审：改 8px（更接近系统）或把 6px 正式纳入阶梯并记录代价 | 设计主控 | **2027-01-31** | resolved | **2026-10-21 13:47** | 采用 8px 面板圆角：`--radius` 改为 `--lr-radius-panel`；`.card` 基础表面交给 `.lr-panel`；按钮改用组件层 4px 控件圆角。见 [10](10_皮肤收口_v0.2.md)。 |

## 登记规则

1. 先尝试用现有 token 表达；确实不能，才登记。
2. 必须写清“违反哪条规则”，不能只写“特殊情况”。
3. 必须有 owner 与到期日；**最长一个季度**。
4. 例外不是永久豁免：到期要么迁移，要么由用户批准续期并记录理由。
5. `check_no_raw_values` 的 `--all` 报告应与本表一致：表里没有的裸值，就是未登记的债务。
6. 收口后状态改为 `resolved`，保留登记时的全部字段，追加 `收口时间` 与 `怎么收口的`；不删除记录。
