# LiveBay 扩展包（运行时）

当前是 **E0 运行时**，不是 L1 玩法内容：

- `l1_shift_a/`、`l1_shift_b/`、`l1_shift_c/`：三个 **实验包**，用于验证 `variant_group` 互斥、preset slot、A/B/C 检查单；
  - A：开局供能 95；W4 复查 -1s；W5 可选隔离/旁路；
  - B：开局供能 85；W4 按惯例低报 +1；W5 可选隔离/旁路；
  - C：开局供能 90；W5 用于旁路对照；
  - 三个包都有结算事故记录：如实 / 按惯例（低报 +1）/ 待复查；
  - W5 故障命中时暂停，选择隔离/旁路；
  - 事故记录会进入下一班「接班简报」，最近 3 班持久化到 `user://shift.json`；
  - 低报 +1 会让下一班故障停塔 +1s，并把 W4 检查单替换为「交接审计」；
  - 这些是 L1 样例，不是最终数值。
- `baseline`：`game/data/expansion_sets/baseline.json`，主游戏默认使用，不含任何包。
- 对比 preset：`l1_compare_a.json` / `l1_compare_b.json`。
- 校验：`./run.sh expansions-check`。

运行时入口：

- `scripts/expansion/expansion_manifest.gd`
- `scripts/expansion/expansion_registry.gd`
- `scripts/expansion/expansion_set.gd`
- `scripts/expansion/expansion_boot.gd`
- `scripts/expansion/feature_flags.gd`

约束：

- 同 `variant_group` 只能选一个；
- 未知/退役/缺依赖/冲突/不兼容 core_api 的包会被拒绝；
- 包失败不阻塞 baseline；
- 主游戏只加载 `baseline`，实验 preset 由测试/工具显式加载。

> L1 检查单、故障处置、事故记录等内容尚未实现；这里是扩展运行时地基。
