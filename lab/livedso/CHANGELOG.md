# LiveDSO Changelog

## [1.1.1] - 2026-10-28 12:05

### Changed

- 用户可见处统一使用正式名 **LiveAtelier / 灵动构坊**：工作台文案、CLI banner、服务启动日志、README/文档正文、示例 vault 名称、报告模板标题。
- 代码目录、包名、`LIVEDSO_*` 配置键与技术文档中的“代号 LiveDSO”保留。

## [1.1.0] - 2026-10-28 12:05

### Added

- **hash 路由**：`#/overview` … `#/report`，支持深链、刷新恢复、前进/后退；未知路由回退总览。
- **中文/English 切换**：顶部 `EN`/`中文`，默认跟随浏览器并持久化；正式名按语言显示为 **灵动构坊 / LiveAtelier**。
- **自我皮肤（狗粮）**：顶栏选择风格卡，把卡 `roles` 映射到 LiveAtelier 自身的 `--bg/--surface/--text/--accent`，可一键恢复默认。
- **分组导航**：工作台 / 审视 / 本地 / 输出。
- 新增 [`docs/10_路由_本地化_皮肤.md`](docs/10_路由_本地化_皮肤.md) 与 [`docs/11_本地化词表.md`](docs/11_本地化词表.md)。

### Changed

- `node:test` 20 → **21**（前端路由/i18n/皮肤契约）。
- 保留技术词与用户 vault 数据不自动翻译；见词表。
- 版本 1.0.3 → 1.1.0。

## [1.0.3] - 2026-10-28 12:01

### Changed

- **正式名改为 LiveAtelier / 灵动构坊**（代号仍为 LiveDSO）：用户可见品牌、README、产品定义、决策记录、许可/贡献文档同步。
- 代码目录、包名、CLI 与配置键继续使用 LiveDSO，避免破坏技术兼容。
- 版本 1.0.2 → 1.0.3；UI 顶栏 `LAB / 1.0.3`。

## [1.0.2] - 2026-10-28 08:48

### Fixed

- **预览切换风格卡不生效**：风格卡只更新色板，未覆盖预览 canvas 的 token 变量。现在每张风格卡提供 `roles`（bg/surface/text/action/focus/danger），预览用语义角色覆盖组件颜色，archive/cyber/solar 都有可见差异。
- 新增风格卡 `roles` 示例与测试，防止再次退化为“只换色板不换组件”。

### Changed

- `node:test` 19 → **20**（风格卡 roles 校验）。
- 版本 1.0.1 → 1.0.2。

## [1.0.1] - 2026-10-28 08:42

### Changed

- **正式名确定为 LiveDesigner / 灵动设计师**（代号仍为 LiveDSO）：README、产品定义、决策记录、UI 品牌、NOTICE/TRADEMARKS 同步。
- 版本 1.0.0 → 1.0.1；许可证仍为 Apache-2.0（核心）+ 商业托管/团队/审计，贡献者政策 DCO 1.1。
- UI 顶栏显示正式名与 `LAB / 1.0.1`。

## [1.0.0] - 2026-10-28 07:47

### Added

- **最小示例 vault**：[`examples/minimal-vault/`](examples/minimal-vault/)，10 tokens / 1 契约 / 1 风格卡，`check` 100/100。
- **快速开始与案例**：[`docs/09_快速开始与案例.md`](docs/09_快速开始与案例.md)，覆盖 sample/LRDS real/minimal、adopt、snapshot、CI、插件、报告包。
- v1.0 稳定边界：本地优先；不接云/账号/团队；写操作只写源 JSON。

### Changed

- `node:test` 18 → **19**（最小示例 vault 校验）。
- 版本从 0.18 升到 **1.0**：本地核心范围冻结。

## [0.18.0] - 2026-10-28 07:24

### Added

- **模板嵌套条件**：安全解析器支持 `{{#if}}` 嵌套与循环内条件；不再依赖正则匹配。
- `inventory.md` 展示弃用替代链：`deprecated → replacedBy`。
- 语法错误会明确报错（未闭合/不匹配块）。

### Changed

- `node:test` 保持 18 项（现有 inventory 断言覆盖嵌套）。
- 云/账号/团队/私有 registry/托管继续搁置。
- LiveDSO 本地功能进入收敛阶段。

