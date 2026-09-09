# 实验笔记 · 实验 A：Rust 数据契约校验器

> 日期：2026-09-08（系统实际时间）。实验 A 落地于 [`prototypes/data-validator/`](../prototypes/data-validator/README.md)。

## 做了什么

- 在 `prototypes/data-validator/` 建 Rust crate（lib + bin）。
- `src/lib.rs`：实现 JSON Schema **子集**校验引擎（type/enum/const/min/max/minLength/maxLength/minItems/maxItems/required/properties/additionalProperties/items/pattern）。
- `src/main.rs`：CLI（单文件或 `--schema-dir`/`--data-dir` 目录），退出码作门禁。
- 测试：单元 5 + 拦截 4 + 属性 5（proptest）+ 真实数据 1，共 15 个。
- README 记录支持/边界 + 实测结果；`.gitignore` 排除 `target/`。

## 教训 / 心得

1. **依赖缓存也是"外部状态"**：`cargo build` 只在依赖已缓存（serde_json/regex）时一次成功；首次拉取 proptest 需写 `~/.cargo/registry`，被工作区沙箱拦截（`Operation not permitted`），需一次更大权限拉取、之后可用缓存复现。形式化验证要"可复现"，值得把"依赖已就位"也作为一个前提写进报告。

2. **clippy 会反向约束写法**：`-D warnings` 逼我把嵌套 `if let` 改成 let-chain（`if let ... && cond`），这本身更接近形式化、也更清晰。但提醒：clippy lint 随版本演进，作门禁要固定命令（`cargo clippy --all-targets -- -D warnings`）。

3. **proptest 宏的断言语义要精确**：`prop_assert_eq!` 的失败消息**不支持** `{var}` 隐式捕获（宏展开后无法解析），必须显式传参。小坑，但体现"属性测试断言 = 精确声明"，值得留意。

4. **诚实边界**：
   - `additionalProperties` 仅在显式 `false` 时拒绝未知字段（符合 JSON Schema 默认 `true`）——`content_card` 用 `true`，所以不误伤。
   - `allOf/if/then`（`content_card` 的条件必填）**未覆盖**——与 `tools/check_data.py` 行为一致、现网数据不依赖它，但这是"表达力边界"，写进 README 而非装作支持。

5. **验证价值**：真实 5 张表**零误报**；4 类非法数据被**精确拦截**（报出路径，如 `channel.json[0].channel_id: 不匹配 pattern`）。相对 Python 版，本原型**新增**了 `pattern`/`minLength`/`minItems`/`additionalProperties:false` 这几类机械判定。

6. **相对链接深度**：CRATE 内 README 在 `data-validator/`（回到工作区根是 4 层 `../`）；`src/lib.rs` 在 `src/` 下（5 层）。首次写错深度，靠 `tools/check_links.py` 拦下。再次印证：链接深度以"文件相对根的实际层级"为准，别靠心算。
