# ADR-006 · QuickJS 脚本宿主 spike

- 状态：接受（M0 只做可行性验证）
- 关联：[01 §九](../docs/01_世界模型与运行时.md#九脚本宿主)

## 结果

- 原生：`world-script` 用 `rquickjs 0.14` 执行 `(1 + 1 === 2) && ('keycard' === 'keycard')`，返回 true。
- WASM：`world-script-wasm` 编译到 `wasm32-unknown-unknown`，Node 实例化后调用 `quickjs_eval_rule()` 返回 1。
- 关键坑：
  1. macOS 自带 `ar/ranlib` 不能正确索引 wasm 对象；构建时需 `AR/RANLIB=/opt/homebrew/opt/llvm/bin/llvm-ar|llvm-ranlib`。
  2. QuickJS 在 wasm 内需要更大栈；`.cargo/config.toml` 设 `-zstack-size=16777216`。
  3. wasm shim 需要宿主提供 `env.__rquickjs_host_now_us`；M0 Node 脚本返回 0。
  4. 没有该 import 时实例化失败；这是 Web 宿主必须实现的最小平台接口。

## 未做

- 没有接入事件/命令/查询 API、预算/中断、沙箱、存档中的脚本状态。
- 规则仍由 Rust 解释 JSON；QuickJS 只是「能跑」的证明。

## M1 计划

实现 `ScriptHost` trait 与 `@refu/world-*` 类型声明；脚本只允许 `world.on/query/cmd/time/rng`，并用 interrupt + 预算做隔离。
