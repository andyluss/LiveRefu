# 波次生命周期

> 由 `tools/build_flow.py` 生成；配套总览见 [README.md](README.md)，总状态机见 [game_flow.md](game_flow.md)。

从准备倒计时到生成、移动、命中/漏过、清除；最后一波进入 WON，保障度归零进入 LOST。

```mermaid
flowchart TD
    A[PREP / BETWEEN] --> B[开始波次]
    B --> C[生成组：按 interval/delay]
    C --> D[敌人沿路径移动]
    D --> E{经过塔位?}
    E -- 故障 --> F[停塔 / 降级]
    E -- 普通 --> G[塔开火]
    F --> H[继续移动]
    G --> H
    H --> I{到湾口?}
    I -- 是 --> J[扣保障度]
    I -- 否 --> D
    J --> K{保障度=0?}
    K -- 是 --> L[LOST]
    K -- 否 --> M{波次清空?}
    M -- 否 --> D
    M -- 是 --> N{最后一波?}
    N -- 是 --> O[WON]
    N -- 否 --> P[BETWEEN]
    P --> B
```

## 说明

- 这张图是流程/结构图，不是数值平衡表；
- 图中的“等待/选项”是流程层概念，不一定是 `Sim.State` 的枚举值；
- 改状态/命令/事件后运行 `./run.sh flow` 重新生成。
