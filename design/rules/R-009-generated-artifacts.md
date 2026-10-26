# R-009 · 生成物不手改；HUB 由源生成

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：tokens/dist、components.css、Godot/App token 副本、HUB 生成物 ｜ **Owner**：工程
> **关联**：E09、[build_hub.ts](../tools/build_hub.ts)、[build_tokens.ts](../tools/build_tokens.ts)

## 一、规则

**凡标记为生成物的文件，只能由脚本生成；手改会在下一次生成被覆盖，并让对账失败。**

## 二、要求

1. **标记**：生成物头部必须有 `AUTO-GENERATED` / `不要手改` 与生成命令。
2. **源**：改 token/组件/HUB 数据，改对应源；不得直接改产物。
3. **提交**：生成物提交，保证用户无需先跑构建；CI 校验“重新生成后无 diff”。
4. **对账**：`build_tokens --check`、`build_web_kit --check`、`build_hub --check` 必须通过。
5. **HUB/GUIDE 分离**：HUB 由项目数据生成；GUIDE 是设计系统说明（静态），不复制 HUB 的运行时数据。

## 三、验收

```bash
node design/tools/build_tokens.ts --check
node design/tools/build_web_kit.ts --check
node design/tools/build_hub.ts --check
```

## 四、例外

- 紧急热修可临时改产物，但必须当天回写源并重生成；否则不得提交。

## 五、反例 / 迁移

- **反例**：手改 `dist/web/*.css`；直接编辑 HUB.html；生成器与产物各改一半；GUIDE 复制 HUB 的运行时数据。
- **迁移**：把手工修改回写到源（token/组件/HUB 数据），重跑生成器；对账通过后再提交。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化生成物标记、源回写与对账。 |
