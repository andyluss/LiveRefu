# rules · 规则目录

> 本目录是工作区的**规则所在目录**（规则的家）。面向工作区整体的具体规则在此**按域编号、集中收口**。
> 当前为**占位阶段**：下面列出的是已存在的**具体规则**作为初始占位规则；**真正正式的规则仍在 [`lab/`](../lab/README.md) 里实验**（见 [`lab/formal-system/`](../lab/formal-system/README.md)——元规则与实验性技术规则），**成熟后会迁移到这里**，届时替换下方占位条目。

## 一、占位规则清单（现状）

> 每条占位规则仍是「名目 + 状态 + 当前权威来源」：占位阶段正文以 `tech/` 下对应文档为准，`rules/` 先立名目，待正式版迁入再填充正文。

| 编号 | 规则 | 一句话 | 当前权威来源 | 状态 |
| --- | --- | --- | --- | --- |
| R01 | 文档约定 | 简体中文 Markdown；doc/studio 体例；相对链接深度 | [`tech/docs-convention.md`](../tech/docs-convention.md) | 占位 |
| R02 | Git 与提交信息约定 | Conventional Commits、AI 自动提交 | [`tech/git-convention.md`](../tech/git-convention.md) | 占位 |
| R03 | 相对链接校验 | pre-commit 钩子 + CI 两道闸门 | [`tech/hooks-readme.md`](../tech/hooks-readme.md) | 占位 |
| R04 | 数据 schema 校验 | 数据表契约（必填/type/enum/范围） | [`tech/formalization.md`](../tech/formalization.md) | 占位 |
| R05 | 变更日志记录约定 | 每次（非琐碎）变更写变更日志；琐碎改动豁免 | [`tech/changelog-convention.md`](../tech/changelog-convention.md) | 占位 |

## 二、豁免范围

- [`indie/`](../indie/README.md)（独立项目区）与 [`lab/`](../lab/README.md)（实验项目区）下的子目录**默认豁免上述根规则**（R01–R05），除非**特别约定**。
- 各子项目/实验可自定义约定；若需引用某条根规则，在该子项目 README 中写明即可。

## 三、未来（正式规则溯源）

- 正式规则从 [`lab/formal-system`](../lab/formal-system/README.md) 实验成熟后**迁移至此**，替换对应占位条目；届时保留「实验来源」与演进历史。
- 规则如何定稿/回退的约定（规则之规则，仍为实验）：见 [`lab/formal-system/concerns/meta-rules/M0-rule-governance.md`](../lab/formal-system/concerns/meta-rules/M0-rule-governance.md)（规则的组织方式）与 [`M3-rule-evolution.md`](../lab/formal-system/concerns/meta-rules/M3-rule-evolution.md)（演进）。
