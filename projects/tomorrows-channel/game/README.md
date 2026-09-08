# game · Godot 程序工程

> 存放《明日频道》的 **Godot 4.7.x 程序工程**（项目配置、场景、脚本、加载逻辑）。主程序牵头，图形程序员 A（渲染）与 UI 设计美术 A（UI 骨架）在此协作。
> 引擎与技术主线依据 [`docs/lead-programmer/03_godot-engine-research.md`](../docs/lead-programmer/03_godot-engine-research.md)、[`../docs/lead-programmer/01_tech-stack-draft.md`](../docs/lead-programmer/01_tech-stack-draft.md)。

> **工程状态**：**已接线，可运行闭环（骨架级）**（Godot 4.7.x / 渲染器 = Compatibility）。主程序已完成 AppController 全局接线：`config_loader` 读取 meta/channel/timer/mixer_track/content_card 五表 → `channel_loader` 装载磁带频道 `tape_warm`（含皮肤 Token）→ 后处理栈 `channel_fx`（三层 CanvasLayer + 4 shader）→ 三态 UI 骨架 `channel_shell`（三面板数据驱动装配）→ 番茄计时 + 混音台 + **收藏 1 卡** 经 `event_bus` 事件驱动。已用 `godot --headless` 实机验证 **无 SCRIPT ERROR、全局类注册齐、闭环自检 VERIFY PASS**。详见下方 §六。

## 一、目录约定（Godot 4.7.x 工程根 + 数据驱动）

> `game/` 即 **Godot 工程根**（`project.godot` 直接位于 `game/` 下，import 后即为项目根），**不再嵌套 `project/` 层**。系统级新增目录以 `scenes/` 顶层子目录映射。

```
game/                        # Godot 工程根
├── project.godot            # 工程配置：渲染器、主场景、autoload 注册、显示设置
├── scenes/                  # .tscn 场景 / 预制体（按系统分子目录）
│   ├── app/                 # App 壳 / 空场景（单实例、窗口、生命周期、后台常驻）
│   ├── channel/             # 频道装载与展示
│   ├── timer/               # 番茄计时器 UI
│   ├── mixer/               # 混音台
│   └── ui/                  # 三态 UI 骨架
├── scripts/                 # 逻辑脚本（GDScript，按系统分子目录）
│   └── autoload/            # 单例：event_bus / config_loader / focus_state_machine 等
├── shaders/                 # 材质 / shader（滤镜双光层栈：扫描线/微噪/窗口遮罩/容器暖光）
├── data/                    # 工程加载用配置表副本（权威源在 ../data/tables/）
└── addons/                  # 第三方插件（系统集成 bridge / 托盘 / 全局快捷键，经评审引入）
```

每目录职责与维护角色：

| 目录 | 内容 | 维护 |
| --- | --- | --- |
| `scenes/` | .tscn 场景 / 预制体（按系统分子目录） | 主程序 / UI 美术 A |
| `scripts/` | 逻辑脚本（**GDScript**，按系统分成；M1 不引入 C# 混写） | 主程序 / 图形程序员 A |
| `shaders/` | 材质 / shader（滤镜双光层栈：扫描线/微噪/窗口遮罩/容器暖光） | 图形程序员 A |
| `data/` | 工程加载用配置表（由 `../data/tables/` 派生/导出） | 数值策划 A |
| `addons/` | 第三方插件（托盘/全局快捷键等，过许可+维护性评审后引入） | 主程序 / 图形程序员 A |

> 注：`game/data/` 只放"工程加载用"的副本/派生；**数值表权威源在 [`../data/`](../data/README.md)**（schema/ 表结构、tables/ 数值）。

### 目录约定边界（不越界）

- **分层**：`art/`＝可编辑源文件 → `assets/`＝最终导出的运行资源 → `game/`＝加载运行的工程（项目 README 已定义）。
- `game/` 内不存储**源文件资源**（PSD/AI/Blender 源），只放导出后的运行资源引用与场景/脚本/shader。

## 二、工程原则（对齐主程序规范）

