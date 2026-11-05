# LiveBay 扩展包（运行时）

当前是 **E0 运行时**，不是 L1 玩法内容：

- `l1_shift_a/`、`l1_shift_b/`：两个 **实验包**，只用于验证 `variant_group` 互斥、preset slot 与 A/B 启动；
  - A：开局供能 95；B：开局供能 85；
  - 这两个数字是运行时验证用的占位，不是 L1 班次机制。
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
