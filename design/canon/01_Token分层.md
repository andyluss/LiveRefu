# 01 · Token 分层：ref、sys、component、product

> 纲领第二篇 ｜ 对应规则：[R-002](../rules/R-002-token-source.md)、[R-003](../rules/R-003-semantic-naming.md)、[R-009](../rules/R-009-generated-artifacts.md)
> 本文回答三个争议：**scale 放哪？角色放哪？`theme-roles` 还要不要？**

## 一、四层，不是五层

```text
ref          原始值：色阶、字族、字号、间距、圆角、阴影、动效、透明度、z
  ↓ alias
sys          默认主题的语义角色：bg / text / action / focus / status / chart ...
  ↓ alias
component    组件专属：button.height / input.border / card.padding ...
  ↓ override
product      某张风格卡/某个纪元的稀疏覆盖
```

- **`ref`**：只回答“有哪些值”，不回答“用在哪”。
- **`sys`**：回答“这个值扮演什么角色”，是业务的默认入口。
- **`component`**：回答“这个组件的哪一部分用哪个角色/尺度”。
- **`product`**：回答“这张风格卡与默认主题哪里不同”。

`theme` **不是独立层**。风格卡是 `product`，不是另一套 token 体系。

## 二、scale 放 `ref`，不放厂商前缀

色阶、字阶、间距、圆角、阴影、动效、透明度、z-index 都是**原始值**，应统一进入：

```text
ref.color.<hue>.<step>
ref.type.family.<name>
ref.type.size.<step>
ref.type.lineHeight.<name>
ref.type.weight.<name>
ref.space.<step>
ref.radius.<name>
ref.shadow.<name>
ref.motion.duration.<name>
ref.motion.easing.<name>
ref.opacity.<name>
ref.z.<name>
```

不要把同一套尺度写成 `md.scale.*`、`cds.scale.*`、`p.scale.*` 三套平行宇宙。厂商前缀只保留其**原生语义 token**（如 `md.sys.color.primary`），再由本系统的 `sys` 映射；原始尺度统一进 `ref`。

**判定**：

| 问题 | 放哪 |
| --- | --- |
| 这个值是色阶/字号/间距/圆角吗？ | `ref` |
| 它回答“用在哪”吗？ | `sys` 或 `component` |
| 它只属于某组件吗？ | `component` |
| 它只在某张风格卡不同？ | `product` |

## 三、50 个 UI 角色放 `sys.role`

为避免与历史 `sys.color.bg.base`、`sys.color.text.primary` 冲突，本系统约定：

```text
sys.role.<role>
```

例如：

```json
{
  "sys": {
    "role": {
      "bg": { "$value": "{ref.color.neutral.50}" },
      "text": { "$value": "{ref.color.neutral.950}" },
      "action": { "$value": "{ref.color.brand.600}" },
      "onAction": { "$value": "{ref.color.neutral.0}" }
    }
  }
}
```

历史路径 `sys.color.*` 可以保留为**兼容别名**，但新角色不写回 `sys.color.*`。

组件专属：

```text
component.button.bg → sys.role.action
component.button.height → ref.space.9
component.input.border → sys.role.border
```

## 四、`theme-roles.tokens.json` 的去留

**结论：不作为 50 角色 × 3 卡的全量副本保留。**

### 为什么全量副本是反模式

1. **双源**：风格卡 JSON 已有 `roles`，`theme.<card>` 又复制 50 个值；改一处，另一处可能漂移。
2. **伪扩展**：token 数量增加，但没有增加表达能力，只增加维护量。
3. **审计假象**：角色全绿，但真正的问题是默认 `sys` 没有定义。
4. **层级错误**：把“主题差异”当成“角色源”，违背 `ref → sys → product`。

### 正确形态

- **`sys.role.*`**：默认主题的 50 个角色；
- **`product.<card>.role.*`**：只写与默认主题**不同**的角色；
- **风格卡 `roles`**：指向 `sys.role` 或 `product.<card>`，不直接写 hex；
- **`theme.*`**：仅作为迁移期别名，标记 deprecated，下一个 major 删除。

示例：

```json
// 默认主题
"sys": { "role": { "bg": "{ref.color.neutral.50}", "text": "{ref.color.neutral.950}" } }

// 某张暗色卡只覆盖 bg/text
"product": { "archive": { "role": { "bg": "{ref.color.neutral.950}", "text": "{ref.color.neutral.0}" } } }
```

### 迁移步骤

1. 为每个藏库选一张 **默认卡**，把它的 50 角色落到 `sys.role`；
2. 对每张非默认卡，逐角色与 `sys` 比较，只生成 `product.<card>.role` 的差异；
3. 风格卡 `roles` 改为 `sys.role.*` 或 `product.<card>.role.*`；
4. 删除 `theme-roles.tokens.json`；`theme.*` 保留一个 minor 周期，仅作别名；
5. 跑 `skin:check` 与视觉回归，确认视觉不变。

## 五、别名规则

- 允许 `ref → sys → component/product` 的链；
- 禁止循环；
- 业务代码只消费 `sys`/`component`/`product`；
- 生成物（CSS/JSON/报告）由工具生成，不手改；
- 新增 token 必须有 `$type` 与 owner。

## 六、一页判定

```text
原始值？           → ref
语义角色？         → sys.role
组件部件/状态？    → component
风格卡差异？       → product
主题别名？         → 迁移期 theme，目标删除
```
