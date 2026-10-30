# M1 UI 骨架 Godot 实现说明（磁带频道最小集 · 换肤骨架）

> UI 设计美术 A · 2026-09-08 · 状态：**M1 骨架交付（场景/脚本占位，可先行）**。
> 承接：[05_m1-ui-skeleton.md](./05_m1-ui-skeleton.md)（三态骨架 / 磁带最小面板 / 换肤骨架 / 中文字体回退 / 数字等宽）；主美术磁带基调 [`../lead-artist/05_m1-tape-baseline.md`](../lead-artist/05_m1-tape-baseline.md)（基线 v0.1）。本文件是 **05_ 的 Godot 落地映射**：说明在 `game/scenes/` 下建了哪些场景/脚本、三态与换肤如何体现、以及中文字体回退与数字等宽在 Godot 下的实现口径。
> 定位：**UI 设计美术 A 职责内**；正式美术/字体/音频资产后置，本文给出占位与骨架的"程序可接"口径。

---

## 一、交付物一览（`game/scenes/` 下新增）

| 路径 | 类型 | 说明 | 对应 05_ |
| --- | --- | --- | --- |
| `scenes/ui/channel_shell.tscn` + `.gd` | 场景+脚本 | **三态骨架**：共用根 + 漫游/专注/设置 三视图容器、图层可见度切换、焦点不劫持 | §三 |
| `scenes/timer/focus_timer_panel.tscn` + `.gd` | 场景+脚本 | **专注计时面板**：角标形态 ↔ 沉浸形态切换骨架；等宽数字 | §五 |
| `scenes/mixer/mixer_panel.tscn` + `.gd` | 场景+脚本 | **混音台**：≥2 轨音量滑杆，数据驱动 | §2.1 表5 |
| `scenes/mixer/mixer_track.gd` | 资源类 | 混音轨数据形态（对齐 `mixer_track` 表契约） | §五 |
| `scenes/channel/channel_skin.gd` | 资源类 | **频道皮肤 Token**（换肤令牌载体） | §六 |
| `scenes/channel/skins/tape_channel_skin.tres` | Token 数据 | **磁带频道 Token 值**（引用主美术基线 v0.1） | §4.2 |
| `scenes/channel/tape_channel_panel.tscn` + `.gd` | 场景+脚本 | **磁带频道最小面板**（接收机中央窗口）· **Token 挂载点** | §四 |

> 说明：M1 只做**骨架 + 占位**，`package` 于注记中；三态骨架为 `Control` 容器（非窗口），计时器/混音台由 shell 承载、皮肤 Token 由 `channel` 面板注入。正式美术/字体/动画资产后置（05_ §八 ①②③⑤ 待确认）。

---

## 二、三态骨架怎么体现（一套图层可见度 + 焦点不劫持）

### 2.1 三态不是三个场景

`channel_shell.gd` 用 `enum ShellState { ROAM, FOCUS, SETTINGS }`，`tscn` 里是**三个兄弟视图容器** `RoamView / FocusView / SettingsView`（`Control`），默认仅 `RoamView.visible=true`。

```
ChannelShell (Control, full-rect, focus_mode = NONE)
 ├─ RoamView    (Control, full-rect, visible)   →  内容轮播 + 频道选择器(漫游态)
 ├─ FocusView   (Control, full-rect, hidden)    →  专注计时/降噪氛围
 └─ SettingsView(Control, full-rect, hidden)    →  设置·图鉴（骨架占位，全流程 M3）
```

**Shell 只订阅逻辑层状态**（`focus_state_machine` → `event_bus.state_changed`），驱动可见度；不持有状态真值：

```gdscript
# UI 入口：请求切态，脱手给逻辑层状态机（状态机广播后本 Shell 响应）
func request_state(state: ShellState) -> void:
    focus_state_machine.request_transition(_to_logic_state(state))

# 响应 event_bus.state_changed(String) → 只改 three 视图 visible（不弹窗/不遮罩/不抢焦点）
func _on_logic_state_changed(state_name: String) -> void:
    current_state = _from_logic_state_name(state_name)
    _apply_visibility(current_state)
```

