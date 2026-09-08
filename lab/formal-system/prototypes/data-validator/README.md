# data-validator —— Rust 数据契约校验器（实验 A 原型）

> 归属 [`lab/formal-system`](../../README.md) 实验 A。目标：用 **Rust 编译器 + clippy + 属性测试** 独立判定
> "这份数据是否符合契约"，把"AI 产出是否可验证"从**自述**降到**机器判定**。
> 功能对齐主项目 [`tools/check_data.py`](../../../../tools/check_data.py)（读 JSON → 校验 schema 契约），
> 但验证由 `cargo build` / `clippy` / `test` 判定，比 Python 版更硬、可入 CI。

## 一、这解决什么问题

主项目用"虚拟工作室 + 角色"协作，但**验证与生成耦合在同一个角色心智**里（见
[`tech/formalization.md`](../../../../tech/formalization.md)）。本原型把"数据契约"变成一条可重跑、
结果确定的命令：`cargo test` / `cargo run` 直接判定"这份数据是否合规"，无需信任任何 agent 的自述。

## 二、怎么验证（一条命令即可重跑；结果确定、不依赖人）

```bash
cd lab/formal-system/prototypes/data-validator
cargo build                                  # 编译期验证(类型/借用)
cargo clippy --all-targets -- -D warnings     # 静态 lint 零警告门禁
cargo test                                    # 单元 + 拦截 + 属性 + 真实数据 → 15 tests
# CLI 校验整个目录
cargo run -- --schema-dir <schema目录> --data-dir <数据目录>
# CLI 校验一份文件(exit!=0 即拒绝)
cargo run -- <schema.json> <data.json>
```

## 三、支持的 JSON Schema 子集（可判定）

- `type`：`object` / `array` / `string` / `integer` / `number` / `boolean` / `null`
- `enum` / `const`
- `minimum` / `maximum`（数值范围）
- `minLength` / `maxLength`（字符串长度，按 Unicode 码点）
- `minItems` / `maxItems`（数组长度）
- `required` / `properties` / `additionalProperties`（对象；**仅当** `additionalProperties:false` 才拒绝未知字段）
- `items`（数组元素；支持单 schema 或元组式）
- `pattern`（正则，经 [`regex`](https://crates.io/crates/regex) 编译）

## 四、明示不校验的边界（诚实，避免虚假声称）

- `allOf` / `anyOf` / `oneOf` / `if` / `then` / `else` / `$defs` / `$ref` / `format`
- `default` / `$schema` / `$id` / `title` / `description` / `unit` / `$comment`

这些要么是元数据、要么是条件/引用语义。MVP 只覆盖主项目表格实际用到的可判定子集。
注：`content_card.schema.json` 的 `allOf`（条件必填）不在覆盖内——与 `check_data.py` 行为一致，
且现有表格数据不依赖它（`license` 均非 `cc_by`/`licensed`，不触发条件必填）。

## 五、实测结果（2026-09-08）

| 验证项 | 结果 |
| --- | --- |
| `cargo build` | ✅ 通过（编译期验证类型/借用） |
| `cargo clippy --all-targets -- -D warnings` | ✅ 零警告 |
| `cargo test` | ✅ 15 tests 全部通过（5 单元 + 4 拦截 + 5 属性 + 1 真实数据） |
| CLI 校验主项目 5 张表（meta/timer/channel/mixer_track/content_card） | ✅ 全通过，0 错误，exit 0 |
| CLI 拦截非法数据（如 `channel_id:"Tape_Warm"` 违反 snake_case pattern） | ✅ 精确报路径，exit 1 |

> 属性测试用 **proptest**（随机生成输入）验证校验器行为性质：数值范围与算术事实一致、
> 枚举包含即通过、数组/字符串长度符合事实、必填键符合逻辑——把"行为正确性"从"样例"升格为"属性"。
