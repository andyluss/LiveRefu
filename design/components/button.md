# Button · 按钮契约

> 状态：**draft** ｜ 适用：Web / Godot / App ｜ 消费者：网站、LiveFab、未来应用
> 契约不是实现：本文只规定解剖、状态、行为与 token；各介质包决定具体控件。

## 一、解剖

```
┌──────────────────────────────┐
│  [可选图标]  标签  [可选计数] │
└──────────────────────────────┘
```

| 部位 | 规则 | token |
| --- | --- | --- |
| 容器 | 单行；内容水平居中；图标与标签间距固定 | `--lr-space-8`、`--lr-space-12`、`--lr-radius-control` |
| 高度 | sm / md / lg 三档；移动端命中区不小于触控最小 | `--lr-size-control-sm`、`--lr-size-control-md`、`--lr-size-control-lg`、`--lr-size-touch-min` |
| 标签 | 动词开头；中文 2–6 字；加载时替换为进行时文案 | `--lr-type-ui-body-size`、`--lr-type-ui-caption-size` |
| 图标 | 可选；与标签同色；不得是唯一语义载体 | `--lr-size-icon-sm`、`--lr-size-icon-md` |
| 描边 | 统一控制描边；不得用装饰线代替 | `--lr-border-control`、`--lr-color-line-strong` |

**变体**：

| 变体 | 用途 | 底色 / 文字 | 约束 |
| --- | --- | --- | --- |
| primary | 一个视图只能有一个主行动 | `--lr-color-action-primary` / `--lr-color-action-on-primary` | 同时只允许一个主按钮 |
| secondary | 次要行动 | `--lr-color-bg-raised` / `--lr-color-text-primary` | 边框用 `--lr-color-line-strong` |
| ghost | 低权重、工具条 | 透明 / `--lr-color-text-primary` | hover 才出现底色 |
| technical | 技术标签/仪表按钮（搜索、CRT 开关） | `--lr-color-bg-raised` / `--lr-color-text-secondary` | 等宽字体、小号、`aria-pressed` 可表示开关 |
| outline | 描边行动（登录、跳转） | 透明 / `--lr-color-action-primary-hover` | 边框用行动色，不使用填充 |
| danger | 删除、不可逆操作 | `--lr-color-feedback-danger` / `--lr-color-text-inverse` | 必须二次确认或明确后果 |

## 二、状态

| 状态 | 视觉 | token | 行为 |
| --- | --- | --- | --- |
| default | 常态底色 + 控制描边 | `--lr-color-bg-raised`、`--lr-color-line-strong` | 可点击 |
| hover | 底色抬升一档；光标为手型 | `--lr-color-action-primary-hover`（primary）或 `--lr-color-bg-surface` | 不改变布局尺寸 |
| active | 底色再压暗/压亮；可有轻微位移 | `--lr-color-bg-sunken` | 按下即反馈，不等网络 |
| focus | 焦点环 + offset | `--lr-color-focus-ring`、`--lr-border-focus`、`--lr-border-focus-offset` | 只用 `:focus-visible`；键盘可见 |
| disabled | 降低对比；不响应 | `--lr-color-bg-sunken`、`--lr-color-text-muted` | `aria-disabled="true"`；不移除焦点顺序（可解释原因） |
| loading | 标签替换为进行时；保留宽度 | `--lr-color-text-muted`、`--lr-motion-duration-base` | `aria-busy="true"`；禁止重复提交 |

**状态可区分**：至少两个维度同时变化（底色 + 边框、文字 + 图标、位移 + 阴影）。不得只靠一个像素的明度差。

## 三、键盘与无障碍

- `Enter` / `Space` 触发；触发后焦点不丢失。
- 焦点环不得被 `overflow: hidden` 裁掉；`outline-offset` 用 token。
- 图标按钮必须有 `aria-label` 或可见文字；不能只有图标。
- loading 时保留可访问名称，并在完成后把焦点留在原处。
- disabled 与 loading 都不是“删除元素”：需要让辅助技术知道状态。
- 触控命中区 ≥ `--lr-size-touch-min`；视觉高度可以小于命中区。
- 对比度：文字 ≥ 4.5:1；按钮边界 ≥ 3:1；焦点环 ≥ 3:1。
- 动效时长 ≤ `--lr-motion-duration-fast`；`prefers-reduced-motion` 下取消位移。

## 四、Do / Don't

**Do**
- 一个视图只放一个 primary；其余用 secondary / ghost。
- 用动词做标签：“保存草稿”“开始计时”“删除卡片”。
- 危险操作写清后果，并给可逆路径（撤销/确认）。
- 加载时给进行时文案，避免用户重复点击。

**Don't**
- 不要用颜色作为唯一状态：danger 也要有文字或图标。
- 不要把链接做成按钮、也不要把按钮做成链接；语义按行为选。
- 不要用超大圆角或渐变制造“复古感”；圆润来自形状与材质。
- 不要在按钮里塞多行说明；需要说明时用 adjacent text。

## 五、跨端

| 介质 | 差异 | 不可照搬 |
| --- | --- | --- |
| Web | `<button>` / `<a>` 按行为选；`:focus-visible`；`aria-disabled` 而非 `disabled`（需要可解释时） | 不要把 `div` 加 `onclick` 当按钮 |
| Godot | `Button` 主题三态 + focus；手柄焦点用 `--lr-color-focus-ring`；无 ARIA | 不要用 `theme_type_variation` 依赖隐式回落（已踩坑） |
| App | 触控目标 ≥ `--lr-size-touch-min`；遵循平台按钮位置与手势 | 不要把 Web 的 hover 当成移动端的主要反馈 |

## 六、Tokens

`--lr-color-action-primary`、`--lr-color-action-primary-hover`、`--lr-color-action-on-primary`、`--lr-color-bg-raised`、`--lr-color-text-secondary`、`--lr-ref-font-family-mono`、`--lr-color-bg-surface`、`--lr-color-bg-sunken`、`--lr-color-text-primary`、`--lr-color-text-muted`、`--lr-color-text-inverse`、`--lr-color-line-strong`、`--lr-color-feedback-danger`、`--lr-color-focus-ring`、`--lr-border-control`、`--lr-border-focus`、`--lr-border-focus-offset`、`--lr-size-control-sm`、`--lr-size-control-md`、`--lr-size-control-lg`、`--lr-size-touch-min`、`--lr-size-icon-sm`、`--lr-size-icon-md`、`--lr-space-8`、`--lr-space-12`、`--lr-radius-control`、`--lr-type-ui-body-size`、`--lr-type-ui-caption-size`、`--lr-motion-duration-fast`、`--lr-motion-easing-standard`