## [0.17.0] - 2026-10-27 22:58

### Added

- **报告包**：`report --bundle --out-dir <dir>` 一次生成全部内置/自定义模板与 `index.md`，适合 CI artifact。
- **API**：`POST /api/report/bundle` 返回 `{ files, index }`，不写服务器目录。
- **模板示例**：`templates/reports/deprecations.md`、`templates/reports/contracts.md`。

### Changed

- `node:test` 从 17 项增至 18 项（报告包构建）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：更多本地报告、模板示例库；留到 v0.18。

## [0.16.0] - 2026-10-27 22:55

### Added

- **报告模板循环/条件**：`{{#tokens}}` / `{{#issues}}` / `{{#contracts}}` / `{{#styleCards}}` 与 `{{#if}}`；安全占位符，不执行代码。
- **示例模板**：[`templates/reports/inventory.md`](templates/reports/inventory.md)，逐 token 列出解析值与弃用状态。
- `docs/08_报告模板.md` 增加循环/条件字段表。

### Changed

- `node:test` 保持 17 项（现有模板测试增加 inventory 断言）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：更多本地报告、模板示例库；留到 v0.17。

## [0.15.0] - 2026-10-27 22:54

### Added

- **Vaults 健康总览**：Workbench 新增 Vaults 页，列出所有注册 vault 的健康分、errors/warnings、tokens/contracts/cards，并可直接切换。
- **API**：`GET /api/vaults/overview` 聚合各 vault 检查结果与当前 activeVault。
- 切换只影响当前本地服务进程，不写 vault 配置。

### Changed

- `node:test` 保持 17 项（沿用现有 CI/注册表覆盖）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：报告模板变量扩展、更多本地报告；留到 v0.16。

## [0.14.0] - 2026-10-27 22:52

### Added

- **本地报告模板**：内置 `health` / `release`，自定义 `templates/reports/*.md`；占位符替换，不执行代码。
- **CLI**：`report --list-templates`、`--template <id>`、`--out <file>`。
- **API/UI**：`GET /api/report/templates`、`POST /api/report` body `{template}`；Report 页可选择模板。
- 新增 [`docs/08_报告模板.md`](docs/08_报告模板.md) 与示例模板 [`templates/reports/summary.md`](templates/reports/summary.md)。

### Changed

- `node:test` 从 16 项增至 17 项（内置/自定义模板渲染）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：更多跨 vault 视图、模板变量扩展；留到 v0.15。

## [0.13.0] - 2026-10-27 22:48

### Added

- **跨 vault 插件矩阵**：`plugin-test --all` 按 `vaults.json` 逐个 vault 运行同一插件；`--json` 输出矩阵；任一 vault 失败或 issue 为 error 时退出码 `1`。
- 插件自检文档补充单 vault / 跨 vault 两种用法。

### Changed

- 将原 `[未发布]` 的 3 项（商品化路径、DOGFOOD、目标产品案例）按实际引入时间（19:50–20:04）归入 `0.3.0` 发布记录；`[未发布]` 清空。
- `node:test` 从 15 项增至 16 项（插件矩阵）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：本地报告模板、更多跨 vault 视图；留到 v0.14。

## [0.12.0] - 2026-10-27 22:43

### Added

- **Trends 视图**：Workbench 新增跨 vault 趋势页；按 vault 展示快照 token 柱状、最新 deprecated/contracts/cards 与加载错误。
- **`plugin-test`**：CLI 本地插件自检；`--json` 输出插件名、load/runtime errors、issue；有 error 时退出码 1。
- 插件上下文版本更新为 0.12。

### Changed

- `node:test` 保持 15 项（趋势/示例插件已有覆盖）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：本地报告模板、插件测试矩阵；留到 v0.13。

## [0.11.0] - 2026-10-27 22:41

### Added

- **跨 vault 趋势**：`trend --all` 与 `GET /api/trends` 聚合 `vaults.json` 中每个 vault 的快照指标（tokens / deprecated / contracts / cards）。
- **可复制 CI 模板**：[`templates/github-actions.yml`](templates/github-actions.yml)、[`templates/gitlab-ci.yml`](templates/gitlab-ci.yml)，默认在 `lab/livedso` 下跑 `ci --strict`。
- **插件示例库**：[`examples/plugins/brand-rules.mjs`](examples/plugins/brand-rules.mjs)、[`examples/plugins/token-naming.mjs`](examples/plugins/token-naming.mjs)，可复制到 `plugins/`。
- 新增 [`templates/README.md`](templates/README.md) 与 [`examples/README.md`](examples/README.md)。