- 数据驱动：内容（数值/关卡/文案）走配置表，代码零硬编码（见 [`docs/lead-programmer/01_tech-stack-draft.md`](../docs/lead-programmer/01_tech-stack-draft.md)）。
- 表现与逻辑分层：玩法逻辑层不直接依赖渲染/UI。
- UI 框架隔离：UI 通过事件总线订阅逻辑层状态。
- 资源规范：命名/尺寸/导入设置遵循主美术与 UI 美术 A 规范。

## 三、里程碑（工程侧）

对齐 [`docs/lead-programmer/02_milestone-plan.md`](../plans/milestones/20260906-1534-milestone-plan.md)：
M1 单频道（磁带暖未来）闭环 → M2 三频道滤镜 → M3 完整一天 → M4 量产。

> 占位：`game/` 顶层 `.gitkeep` 已在工程骨架建成后移除；各空子目录（`scenes/*`、`shaders/`、`addons/`）以 `.gitkeep` 占位，目录内出现实际文件后可移除该占位。

## 四、M1 UI 骨架落点（UI 设计美术 A · 2026-09-08）

> M1 聚焦**磁带频道最小 UI 集 + 三态骨架**（漫游↔专注，设置/图鉴仅骨架占位）。场景/脚本为**骨架式占位**（可先行，正式美术/字体/音频资产后置）；换肤通过「共用骨架 + 频道 Token（`ChannelSkin`）」实现。规范与口径详见 [`docs/ui-artist-a/06_m1-ui-godot-impl.md`](../docs/ui-artist-a/06_m1-ui-godot-impl.md)、[`05_m1-ui-skeleton.md`](../docs/ui-artist-a/05_m1-ui-skeleton.md)。

### 4.1 已建场景/脚本（`scenes/` 下）

| 路径 | 说明 |
| --- | --- |
| `scenes/ui/channel_shell.{tscn,gd}` | **三态骨架**：共用根 + 漫游/专注/设置 三视图、图层可见度切换、焦点不劫持；订阅 `event_bus.state_changed` |
| `scenes/timer/focus_timer_panel.{tscn,gd}` | **专注计时面板**：默认角标 ⇄ 沉浸大计时切换骨架；等宽数字（`MM:SS`）；时长取自 `config_loader` |
| `scenes/mixer/mixer_panel.{tscn,gd}` + `mixer_track.gd` | **混音台**：≥2 轨音量滑杆，数据驱动；音量变化广播 `event_bus.mixer_volume_changed` |
| `scenes/channel/channel_skin.gd` | **频道皮肤 Token** 资源类（换肤令牌载体） |
| `scenes/channel/skins/tape_channel_skin.tres` | **磁带频道 Token 值**（引用主美术基线 v0.1：`#FFB000` 等；脚本/场景零硬编码色值） |
| `scenes/channel/tape_channel_panel.{tscn,gd}` | **磁带频道最小面板**（接收机中央窗口）· **Token 挂载点** |

### 4.2 换肤机制

各面板 `.gd` 声明 `@export var skin: ChannelSkin`，`_apply_skin()` 只从 `skin` 取色（`skin.lut_phosphor_amber` 等），**脚本与场景不出现十六进制色值**；换频道 = 换一份 `skins/*.tres`（Token），**不改骨架结构**（05_ §6.3 纪律）。是否「运行时热切换」或「预烘焙 UI 主题」待主程序拍板（05_ §6.2 / §8 ②）。

### 4.3 中文字体回退 & 数字等宽（M1 必锁，引用 05_ §七）

- **中文正文/卡片**：`SystemFont`（`PingFang SC` / `Microsoft YaHei`）系统回退，**不用终端等宽字**排中文。
- **数字**：一律走 `font_digit_tabular` 等宽数位（tabular figures），`MM:SS` 固定位宽防跳动。
- **装饰字**：仅频道标题/引言，正文不用（可读性优先 + UI 是器物边界）。

> 职责对照：UI 美术 A 产 UI 骨架/字体规范；主程序产工程引导/装配/换肤可行性；图形 A 产滤镜双光层（`shaders/`）；数值策划 A 产配置表（`../../data/tables/`）；正式字体/美术/音频资产后置。

## 五、磁带频道 2D 后处理栈（图形程序员 A · M1）

