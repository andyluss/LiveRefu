# 泳道图：一局的职责分工

> 由 `tools/build_flow.py` 生成；配套总览见 [README.md](README.md)，总状态机见 [game_flow.md](game_flow.md)。

把玩家、Runtime、Sim、扩展内容分成四条泳道：谁发起、谁调度、谁改变状态、谁提供班次内容。

```mermaid
flowchart LR
    subgraph P["玩家 / UI"]
        P1[选择塔位]
        P2[建造 / 升级 / 出售]
        P3[开波]
        P4[检查单 / 故障选择]
    end
    subgraph R["Runtime / Clock"]
        R1[CommandBus]
        R2[MissionClock]
        R3[EventBus]
    end
    subgraph S["Sim / Domain"]
        S1[PREP]
        S2[WAVE]
        S3[BETWEEN]
        S4[WON / LOST]
    end
    subgraph X["扩展 / 内容"]
        X1[W4 检查单]
        X2[W5 故障]
        X3[记录 / 简报]
    end
    P1 --> R1
    P2 --> R1
    P3 --> R1
    R1 --> S1
    S1 --> S2
    S2 --> R3
    R3 --> S3
    S3 --> S2
    S2 --> S4
    S2 --> X2
    S3 --> X1
    X1 --> P4
    X2 --> P4
    P4 --> R1
    S4 --> X3
    X3 --> P1
    R2 -. 暂停/恢复 .-> S2
```

## 说明

- 这张图是流程/结构图，不是数值平衡表；
- 图中的“等待/选项”是流程层概念，不一定是 `Sim.State` 的枚举值；
- 改状态/命令/事件后运行 `./run.sh flow` 重新生成。
