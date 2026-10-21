# 设计系统例外登记

> 规则见 [03 治理与运营 §五](03_治理与运营.md)：**允许例外，但不允许静默；例外有 owner、有到期日。**
> 到期未收口 = 阻塞该产品下一次设计评审。不能靠“再续一个季度”无限续命。

## 当前例外

（暂无 active 例外。）

## 已收口

| ID | 产品 / 位置 | 收口日期 | 怎么收口的 |
| --- | --- | --- | --- |
| **EX-20261021-01** | 《未来档案》`GalleryGrid.vue`、`SearchDialog.vue`、`pages/gallery/index.vue`、`theme.css` | **2026-10-21** | 产品层补 8 个 alpha/overlay token（`scanline` / `vignette` / `overlayStrong` / `overlayPanel` / `overlaySearch` / `shadow` / `surfaceDeep` / `onWarning`），8 位 hex 与 `rgba()` 等价；网站 app 全量裸色值检查通过。见 [06](06_实现记录_v0.2.md)。 |
| **EX-20261021-02** | 《未来档案》`app/assets/theme.css` + `.card` | **2026-10-21** | 采用 8px 面板圆角：`--radius` 改为 `--lr-radius-panel`；`.card` 基础表面交给 `.lr-panel`；按钮改用组件层 4px 控件圆角。见 [10](10_皮肤收口_v0.2.md)。 |

## 登记规则

1. 先尝试用现有 token 表达；确实不能，才登记。
2. 必须写清“违反哪条规则”，不能只写“特殊情况”。
3. 必须有 owner 与到期日；**最长一个季度**。
4. 例外不是永久豁免：到期要么迁移，要么由用户批准续期并记录理由。
5. `check_no_raw_values` 的 `--all` 报告应与本表一致：表里没有的裸值，就是未登记的债务。
