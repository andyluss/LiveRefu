---
title: "RefuWorld · 跨游戏世界系统中间层"
tagline: "让内容作者写世界，让引擎只负责把它画出来"
form: "Rust 权威内核 + TypeScript 内容层 + 薄引擎适配器"
status: "M0 已通过；M1 主要切片（TS DSL / 多 Demo 体系 / ScriptHost / 真实 5k v1 / 三平台 CI / 编辑器 v0.5 / 移动与寻路 / 导航与资产）已通过"
stack: "Rust / TypeScript / C ABI"
scope: "跨游戏、跨引擎"
---

# RefuWorld（世界层）

> **一句话**：把「世界怎么运转」从引擎里拿出来，做成一个**确定性、可测试、可替换引擎**的 Rust 内核；
> 内容作者用 TypeScript 与数据描述世界，引擎只负责把世界画出来、放出声音、接收输入。

> **当前状态**：**M0 已通过；M1 主要切片（TS DSL / 多 Demo 体系 / ScriptHost / 真实 5k v1 / 三平台 CI / 编辑器 v0.5 / 移动与寻路 / 导航与资产）已通过**。
> 无头内核、C ABI、wasm + QuickJS、TypeScript DSL、wasm 2D/2.5D/3D 多 Demo、QuickJS ScriptHost、Web 编辑器 v0.5、移动/寻路、导航/资产依赖均可运行；
> TS 编译包与 JSON 包同哈希，Web 预览回放得到同一 `0xc840fe2090a0a085`。
> 记录见 [06 · M0](docs/06_M0实现与验收.md) 与 [07 · M1 切片](docs/07_M1实现与验收.md)。
>
> 方案仍有效：推荐结论见 [04 · 选型对比与推荐](docs/04_选型对比与推荐.md)，路线见
> [05 · 路线图与验收](docs/05_路线图与验收.md)。

## 快速开始

```bash
cd games/world
npm install                    # TypeScript 类型检查（可选，但推荐）
./test/run_m0.sh          # M0：测试 / 双跑哈希 / 坏包 / C ABI / wasm+QuickJS / 基准
./test/run_m1.sh          # M1：TS DSL / 内容测试 / 5k real / 编辑器 / wasm 预览
./worldc ts-check                              # TypeScript 类型检查
./worldc bake nav                             # 从 Zone/Prop 烘焙导航
./worldc ts-build --compare data/demo.harbor   # 单独跑 TS DSL 编译
./worldc editor --port 8788                    # Web 编辑器 v0.5
WORLDC_RELEASE=1 ./worldc bench --scenario real5k --ticks 6000 --runs 5 --json  # 真实 5k
npm run dev                                    # TS 内容监听（编译→构建→复制 pack.data）
```

M1 预览：

```bash
cd games/world
./web/build.sh
python3 -m http.server 8787
# Demo 索引：http://127.0.0.1:8787/web/demos.html
# 2D 预览：http://127.0.0.1:8787/web/
# 3D 港湾：http://127.0.0.1:8787/web/demo3d.html
# 2.5D 夜市/温室：/web/iso.html?demo=market / ?demo=greenhouse
# 3D 环形站：/web/orbit3d.html
# 编辑器（另开终端）：./worldc editor --port 8788
```

> 当前有 **2D/2.5D/3D 多 Demo** 与 **Web 编辑器 v0.5**（布局/表单/对话图/撤销）；TS 类型检查与 `npm run dev` 已可用；更完整的 schema 表单、动态导航与 ScriptHost hardening 仍待。

## 先读哪篇

| 你想知道 | 读这篇 | 大约 |
| --- | --- | --- |
| 整体怎么搭、为什么需要它 | [00 · 方案总览](docs/00_方案总览.md) | 20 分钟 |
| 世界、区域、实体、时间、确定性怎么定义 | [01 · 世界模型与运行时](docs/01_世界模型与运行时.md) | 30 分钟 |
| 内容作者到底怎么写内容 | [02 · 内容作者与工具链](docs/02_内容作者与工具链.md) | 25 分钟 |
| 怎么做到「换引擎只换一层」 | [03 · 引擎适配与替换](docs/03_引擎适配与替换.md) | 25 分钟 |
| 为什么选这套，不选别的 | [04 · 选型对比与推荐](docs/04_选型对比与推荐.md) | 20 分钟 |
| 分几步做、怎么算做完 | [05 · 路线图与验收](docs/05_路线图与验收.md) | 15 分钟 |
| 项目现在到哪、第一次怎么用 | [项目 HUB](brief/HUB.html) / [用户指南](brief/GUIDE.html) | 5–15 分钟 |

