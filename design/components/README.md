# Components · 组件契约

> **先有契约，后有实现。** 本目录不存放任何平台的组件代码；它规定**解剖、状态、行为、token 与跨端差异**，由 Web / Godot / App 介质包分别实现。
> 组件只在**至少两个真实消费者**需要时抽象；不做“可能会用”的全家桶。

## 一、当前契约

| 契约 | 状态 | 消费者 | 说明 |
| --- | --- | --- | --- |
| [button](button.md) | draft · **已渐进接入** | 网站 4 文件 / 12 处；LiveFab 1 处 | 主/次/幽灵/危险；sm/md/lg；6 种状态 |
| [form-field](form-field.md) | draft · **已接入网站** | 网站搜索框（wrapper + control）；LiveFab 无表单 | 标签/输入/帮助/错误/必填；8 种状态 |
| [panel](panel.md) | draft · **已渐进接入** | 网站 6 文件 / 22 处；LiveFab 1 处 | 静态面板 / 可交互卡片；头/身/脚 |

> “draft” = 契约已写、已在真实产品渐进接入，但尚未完成两个平台的完整视觉/键盘走查；不是“可以随便改”。组件层与使用审计见 [`../kits/web/README.md`](../kits/web/README.md) 与 [`../tools/check_component_usage.ts`](../tools/check_component_usage.ts)。

## 二、契约模板（每个组件必须有的五节）

```markdown
# <Component> · <中文名>契约

> 状态 / 适用介质 / 消费者

## 一、解剖
（部位、层级、尺寸 token、内容规则）

## 二、状态
（default / hover / active / focus / disabled / loading / error … 的视觉与行为）

## 三、键盘与无障碍
（焦点顺序、按键、ARIA/语义、触控目标、对比度、减少动态）

## 四、Do / Don't
（各至少 3 条，写“为什么”，不是只写“不要”）

## 五、跨端
（Web / Godot / App 的差异与不可照搬之处）

## 六、Tokens
（本组件允许引用的 token 清单）
```

## 三、规则

1. **只引用 token**：契约里不出现 `#hex`、`rgb/rgba`、`px` 字面量；尺寸用 `--lr-size-*` / `--lr-space-*`。
2. **状态必须可区分**：hover / active / focus / disabled 不能只靠一个像素的明度差；至少两个维度（底色、边框、文字、图标、位移）。
3. **焦点不得复用强调色**：用 `--lr-color-focus-ring`，环宽 `--lr-border-focus` + offset `--lr-border-focus-offset`。
4. **图标不是唯一载体**：图标按钮必须有可访问名称；状态不能只靠颜色。
5. **触控最小**：移动端命中区不小于 `--lr-size-touch-min`；视觉可以更小，命中区不能更小。
6. **跨端不照搬**：Web 的 `:focus-visible`、Godot 的手柄焦点、App 的平台导航各自成立；契约只统一语义与结果。
7. **先两个消费者**：没有第二个真实消费者，不新增契约；先写产品内实现，重复出现后再抽。

## 四、检查

```bash
node --experimental-strip-types design/tools/check_component_contracts.ts
```

检查：五节齐全、token 存在、无裸值、至少 5 个 token 引用、包含 focus 与 disabled 状态。每个检查器都必须能被负向用例证伪。
