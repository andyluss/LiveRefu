# game · Godot 程序工程

> 存放《明日频道》的 **Godot 4.7.x 程序工程**（项目配置、场景、脚本、加载逻辑）。主程序牵头，图形程序员 A（渲染）与 UI 设计美术 A（UI 骨架）在此协作。
> 引擎与技术主线依据 [`docs/lead-programmer/03_godot-engine-research.md`](../docs/lead-programmer/03_godot-engine-research.md)、[`../docs/lead-programmer/01_tech-stack-draft.md`](../docs/lead-programmer/01_tech-stack-draft.md)。

> **工程状态**：**工程骨架已建**（Godot 4.7.x / 渲染器 = Compatibility）。已建 `project.godot`、`scenes/`（app/channel/timer/mixer/ui 占位，含 `scenes/app/main.tscn` 主场景）、`scripts/`（`autoload/` 单例 `config_loader` / `event_bus` / `focus_state_machine` + 核心系统骨架 `channel_loader` / `pomodoro_timer` / `mixer_controller` / `app_controller`）、`shaders/`、`data/`、`addons/` 骨架。各空目录以 `.gitkeep` 占位。详见下方目录约定。

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