## 推荐方案（TL;DR）

| # | 决策 | 推荐 | 一句话理由 |
| --- | --- | --- | --- |
| D1 | 权威内核语言 | **Rust** | 无 GC、可预测、能同时产出原生库与 WASM，适合做跨引擎底座 |
| D2 | 内容与规则语言 | **TypeScript**（编译为规范化内容包；JSON 可直写） | 作者生态最好，类型即文档；编译后语言中立 |
| D3 | 内核与引擎的边界 | **版本化 C ABI + 轮询**（内核从不回调引擎） | 边界最小，任何语言都能接；线程与错误模型简单 |
| D4 | 脚本运行时 | **QuickJS-NG**（`rquickjs`） | 体积小、无 JIT、可嵌入原生与 WASM；TS 编译后直接跑 |
| D5 | ECS 的角色 | **内部实现细节**（先用 `bevy_ecs`，外面包一层门面） | 借成熟实现，但不把 ECS 概念甩给内容作者 |
| D6 | 空间与物理归属 | **核心拥有逻辑空间/导航/碰撞；引擎只做表现** | 不把确定性交给各引擎的物理实现 |
| D7 | 世界模型 | **持久 World + Session + Zone + Entity/Component** | 同时覆盖「一局」与「持续世界」，不被塔防/关卡结构绑死 |
| D8 | 首批宿主 | **Headless（CI）+ C/C# ABI 冒烟 + Web（作者预览）+ Godot（首个生产适配器）** | 先用非 Rust 宿主真正压一遍 C ABI，再用两个宿主证明可换 |

## 成功是什么样

不是「架构图好看」，而是下面四件事能同时成立：

1. **内容作者不需要引擎知识**：一个没写过 Godot/Unity 的人，照教程在 **目标 2 小时内**做出一个可玩房间（含 1 个 NPC、1 段对话、1 个任务）。
2. **同一内容包能在两个宿主上跑出同一局**：固定种子 + 同一输入轨迹，跑 **600 tick** 后状态哈希与事件序列完全一致。
3. **换引擎基本只换适配器**：新增一个引擎的基础适配器（输入/资产/视图/音频/存档）**≤ 2,000 行**，且适配器里**没有一条玩法规则**。
4. **内容迭代足够快**：改一个定义到预览可见 **≤ 2 秒**；内容错误在编辑器里指出具体内容 ID，而不是引擎堆栈。

## 目录

| 路径 | 是什么 |
| --- | --- |
| [`docs/00_方案总览.md`](docs/00_方案总览.md) | 问题、目标/非目标、十条原则、五层架构、一次 tick 的完整路径 |
| [`docs/01_世界模型与运行时.md`](docs/01_世界模型与运行时.md) | World/Zone/Session/Entity/Component、空间、时间、命令/事件、确定性、存档 |
| [`docs/02_内容作者与工具链.md`](docs/02_内容作者与工具链.md) | 内容包结构、TS DSL、校验、Web 编辑器、CLI、两小时教程 |
| [`docs/03_引擎适配与替换.md`](docs/03_引擎适配与替换.md) | C ABI、表现同步、资产、Godot/Unity/Unreal/Web/Bevy、适配器契约测试 |
| [`docs/04_选型对比与推荐.md`](docs/04_选型对比与推荐.md) | 五个整体方案评分、十二个子决策、推荐理由、改选信号、风险登记 |
| [`docs/05_路线图与验收.md`](docs/05_路线图与验收.md) | M0–M4 里程碑、第一个垂直切片、测试策略、指标、待拍板问题 |
| [`docs/06_M0实现与验收.md`](docs/06_M0实现与验收.md) | M0 实际架构、验收对照、基准、偏差与已知限制 |
| [`docs/07_M1实现与验收.md`](docs/07_M1实现与验收.md) | M1 切片：TS DSL、Web 预览、截图、验收与剩余 M1 |
| [`docs/08_两小时教程.md`](docs/08_两小时教程.md) | 用 Web 编辑器做出「港湾值班室」的两小时教程 |
| [`brief/`](brief/) | 项目 HUB 与用户指南（R-016 三态主题） |
| [`packages/world-authoring/`](packages/world-authoring/) | 类型化 TS DSL 与注册表 |
| [`src/content/demo.harbor/`](src/content/demo.harbor/) | TS 版「港湾值班室」内容源 |
| [`tools/ts-build.mjs`](tools/ts-build.mjs) | TS DSL → 规范化内容包编译器 |
| [`web/`](web/) | wasm 2D 预览 + 3D 演示 + 编辑器 v0.5（构建、页面、Node 测试） |
| [`web/demos.html`](web/demos.html) | Demo 索引：2D / 2.5D / 3D、剧情/探索/工具 |
| [`web/demo3d.html`](web/demo3d.html) | 3D 港湾值班室（Three.js，本地 vendor） |
| [`web/iso.html`](web/iso.html) | 2.5D 等距渲染器（夜市 / 温室） |
| [`web/orbit3d.html`](web/orbit3d.html) | 3D 环形站中庭 |
| [`tools/editor-server.mjs`](tools/editor-server.mjs) | 本地编辑器服务器（读写/校验/构建） |
| [`code/`](code/) | Rust workspace：pack/core/ffi/headless/cli/script/wasm |
| [`data/demo.harbor/`](data/demo.harbor/) | 「港湾值班室」内容包（2D/3D） |
| [`data/demo.market/`](data/demo.market/) | 「霓虹夜市」内容包（2.5D） |
| [`data/demo.greenhouse/`](data/demo.greenhouse/) | 「温室协议」内容包（2.5D） |
| [`data/demo.orbit/`](data/demo.orbit/) | 「环形站」内容包（3D，含 ScriptHost 示例） |
| [`test/`](test/) | 一键验收脚本、坏包 fixture、wasm QuickJS 检查 |
| [`plans/`](plans/) | ADR-001…008：拍板、包 schema、确定性、ABI、ECS 偏差、QuickJS spike、M1 DSL/Web、真实 5k 基准 |
| [`CHANGELOG.md`](CHANGELOG.md) | 本项目变更日志 |