> 三态切换**不是本地 set 一处**，而是「UI 请求 → 逻辑层状态机判定（`focus_state_machine.request_transition`）→ 广播 `event_bus.state_changed` → Shell 改可见度」；逻辑层不直接依赖 UI，UI 只经 event_bus 订阅。

### 2.2 焦点不劫持

- 骨架根 `focus_mode = 0`（`FOCUS_MODE_NONE`），三视图同设 `focus_mode = 0`。
- 切换视图**不调用 `grab_focus()`**，不放 `modal`，不置默认焦点；逻辑层 `focus_state_machine.request_transition` 也不动焦点（切换不夺焦、不打断专注，见 05_ §三.3）。
- 专注态下进入设置·图鉴态时，**计时器于角标"继续走表"**，设置只在地面以下增厚、不盖住计时（05_ §三.3 口径）——因此计时器是**独立于 shell 的子面板**（`FocusTimerPanel` 在 FocusView/SettingsView 中均可挂载，计时源独立）。

### 2.3 三态里谁来消费什么

| 态 | shell 内视图 | 承载（程序接） | 完整度 |
| --- | --- | --- | --- |
| 漫游 | `RoamView` | `TapeChannelPanel`（磁带最小面板）+ 频道选择器入口 | M1 最小实现 |
| 专注 | `FocusView` | `FocusTimerPanel`（默认角标 / 可切沉浸） | M1 实现 |
| 设置·图鉴 | `SettingsView` | 极简占位（音量/动效开关/退出 + "已收藏 1 卡"列表） | **骨架/极简占位**，全流程 M3 |

> M1 出口口径（05_ §三.3）：三态 = 图层可见度开关 + 焦点不劫持；**不是三套窗口**。

---

## 三、换肤骨架怎么体现（共用骨架 + Token）

### 3.1 令牌载体 = `ChannelSkin`（`channel_skin.gd`，`class_name ChannelSkin extends Resource`）

把 05_ §4.2 的 UI Token 与主美术 §一/§二 token 封装成 `@export Color/float` 字段：

- **信号层 LUT**：`lut_base_dark / lut_mid_beige / lut_lit_warm / lut_phosphor_amber / lut_phosphor_green / lut_emphasis`
- **容器暖光**：`housing_beige / housing_dark / dial_amber / device_warm_k / lamp_warm_k / glow_ratio`
- **装饰/字体**：`decor_enabled / scanline_opacity / decor_font_name`
- 便捷取色：`accent_color() / base_color() / surface_color() / frame_color()`

### 3.2 一份 Token = 一份 `.tres`（`skins/tape_channel_skin.tres`）

磁带频道 Token 值**引用主美术基线 v0.1**（`scenes/channel/channel_skin.gd` 的默认值已对齐，`.tres` 为显式值副本）：

| UI Token | 语义 | 值（主美术基线） |
| --- | --- | --- |
| `lut_phosphor_amber` | 主荧光·琥珀 | `#FFB000` |
| `lut_base_dark` | 窗口底 | `#221610` |
| `lut_mid_beige` | 内容卡面 | `#C7B394` |
| `lut_lit_warm` | 暖白高光 | `#F5E9CE` |
| `lut_phosphor_green` | 辅荧光·绿 | `#7FC98A` |
| `lut_emphasis` | 状态·琥珀偏橙 | `#E39A4C` |
| `housing_beige` | 机身塑料米 | `#C7B491` |
| `housing_dark` | 面板暗部 | `#2C2113` |
| `dial_amber` | 刻度背光 | `#FFB04A` |

### 3.3 消费方式：`@export var skin: ChannelSkin`，脚本只从 skin 取色