> 渲染器已由主程序锁 **Compatibility**（`project.godot` → `gl_compatibility`）。磁带频道 2D 后处理（**双层光 + 扫描线 + 微噪**）不需要 Forward+ / HDR / 真 bloom —— 详见 [`docs/graphics-programmer-a/05_m1-render-slice.md`](../docs/graphics-programmer-a/05_m1-render-slice.md)。本栈遵循"后处理栈复用 + 效果可开关"骨架（[`docs/graphics-programmer-a/01_rendering-tech-draft.md`](../docs/graphics-programmer-a/01_rendering-tech-draft.md)），M2 三频道（太空/蒸汽波）在此框架上加 feature。目录维护角色 = 图形程序员 A。

### 5.1 栈结构（三 CanvasLayer · Way A 分层合成）

| 层 | 承载 | 恒常？ | 用到的 shader |
| --- | --- | --- | --- |
| 信号层（频道内容） | 中央窗口内的频道内容 + 频道 LUT | 恒常（基底） | `window_mask.gdshader`（裁剪区） |
| 容器层（接收机框架） | 机身皮肤 + **容器暖光**（设备 2400K + 台灯 2800K） | 恒常（基底·暖光常亮） | `container_glow.gdshader` |
| 动效层（可关） | 扫描线 + 微噪（+ 暖光呼吸/辉光动态） | 可关 | `scanline.gdshader`、`noise.gdshader` |

> **双层光隔离（Way A）**：暖光只作用于容器层皮肤（其乘法光场 + 小范围辉光），不接触信号层像素；频道 LUT 只作用于信号层窗口区（`window_mask` 界定），不接触框架 —— 二者"区域/分层"隔离，互不污染（[`docs/graphics-programmer-a/04_response-gdd.md`](../docs/graphics-programmer-a/04_response-gdd.md) §八.2）。

### 5.2 shader 文件与性能预估（对齐 `05_m1-render-slice` §三，1080p 桌面）

| 文件 | 效果 | 层 | 可关？ | 性能（估） |
| --- | --- | --- | --- | --- |
| `shaders/scanline.gdshader` | 扫描线（tileable 叠加/程序化，缓移） | 动效 | 是 | **< 0.1 ms** |
| `shaders/noise.gdshader` | 微噪（luma grain·加法叠加） | 动效 | 是 | **0.05–0.1 ms** |
| `shaders/window_mask.gdshader` | 中央窗口遮罩（圆角矩形 64%×58%） | 结构 | 否（基底） | **< 0.05 ms** |
| `shaders/container_glow.gdshader` | 容器暖光 2D 假辉光（径向/薄雾） | 容器层 | 否（暖光常亮属基底） | **0.1–0.3 ms** |

**单频道累计**（对齐 `05_m1-render-slice` §3.2）：
- 动效全开（基底 + 双层光 + 扫描线 + 微噪）：**≈ 0.6–1.3 ms**（≤3 ms 后处理预算的 ≤8%，对 16.7 ms@60FPS 无压力）。
- 动效全关（**静默可用**）：**≈ 0.2–0.5 ms**。基底 = LUT + 终端边框 + 自发光屏 + 容器层皮肤 + **暖光常亮** + 窗口遮罩。
- 其他：2D DrawCall 增量 ≤ 8；显存增量 < 16 MB；后台暂停态 < 0.3 ms。

### 5.3 动效开关与基底层（静默可用）

控制器：`scenes/channel/channel_fx.gd`（+ 占位 `channel_fx.tscn`）。`ChannelFX` 控制各 effect 开关：
- `motion_enabled`：全局「减少动态/关闭动效」—— 关掉后**隐藏扫描线/微噪叠加层**、停暖光呼吸；
- `scanline_enabled` / `noise_enabled` / `glow_breathing_enabled`：逐 effect 开关。

**关动效 = 隐藏叠加层 + 停暖光呼吸；不改基底场景树与调色** → 暖光常亮、窗口遮罩、LUT 保留，"一盏亮着的灯 + 一块静止刻度盘"仍成立（主美术磁带基线 §七「静默可用」、`05_m1-render-slice` §四）。

