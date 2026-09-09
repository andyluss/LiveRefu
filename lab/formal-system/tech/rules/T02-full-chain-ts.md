# T02 · 全链路 TS：脚本 / hooks / CI 同源同语言（已定）

**一句话**：**技术脚本、pre-commit 钩子、CI 三者跑同一套 TypeScript**（`.ts`），不搞"本地 Python + CI TS"双轨，
统一用 `node --experimental-strip-types`（或 deno/bun）。这是 [T01](T01-default-ts-scripts.md)（默认 TS）之上的**一致性约束**。

## 一、目标

- **不分裂**：一条检查只写一套逻辑、用一种语言（TS），本地 pre-commit 与 CI 跑的是**同一份脚本**。
- **行为一致**：本地钩子拦住的，CI 也拦得住；反之亦然（避免"本地 Python 版这样、CI TS 版那样"）。
- **好维护**：改一次检查 → 本地 + CI 自动同源更新，不用维护两套 Python/TS 实现。

## 二、主选（决策）

1. **可运行检查脚本统一 TS**（见 [T01](T01-default-ts-scripts.md)）：默认 `.ts`，node/deno/bun 兼容。
2. **pre-commit 钩子与 CI 都运行 `.ts`**（同源），不各写一套逻辑。
   - running 方式统一：`node --experimental-strip-types <script>.ts`（脚本本身 node/deno/bun 皆可跑）。
3. **不双轨进链**：同一逻辑不出现"一套 Python 进钩子、一套 TS 进 CI"；`.py` 若保留，定位为**对照/溯源**，不进入执行链。
4. `hub.ts --run` 作为"刷新入口"纳入 `verify.yml`（CI），保证"生成 → 校验 → 入口"都用 TS 跑。

**权衡**：单一语言栈 + 同一脚本集合，换来一致性、可维护、行为可复现。

## 三、备选（被放弃的选项）

| 备选 | 描述 | 为何不为主选 | 代价 |
| --- | --- | --- | --- |
| A2.1 钩子与 CI 各用一种语言 | 钩子 Python、CI TS（现状曾如此）| 两套实现、行为可能不一致 | 双份维护、易分叉 |
| A2.2 双轨都跑（py + ts） | 本地/CI 都再跑一遍另一份 | 一次改动两处、更慢 | 加倍验证成本 |
| A2.3 沿用全 Python | 维持旧栈 | 已被 T01 的"默认 TS、跨运行时"取代 | 跨运行时差 |

## 四、判定标准

- 新检查 → 写 **`.ts`**，并**同时接入 pre-commit 钩子与 `verify.yml`**（同一条命令形态）。
- `tools/hooks/pre-commit` 与 `.github/workflows/verify.yml` 里引用的脚本路径**均为 `.ts`**。
- 同一个逻辑不出现"一套进钩子、另一套进 CI"。

## 五、自检问题

> "把这条检查改一下，**本地钩子和 CI 是不是用同一份 `.ts` 脚本在跑**？有没有某处还挂着 `.py`？"

## 六、可验证 / 演进历史

可验证：
```bash
# 钩子与 CI 引用的脚本都应是 .ts
grep -nE '\.(py|ts)' tools/hooks/pre-commit .github/workflows/verify.yml | grep -v '#'
bash tools/hooks/pre-commit   # 本地钩子（走 TS）
```

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `accepted.applied` | 初定：脚本/hooks/CI 同源同语言（全 TS），避免双轨；`hub.ts --run` 进 CI | 用户要求"把全链路 TS 沉淀为 T02，约定后续 CI/钩子/脚本都走 TS" |
