# 数值沙盘 · simulator

> **一句话**：离线、单页、数据驱动的解析计算器；用于调塔/波次/地图/经济，不替代 Godot 试玩。
>
> 方案：[`../tech/18_HTML数值模拟器方案.md`](../tech/18_HTML数值模拟器方案.md)。本目录实现 C-lite 的 **P1–P4**：解析沙盘 + Godot trace 对账 + 离散小模拟。

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
./run.sh sim-trace       # 导出 Godot 标准场景 traces.json
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
- 「标准班」按钮恢复默认配置；
- 导入 `sim-trace` 导出的 `traces.json`，或使用内置 trace，对照路径/塔位/波次/HP/塔数；
- P4「离散小模拟」：按当前塔位跑移动、索敌、开火、减速、故障停塔、漏过、供能与评级。

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
- P3 已提供 `sim-trace` 与 trace 导入/内置对照；解析沙盘本身不产生逐局 grade，因此击杀/漏过/保障度只显示 Godot 参考值，不冒充预测。

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

## 六、P3 对账

```bash
./run.sh sim-trace
```

写出：

```text
docs-ai/design01/simulator/traces.json
```

当前 trace：

- 三张地图；
- 场景 `standard`：两座拦截炮 + 供能/补塔/升级的固定策略；
- 结果：grade / 保障度 / 击杀 / 漏过 / 建造/花费 / 时长；
- 静态事实：路径长度、塔位、波数、敌人总数、波次 HP。

页面内置这份 trace，也可以手动导入新的 JSON。对照表会检查静态事实；逐局结果只显示 Godot 参考值。

## 七、P4 离散小模拟

页面底部「P4 离散小模拟」使用当前地图、塔位和塔等级：

- 固定 1/60 s 步长；
- 敌人沿路径移动；
- 塔按射程索敌、单体/范围开火；
- 脉冲环/牵引锚减速；
- 故障反向移动并停塔；
- 漏过扣保障度；
- 每波清空后进入下一波；
- 输出 grade / 保障度 / 击杀 / 漏过 / 供能 / 时长；
- 仅用于对比数值关系，不是完整 Godot 复刻。

## 八、后续

- P4 已提供近似小模拟；如果要更接近真实，可继续加目标选择细节、相邻塔降级、暂停/倍速与多场景 trace；
- 在 P4 之外，页面里的解析指标仍只适合**相对比较**，不能当绝对结果。
