# 数值沙盘 · simulator

> **一句话**：离线、单页、数据驱动的解析计算器；用于调塔/波次/地图/经济，不替代 Godot 试玩。
>
> 方案：[`../tech/18_HTML数值模拟器方案.md`](../tech/18_HTML数值模拟器方案.md)。本目录只实现 C-lite 的 **P1–P2**。

## 一、怎么用

直接打开：

```text
docs-ai/design01/simulator/index.html
```

或重新生成：

```bash
cd games/livebay
./run.sh simulator
./run.sh simulator-check
```

页面不联网、无后端；数据已嵌入 HTML。

## 二、能做什么

- 选地图（bay01/02/03）；
- 选波次（单波/合计）；
- 给每个塔位选塔（空/拦截炮/脉冲环/牵引锚/补给塔）；
- 调塔等级与敌人速度倍率；
- 实时看：
  - 路径长度、覆盖倍率；
  - 理论 DPS、波次压力；
  - 建造/剩余供能；
  - 塔位覆盖弦长；
  - 每波 HP/奖励/漏过/压力；
  - 地图修正；
- 场景会写入 URL hash，刷新/分享可恢复；
- 「标准班」按钮恢复默认配置。

## 三、公式与口径

### 3.1 覆盖

- 塔位到路径：点到折线的最近距离 `d`；
- 射程 `R` 的覆盖弦长：`2 × sqrt(R² − d²)`（`d ≥ R` 时为 0）；
- 覆盖倍率：`Σ 弦长 / 路径长度`；不是“覆盖率百分比”。

### 3.2 DPS

```text
DPS = damage × fire_rate × (1 + 0.25 × (level − 1))
```

- 只算单目标理论 DPS；
- 脉冲环/AoE 的“多目标收益”不乘进去；
- 减速只影响实际停留时间，第一版不精确模拟。

### 3.3 波次压力

```text
压力 = 波次总 HP / (最后生成窗口 + 最后一只穿越全弧时间)
```

- 用于比较“这波需要多快输出”，不是准确 TTK；
- 不计玩家操作、建造顺序、故障暂停、敌人被提前击杀。

### 3.4 经济

```text
剩余供能 = 初始供能 + 地图修正 + 本波奖励 − 建造花费
```

- 不含补给塔持续产出、升级花费、出售退款；
- 初始供能来自 `balance` + `map.modifiers.energy_delta`。

## 四、边界

- **不是**完整战斗模拟：没有逐帧走位、索敌、减速叠加、故障相邻塔、玩家操作；
- **不是**最终平衡裁决：结论必须用 Godot `./run.sh playtest` 或人工试玩复核；
- 数据来自 `game/data/*.json`，生成物不手改；
- 方案 P3 的 `sim-trace` 对账尚未实现。

## 五、生成

```bash
python3 tools/build_simulator.py           # 生成 index.html
python3 tools/build_simulator.py --check   # 只校验是否过期
```

数据源：

```text
game/data/towers.json
game/data/enemies.json
game/data/balance.json
game/data/map_bay01/02/03.json
game/data/waves*.json
```

## 六、后续

- P3：`./run.sh sim-trace` 导出 Godot 标准场景 JSON，在页面里对比估算偏差；
- P4（可选）：离散事件小模拟，加入更真实的目标选择/减速/故障；
- 在 P3 之前，页面里的诊断只能作为**相对比较**，不能当绝对结果。
