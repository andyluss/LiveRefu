# 相对链接校验：pre-commit 钩子 + CI

> 本文说明本仓库用**两级闸门**校验 Markdown 相对链接：本地 pre-commit 钩子（提交前）+ CI 链接检查（提交后兜底）。工具脚本见 [`../tools/check_links.ts`](../tools/check_links.ts)、[`../tools/install_hooks.sh`](../tools/install_hooks.sh)、[`../tools/hooks/pre-commit`](../tools/hooks/pre-commit)。
> **规则权威**：[`rules/R03-link-validation.md`](../rules/R03-link-validation.md)（R03 相对链接校验）。本文为**技术详解 / 实施说明**。
> 为什么需要：本工作区文档大量使用跨目录相对链接（如 `studio/主策划/` 指向 `doc/` 知识库），深度写错（`../doc` 应为 `../../doc`）会在本地 IDE / 预览器 / 网页版变成失效链接。

---

## 一、本地 pre-commit 钩子（提交前）

每次 `git commit` 前，校验**本次暂存的 Markdown** 的内部相对链接是否有效；若存在失效链接则**拦截提交**并打印问题明细。

### 启用（clone 后运行一次）

> 注意：git 出于安全设计，**不跨 clone 传递 `core.hooksPath`**（它存于本地 `.git/config`，而 `.git` 目录不随克隆传输）。因此「clone 即自动启用」无法用 git 原生做到。本仓库提供一键安装脚本，clone 后运行一次即生效。

```bash
./tools/install_hooks.sh
```

脚本会设置 `git config --local core.hooksPath tools/hooks`（用**相对路径**，故 clone 到任意路径、或从子目录运行都有效），幂等可重跑。启用后，**每次 `git commit` 自动校验**本次暂存的 md 相对链接。

手动等价的配置方式（效果相同，但需手动记得跑）：

```bash
git config core.hooksPath tools/hooks
```

### 校验内容

- 只校验 **staged（本次暂存区）中新增/修改/复制的 `*.md`**，不扫全工作区——避免误拦与本次改动无关的既有问题。
- 校验逻辑复用 [`tools/check_links.ts`](../tools/check_links.ts)：跳过外链、纯锚点、无目标条目；只判定真正需要存在的内部相对链接。
- 判断结果：目标文件/目录不存在 => 失效 => 拦截。

### 钩子的全部校验项

钩子按"**本次暂存涉及哪些路径**"触发对应检查（**只跑相关项**，避免拖慢无关提交）：

| 暂存涉及 | 检查 | 脚本 |
| --- | --- | --- |
| `*.md` | 内部相对链接（[R03](../rules/R03-link-validation.md)） | [`tools/check_links.ts`](../tools/check_links.ts) |
| `projects/tomorrows-channel/data/{tables,schema}/` | 数据表 schema 契约（[R04](../rules/R04-data-validation.md)） | [`tools/check_data.ts`](../tools/check_data.ts) |
| `lab/formal-system/` | 元规则结构 M1+M2 / 演进 M3 / `STRUCTURE.md` M4 | `lab/formal-system/concerns/meta-rules/*.ts` |
| `rules/` | 规则目录结构 M1+M2 + 规则演进 M3（**覆盖元规则 M 与具体规则 R**） | [`rules/meta/tools/meta_rules_check.ts`](../rules/meta/tools/meta_rules_check.ts)、[`rules/meta/evolution/rule_evolution_check.ts`](../rules/meta/evolution/rule_evolution_check.ts) |

> `rules/` 两项为**目录级**检查（扫 `rules/` 全树），故以"暂存是否涉及 `rules/`"为触发条件。

### 常见处理

| 情况 | 处理 |
| --- | --- |
| 提示"存在失效链接" | 按输出修复相对链接深度（朝工作区根每深一级多一个 `../`），重新提交 |
| 确认本次改动不需要修复 | `git commit --no-verify`（临时跳过钩子，提交前请自行确认链接） |
| 想看看全工作区链接状态 | `node --experimental-strip-types tools/check_links.ts` |

### 手动跑钩子

不做提交、只模拟钩子校验时，可手动执行：

```bash
bash tools/hooks/pre-commit
echo $?   # 0=全部通过, 非 0=有检查被拦截
```

---

## 二、CI 检查（提交后兜底）

即使本地未启用钩子（例如贡献者在未运行 `install_hooks.sh` 的机器上提交），推送到托管平台后由 CI 兜底拦截。

- **平台**：**GitHub Actions**（[`.github/workflows/verify.yml`](../.github/workflows/verify.yml)），远端 [`andyluss/LiveRefu`](https://github.com/andyluss/LiveRefu)；push / PR 到 `main` 时触发。若你在 GitLab，用对应的 `.gitlab-ci.yml` 语法改写（触发器 + 一个跑 `node --experimental-strip-types tools/check_links.ts` 的 job），或在其它 CI 中复用一个执行同命令的步骤即可。
- **逻辑**：检出代码 → 用 Node 直接运行 TS `tools/check_links.ts`（纯标准库，无需安装依赖）→ 若返回非零则失败。默认扫描全工作区（`--sub` 不传即全量）；可按需加 `--sub studio` 缩小范围。
- **影响**：提交涉及失效相对链接时，CI 会标记检查失败，提示修复后再合入。
- **CI 的完整校验集**：除链接外，[`.github/workflows/verify.yml`](../.github/workflows/verify.yml) 还跑数据 schema、lab 元规则（结构/演进/`STRUCTURE.md`），以及 **`rules/` 结构 M1+M2 与规则演进 M3（覆盖 M 与 R）**——与本地钩子互补、命令同源。

### 手动验证 CI 同款命令

```bash
node --experimental-strip-types tools/check_links.ts
echo $?   # 0=通过, 1=有失效链接
```

---

## 三、要点回顾

- `core.hooksPath` 指向的目录需**被 git 跟踪**（`tools/hooks/` 已入库），钩子随仓库共享，而非依赖不入库的 `.git/hooks/`。
- 两道闸门按需互补：本地钩子拦截得早（提交前、未合入）；CI 兜底覆盖未启用本地钩子的人（提交后、合入前）。
- 文档约定（相对链接深度等）见 [`docs-convention.md`](docs-convention.md)。
