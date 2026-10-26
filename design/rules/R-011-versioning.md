# R-011 · 版本、稳定性与弃用窗口

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：设计系统、token、组件、kit、HUB ｜ **Owner**：设计主控
> **关联**：D8、[03 治理 §六](../docs/03_治理与运营.md)、[CHANGELOG](../CHANGELOG.md)

## 一、规则

**用 SemVer + 稳定性分级 + 弃用窗口 + 产品钉版本；破坏性变更必须给迁移路径。**

## 二、要求

1. **版本**：设计系统 tag `design-v<semver>`；工作区/产品用各自前缀。
2. **稳定性**：experimental / beta / stable / deprecated；未标 stable 的 API 可改，但必须记录。
3. **弃用**：先标 deprecated，给至少一个 minor 周期的窗口，再移除；保留迁移说明。
4. **钉版本**：产品消费生成物时记录版本/哈希；不得静默跟随 main。
5. **变更日志**：每个版本写 Added/Changed/Deprecated/Removed/Fixed/Security；时间取 tag 提交。
6. **不可回删**：已发布 tag 不移动、不 force push；修错发新版本。

## 三、验收

```bash
node tools/check_changelog.ts --file design/CHANGELOG.md --tag-prefix design-v
git tag --points-at HEAD
```

## 四、例外

- 安全修复可缩短弃用窗口，但必须在 CHANGELOG 的 Security 说明。

## 五、反例 / 迁移

- **反例**：移动已发布 tag；force push 改历史；无弃用窗口直接删 token；产品永远跟随 main。
- **迁移**：补 deprecated 标记与替代项，至少一个 minor 周期；产品记录当前版本/哈希。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化 SemVer、稳定性、弃用窗口和 tag 规则。 |
