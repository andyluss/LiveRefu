# Form Field · 表单字段契约

> 状态：**draft** ｜ 适用：Web / Godot / App ｜ 消费者：网站、LiveFab、未来应用
> 覆盖：文本输入、文本域、选择器、搜索框的共同骨架；具体控件由介质包实现。

## 一、解剖

```
┌ 标签（可选必填标记） ───────────────┐
│ ┌────────────────────────────────┐ │
│ │ 输入区（可选前缀图标/后缀动作） │ │
│ └────────────────────────────────┘ │
│ 帮助文本 / 错误文本（二选一或并存）  │
└────────────────────────────────────┘
```

| 部位 | 规则 | token |
| --- | --- | --- |
| 标签 | 始终可见；不用 placeholder 代替 | `--lr-type-ui-caption-size`、`--lr-color-text-secondary` |
| 必填标记 | 文字“必填”或 `*` + 可访问说明 | `--lr-color-feedback-danger`、`--lr-type-ui-caption-size` |
| 输入区 | 与标签间距固定；高度至少控制中号 | `--lr-color-bg-sunken`、`--lr-color-line-strong`、`--lr-border-control`、`--lr-size-control-md`、`--lr-radius-control` |
| 前缀/后缀 | 图标或单位；不得抢占输入焦点 | `--lr-size-icon-sm`、`--lr-color-text-muted` |
| 帮助文本 | 常态提示；与错误文本不同色 | `--lr-color-text-muted`、`--lr-type-ui-caption-size` |
| 错误文本 | 说明“哪里错、怎么修”；不指责用户 | `--lr-color-feedback-danger`、`--lr-type-ui-caption-size` |
| 字数/计数 | 上限附近才出现；不是装饰 | `--lr-color-text-muted`、`--lr-type-ui-caption-size` |

## 二、状态

| 状态 | 视觉 | token | 行为 |
| --- | --- | --- | --- |
| default | 凹槽底 + 控制描边 | `--lr-color-bg-sunken`、`--lr-color-line-strong` | 可输入 |
| hover | 描边保持或轻微提亮 | `--lr-color-line-strong` | 不改变布局 |
| focus | 焦点环 + 描边强化 | `--lr-color-focus-ring`、`--lr-border-focus`、`--lr-border-focus-offset` | 用 `:focus-visible` / 等价手柄焦点 |
| filled | 有值；标签仍在 | `--lr-color-text-primary` | 不把标签缩成 placeholder |
| error | 错误描边 + 错误文本 + `aria-invalid` | `--lr-color-feedback-danger` | 错误文本与字段关联 |
| success | 成功描边 + 简短确认（可选） | `--lr-color-feedback-success` | 不要闪烁或自动消失 |
| disabled | 降低对比；不响应 | `--lr-color-bg-surface`、`--lr-color-text-muted` | 说明为什么禁用（邻近文本） |
| read-only | 可聚焦、可复制；不可编辑 | `--lr-color-bg-base`、`--lr-color-text-secondary` | 与 disabled 明确区分 |

## 三、键盘与无障碍

- 标签用 `for` / `id` 关联；点击标签聚焦输入。
- 错误文本通过 `aria-describedby` 关联；错误时 `aria-invalid="true"`。
- 必填用 `aria-required="true"`，不只靠 `*`。
- `Tab` 顺序按视觉顺序；不要把焦点困在字段内。
- `Enter` 提交表单（单行输入）；`Esc` 不清空用户输入，除非有明确“清除”动作。
- 输入区命中高度 ≥ `--lr-size-control-md`；移动端触控 ≥ `--lr-size-touch-min`。
- 错误不能只靠红色：要有文本与图标/位置。
- 密码字段提供显示/隐藏切换，并有可访问名称。
- 文字缩放 200% 时标签与错误文本不重叠。

## 四、Do / Don't

**Do**
- 先写清楚“要用户填什么”，再决定控件。
- 错误文案具体：“邮箱缺少 @”优于“输入有误”。
- 在提交前做格式提示，在提交后做具体错误定位。
- 保留用户输入；失败时不清空。

**Don't**
- 不要用 placeholder 当标签；用户输入后标签就消失。
- 不要用红色边框作为唯一错误信号。
- 不要自动聚焦到错误字段并抢走用户上下文（除非表单很短且明确）。
- 不要在输入过程中实时报“格式错误”，除非格式已确定（如邮箱）。

## 五、跨端

| 介质 | 差异 | 不可照搬 |
| --- | --- | --- |
| Web | `<label>` + `<input>`；`aria-describedby`；浏览器自动填充 | 不要禁用自动填充而不给替代 |
| Godot | `Label` + `LineEdit`/`TextEdit`；手柄焦点环；软键盘由平台处理 | 不要把 Web 的 `:focus-visible` 直接搬成鼠标焦点 |
| App | 平台键盘类型、自动大写、安全区；触控目标 ≥ `--lr-size-touch-min` | 不要把桌面 hover 当移动反馈 |

## 六、Tokens

`--lr-color-bg-base`、`--lr-color-bg-surface`、`--lr-color-bg-sunken`、`--lr-color-text-primary`、`--lr-color-text-secondary`、`--lr-color-text-muted`、`--lr-color-line-strong`、`--lr-color-feedback-danger`、`--lr-color-feedback-success`、`--lr-color-focus-ring`、`--lr-border-control`、`--lr-border-focus`、`--lr-border-focus-offset`、`--lr-size-control-md`、`--lr-size-touch-min`、`--lr-size-icon-sm`、`--lr-space-8`、`--lr-space-12`、`--lr-radius-control`、`--lr-type-ui-body-size`、`--lr-type-ui-caption-size`