各面板 `.gd` 声明 `@export var skin: ChannelSkin`，并在 `_apply_skin()` 中把 token 填进组件。**脚本与场景里不出现任何十六进制色值**（如 `tape_channel_panel.gd` 用 `skin.lut_phosphor_amber` 上色、`focus_timer_panel.gd` 用 `skin.lut_phosphor_amber` / `skin.lut_phosphor_green`、`mixer_panel.gd` 用 `skin.lut_phosphor_amber`）。换频道 = 换一份 `.tres`（Token），**不改骨架结构**（05_ §6.3 纪律：随频道变的只允许是 Token 值）。

### 3.4 换肤机制【待定·主程序】与两类路径

05_ §6.2 的两类实现路径（**运行时 Token 热切换** / **预烘焙 UI 主题**）在 M1 需与主程序对齐。当前骨架采用**"运行时从 `ChannelSkin` 读取并 `add_theme_color_override`"** 这一兼容口径（最小改动、结构不动）；若主程序拍板**预烘焙 UI 主题**（`Theme` + `ThemeDB`），则把 `_apply_skin()` 改为切换 `theme` 资源即可——本骨架已在各面板留好 `_apply_skin()` 单入口，切换成本极低。

---

## 四、中文字体回退 & 数字等宽（Godot 实现口径，引用 05_ §七）

> 字体必须**显式验证、显式声明回退**，绝不假设某系统字在 macOS/Windows 双端可用（合订本 v1 教训，05_ §七）。正式字体资产后置，本文给 **SystemFont 落地方案**，供主程序/图形 A 引用。

### 4.1 中文正文回退链（规则 A，上帝视角）

| 字体槽 | 用途 | Godot 实现 | 回退 |
| --- | --- | --- | --- |
| `font_body_cn` | 中文正文/卡片文案 | `SystemFont`（`font_names=["PingFang SC","Microsoft YaHei"]`）→ 系统默认 → Godot 内置默认 | 可读性优先、跨端一致；**不取终端等宽字** |
| `font_digit_tabular` | 数字（时长/进度/收藏/碎片） | 支持 `tnum`（tabular figures）的数字字体；或系统字体 + 显式启用 `tnum`；再兜 `%02d` + 等宽克隆字 | 等宽数位，防跳动 |
| `font_decor_<channel>` | 频道标题/引言（装饰字） | 各频道复古装饰字体，回退 `font_body_cn` | **仅标题引言**，正文不用 |
| `font_latin` | 纯西文 | 随正文/装饰槽 | 中西文分槽，避免缺字 |

落地要点（Godot）：
- 用 `SystemFont` 资源声明 `font_body_cn`（`font_names` 数组既可写 `["PingFang SC", "Microsoft YaHei"]`，含双重回退），避免"假设某系统字"。
- 中英混排（规则 B）：句子内阿拉伯数字 → 用 `font_digit_tabular` 槽；中西文分别回退，避免西文字体对 CJK 缺字。
- 装饰字只做"皮"（规则 C）：仅频道标题与引言用装饰字，正文永不使用——这是"可读性优先 + UI 是器物"的边界。

### 4.2 数字等宽（tabular figures）—— M1 必锁

1. **所有数字字段走 `font_digit_tabular`**：倒计时、`MM:SS`、进度、收藏数、碎片数一律等宽数位，防跳动/防错位。
2. **显式启用 tnum**：优先支持 OpenType `tnum` 的字体；否则系统字体显式启用其 `tnum`；再不行用定宽格式兜底。须**显式验证 macOS/Windows 双端渲染**。
3. **位宽约束**：数字节点预留固定宽度（不因位数变化撑开），倒计时面板/收藏数不跳行、不形变。`FocusTimerPanel._format_time()` 用 `"%02d:%02d"` 固定 5 位（`MM:SS`），与 7.4 位宽占位一致。
4. **数字允许字符集**：仅 `0-9 : - + / %`，禁止全角数字混入。

### 4.3 字号阶梯（1080p 基准，运行时按窗口缩放）