> 暖光边界（主美术磁带基线 §5.2）：**暖光"存在"（常亮台灯、静止刻度盘、暖米机身）= 基底，不可关**；**暖光"动态"（缓慢呼吸、辉光振幅、淡入淡出）= 动效，可关**。

### 5.4 整合说明（待主程序/UI 美术 A 对接）

- 信号层内容裁剪：`channel_fx` 暴露 `window_mask_material`（`scenes/channel/channel_fx.gd`）。对**多子节点**内容的结构性裁剪由场景用 `Control.clip_contents`（矩形）+ 本遮罩整合，或用 `SubViewport` + 本遮罩；对单个 `CanvasItem` 可把本材质挂上去并置 `reject_outside=true`（`discard` 窗外）。
- 动效覆盖范围：主美术 §六 P8 建议「窗口内容覆盖、顶栏/边框不覆盖」。当前 `fx` 层默认铺满视口，**是否按 P8 收敛到仅窗口区**由 UI 美术 A 在骨架层叠约定后定（`05_m1-render-slice` §五 【待定】）。
- 参数收敛：扫描线/微噪/遮罩/暖光的**初值**已按主美术磁带基线 v0.1 置入各 shader 与 `channel_fx.gd`（扫描线 ≈3px、暗线强度 0.06–0.10、微噪 0.03–0.06、暖光 2400K/2800K、辉光半径 ≈220px、窗口 64%×58%/圆角 16px）。**待收敛进 `data/fx_preset.json`**（图形 A + 主程序确认后冻结）。

### 5.5 待 Godot 内验证

> 当前工作区无 Godot 4.7.x 编辑器/运行环境，**四个 `.gdshader` 与 `channel_fx.gd` 语法/资源编译未在 Godot 内验证**。以下为已知需在 Godot 里确认的点，一校验即修正：
> - `SCREEN_PIXEL_SIZE` 在 `canvas_item` fragment 的可用性（本栈假设叠加层铺满视口，`UV / SCREEN_PIXEL_SIZE` 得像素坐标）；
> - 四个 `.gdshader` 的编译与 `uniform`（`hint_range`/`source_color`/纹理 `repeat_enable`）映射；
> - `ShaderMaterial.set_shader_parameter`（`vec4`←`Vector4`、`vec3`←`Vector3`）与 `ColorRect` 全屏锚点在 `CanvasLayer` 下的缩放。
> 通过 Godot 4.7.x 打开 `game/` 工程（Compatibility）后按以上逐项确认。

---

## 六、工程状态：M1 单频道闭环已接线（主程序 · 2026-09-08）

> **已接线，可运行闭环（骨架级）**。此前四角色骨架（主程序工程 / 数值数据 / 图形后处理 / UI 面板）已由主程序 AppController 全局串联成**数据驱动 + 事件驱动**的最小闭环。本机实机验证：`godot --headless --path game --import` 无 SCRIPT ERROR、全局类注册齐；运行主场景 `--quit-after` 闭环自检 **VERIFY PASS**（详见 §6.4）。

### 6.1 接线链路（一行读懂）

```
app/main.tscn: Main(AppController)
 ├─ ChannelLoader   └─ PomodoroTimer   └─ MixerController
 └─（运行时实例化）ChannelFX（后处理栈） + ChannelShell（三态 UI→TapeChannelPanel/FocusTimerPanel/MixerPanel）

AppController._ready()
  config_loader 读 meta/channel/timer/mixer_track 四表
  → channel_loader.load_channel("tape_warm")   # 读 channel.json + 皮肤 Token（loaded_skin）
  → _init_channel_fx(skin)                     # 三层 CanvasLayer + 4 shader，注入 skin
  → _init_channel_shell(skin)                  # 三态骨架装配：Roam/专注视图挂三面板（数据驱动）
  → 订阅 event_bus.state_changed：进入 FOCUS ⇒ pomodoro_timer.start_focus()（事件驱动）
```

事件驱动闭环：`focus_state_machine` 切换 → `event_bus.state_changed` → `ChannelShell` 改三视图可见度 + `AppController` 启动番茄；`MixerPanel` 滑杆 → `event_bus.mixer_volume_changed` → `MixerController` 订阅生效；`PomodoroTimer` 起/收 → `event_bus.pomodoro_started/finished` → `FocusTimerPanel` 呈现。

