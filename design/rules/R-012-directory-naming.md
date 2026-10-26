# R-012 · 目录与命名：M1/M2

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：`design/` 及其子目录 ｜ **Owner**：设计主控 + 工程
> **关联**：E03、[M1](../../rules/meta/M1-file-organization.md)、[M2](../../rules/meta/M2-naming-vocabulary.md)、[config-design.json](../../rules/meta/tools/config-design.json)

## 一、规则

**`design/` 的文件组织与命名由 M1/M2 配置守；新增目录先声名词表，再放文件。**

## 二、要求

1. **类型目录**：`docs/` `philosophy/` `fullstack/` `tokens/` `kits/` `components/` `tools/` `rules/` `ref/`；新增类型先改 `type_vocab`。
2. **子关注点**：`tokens/` `kits/` `ref/`；子关注点有 README；不得在子关注点里静默堆文件。
3. **命名**：文档默认 `NN_` 或小写/数字/点/横线；规则 `R-NNN-*.md`；代码类目录命名豁免。
4. **根文档**：只允许 `README.md` `CHANGELOG.md` `HUB.html` `GUIDE.html` `TODO.md` 等已声明文件。
5. **区块**：`design/` 在 workspace scope 里是 `block`；违规阻断提交。
6. **不建空目录**：只建有内容的目录；空类型用 `empty_ok_types` 显式允许。

## 三、验收

```bash
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts --root design --config rules/meta/tools/config-design.json
node --experimental-strip-types rules/meta/tools/meta_rules_scope.ts
```

## 四、例外

- 临时实验目录必须带 `_` 前缀或在 `.tmp/`；不得提交。

## 五、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化 `design/` M1/M2 block 与子关注点。 |
| 2026-10-26 | v1.1 | 新增 `rules/` 类型与 `R-NNN-*.md` 命名。 |
