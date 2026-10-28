# 01 · Token 分层：ref、sys、component、product

> 纲领第二篇 ｜ 对应规则：[R-002](../rules/R-002-token-source.md)、[R-003](../rules/R-003-semantic-naming.md)、[R-009](../rules/R-009-generated-artifacts.md)
> 本文只回答结构问题：**scale 放哪、角色放哪、组件放哪、风格卡差异放哪。**

## 一、四层

```text
ref          原始值：色阶、字体、字号、间距、圆角、阴影、动效、透明度、z
  ↓ alias
sys          默认主题的语义角色：bg / text / action / focus / status ...
  ↓ alias
component    组件专属：button.height / input.border / card.padding ...
  ↓ override
product      某张风格卡/某个纪元的稀疏差异
```

- **`ref`**：只回答“有哪些值”，不回答“用在哪”。
- **`sys`**：回答“这个值扮演什么角色”，是业务的默认入口。
- **`component`**：回答“这个组件的哪一部分用哪个角色/尺度”。
- **`product`**：回答“这张风格卡与默认主题哪里不同”。

`theme` **不是独立层**。风格卡是 `product`，不是另一套 token 体系。

## 二、scale 放 `ref`

色阶、字体、间距、圆角、阴影、动效、透明度、z-index 都是原始值：

```text
ref.color.<hue>.<step>
ref.font.family.<name>
ref.font.size.<step>
ref.space.<step>
ref.radius.<name>
ref.shadow.<name>
ref.motion.duration.<name>
ref.motion.easing.<name>
ref.opacity.<name>
ref.z.<name>
```

不需要每个厂商都重写一套 `md.scale.*` / `cds.scale.*`。厂商原生 token 作为来源保留：

```text
ref.source.<vendor>.*       原始厂商命名
ref.<scale/type/space/...>  统一尺度
```

再由 `sys` 映射到业务角色。

**判定**：

| 问题 | 放哪 |
| --- | --- |
| 这个值是色阶/字号/间距/圆角吗？ | `ref` |
| 它回答“用在哪”吗？ | `sys` 或 `component` |
| 它只属于某组件吗？ | `component` |
| 它只在某张风格卡不同？ | `product` |

## 三、角色放 `sys`，差异放 `product`

LRDS 已有语义路径（如 `sys.color.bg.base`、`sys.color.action.primary`）。新角色应优先复用这些路径，而不是另造一套平行命名。

```text
sys.color.bg.base           页面底色
sys.color.bg.surface        表面
sys.color.text.primary      正文
sys.color.action.primary    主行动
sys.color.focus.ring        焦点
```

只有满足以下条件才新增 `sys` 角色：

- 跨两个以上组件/产品重复；
- 现有角色无法表达；
- 有真实消费者、owner、对比度验收。

风格卡差异：

```json
{
  "product": {
    "archive": {
      "role": {
        "bg": "{ref.color.neutral.950}",
        "text": "{ref.color.neutral.0}"
      }
    }
  }
}
```

- 只写与默认主题不同的角色；
- 默认值继承 `sys`；
- 风格卡 `roles` 指向 `sys` 或 `product`，不写 `#rrggbb`。

## 四、组件层

组件层是可选的，只引用 `ref`/`sys`：

```text
component.button.bg      → sys.color.action.primary
component.button.height  → sys.space.12
component.input.border   → sys.color.line.subtle
```

- 不定义新的原始值；
- 不把“缺失的通用角色”塞进组件层；
- 没有真实消费者的组件不建。

## 五、全量主题副本的反模式

不要为每张风格卡复制完整角色集：

```text
theme.<card>.*      全量 50 角色副本   ← 反模式
```

原因：

1. 风格卡 `roles` 与主题 token 双源；
2. token 数量虚增，没有增加表达；
3. 默认 `sys` 缺失被掩盖；
4. 改一处容易漂移。

正确形态：

```text
sys.*                    默认主题
product.<card>.*         稀疏差异
风格卡 roles              引用 sys / product
```

迁移细节、项目命令与历史状态由项目文档维护，不写回纲领。

## 六、别名规则

- 允许 `ref → sys → component/product` 的链；
- 禁止循环；
- 业务代码只消费 `sys`/`component`/`product`；
- 生成物（CSS/JSON/报告）由工具生成，不手改；
- 新增 token 必须有 `$type` 与 owner。

## 七、一页判定

```text
原始值？           → ref
语义角色？         → sys
组件部件/状态？    → component
风格卡差异？       → product
全量主题副本？     → 不做
```