### 6.2 如何打开 / 运行

- **编辑器运行**：用 Godot 4.7.x 打开 `game/` 工程（Compatibility），F5 运行主场景 `res://scenes/app/main.tscn`。默认进入**漫游态**（磁带频道窗口 + 后处理栈 + 氛围）；按 **F 或空格** 在 漫游↔专注 间切换。切换不夺焦、不打断专注（M1 口径）。
- **命令行导入自检**（无 SCRIPT ERROR）：`godot --headless --path game --import`
- **命令行运行一帧自检**（闭环 VERIFY PASS，stderr 输出判定）：`godot --headless --path game --quit-after 5`
  - ⚠️ 本机 `--headless` 会因 `user://` 目录创建失败而崩溃（沙箱限制）；可 `export HOME=/tmp/gdhome` 规避。此与工程无关。

### 6.3 当前可跑什么（骨架级验收）

| 项 | 状态 |
| --- | --- |
| 数据驱动装载 | ✅ `config_loader` 读 `game/data/tables/{meta,channel,timer,mixer_track,content_card}.json` 五表（含类型化取值；channel/timer/mixer_track/content_card 副本已从 `../../data/tables/` 派生到 `game/data/tables/`；content_card 权威源已由数值策划 A 建，3 张卡） |
| 频道装载 | ✅ `channel_loader.load_channel("tape_warm")` 读 channel.json，装载 `loaded_channel` + 皮肤 Token `loaded_skin` |
| 磁带动效栈 | ✅ `channel_fx` 自建三层 CanvasLayer，加载 4 个 `.gdshader`（扫描线/微噪/窗口遮罩/容器暖光），注入 skin 参数；动效可关 |
| 频道皮肤 Token | ✅ `tape_channel_skin.tres`（ChannelSkin）注入 channel_fx / 三面板；各面板 `_apply_skin()` 从 token 取色，零硬编码 |
| 三态 shell 可见度 | ✅ `ChannelShell` 订阅 `state_changed`，漫游↔专注 切换只改视图可见度（焦点不劫持） |
| 番茄专注 | ✅ 进入 FOCUS 时 `pomodoro_timer.start_focus()`（meta/timer 表 25min → 1500s），`FocusTimerPanel` 读 25min；后台/最小化准确性后置 |
| 混音台 | ✅ `MixerPanel` 滑杆由 `mixer_track` 表数据生成（2 轨：嗡鸣/磁带底噪），滑杆→事件→`MixerController` 生效；音量实时生效（骨架级，无真实音频） |
| 收藏 1 卡 | ✅ `TapeChannelPanel` 收藏按钮 → `event_bus.collect_requested` → `CollectionController` 从 `content_card` 池校验（存在 + 版权 status 合规闸门）→ 记录图鉴最小列表（内存 `id→{rarity, collected_at}`）→ 首次收藏记 `collect_frag` 碎片 → 广播 `event_bus.card_collected`（UI「已归档」反馈） |
| 静默可用 | ✅ `channel_fx` 动效可一键关（motion/scanline/noise），基底（暖光常亮/遮罩）保留 |

### 6.4 实机验证证据（headless）

`--quit-after 5`（`HOME=/tmp/gdhome`）输出（stderr）节选：

```
AppController: meta loaded [25.0] channel=[1] timer=[2] mixer_track=[2] content_card=[3]
AppController: 频道装载完成 id=tape_warm name=磁带暖未来 skin=ok
OK   meta 装载 pomodoro_work=25
OK   channel 装载 current=tape_warm
OK   皮肤 Token 装载 loaded_skin!=null
OK   混音轨数据 = 2 轨
OK   后处理栈 channel_fx 已挂接
OK   默认 ROAM 可见
OK   请求 FOCUS 成功 / 进入 FOCUS 态 / FOCUS 视图可见
OK   番茄已启动 / 番茄剩余 ≈ 25min
OK   混音事件生效 嗡鸣=0.8 / 混音台面板数据驱动 2 轨 / 含嗡鸣轨
OK   专注计时面板 = 25min
OK   回切 ROAM 成功 / 回切后番茄继续（不打断）
OK   内容卡池装载非空 / 当前卡 id 非空 / 当前卡存在
OK   收藏完成 图鉴=1 / 归档卡存在 rarity 正确 / 首次收藏碎片=collect_frag
OK   重复收藏幂等 图鉴仍=1 / 不存在卡拒绝收集 / 版权未批准拒绝收集
VERIFY PASS: M1 单频道闭环全部检查通过
```