沿用 05_ §7.2 六档（沉浸计时 96 / 频道标题 36 / 标题 24 / 正文 17 / 说明 14 / 角标 12）。各面板用 `add_theme_font_size_override()` 取对应级；`font_body_cn` 承担正文/说明/标题，数字字段用 `font_digit_tabular`。

---

## 五、组合与装配（主程序/图形 A 接）

```
channel_shell (三态骨架)
 ├─ RoamView
 │   └─ TapeChannelPanel（skin = tape_channel_skin.tres，Token 挂载点）
 ├─ FocusView
 │   └─ FocusTimerPanel（角标形态；可切沉浸）+ MixerPanel（混音台，数据驱动）
 └─ SettingsView（极简占位）
```

装配时把 `tape_channel_skin.tres` 作为 `skin` 注入各面板（父→子）。逻辑层侧已有 autoload 单例（`scripts/autoload/`：`event_bus` / `focus_state_machine` / `config_loader`）与核心系统骨架（`scripts/`：`channel_loader` / `pomodoro_timer` / `mixer_controller`），UI 层接线如下：

- **三态**：UI 按钮 → `focus_state_machine.request_transition()` → 广播 `event_bus.state_changed` → `ChannelShell._on_logic_state_changed` 改三视图可见度。
- **计时**：`FocusTimerPanel` 从 `config_loader.get_pomodoro_work_min()` 取时长（min→sec），订阅 `event_bus.pomodoro_started / pomodoro_finished`，发出 `timer_finished`。
- **混音**：`MixerPanel` 滑杆变化 → 发 `volume_changed` + `event_bus.mixer_volume_changed`（逻辑层 `mixer_controller` 订阅）。

**依赖/待确认**（回 05_ §八）：① 主美术 Token 色板 + 装饰字体；② 换肤路径（热切换 vs 预烘焙）；③ 扫描线/微噪是否盖 UI（P8 建议窗口内容覆盖、顶栏/边框不盖）；⑤ 字体加载/子集化 + 双端验证。

---

## 五点六、收藏 1 卡 UI 侧接线（M1 出口标准 #4 呈现）

> UI 设计美术 A · 2026-09-08 · 状态：**UI 侧已接线**（呈现 + 事件 emit + 订阅驱动界面）。收藏逻辑（校验/归档/碎片）与内容卡池归主程序/数值侧（`scripts/collection_controller.gd` + `config_loader.content_cards`），UI 侧**只承担呈现**。

**职责边界（不越界）**：本面板不持有收藏真值、不做合规校验、不建本地列表（那些在 `CollectionController` / `config_loader`）；UI 只做「点卡收藏 → 发请求 → 收确认 → 更新界面」。

### 5.6.1 事件契约（与主程序对齐）

| 信号 | 方向 | 签名 | 触发/消费 | 说明 |
| --- | --- | --- | --- | --- |
| `collect_requested` | UI → 逻辑层 | `(card_id: String)` | UI（`TapeChannelPanel._on_collect_pressed`）emit；`CollectionController` 订阅 | 用户点「收藏」请求收藏该卡。**M1 事件名已定**（`event_bus.collect_requested`，snake_case）；逻辑层如拟改用其它名，请在 `event_bus` 收敛并同步 UI A。 |
| `card_collected` | 逻辑层 → UI | `(card_id: String, rarity: String)` | `CollectionController.request_collect` 归档成功 emit；UI（`TapeChannelPanel._on_card_collected`）订阅 | 收藏成功（含首次碎片）后广播，UI 据此置「已归档」态 + 轻反馈。 |

> 二者为「请求 / 确认」一对：UI 只发 `collect_requested`，不直接写列表；逻辑层校验通过才广播 `card_collected`，UI 只响应。合规闸门（`status` ∈ `APPROVED_STATUSES` + 强制版权字段齐全）在 `CollectionController._is_compliant`，UI 不重复判断。

### 5.6.2 UI 呈现（`tape_channel_panel.tscn` / `.gd`）

