# R-013 · 评审闸门与 Definition of Done

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：设计变更、组件、token、介质接入、发布 ｜ **Owner**：设计主控 + 工程
> **关联**：[03 §五](../docs/03_治理与运营.md)、[04 §五](../docs/04_落地路线.md)、[check.sh](../tools/check.sh)

## 一、规则

**没有规格不进实现，没有验收不算交付；例外必须登记，不得静默绕过。**

## 二、要求

1. **实现前**：D/E 决策或 DP；影响面、回滚、验收面写清。
2. **实现中**：token 源、组件契约、无障碍、跨端影响同步更新。
3. **提交前**：`bash design/tools/check.sh` 全绿；相关产品闸门全绿；CHANGELOG 记账。
4. **发布前**：HUB/GUIDE 与源一致；链接 0 失效；版本/tag 对齐；例外清单复核。
5. **DoD**：能力可用 + 真实消费者 + 机器/人工验收 + 文档 + 回滚路径；缺一不算完成。
6. **例外**：写 owner、原因、到期、替代方案；到期未收口即阻断。

## 三、验收

```bash
bash design/tools/check.sh
node --experimental-strip-types tools/check_links.ts
node --experimental-strip-types tools/check_changelog.ts --file design/CHANGELOG.md --tag-prefix design-v
```

## 四、例外

- 安全热修可先修后补文档，但必须在同一工作日补齐并记录。

## 五、反例 / 迁移

- **反例**：先实现后补规格；闸门红了用 `--no-verify`；例外不写到期；发布前不跑 HUB/链接检查。
- **迁移**：冻结新增，补规格/验收/回滚，再恢复；例外到期必须收口。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化实现前/提交前/发布前闸门与 DoD。 |