### Changed

- `node:test` 从 13 项增至 15 项（跨 vault 趋势 + 示例插件加载）。
- 云/账号/团队/私有 registry/托管继续搁置。
- 未做：本地报告模板、插件测试工具；留到 v0.12。

## [0.10.0] - 2026-10-27 22:36

### Added

- **跨快照趋势**：快照记录 tokens / deprecated / contracts / styleCards 指标；`trend` 命令输出时间序列。
- **History UI 趋势条**：History 页显示旧→新的 token 数量柱状趋势与最新弃用数。
- 快照指标向后兼容：旧快照没有 `metrics` 时从 token 数据回退计算。

### Changed

- `node:test` 13 项（历史测试增加趋势断言）。
- 未做：CI 模板、插件示例库、跨 vault 趋势；留到 v0.11。
- 云/账号/团队/私有 registry/托管继续搁置。

## [0.9.0] - 2026-10-27 22:32

### Added

- **本地检查插件**：`plugins/*.mjs` 可导出函数或 `{ name, check }`；issue 进入健康分、Checks、Report、CI。
- **接入点**：`check` / `report` / `ci` 支持 `--plugins`，`LIVEDSO_PLUGINS` 覆盖；`serve` 默认加载 `plugins/`。
- **插件文档**：[`docs/07_插件API.md`](docs/07_插件API.md) 说明接口、示例、安全边界。
- 插件加载/运行失败分别产生 `plugin.load` / `plugin.runtime` error，不静默吞掉。

### Changed

- 插件运行在本地进程内，**无沙箱**；只加载可信代码；不接云、不上传。
- `node:test` 从 12 项增至 13 项（插件加载 + issue 注入）。
- 未做：跨快照趋势、CI 模板、插件示例库；留到 v0.10。

## [0.8.0] - 2026-10-27 22:30

### Added

- **本地 CI 门禁**：`ci` 命令读取 `vaults.json`，聚合所有 vault 的健康分/errors/warnings；支持 `--strict`、`--max-warnings`、`--max-raw`、`--max-deprecated`、`--adopt`、`--baseline`、`--json`、`--out`。
- **跨 vault 汇总**：一次输出 token/contract/style-card 总量、各 vault 分数、采用扫描与基线 diff；退出码可用于任意 CI。
- **CI 文档**：[`docs/06_CI集成.md`](docs/06_CI集成.md) 提供本地运行、阈值与 GitHub Actions 片段。
- 不接云、不建账号、不上传 vault。

### Changed

- `node:test` 从 11 项增至 12 项（跨 vault CI 聚合 + 严格阈值）。
- 未做：本地插件 API、趋势报告；留到 v0.9。

## [0.7.0] - 2026-10-27 22:28

### Added

- **本地快照**：`snapshot` 命令、`POST /api/history`、Workbench History 视图；写入 `vault/.history/`，不依赖 Git/云。
- **只读差异**：`history` / `diff <id>` CLI、`GET /api/history`、`POST /api/history/diff`；对比 token（值/解析值/弃用/替代）、契约、风格卡的增删改。
- **本地历史 UI**：创建快照、列出快照、选择查看差异；不自动回滚。
- `.history/` 加入忽略规则，快照默认不进 Git。

### Changed

- 云/账号/团队/私有 registry/托管按用户裁决**继续搁置**；v0.7 只做本地能力。
- `node:test` 从 10 项增至 11 项（快照创建/列表/差异）。

## [0.6.0] - 2026-10-27 22:18

### Added

- **Token 生命周期**：token 叶可写 `deprecated` / `replacedBy` / `deprecationNote`；Workbench Tokens 支持按生命周期过滤、标记弃用并写回源 JSON。
- **弃用检查**：替代 token 不存在/指向自己/替代链仍弃用；契约/风格卡仍引用弃用 token 时告警；报告 Inventory 增加 Lifecycle 列。
- **采用扫描统计弃用引用**：Adoption 结果增加 `deprecatedRefs`，CLI/API/UI 都能看到代码里对弃用 token 的引用。
- 示例 vault 把 `sys.color.action.primaryHover` 标为 deprecated，替代为 `sys.color.action.primary`。

