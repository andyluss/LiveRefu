# 数据到 MissionPack

> 由 `tools/build_extra_flows.py` 生成；配套总览见 [README.md](README.md)，总状态机见 [game_flow.md](game_flow.md)。

Markdown 数值表是源；Python 导出 JSON，编译 MissionPack；DataLoader 校验后进入 Sim。测试和 HUB 再反过来校验数据。

```mermaid
flowchart TD
    A[numbers/*.md] --> B[export_numbers.py]
    B --> C[game/data/*.json]
    C --> D[export_mission_pack.py]
    D --> E[MissionPack manifest + hash]
    E --> F[DataLoader]
    C --> F
    F --> G[MissionRuntime / Sim]
    G --> H[tests / blackbox / playtest]
    H --> I[tests & HUB facts]
    I --> A
```

## 说明

- 这张图是流程/结构图，不是数值平衡表；
- 图中的“等待/选项”是流程层概念，不一定是 `Sim.State` 的枚举值；
- 改状态/命令/事件后运行 `./run.sh flow` 重新生成。
