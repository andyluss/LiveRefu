# Panel · 面板 / 卡片契约

> 状态：**draft** ｜ 适用：Web / Godot / App ｜ 消费者：网站、LiveFab、游戏 HUD
> 覆盖：静态面板、可交互卡片、浮起对话框的外壳；不覆盖具体内容。

## 一、解剖

```
┌────────────────────────────────────┐
│ 头部：标题 + 可选操作               │
├────────────────────────────────────┤
│ 主体：内容 / 列表 / 表单            │
├────────────────────────────────────┤
│ 底部：可选操作区（主/次按钮）        │
└────────────────────────────────────┘
```

| 部位 | 规则 | token |
| --- | --- | --- |
| 容器 | 静态面板用一级表面；浮起用抬升表面 | `--lr-color-bg-surface`、`--lr-color-bg-raised` |
| 边框 | 静态用装饰线；可交互用控制描边 | `--lr-color-line-subtle`、`--lr-color-line-strong` |
| 圆角 | 面板圆角；内部控件用控件圆角 | `--lr-radius-panel`、`--lr-radius-control` |
| 内边距 | 头/身/脚统一节奏 | `--lr-space-16`、`--lr-space-24` |
| 标题 | 二级标题；单行；不挤压操作 | `--lr-type-ui-title-2-size`、`--lr-color-text-primary` |
| 正文 | 可读行宽；中文正文不小于 body | `--lr-type-ui-body-size`、`--lr-color-text-primary` |
| 次级信息 | 说明、时间、来源 | `--lr-type-ui-caption-size`、`--lr-color-text-muted` |
| 阴影 | 只给浮起面（弹窗、拖拽中的卡） | `--lr-shadow-elevated` |

**变体**：

| 变体 | 用途 | 关键差异 |
| --- | --- | --- |
| static | 内容分组 | 装饰线，不响应点击 |
| interactive | 可点击卡片（跳转/选择） | 整个卡片是一个链接/按钮；控制描边 + hover 抬升 |
| elevated | 弹窗/浮层 | 阴影 + 抬升表面；焦点陷阱由上层负责 |

## 二、状态

| 状态 | 视觉 | token | 行为 |
| --- | --- | --- | --- |
| default | 表面 + 边框 | `--lr-color-bg-surface`、`--lr-color-line-subtle` | 静态或可交互 |
| hover（仅 interactive） | 边框转控制色；表面抬升 | `--lr-color-line-strong`、`--lr-color-bg-raised` | 光标手型；不移动内容 |
| focus（仅 interactive） | 焦点环套在卡片外沿 | `--lr-color-focus-ring`、`--lr-border-focus`、`--lr-border-focus-offset` | 卡片是链接/按钮时生效 |
| selected | 左侧/顶部标记 + 边框 | `--lr-color-action-primary` | 不能只靠底色；配勾选/文字 |
| disabled | 降低对比；不响应 | `--lr-color-text-muted`、`--lr-color-line-subtle` | 说明原因 |
| loading | 骨架或占位；保留尺寸 | `--lr-color-bg-raised`、`--lr-motion-duration-base` | 不让布局跳动 |

## 三、键盘与无障碍

- 静态面板不是控件：不要给它 `tabindex`，不要让屏幕阅读器读成按钮。
- 可交互卡片必须是 `<a>` 或 `<button>`（或等价语义），不能是 `div` + 点击。
- 卡片内**不得再嵌套可交互元素**（链接/按钮）；需要多个动作时改用“卡片 + 独立操作区”。
- 焦点环必须完整可见，不被 `overflow: hidden` 裁掉。
- 标题层级按页面结构选，不因为“看起来像卡片标题”就固定用二级。
- 选中状态用 `aria-selected` / `aria-current` 或等价语义，不只靠颜色。
- 浮起面板：焦点陷阱、`Esc` 关闭、关闭后焦点回到触发元素。
- 触控：卡片整体可点，命中区不小于 `--lr-size-touch-min`。

## 四、Do / Don't

**Do**
- 用面板承载“一组相关信息”，而不是给每个段落套框。
- 可交互卡片只做一件事；把次要动作放在卡片外或独立操作区。
- 用标题 + 次级信息建立扫读顺序。
- 浮起面才用阴影；静态分组用线。

**Don't**
- 不要在可点击卡片里再放按钮/链接。
- 不要用阴影代替边框来表达“可点击”。
- 不要把面板做成超大圆角 + 多层阴影的“玻璃卡片”。
- 不要让卡片高度随 hover 变化导致布局抖动。

## 五、跨端

| 介质 | 差异 | 不可照搬 |
| --- | --- | --- |
| Web | `<section>` / `<article>` / `<a>` / `<button>` 按语义选；焦点环；`overflow` 不裁剪焦点 | 不要用 `div` 承载点击 |
| Godot | `PanelContainer` + 显式 `RootBackground`/面板样式；手柄焦点；无 ARIA | 不要依赖 `theme_type_variation` 隐式回落（已踩坑） |
| App | 卡片点击态、触控目标、平台手势；安全区 | 不要把 hover 当主要反馈 |

## 六、Tokens

`--lr-color-bg-surface`、`--lr-color-bg-raised`、`--lr-color-bg-base`、`--lr-color-text-primary`、`--lr-color-text-muted`、`--lr-color-line-subtle`、`--lr-color-line-strong`、`--lr-color-action-primary`、`--lr-color-focus-ring`、`--lr-border-focus`、`--lr-border-focus-offset`、`--lr-radius-panel`、`--lr-radius-control`、`--lr-space-16`、`--lr-space-24`、`--lr-size-touch-min`、`--lr-type-ui-title-2-size`、`--lr-type-ui-body-size`、`--lr-type-ui-caption-size`、`--lr-shadow-elevated`、`--lr-motion-duration-base`