> 说明：headless 走 `DisplayServer.get_name()=="headless"` 判定（4.7 下 `OS.has_feature("headless")` 不可靠）。`--import` 与 `--quit-after` 均 **EXIT=0、无 SCRIPT ERROR**；全局类 `ChannelFX/ChannelSkin/TapeChannelPanel/MixerPanel/MixerTrack/FocusTimerPanel/ChannelShell/ConfigLoader/EventBus/FocusStateMachine/AppController/ChannelLoader/MixerController/PomodoroTimer/CollectionController` 注册齐。

### 6.5 还差什么（M1 出口缺口，交对应角色）

> 以下为 M1 验收里**尚未完成**或**需编辑器/真实资产**项；骨架已就位，属实现/资产缺口而非接线缺口。标【待定】交对应角色，不改动其文档。

| 缺口 | 说明 | 责任人 |
| --- | --- | --- |
| **双光实机渲染在编辑器验证**（README §5.5） | headless 不加载体，`SCREEN_PIXEL_SIZE` 在 fragment 的可用性、四个 `.gdshader` 的编译与 `uniform` 映射（`hint_range`/`source_color`/纹理 `repeat_enable`）、`ShaderMaterial.set_shader_parameter`（`vec4`←`Vector4`/`vec3`←`Vector3`）与全屏锚点缩放。**需在 Godot 编辑器（Compatibility）逐项确认**。 | 图形程序员 A |
| 真实氛围音景 / AudioBus | `mixer_track` 表已定义 `bus`（`Ambience_Hum`/`Ambience_TapeHiss`），但无音频资源、无 bus 布局；`MixerController` 现为"内存音量真值"（未映射 `AudioStreamPlayer.volume_db`），"音量实时生效"为骨架级。需音景资产 + `default_bus_layout.tres`（衔接主程序/音频）。 | 主程序（bus 布局）+ 音频/主美术（音景资源） |
| 番茄结束轻提示 + 一次极简泛光 | `pomodoro_finished("completed")` 已广播，但结束的频道音色 + 一次泛光副作用未实现（可关、不弹窗）。 | 主程序（泛光，衔接图形 A）+ 音频 |
| 频道路由表（channel_id → skin/资源） | `channel_loader` 用 `SKIN_RESOURCE_BY_CHANNEL`（程序侧资源路由）关联 `channel.json` → `skins/*.tres`。M2 三频道需扩充；【待定】是否下沉到数据表（`channel.json` 增 `skin_resource` 字段，需数值 A/主程序共定 schema）。 | 主程序 + 数值策划 A |
| 焦点回收/防打断细化 | 状态机 `request_transition` 已实现漫游↔专注可切、不打断计时；设置/图鉴态只定骨架（M3）。专注段内真实"自动降噪"与"不打断"细化（如定时器重置、切换时计时器语义）【待定】。 | 主程序 |
| 中文字体回退 & 数字等宽资产 | UI 骨架已按 `SystemFont`（PingFang SC/Microsoft YaHei）+ tabular 数字口径占位；**正式字体资产/子集化 + macOS/Windows 双端验证**后置（05_ §七/§八 ⑤）。 | UI 设计美术 A |

### 6.6 本次接线跨角色改动登记（【待定】已交对应角色，未改其职责）

