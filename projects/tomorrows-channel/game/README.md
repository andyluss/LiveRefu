# game · Godot 程序工程

> 存放《明日频道》的 **Godot 4.7.x 程序工程**（项目配置、场景、脚本、加载逻辑）。主程序牵头，图形程序员 A（渲染）与 UI 设计美术 A（UI 骨架）在此协作。
> 引擎与技术主线依据 [`docs/lead-programmer/03_godot-engine-research.md`](../docs/lead-programmer/03_godot-engine-research.md)、[`../docs/lead-programmer/01_tech-stack-draft.md`](../docs/lead-programmer/01_tech-stack-draft.md)。

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
├── shaders/                 # 材质 / shader（滤镜双光层栈：扫描线/微噪/暗角）
├── data/                    # 工程加载用配置表副本（权威源在 ../data/tables/）
└── addons/                  # 第三方插件（系统集成 bridge / 托盘 / 全局快捷键，经评审引入）
```

每目录职责与维护角色：

| 目录 | 内容 | 维护 |
| --- | --- | --- |
| `scenes/` | .tscn 场景 / 预制体（按系统分子目录） | 主程序 / UI 美术 A |
| `scripts/` | 逻辑脚本（**GDScript**，按系统分成；M1 不引入 C# 混写） | 主程序 / 图形程序员 A |
| `shaders/` | 材质 / shader（滤镜双光层栈：扫描线/微噪/暗角） | 图形程序员 A |
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

> 占位：工程建立前 `game/` 以 `.gitkeep` 占位；启动工程时移除。
