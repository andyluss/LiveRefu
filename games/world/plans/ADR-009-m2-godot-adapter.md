# ADR-009 · M2 从 Godot 逻辑适配器启动

- 状态：接受（M2 第一切片）
- 日期：2026-11-26
- 关联：[05 M2](../docs/05_路线图与验收.md#五m2--第一生产适配器godot)、[03 §8.1](../docs/03_引擎适配与替换.md#81-godot首个生产适配器)、[M2 启动记录](../docs/09_M2适配器启动.md)

## 决策

M2 先做 **Godot 4.7 的逻辑适配器**，不先做渲染/资产/音频：

- 新增 `world-abi`：只声明 C ABI 类型与函数，不依赖 `world-core`；`link-world-ffi` feature 只负责把 `world-ffi` 链接进来。
- 新增独立 crate `godot-extension/`：`godot` 0.5.6 + `api-4-7`，输出 GDExtension cdylib；源码只 `use world-abi`。
- 新增 `WorldNode`：`load_pack`、`tick`、`interact/talk/pickup`、`set_move`、`sync_views`、`state_hash`、`poll_events`、`save/load_save`。
- 新增 `play.tscn`：Camera3D、DirectionalLight3D、地面与 WASD 固定 60Hz 循环。
- 新增 `godot/test.sh`：Godot headless 跑 600 tick + 存档往返，和 C ABI/Headless 对账。

## 为什么

- M2 的验收是**同一个包在同一局**，不是画面好看；先证明 C ABI → Godot 的边界，再铺视图层。
- `world-abi` 把「适配器不依赖内核实现」变成代码结构，而不是文档口号。
- Godot GDExtension 的构建/动态库/版本风险可以独立暴露，不拖累内核。

## 第一切片证据

- Godot `4.7.stable.official.5b4e0cb0f`
- `godot/test.sh`：
  - 600 tick 后 `WORLD_HASH=0xc840fe2090a0a085`
  - `WORLD_VIEWS=3`（拾取后视图池回收）
  - `WORLD_EVENTS=2025`
  - save/load 后 `WORLD_SAVE_HASH=0xc840fe2090a0a085`
  - `set_move` 后 `WORLD_MOVE_X=0.6666`
  - `play.tscn` headless 冒烟通过（无脚本错误）
  - `cts.sh`：L/T/I/E/V/S/X/D 基础组全 PASS
  - 视图按 kind 选 Capsule/Box/Sphere，play 注册全部 mesh GLB scene；`sync_views_at` 插值，`clear_views`/`unregister_visual` 卸载；MultiMesh 批渲染 prop/item，2D/iso 轴映射；真实 WAV `airlock_open.wav` 经事件播放；CTS 增加 Z/A；play 提供 E/F/T/HUD；5k CPU benchmark 600 tick（sync P95 0.656ms）
- C ABI/Headless 同一哈希；适配器源码不 `use world_core`。

## 不包含

- 全量 GLB 导入/资源池、完整 Input 映射、插值/MultiMesh；已有 keeper GLB fixture、真实 WAV 与 Z/A CTS。
- CTS 全组（当前已有 L/T/I/E/V/S/X/D 基础组）；
- 5k 渲染帧时间；
- Godot 打包/移动端；
- 完整值班室可玩场景。

这些是 M2 后续切片；当前只完成“逻辑适配器可加载、可驱动、可对账”。

## 复跑

```bash
cd games/world
./godot/test.sh
```
