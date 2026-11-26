# real5k 基准记录

- 场景：`worldc bench --scenario real5k`，单 Zone 5,000 实体（含玩家）。
- 机器：Apple M1 Pro / macOS 27.2.1 / aarch64。
- 构建：`--release`；warmup 300 tick；5 轮 × 6,000 tick。
- 基线 JSON：[`real5k-baseline-m1pro.json`](real5k-baseline-m1pro.json)。
- 完整定义与决策：[`ADR-008`](../../plans/ADR-008-real-5k-benchmark.md)。

复跑：

```bash
cd games/world
WORLDC_RELEASE=1 ./worldc bench --scenario real5k --ticks 6000 --runs 5 --json
```
