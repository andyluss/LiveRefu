# App Kit · 移动应用介质适配（起步）

> 状态：**v0.3 起步**——平台无关 token 导出 + iOS/Android 使用规范 + 验收清单。
> **还没有真实 App 消费者**：本 Kit 只到“可接入”为止；不虚构一个 App，也不声称已验收。

## 一、产物

| 文件 | 内容 |
| --- | --- |
| [`tokens/dist/app/tokens.json`](../../tokens/dist/app/tokens.json) | 20 个语义色、UI 5 级字阶、控件/触控/图标尺寸、间距、圆角、描边、动效、无障碍阈值 |

- **单位**：`logical-px`。基线上 1 logical px = iOS pt / Android dp；文字必须随系统 Dynamic Type / `fontScale` 缩放。
- **颜色**：只含 `sys.*` 语义；产品风格卡（如未来某个 App 的磁带/档案风格）另行叠加。
- **不包含**：平台组件代码、导航结构、图标资源、启动图、推送/权限文案。

## 二、怎么消费

### iOS

- 颜色：`Color(.sRGB, red:green:blue:opacity:)`，值从 JSON 的 `#RRGGBB` 解析；不要在其他地方再写 hex。
- 字号：以 `type[].size` 为**基准**，用 `UIFontMetrics` / Dynamic Type 缩放；不要用固定高度裁切文字。
- 触控最小：**44pt**（token `size.touch.min`）；视觉可以更小，命中区不能更小。
- 安全区：读 `safeAreaInsets`；底部 Home Indicator、顶部刘海/灵动岛附近不放关键操作。
- 导航：用平台导航栏/标签栏；不要为了“复古”自绘一套与系统手势冲突的导航。
- 焦点/键盘：iPad 硬件键盘与辅助技术要有可见焦点；复用 `focus.ring`。
- 深色模式：当前 `sys.*` 是 Console 暗色；Archive 亮色模式尚未落地，不要自行反相。

### Android

- 颜色：`Color(0xFFRRGGBB)`；同样只引用 `sys.*`。
- 字号：`sp` + 系统 `fontScale`；不要写死 `dp` 字号。
- 触控最小：平台建议 **48dp**；token 给 44 是跨平台下限，Android 取 `max(48, token)`。
- 安全区：edge-to-edge + `WindowInsets`；状态栏/导航栏/手势区不压关键操作。
- 导航：用平台返回手势/返回键；不要拦截系统返回。
- 深色模式：同上；亮色皮肤未定前不做自动反相。
- 动态颜色：不要用 Material You 动态取色覆盖品牌语义色；品牌色是识别的一部分。

### 两端通用

- **字号不是固定像素**：token 是基准，必须随系统文字大小缩放；200% 时布局不重叠、不裁切。
- **触控目标**：不小于 `accessibility.minTouchTarget`；Android 取平台更大值。
- **对比度**：文字 ≥ `accessibility.minContrastText`；控件边界/焦点 ≥ `minContrastUi`。
- **减少动态**：读系统“减少动态效果”；`motion` 时长可归零，不能只靠动画传达状态。
- **触觉反馈**：可作为增强，不能替代视觉/文字反馈；不要在每次点击都震动。
- **图标**：24 基准、1.5 描边；图标不是唯一语义载体，必须有可访问名称。

## 三、组件对应

| 组件 | 移动端要点 |
| --- | --- |
| [Button](../../components/button.md) | 主行动一个；触控命中 ≥44/48；loading 时禁止重复提交；danger 二次确认 |
| [Form Field](../../components/form-field.md) | 正确键盘类型/自动填充；标签始终可见；错误文本与字段关联；200% 字号不重叠 |
| [Panel](../../components/panel.md) | 整卡可点时不嵌套按钮；安全区内边距；列表滚动不与系统手势冲突 |

## 四、验收清单（首个 App 消费者出现时逐项过）

- [ ] 所有颜色来自 `tokens.json` 的 `sys.*`，业务代码无裸 hex。
- [ ] 所有字号随系统文字大小缩放；200% 下无裁切/重叠。
- [ ] 触控命中 ≥44pt / 48dp；视觉更小也保留命中区。
- [ ] 安全区/刘海/Home Indicator/手势区不压关键操作。
- [ ] 键盘类型、自动填充、返回键/返回手势符合平台习惯。
- [ ] 焦点可见（硬件键盘/辅助技术）；焦点不复用强调色。
- [ ] 深色模式对比度达标；亮色皮肤未定前不自动反相。
- [ ] 减少动态效果生效；动画不是唯一状态信号。
- [ ] 触觉反馈可选、不过度；不替代文字/视觉。
- [ ] 屏幕阅读器走查：按钮有名称、字段有标签、错误可被读出。
- [ ] 截图：首页 / 表单 / 弹窗 / 空状态 / 错误状态。
- [ ] 真机（至少一台 iOS + 一台 Android）走查记录。

> 没有真实 App 前，这份清单是**契约**，不是“已通过”。

## 五、下一步

1. 首个 App 消费者出现时，新增对应 `product.<app>` 风格卡；
2. 用真实页面补截图 + 真机走查；
3. 再决定是否生成 Swift/Kotlin 常量（当前先消费 JSON，避免维护两份代码）；
4. 打印/实体仍按 D6 后置。

> 记录：[11 App kit 起步](../../docs/11_App_kit_v0.2.md) ｜ 契约：[button](../../components/button.md) / [form-field](../../components/form-field.md) / [panel](../../components/panel.md)