> 主程序只做全局串联；对 UI/图形脚本做了**最小编译修正**与**接口接线**，改动登记如下，交对应角色知悉（不改动其文档）。

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `scenes/channel/channel_fx.gd` | `_kelvin_to_rgb()`：`var t := clamp(...)` 无法推断类型 → 改 `var t: float = clampf(...)`（Godot 4 下 `clamp` 返回 Variant，`:=` 推断失败）。**仅编译修正，未改行为/接口。** | 编译修正（图形 A） |
| `scripts/autoload/config_loader.gd` | `_load_json_table()` 支持 object/array 两类表（原只收 object，channel/timer/mixer_track 为 array 会被拒 + 运行时类型错）；新增 channel/timer/mixer_track 加载与类型化取值（`get_channel`/`get_timer_by_mode`/`get_focus_minutes`/`get_mixer_tracks`）。 | 主程序（数据驱动接入） |
| `scripts/autoload/focus_state_machine.gd` | `_emit_state_changed()` 接通 `event_bus.state_changed`（取消骨架注释）。 | 事件驱动接线 |
| `scripts/pomodoro_timer.gd` | 接通 `event_bus.pomodoro_started/finished`，`_get_meta_work_min()` 走 `config_loader.get_focus_minutes()`（数据驱动）。 | 事件驱动 + 数据驱动 |
| `scripts/mixer_controller.gd` | 从 `mixer_track` 表装载轨音量（数据驱动），订阅 `event_bus.mixer_volume_changed`，`set_track_volume` 广播。 | 数据 + 事件驱动 |
| `scripts/channel_loader.gd` | `load_channel()` 读 `config_loader` 频道数据 + 皮肤 Token；完成后广播 `event_bus.channel_loaded`。 | 数据 + 事件驱动 |
| `scripts/app_controller.gd` / `scenes/app/main.tscn` | AppController 全局接线（§6.1）；main.tscn 挂 `ChannelLoader/PomodoroTimer/MixerController` 子节点（其余运行时实例化）。 | 主程序接线 |
| `game/data/tables/{channel,timer,mixer_track}.json` | 工程加载用副本（权威源 `../../data/tables/`，数值策划 A 维护）；`game/data/` 只放加载副本，见 README §一。 | 数据副本 |

**收藏 1 卡（M1 出口标准 #4，补）**：

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `scripts/autoload/event_bus.gd` | 新增 `collect_requested(card_id)` 事件（请求）；`card_collected(card_id, rarity)` 已有。 | 事件驱动（主程序） |
| `scripts/autoload/config_loader.gd` | 新增 `content_cards` 表加载 + `get_content_card`/`get_content_card_pool`（读取接口，数据驱动）。 | 数据驱动（主程序） |
| `scripts/collection_controller.gd` | **新增`CollectionController`**：订阅 `collect_requested` → 从内容卡池校验（存在 + 版权 status 合规闸门）→ 记录图鉴最小列表（内存 `id→{rarity, collected_at}`）→ 首次收藏记 `collect_frag` → 广播 `card_collected`。 | 收藏逻辑（主程序） |
| `scenes/app/main.tscn` | 挂 `CollectionController` 子节点。 | 装配（主程序） |
| `scripts/app_controller.gd` | 装配时从内容卡池注入 `TapeChannelPanel.current_card_id`（数据驱动）+ 闭环自检增收藏链路校验。 | 接线（主程序） |
| `game/data/tables/content_card.json` | **内容卡池**（M1 收藏 1 卡：权威源已由数值策划 A 建 `../../data/tables/content_card.json`，3 张：1 张 approved + 测试用，用于验证合规闸门）；此处为工程加载副本 | 数据（数值策划 A 权威源 / 主程序派生副本） |
| `scenes/channel/tape_channel_panel.gd` + `.tscn` | **接线 + 最小 UI（UI 美术 A）**：`_on_collect_pressed()` 由占位改为广播 `collect_requested(current_card_id)`；新增 `current_card_id` 导出（供 AppController 注入，数据驱动）+ `card_collected` 订阅 → 置「已归档」态 + 轻反馈。收藏卡 UI **改为场景节点**（`CardBox`：`CardTitle`/`CardMeta`/`CardBody` 呈现 title/rarity/摘要 + `CollectButton` 常态/已收藏态 + `CollectFeedback`「已归档」），非代码构建；按钮/反馈/窗口色取值自 `skin`（`ChannelSkin`，无硬编码 hex）。**未改骨架结构。** | 呈现 + 事件接线（UI 美术 A） |

> 注：`OS.has_feature("headless")` 在 Godot 4.7 下不可靠（`--headless` 仍返回 false），凡无头判定用 `DisplayServer.get_name()=="headless"`。
