# T01 · 技术脚本默认 TypeScript（同功能双语言，node/deno/bun 兼容）（已定）

**一句话**：**新技术脚本默认写 TypeScript（`.ts`）**，并让它在 **node / deno / bun** 可直接运行；formal-system 内的
Python 脚本**逐一补同名同功能的 `.ts`**，两者并存（避免"只有 Python 一种运行时用不了"）。

## 一、目标

- 技术产物（可运行脚本/检查）**默认用 TS**，而非 Python——因为 TS 跨 node/deno/bun 都能**零依赖直接跑**，覆盖面更广（CI、本地、不同机器）。
- 保留既有 Python 版的**同功能**（作为对照/溯源），但**新增/默认以 TS 为准**。
- 让脚本**不在特定运行时绑定**：换到 node / deno / bun 都能 `run`。

## 二、主选（决策）

1. **默认 TS**：新增技术脚本写 `.ts`（除非是明确只用某一运行时的场景）。
2. **双语言并存**：formal-system 内现有 `.py` 旁加**同名 `.ts`**（`X.py` ↔ `X.ts`，同功能）；两者均可跑。
3. **跨运行时兼容（关键约束）**：只用三个运行时都有的能力——
   - `node:fs` / `node:path` / `process.argv` / `JSON` / 标准 `Date`、`Array` 等；**不用** node 私有 API、不用需安装的外部包。
   - 无 `enum`/`namespace`/装饰器（便于 type-stripping）；纯类型注解 + 普通 JS 运行时语义。
   - 运行方式：`node --experimental-strip-types X.ts`、`deno run --allow-read X.ts`、`bun X.ts`。
4. **运行时不判定的差异化**：仅当某能力只有 deno/bun 私有（如 `Deno.args`）时，改用跨运行时的 `process.argv` 等来拉齐。

**权衡**：为"跨运行时 + 双语言"多一份源码；换来"不被单一运行时绑架、默认技术栈统一、溯源方便"。

## 三、备选（被放弃的选项）

| 备选 | 描述 | 为何不为主选 | 代价 |
| --- | --- | --- | --- |
| A1.1 只用 Python | 现状 | node/deno/bun 下要么装环境、要么只能单运行时跑 | 跨运行时差、CI 绑定 Python |
| A1.2 只用 TS | 只留 TS | 丢 Python 对照；已有多脚本要大改 | 一次性迁移成本 |
| A1.3 用构建（tsc/打包） | 先编译成 JS 再跑 | 引入构建/依赖步骤 | 违背"零依赖直接跑" |

## 四、判定标准

- 新增技术脚本（会被 CI/多运行时跑）→ **用 `.ts`**。
- formal-system 内每个 `.py` 有同名 `.ts`（同功能、运行时无关）。
- `.ts` 用运行时统一能力，`node --experimental-strip-types` / `deno run --allow-read` / `bun` **三者都直接跑**。

## 五、自检问题

> "这个脚本换到 node / deno / bun 能**一条命令直接跑**吗？有没有用到某个运行时私有的东西？"

## 六、可验证 / 演进历史

可验证：`node --experimental-strip-types <file>.ts && deno run --allow-read <file>.ts && bun <file>.ts`。

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `accepted.applied` | 初定：默认 TS + 双语言并存 + node/deno/bun 兼容（零依赖、type-stripping 可用） | 用户要求"Python 脚本旁加同名 TS、默认 TS、建 tech/rules 技术规则目录" |
