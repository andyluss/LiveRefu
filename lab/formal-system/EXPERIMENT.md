# 形式化协作实验 · 启动文档（EXPERIMENT）

> 本文件是**交接启动文档**：新对话读此文件即可启动实验，无需重新叙述背景。
> 实验室地：[`lab/formal-system/`](README.md)（目标/对比/分层推荐/MVP 组合见其 README）。

## 一、实验目标（一句话）

验证"用**形式化可验证的系统与语言**与 AI 协作"是否比"模拟人类组织"更可靠——即：**AI 产出能否被编译器/契约校验/属性测试独立验证，而非信任 AI 自述**。

## 二、背景（一句话）

主项目《明日频道》用"虚拟工作室 + 角色"模式完成 M1，但该模式验证缺位（见 [`tech/formalization.md`](../../tech/formalization.md)）。本实验小范围探索更形式化路径，成熟后回流主项目。

## 三、自机工具现状（2026-09-08 实测）

| 工具 | 状态 | 用途 |
| --- | --- | --- |
| **Rust**（cargo/rustc）| ✅ 已装 | 类型化语言层（编译器验证）|
| **node / npx / deno** | ✅ 已装 | TS（deno 可跑）/工具运行 |
| **TypeScript**（tsc）| ❌ 无（可用 deno 跑）| Web/类型层（可选）|
| **CUE** / **Alloy** / **TLA+** | ⚠️ 待装 | 配置契约 / 模型检验 / 规格 |

## 四、M1 已落地的形式化基础（可直接引用/升级）

- **数据契约校验器**：`tools/check_data.py`（纯标准库）——校验 `projects/tomorrows-channel/data/tables/*.json` 是否符合 `data/schema/*.schema.json`（必填/type/enum/数值范围/嵌套 copyright）。
- **pre-commit + CI**：链接校验 + 数据校验 + Godot 加载检查（见 [`tech/formalization.md`](../../tech/formalization.md)）。
- **CUE 实验素材**：主项目已有 6 个 JSON Schema（`projects/tomorrows-channel/data/schema/`：channel / content_card / content_card_numerics / meta / mixer_track / timer）——可作 CUE 表达与对照的现成样例。

## 五、推荐的第一个实验（MVP）

> **选其一**（都基于已装 Rust，或可用 deno 跑 TS）：

### 实验 A · Rust 数据契约校验器（最贴近"编译器验证 AI 产出"）
- **目标**：用 Rust 实现等价 `check_data.py` 的校验器（读 JSON → 校验 schema 契约），体验 `cargo build`/`clippy` 直接判定。
- **产出**：`prototypes/data-validator/`（Rust crate + 校验逻辑），比 Python 版更硬、可接入 CI。
- **验收**：能拦非法（越界/type 错/enum 越界）；`cargo clippy` 零警告；接入极简测试。

### 实验 B · CUE 配置契约（比 JSON Schema 更强的 AI 协作契约）
- **目标**：把主项目一个表契约（如 `meta` 或 `content_card`）用 CUE 表达，体验其校验/合并/约束。
- **产出**：`specs/` 下 CUE 规格 + 验证脚本。
- **验收**：CUE 校验非法配置失败；表达力优于 JSON Schema（约束/合并）。

### 实验 C · Alloy 数据/规则模型（先验 + 自动找反例）
- **目标**：对一个业务规则（如"收藏合规闸门：仅 approved 可入池"）建 Alloy 模型，让 SAT 找反例。
- **产出**：`specs/` 下 Alloy 模型。
- **验收**：Alloy 验证性质、能暴露反例。

## 六、执行步骤（新对话如何开始）

1. 读本文件 + [`lab/formal-system/README.md`](README.md)（目标/推荐）。
2. **先定实验 A/B/C 选哪个**（默认建议 A，本机 Rust 现成、验证最"硬"）。
3. 工作树要干净（跑 `git status`）再动手；改动集中 `lab/formal-system/{specs,prototypes,notes}/`。
4. 每步产物**写进对应子文件夹** + 记边想边试的教训到 `notes/`。
5. 提交遵循 Conventional Commits（`feat(lab): ...` / `docs(lab): ...`），跑 `tools/check_links.py` 确认链接。

## 七、验收标准（实验成功 = 什么）

- AI 产出的**验证**从"自述/样例"降到"机器判定"（rustc/契约校验/属性测试 通过才入库）；
- 有一份**可复现的验证报告**（哪些产出被编译/契约/测试拦住）；
- 能回答："这个组合对比角色工作室，确定性与可验证性提升了多少？是否值得回流主项目？"

## 八、不在实验范围（避免蔓延）

- 不动主项目 `projects/tomorrows-channel/` 的现状（除非实验证明应回流）；
- 不做 Lean/Coq 定理证明（成本过高，层 D 末期再说）；
- 不追求"完整形式化需求"，MVP 只验证"AI 产出可机器判定"。
