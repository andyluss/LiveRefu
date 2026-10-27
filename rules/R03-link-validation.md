# R03 · 相对链接校验（已定 · 已落地）

**一句话**：用**两道闸门**——本地 pre-commit 钩子（提交前）+ CI（提交后兜底）——校验 Markdown 内部相对链接，失效即**拦截**。

> 状态：`accepted.applied` ｜ 版本：v3 ｜ 最后更新：2026-10-27
> 本文是相对链接校验的**唯一规则与实施说明**；原 [`tech/hooks-readme.md`](../tech/hooks-readme.md) 已整合进本文，仅保留指针。

## 一、目标

把“相对链接深度写错”从“靠人肉核对”变成“提交前机器拦截”，保证文档链接在本地 IDE / 预览器 / 网页版都能跳转。

## 二、规则条款（主选）

1. **两道闸门**：① **pre-commit 钩子**——每次 `git commit` 前校验**本次暂存的 `*.md`**；② **CI**——提交后全量校验兜底。
2. **判定口径**：只判真正需要存在的**内部相对链接**；外链、纯锚点、无目标条目跳过；目标文件/目录不存在 = 失效 = 拦截。
3. **启用**：clone 后运行一次 `./tools/install_hooks.sh`（设置 `core.hooksPath tools/hooks`，用相对路径、幂等可重跑）。
4. **例外**：确认本次改动无需修复时，可用 `git commit --no-verify` 临时跳过（须自行确认链接）。
5. **手动运行**：全量 `node tools/check_links.ts`；模拟钩子 `bash tools/hooks/pre-commit`（退出码 0=通过）。

## 三、本地 pre-commit 钩子（提交前）

每次 `git commit` 前，校验**本次暂存的 Markdown** 的内部相对链接是否有效；存在失效链接则**拦截提交**并打印问题明细。

### 启用（clone 后一次）

Git 出于安全设计**不跨 clone 传递 `core.hooksPath`**（它存于本地 `.git/config`，`.git` 不随克隆传输）。因此“clone 即自动启用”无法用 git 原生做到；本仓库提供一键安装脚本：

```bash
./tools/install_hooks.sh
```

脚本设置 `git config --local core.hooksPath tools/hooks`（相对路径；clone 到任意路径、从子目录运行都有效），幂等可重跑。

手动等价配置（效果相同）：

```bash
git config core.hooksPath tools/hooks
```

### 校验内容

- 只校验 **staged（本次暂存区）中新增/修改/复制的 `*.md`**，不扫全工作区，避免误拦无关既有问题。
- 复用 [`tools/check_links.ts`](../tools/check_links.ts)：跳过外链、纯锚点、无目标条目；只判真正需要存在的内部相对链接。
- 目标文件/目录不存在 => 失效 => 拦截。

### 钩子的全部校验项

钩子按“暂存涉及哪些路径”触发对应检查，只跑相关项：

| 暂存涉及 | 检查 | 脚本 |
| --- | --- | --- |
| `*.md` | 内部相对链接（本规则） | [`tools/check_links.ts`](../tools/check_links.ts) |
| `projects/tomorrows-channel/data/{tables,schema}/` | 数据表 schema 契约（[R04](R04-data-validation.md)） | [`tools/check_data.ts`](../tools/check_data.ts) |
| `lab/formal-system/` | 元规则结构 M1+M2 / 演进 M3 / `STRUCTURE.md` M4 | `lab/formal-system/concerns/meta-rules/*.ts` |
| `rules/` | 规则目录结构 M1+M2 + 规则演进 M3（覆盖 M 与 R） | [`rules/meta/tools/meta_rules_check.ts`](../rules/meta/tools/meta_rules_check.ts)、[`rules/meta/evolution/rule_evolution_check.ts`](../rules/meta/evolution/rule_evolution_check.ts) |
| `projects/refu-game-001/docs/design/`、`projects/refu-game-001/tools/sim_refu_game_001.ts` | Refu Game 001 难度模型自检/带位 | [`projects/refu-game-001/tools/sim_refu_game_001.ts`](../projects/refu-game-001/tools/sim_refu_game_001.ts) |

> `rules/` 两项为目录级检查（扫全树），所以触发条件是“暂存是否涉及 `rules/`”。

### 常见处理

| 情况 | 处理 |
| --- | --- |
| 提示“存在失效链接” | 按输出修复相对链接深度（朝工作区根每深一级多一个 `../`），重新提交 |
| 确认本次无需修复 | `git commit --no-verify`（临时跳过，提交前自行确认） |
| 想看全工作区状态 | `node tools/check_links.ts` |

### 手动跑钩子

```bash
bash tools/hooks/pre-commit
echo $?   # 0=全部通过；非 0=有检查被拦截
```

## 四、CI 检查（提交后兜底）

即使本地未启用钩子，push / PR 后由 CI 兜底拦截。

- **平台**：GitHub Actions（[`.github/workflows/verify.yml`](../.github/workflows/verify.yml)），push / PR 到 `main` 触发。
- **逻辑**：检出 → Node 直接运行 TS `tools/check_links.ts`（纯标准库，无需依赖）→ 非零失败。
- **影响**：失效链接会标记 CI 失败，修复后再合入。
- **CI 完整校验集**：除链接外还跑数据 schema、lab 元规则、`rules/` 结构 M1+M2 与规则演进 M3；与本地钩子互补、命令同源。

手动验证 CI 同款命令：

```bash
node tools/check_links.ts
echo $?   # 0=通过；1=有失效链接
```

## 五、要点

- `core.hooksPath` 指向的目录需**被 git 跟踪**（`tools/hooks/` 已入库），钩子随仓库共享，不依赖不入库的 `.git/hooks/`。
- 两道闸门互补：本地钩子拦截得早；CI 覆盖未启用钩子的人。
- 链接深度规则见 [R01](R01-docs-convention.md) §三；变更日志、规则、项目文档都是普通 Markdown，不享受链接豁免。

## 六、备选（被放弃）

| 备选 | 为何不为主选 | 代价 |
| --- | --- | --- |
| 只靠 CI | 反馈晚（合入前才发现） | 返工 |
| 只靠本地钩子 | 未启用钩子者会漏检 | 漏网 |
| 不做链接校验 | 链接静默失效 | 文档不可用 |

## 七、判定标准

- `bash tools/hooks/pre-commit` 退出码 `0`。
- `node tools/check_links.ts` 退出码 `0`。

## 八、自检

> “我这次提交触动/新增的 md 链接，钩子会放行吗？”

## 九、演进历史

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `proposed` | 立名目（占位）：登记 R03，正文暂以 `tech/hooks-readme.md` 为准 | 建立根 `rules/` 目录 |
| v2 | 2026-09-14 | `accepted.applied` | **转正**：规则条款迁入本文件为权威；已有钩子/CI 工具，状态标 `applied` | 用户要求 R 系列转正 |
| v3 | 2026-10-27 | `accepted.applied` | **整合 `tech/hooks-readme.md`**：启用/校验范围/全部钩子项/排除/CI/手动命令全部收进本文件；tech 只留指针 | 用户要求消除两处维护的规则/技术文档 |
