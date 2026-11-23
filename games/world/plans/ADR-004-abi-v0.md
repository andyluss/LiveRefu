# ADR-004 · C ABI v0

- 状态：接受（M0 实现）
- 关联：[03 引擎适配](../docs/03_引擎适配与替换.md)

## 决策

1. `abi_version = (major << 16) | minor`；主版本相等且调用方 minor ≤ 内核 minor 才接受。
2. 内核不回调引擎；适配器轮询事件/变换，调用命令与 tick。
3. 高频变换用 `WorldTransformPod` POD 数组；事件/命令/存档用 JSON 字节，调用方分配缓冲，两段式取长度。
4. 指针有效性由调用方保证；每个 extern 函数用 `catch_unwind` 隔离 panic；错误文本走 `world_last_error`。
5. M0 函数面：create/destroy/load_pack/tick/command/poll_events/copy_transforms/state_hash/find_entity/save/load_save/activate_zone/deactivate_zone/zone_assets/zone_status/set_zone_visible/suspend/set_timescale/last_error/core_version。
6. `include/world.h` 由 `worldc header` 写入；M0 是模板生成，M1 改为从 schema/IDL 生成。

## 证据

- `hosts/c/main.c` 通过 C ABI 跑 600 tick，`final_hash=0x9c4032a29d99274d`，与 Headless 一致。
- `cargo test -p world-ffi` 覆盖同哈希与 save/load。

## 代价 / 后续

- 手写头文件可能与实现漂移；M1 必须改用 schema 生成 + 签名比对。
- `world_poll_events`/`world_save` 的缓冲协议是「不足返回 1 + 所需长度」；适配器要按此实现。