- **当前可收藏卡**：`config_loader.get_content_card_pool()` 取一张（M1 取池首张），呈现 `title / rarity+type / body 摘要(前40字)`。卡池 `card_id` 由上装程序注入（`AppController._inject_current_card` → `panel.current_card_id`），代码零硬编码 id。
- **收藏按钮（3 态）**：常态「收藏」可点；点击 → `_on_collect_pressed` → `event_bus.collect_requested.emit(current_card_id)`；已收藏态「已归档」禁用 + 置辅荧光绿。
- **已归档轻反馈**：订阅 `card_collected`（仅当前卡）→ 按钮置「已归档」+ `CollectFeedback` 标签淡入→停留→淡出。**静默可用**：不走弹窗/遮罩/抢焦，关闭动效层后仍成立（节点默认即可显示）。
- **Token 复用**（不硬编码 hex）：所有色值取自 `skin`（`ChannelSkin`，磁带基线 token）——窗口暗底 `lut_base_dark`、标题/按钮主荧光 `lut_phosphor_amber`、稀有度/已归档辅荧光 `lut_phosphor_green`、正文暖白 `lut_lit_warm`；StyleBox（窗口/按钮）均由 `skin` 取色构建。

### 5.6.3 闭环验证（无头/CI）

`AppController._verify_closed_loop` 已含收藏 1 卡闭环：注入卡池首张 id → `_tape_panel._on_collect_pressed()` → `collect_requested` → `CollectionController` 校验归档 → `card_collected` → UI「已归档」；并校验幂等（重复收藏不重复归档/不给二次碎片）与合规拒收（不存在卡 / 版权未批准 / 缺版权字段）。输出含 `OK 收藏完成 图鉴=1`、`VERIFY PASS: M1 单频道闭环全部检查通过`。

---

## 六、自检（对照 05_ §九）

- [x] 命名含 `ui_`/`tape_` 前缀（`_` 前缀，组件名 `ui_` 由主美术 `02_` 统一）
- [x] 换肤：随频道变的只改 `ChannelSkin`（`.tres`），不改骨架结构
- [x] 三态切换不夺焦、不打断专注（`focus_mode=NONE` + `keep_focus`）
- [x] 数字走 tabular 等宽、`MM:SS` 固定位宽
- [x] 中文正文走系统回退（`SystemFont`，`PingFang SC`/`Microsoft YaHei`），不用终端字
- [x] 收藏 1 卡 UI 侧接线：收藏按钮→`collect_requested`；订阅 `card_collected`→「已归档」轻反馈；卡 title/rarity/摘要数据驱动呈现；按钮/反馈 Token 复用（无硬编码 hex）
- [ ] 正式字体资产 / 装饰字收益 / 扫描线可读性检查 —— 待主程序/图形 A 定稿后补

---

## 七、决策记录

- 2026-09-08：M1 UI 骨架 Godot 落地（`06_`）。确立三态＝共用骨架的图层可见度＋焦点不劫持（`channel_shell`），换肤＝`ChannelSkin`（`.tres`）令牌注入、脚本零硬编码色值；给出系统中文回退（`SystemFont`）+ 等宽数字（tabular）的 Godot 实现口径；磁带频道最小面板为 Token 挂载点。正式字体/美术/动效资产后置。
- 2026-09-08：**收藏 1 卡 UI 侧接线**（§五点六）。事件契约：UI `collect_requested(card_id)` → 逻辑层 `CollectionController` → `card_collected(card_id, rarity)` → UI「已归档」轻反馈；UI 只做呈现 + emit + 订阅驱动界面，收藏逻辑与卡池归主程序/数值。卡 title/rarity/摘要数据驱动呈现；按钮/反馈 Token 取自 `ChannelSkin`，**脚本/场景无硬编码色值**。经 `godot --headless --import --path game` 与主场景无头闭环自检（`VERIFY PASS`）验证，无 SCRIPT ERROR。