### Changed

- 生命周期编辑只写 token 源 JSON；不自动提交 Git。
- `node:test` 从 9 项增至 10 项（生命周期写回 + 采用扫描弃用统计）。
- 未做：团队/权限、私有 registry、托管；留到 v0.7。

## [0.5.0] - 2026-10-27 22:15

### Added

- **多 vault**：新增 [`vaults.json`](vaults.json) 与 `src/registry.ts`；Workbench 侧栏可切换 sample / LRDS real，`GET /api/vaults` 与 `POST /api/vault` 支持列出/切换。
- **风格卡对比**：Style cards 页新增 A/B 并排对比，显示色板、时代、维护说明、共享色，不修改 vault。
- 注册表路径相对 `vaults.json` 解析，项目整体移动不失效；无注册表时回退到单个默认 vault。

### Changed

- 多 vault 切换只影响当前本地服务进程，不写任何 vault 配置；切换后重新加载 token/契约/风格卡并跑闸门。
- `node:test` 从 8 项增至 9 项（注册表路径解析）。
- 未做：团队/权限、私有 registry、版本/弃用；留到 v0.6。

## [0.4.0] - 2026-10-27 21:41

### Added

- **采用扫描**：新增 `adopt` 命令、`POST /api/adopt` 与 Workbench 的 Adoption 视图；只读扫描一个代码目录，统计 token 引用、裸色、未知 `--dso-` 变量与文件分布。
- **CLI 严格模式**：`--json`、`--strict`（未知变量失败）、`--fail-on-raw`（裸色失败）。

### Changed

- 采用扫描只读；不自动改目标代码、不上传目标目录。
- 未做：多 vault、风格卡对比、团队/私有 registry；留到 v0.5。
- `node:test` 8 项（新增采用扫描测试）。

## [0.3.0] - 2026-10-27 21:37

### Added

- **契约编辑**：Workbench 的 Contracts 卡片增加编辑入口；标题/状态/说明/anatomy/states/tokens/keyboard/a11y/do/dont 可改，写回 `contracts/*.json`。
- **真实 token 预览**：新增 Preview 视图，用当前 vault 的解析值渲染按钮/输入/面板；支持风格卡选择与 default/hover/focus/disabled 状态切换。
- 新增 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)：设计系统体检包未来提案；未实施、未排期。
- 新增跨项目 [`DOGFOOD.md`](../DOGFOOD.md) 与 `04` 狗粮计划：9 个未来案例、Wave 1–3、反馈回路；未启动。
- `04_商品化路径.md` 增加 3 个目标产品案例：自由职业者发票 App、家庭能源 App、老人用药提醒 App。

### Changed

- 契约编辑与 token 编辑都只写源 JSON；不自动提交 Git。
- **未做**：采用扫描、多 vault、团队/私有 registry；留到 v0.3 后续/v0.4。
- `node:test` 从 6 项增至 7 项（新增契约写回/重载测试）。

## [0.2.0] - 2026-10-27 13:07

### Added

- `import` 命令：从 `design/tokens/` 导入 ref/sys/product 到 LiveDSO vault。
- `vault-lrds/`：真实 LRDS case（6 个文件 / 229 tokens），含契约/风格卡/检查配置。
- **v0.1 baseline**：本地 vault、token 解析/别名、3 类闸门、契约、风格卡、健康报告、CSS 投影、Workbench、`check/report/build/serve`、`node:test`。
- 首批用户决策：独立开发者。
- 许可：Apache-2.0（核心）+ 商业托管/团队/审计；贡献者政策 DCO 1.1。
- 正式名暂定 LiveDesign / 灵动设计；LiveDSO 继续作代号。
- 新增 `LICENSE` / `NOTICE` / `CONTRIBUTING.md` / `DCO` / `TRADEMARKS.md`；核心源码加 SPDX 头。

### Changed

- 只编辑 token 值，不编辑 token 树/契约。
- 无云同步/账号/计费；无 Figma 同步；无采用扫描。
- 0.1.0 是内部 prototype，不单独发版/打 tag；首个版本为 0.2.0。
