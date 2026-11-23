# ADR-003 · 确定性与存档/回放 v0

- 状态：接受（M0 实现）
- 关联：[01 世界模型](../docs/01_世界模型与运行时.md)

## 决策

1. 固定 tick，默认 60 Hz；`advance(frame_dt_us)` 用累加器，单帧最多追 4 tick。
2. 随机用 SplitMix64，状态进快照与哈希；M0 的示例内容暂未消耗随机数。
3. 实体按 `EntityId` 排序后进入快照；不使用哈希表遍历顺序。
4. 状态哈希 = xxh3_64(规范化 JSON 快照)；哈希 0 保留为错误。
5. 存档 = JSON 信封（format/core/pack/hash/seed/tick/snapshot/checksum），校验和覆盖除 checksum 外的字段；包不匹配或校验和错误都拒绝加载。
6. 回放 = 包哈希 + tick 数 + 输入/命令 trace + 每 60 tick 关键帧哈希 + 最终哈希。

## M0 证据（M1 更新）

- 同一 trace 双跑：`final_hash = 0xc840fe2090a0a085`。
- save → load → hash 一致；篡改 checksum 被拒绝。
- C ABI 宿主同一 trace 得到相同哈希。
- **M1 变更**：加入 `collider`、`move_intent` 与 `open_door` 动作后，状态快照包含新字段，黄金哈希更新为 `0xc840fe2090a0a085`；旧 `0xd1c6…` 只对应 M0 的历史状态。

## 已知限制（M1 必须补）

- 尚未做 NaN/`-0.0`/次正规数的规范化；当前示例不触发，但 Det1 前必须补。
- 只在 macOS 本地验证；Linux/Windows CI 已配置但尚未执行。
- `timescale`/`suspend` 已进状态，但未做专门的确定性测试。