## 边界（明确不做）

- **不做渲染器 / 物理引擎 / 音频引擎**：这些是引擎的强项，也是换引擎时最不该自己重写的部分。
- **不做通用 DCC / 资产创作工具**：只定义「逻辑资产 ID + 每引擎导入配方」，建模仍在 Blender 等工具里。
- **v0 不做联网 / MMO**：但命令日志 + 快照的设计为将来的 rollback/回放留口。
- **v0 不做可视化节点编程**：规则用 TypeScript 或数据；节点图是编辑器成熟后的事。
- **不替代引擎编辑器**：内容包是唯一事实源，引擎编辑器与 Web 编辑器都只是它的视图。
- **不追求跨编译器浮点一致**：目标是从「同平台可复现」到「跨平台可复现」，不承诺跨 CPU/编译器的逐位一致。

## 与现有项目的关系

LiveBay 的模块化架构（[16 · 模块化技术架构](../../games/livebay/docs-ai/design01/tech/16_模块化技术架构_NASApunk.md)、
[17 · 可插拔扩展架构](../../games/livebay/docs-ai/design01/tech/17_可插拔扩展架构.md)、
[19 · 任务包目录与跨地图语义](../../games/livebay/docs-ai/design01/tech/19_任务包目录与跨地图语义.md)）
已经验证了命令/事件总线、模块端口、MissionPack、黑匣子回放这套做法在真实项目里跑得通。

本方案**继承它的概念**，但**不继承它的实现**：

| 继承 | 不继承 |
| --- | --- |
| 命令/事件/读模型分离；端口而非兄弟模块；固定 tick；内容包 + 哈希；黑匣子回放；扩展包启停 | GDScript 实现、Godot 类型、仅任务级的生命周期、与 `main.gd` 耦合的表现层 |

迁移路线是「新层先独立跑通 → 用 LiveBay 的一个切片做试点 → 再决定是否整体迁移」，不要求停掉现有项目重写。

## 已拍板（2026-11-23）

| 编号 | 结论 |
| --- | --- |
| Q1 | 首发试点：**「港湾值班室」**；LiveBay 切片在 M4 试点 |
| Q2 | 平台：**PC + Web** |
| Q3 | v0 **不做联网/多人** |
| Q4 | 作者主界面：**Web 编辑器优先**，Godot 插件后置 |
| Q5 | 许可：**内部私有**；M0 不因开源协议收缩依赖 |
| Q7 | 命名：**RefuWorld**（目录仍为 `games/world/`） |
| Q8 | 团队：2 名核心全职 + 1.0 兼职 |
| Q9 | 规模：5k 活跃 / 20k 总 / 10 MB 存档 |
| Q10 | LiveBay：M4 试点一个切片，不做全量迁移 |

完整记录见 [ADR-001](plans/ADR-001-m0-decisions.md)；原始选项见 [05 · 待拍板问题](docs/05_路线图与验收.md#七待拍板问题)。
