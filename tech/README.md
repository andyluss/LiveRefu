# 技术文档目录

> 本目录集中存放 **仓库级技术规范与工具说明**（不含角色业务文档——那些归属 `studio/<角色>/`）。
> 根 [`README.md`](../README.md) 对各目录做导览；本文是技术文档的入口与索引。

## 文档清单

| 文档 | 内容 |
| --- | --- |
| [`git-convention.md`](git-convention.md) | Git 与提交信息约定（Conventional Commits、自动提交、历史约定） |
| [`docs-convention.md`](docs-convention.md) | 文档约定（md 体例、**相对链接深度**与校验机制） |
| [`changelog-convention.md`](changelog-convention.md) | 变更日志约定（Keep a Changelog + SemVer；每次非琐碎变更须记录） |
| [`hooks-readme.md`](hooks-readme.md) | 相对链接校验：pre-commit 钩子 + CI 的启用/跳过/常见处理 |
| [`formalization.md`](formalization.md) | 形式化验证：数据 schema 校验 + CI Godot 加载检查，GDScript 边界与演进路线 |

> 注：**技术性规则**现以实验形式放于 [`lab/formal-system/tech/rules/`](../lab/formal-system/tech/rules/README.md)（服务本形式化系统），成熟后再回流入工作区根 [`rules/`](../rules/README.md)（规则目录）。

## 相关工具（脚本，仍在 `tools/`）

| 工具 | 作用 |
| --- | --- |
| [`tools/check_links.py`](../tools/check_links.py) | 校验工作区 md 内链（支持 `--sub`、`--files`） |
| [`tools/check_data.py`](../tools/check_data.py) | 校验数据表是否符合 schema 契约（必填/type/enum/范围），纯标准库 |
| [`tools/install_hooks.sh`](../tools/install_hooks.sh) | 一键启用 pre-commit 钩子 |
| [`tools/hooks/pre-commit`](../tools/hooks/pre-commit) | 钩子本体（校验暂存 md 内链 + 数据 schema） |

## 约定

- 技术规范文档使用 `kebab-case` 文件名（`git-convention.md` 等），避免用编号，便于与 doc/、studio/ 的业务体例区分。
- 修改任一技术规范后，请同步更新本文索引与根 README 的对应入口。
