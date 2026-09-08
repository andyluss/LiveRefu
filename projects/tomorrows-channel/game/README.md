# game · Godot 程序工程

> 存放《明日频道》的 **Godot 4.7.x 程序工程**（项目配置、场景、脚本、加载逻辑）。主程序牵头，图形程序员 A（渲染）与 UI 设计美术 A（UI 骨架）在此协作。
> 引擎与技术主线依据 [`docs/lead-programmer/03_godot-engine-research.md`](../docs/lead-programmer/03_godot-engine-research.md)、[`../docs/lead-programmer/01_tech-stack-draft.md`](../docs/lead-programmer/01_tech-stack-draft.md)。

## 一、目录约定（Godot 标准 + 数据驱动）

| 目录 | 内容 | 维护 |
| --- | --- | --- |
| `project/` | 工程目录：`project.godot`、`scenes/`、`scripts/`、`autoload/` | 主程序 |
| `scenes/` | .tscn 场景 / 预制体（按系统分子目录） | 主程序 / UI 美术 A |
| `scripts/` | 逻辑脚本（GDScript 或 C#，按系统分） | 主程序 / 图形程序员 A |
| `data/` | 配置表（`../data/tables/` 导出，或此处引用） | 数值策划 A |
| `shaders/` | 材质 / shader（滤镜双光层栈） | 图形程序员 A |

> 注：`game/` 下的 `data/` 为存放/引用数值表的工程侧落点；**数值表的权威源在 [`../data/`](../data/README.md)**，本目录只放"工程加载用"的版本。

## 二、工程原则（对齐主程序规范）

- 数据驱动：内容（数值/关卡/文案）走配置表，代码零硬编码（见 [`docs/lead-programmer/01_tech-stack-draft.md`](../docs/lead-programmer/01_tech-stack-draft.md)）。
- 表现与逻辑分层：玩法逻辑层不直接依赖渲染/UI。
- UI 框架隔离：UI 通过事件总线订阅逻辑层状态。
- 资源规范：命名/尺寸/导入设置遵循主美术与 UI 美术 A 规范。

## 三、里程碑（工程侧）

对齐 [`docs/lead-programmer/02_milestone-plan.md`](../plans/milestones/20260906-1534-milestone-plan.md)：
M1 单频道（磁带暖未来）闭环 → M2 三频道滤镜 → M3 完整一天 → M4 量产。

> 占位：工程建立前 `game/` 以 `.gitkeep` 占位；启动工程时移除。
