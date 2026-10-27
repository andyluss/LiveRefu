# LiveDSO · 设计系统操作台（实验）

> **正式名（暂定）**：LiveDesign / 灵动设计 ｜ **代号**：LiveDSO ｜ **版本**：1.0.0 ｜ **状态**：`prototype` ｜ **日期**：2026-10-27
> **位置**：`lab/livedso/` ｜ **实验区规则**：见 [`../README.md`](../README.md)
> **一句话**：把设计系统当成一套持续运行的系统：Token 源 → 组件契约 → 风格卡 → 闸门 → 投影 → 健康报告。
> **首批用户**：独立开发者 ｜ **许可**：**Apache-2.0**（核心） + 商业托管/团队/审计 ｜ **贡献者政策**：DCO 1.1
> **清澄**：来源、代价、权限、退路可见；透明不是曝光，开源不是自动清澄。见 [`09 清澄`](../../design/philosophy/09_清澄_透明作为方法.md)。

## 一、它是什么

LiveDSO 是一个**本地优先、零运行时依赖**的设计系统操作台：

- 读取一个 `vault/`（DTCG 风格 token JSON + 契约 + 风格卡）；
- 解析别名、计算对比度、检查语义层裸值；
- 检查组件契约的完整性与 token 引用；
- 预览风格卡；
- 用 vault token 实时渲染组件预览；
- 编辑组件契约并写回 JSON；
- 扫描代码中的 token 引用、裸色与未知 `--dso-` 变量；
- 多 vault 切换（`vaults.json`）与风格卡并排对比；
- token 生命周期（deprecated / replacedBy / note）、契约/风格卡弃用检查、采用扫描统计弃用引用；
- 本地快照（`vault/.history/`）与当前 vault 的只读差异；
- 跨 vault 本地 CI 门禁（`ci`）：健康、阈值、采用扫描、基线 diff、JSON/Markdown 输出；
- 本地检查插件（`plugins/*.mjs`）：品牌/命名/业务规则接入 check/report/ci/Workbench；
- 跨快照趋势：token / 弃用 / 契约 / 风格卡随时间的本地变化；
- 跨 vault 趋势、可复制 CI 模板、可复制插件示例；
- Workbench 跨 vault Trends 视图与 `plugin-test` 插件自检；
- `plugin-test --all` 跨 vault 插件测试矩阵；
- 本地报告模板（`health` / `release` / `templates/reports/*.md`）；
- Workbench Vaults 健康总览与切换；
- 报告模板循环/条件（token/issues/contracts/styleCards 明细）；
- 报告包：一次生成全部模板 + `index.md`，适合 CI artifact；
- 模板条件支持嵌套（安全解析器，不执行代码）；
- 最小示例 vault 与 v1.0 快速开始文档。
- 生成健康报告与 CSS 投影；
- 在 Web Workbench 里搜索、查看、改值、重跑闸门。

它不是：

- 另一个 Figma/组件画布；
- 另一个静态文档站；
- 云协作平台（v0.18 没有账号、同步、计费）；
- 青橙设计的内部工具。它是独立产品，只是把 LRDS 当作**示例 vault**。

## 二、与青橙设计的关系

**独立但相邻**：

| 维度 | LiveDSO | LRDS |
| --- | --- | --- |
| 定位 | 设计系统运维产品 | LiveRefu 的设计系统 |
| 数据 | 任意 DTCG 风格 vault | 自身 token/组件/风格卡 |
| 依赖 | 不 import LRDS 代码 | 不依赖 LiveDSO |
| 关系 | 可用 LRDS 作为示例/首批客户 | 可用 LiveDSO 做运维 |

默认 `vault/` 是“LRDS sample”，用于演示；真实使用时用 `LIVEDSO_VAULT` 指向自己的目录。

## 三、跑起来

要求 Node **24+**（无第三方依赖）。

```bash
cd lab/livedso
node src/cli.ts check        # 终端检查
node src/cli.ts report       # 生成 reports/health.md
node src/cli.ts build        # 生成 dist/tokens.css
node src/cli.ts import ../../design/tokens vault-lrds  # 真实 LRDS case
node src/cli.ts adopt ../../design                    # 扫描采用/裸色
node src/cli.ts snapshot                              # 创建本地快照
node src/cli.ts history                               # 列出快照
node src/cli.ts diff <snapshot-id>                    # 对比当前 vault
node src/cli.ts ci --adopt ../../design --out reports/ci.md  # 本地 CI 门禁
node src/cli.ts trend                                  # 快照趋势
node src/cli.ts trend --all                            # 跨 vault 趋势
node src/cli.ts plugin-test --plugins examples/plugins  # 插件自检
node src/cli.ts plugin-test --all --plugins examples/plugins  # 跨 vault 矩阵
node src/cli.ts report --template release --out reports/release.md  # 报告模板
node src/cli.ts report --bundle --out-dir reports/bundle  # 报告包
node src/cli.ts serve 4173   # 打开 http://127.0.0.1:4173
LIVEDSO_VAULT="$PWD/vault-lrds" node src/cli.ts serve 4173  # 用真实 case
```

也可以：

```bash
npm test                     # Node 内置测试
LIVEDSO_VAULT=/path/to/vault node src/cli.ts serve
```

Web Workbench 的 `Run checks`、`Tokens` 编辑、`Report & projection` 都走本地 API；不上传 vault。

## 四、v1.0 已实现

- Token 解析：`ref` / `sys` / `product` 分层、别名递归、断链检测；
- 检查：坏别名、语义层裸色、对比度、焦点复用、契约字段/状态/token 引用、风格卡引用；
- 组件契约：anatomy / states / tokens / keyboard / a11y / do / dont；
- 风格卡：色板、时代、维护说明；
- 健康分与问题列表；
- Markdown 健康报告；
- CSS variables 投影；
- Web UI：总览、Tokens 搜索/过滤/改值/生命周期、Contracts 编辑、Preview、Style cards + 对比、Checks、Adoption、History、Report；Vault 切换；
- 三态主题（系统/浅色/深色）；
- CLI：`check` / `report` / `build` / `serve` / `import` / `adopt`；
- `vault-lrds/`：从 `design/tokens` 导入的真实 case（229 tokens）。

## 五、Vault 格式

```text
vault/
  tokens/*.json          # DTCG 风格：{ "$value": ..., "$type": ... }
  contracts/*.json       # 组件契约
  style-cards/*.json     # 风格卡
  checks.json            # 对比度对、必须字段等
```

Token 示例：

```json
{
  "sys": {
    "color": {
      "action": {
        "primary": { "$value": "{ref.color.teal.400}", "$type": "color" }
      }
    }
  }
}
```

注意：v0.4 的编辑只写回 token/契约源 JSON；不会自动提交 Git。真实项目应先开分支/PR。

## 六、架构

```text
src/
  types.ts       # 领域类型
  tokens.ts      # 解析/别名/CSS 投影
  checks.ts      # 闸门/健康分/Markdown 报告
  vault.ts       # vault 读取/保存 token/契约/状态
  registry.ts    # vaults.json 读取/路径解析
  history.ts     # 本地快照/差异
  ci.ts          # 跨 vault 本地 CI 门禁
  plugins.ts     # 本地检查插件加载/运行     # 本地快照/差异
  adoption.ts    # 只读采用扫描（token/裸色/未知变量）
  server.ts      # Node 原生 HTTP + API + 静态文件
  cli.ts         # check/report/build/serve/import
web/
  index.html     # Workbench
  styles.css     # 独立视觉（非 LRDS 依赖）
  app.js         # 无框架 UI
vaults.json      # 多 vault 注册表
vault/           # 示例数据
test/            # node:test
```

## 七、已做的决定

| # | 决定 | 理由 |
| --- | --- | --- |
| D1 | 本地优先、零依赖、Node 24 | 先验证工作流，不引入云/账号/依赖 |
| D2 | DTCG 风格 token + 语义三层 | 与现有设计系统生态兼容 |
| D3 | 与 LRDS 代码解耦 | 独立产品；LRDS 只是 sample |
| D4 | 先只做 token/contract/style-card/checks/report | 先闭合“改一处 → 全端可见”的最小链路 |
| D5 | 不做 Figma 克隆/文档站 | 差异化在运维，不在画布 |
| D6 | Web UI 无框架 | 零构建、可审计、适合本地工具 |
| D7 | 报告/投影可下载 | 可进 PR/CI，不绑定平台 |
| D8 | 首批用户：独立开发者 | 个人导入/报告/价格优先；团队版后置 |
| D9 | 正式名 | 代号 LiveDSO；正式名暂定 **LiveDesign / 灵动设计**，未来可能改 |
| D10 | 许可 | **A：Apache-2.0 核心 + 商业托管/团队/审计** |
| D11 | 贡献者政策 | **DCO 1.1**，不使用 CLA |
| D12 | v0.2 导入 `design/tokens` | 真实 LRDS case：229 tokens |
| D13 | v0.3 契约编辑 + 预览 | 契约写回 JSON；预览只读 token，不渲染真实产品组件 |
| D14 | v0.4 采用扫描 | 只读扫描代码；统计 token 引用/裸色/未知变量，不自动改目标代码 |
| D15 | v0.5 多 vault + 风格卡对比 | 注册表只存路径；切换只影响当前服务；对比只读 |
| D16 | v0.6 token 生命周期 | deprecated/replacedBy 写源 JSON；lint/采用扫描只读检查 |
| D17 | v0.7 本地快照/差异 | 快照写 `vault/.history/`；只读 diff，不自动回滚；云/账号继续搁置 |
| D18 | v0.8 本地 CI | `ci` 聚合所有 vault；阈值/退出码；不接云、不上传 |
| D19 | v0.9 本地插件 | `plugins/*.mjs` 受信本地代码；无沙箱；不接云 |
| D20 | v0.10 跨快照趋势 | 只读历史快照；展示数量/弃用；不接云 |
| D21 | v0.11 跨 vault 趋势 + 模板 | 聚合各 vault 快照；模板/示例可复制；本地优先 |
| D22 | v0.12 趋势 UI + 插件自检 | 趋势视图只读；plugin-test 只本地运行 |
| D23 | v0.13 插件测试矩阵 | 对一个插件跑所有 vault；本地只读；不接云 |
| D24 | v0.14 报告模板 | 本地 Markdown 占位符；不执行代码；不接云 |
| D25 | v0.15 Vaults 总览 | 聚合所有 vault 健康；切换只影响当前服务 |
| D26 | v0.16 模板循环/条件 | 安全占位符；不执行代码；不接云 |
| D27 | v0.17 报告包 | 一次生成全部模板 + index；本地 artifact |
| D28 | v0.18 模板嵌套 | 安全解析器；支持嵌套 #if；不执行代码 |

## 八、路线图（待验证）

- **v0.2（已完成）**：LRDS 真实 case 导入。
- **v0.3（已完成）**：契约编辑、真实 token 组件预览。
- **v0.4（已完成）**：采用扫描（CLI/API/UI）。
- **v0.5（已完成）**：多 vault 切换、风格卡并排对比。
- **v0.6（已完成）**：token 生命周期/弃用。
- **v0.7（已完成）**：本地快照与差异。
- **v0.8（已完成）**：跨 vault 本地 CI 门禁。
- **v0.9（已完成）**：本地检查插件。
- **v0.10（已完成）**：跨快照趋势。
- **v0.11（已完成）**：跨 vault 趋势、CI 模板、插件示例。
- **v0.12（已完成）**：跨 vault Trends UI、`plugin-test`。
- **v0.13（已完成）**：`plugin-test --all` 插件矩阵。
- **v0.14（已完成）**：本地报告模板。
- **v0.15（已完成）**：Vaults 健康总览。
- **v0.16（已完成）**：报告模板循环/条件。
- **v0.17（已完成）**：报告包（bundle）。
- **v0.18（当前）**：模板嵌套条件；云/账号/团队/私有 registry/托管继续搁置。
- **之后**：托管/CI/审计服务；开源核心 + 企业版。

## 九、已裁决

- **代号**：LiveDSO。
- **正式名（暂定）**：**LiveDesign / 灵动设计**，未来可能改。
- **首批用户**：独立开发者。
- **许可**：**A：Apache-2.0 核心 + 商业托管/团队/审计**。
- **贡献者政策**：**DCO 1.1**（`git commit -s`）。
- **LRDS 接入**：v0.2 直接导入 `design/tokens`（已完成，229 tokens）。
- **许可文件**：[`LICENSE`](LICENSE) / [`NOTICE`](NOTICE) / [`CONTRIBUTING.md`](CONTRIBUTING.md) / [`DCO`](DCO) / [`TRADEMARKS.md`](TRADEMARKS.md)。

## 十、边界

- 不读/写 LRDS 的组件 CSS 或产品代码（v0.18）；采用扫描是只读。
- 不做自动 Git 提交；
- 不做云同步/账号/计费；
- 不做完整的 token 树编辑器（v0.18 只改值/契约/生命周期，不建树）；不做自动改代码；插件无沙箱；报告模板不执行代码。
- 快照不自动回滚；只读差异，恢复由人决定。

## 十一、商品化（未来，未实施）

- 未来可选扩展：**设计系统体检包**（报告 + 修复计划），不是当前版本功能；
- 目标产品案例（发票 App/家庭能源/用药提醒）、触发条件、定价、边界见 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)；跨项目狗粮计划见 [`../DOGFOOD.md`](../DOGFOOD.md)；
- **现在不做**：不加 SaaS、账号、计费；云/账号/团队/私有 registry/托管**按用户裁决搁置**；先把本地快照、diff、CI 做稳。

## 十二、CI 集成与插件

本地/任意 CI 运行：

```bash
node src/cli.ts ci --strict --adopt ../../design --out reports/ci.md
```

门禁：错误必须为 0；`--strict` 还要求无警告/裸色/未知变量/弃用引用；支持 `--max-warnings`、`--max-raw`、`--max-deprecated`、`--baseline`。详见 [`docs/06_CI集成.md`](docs/06_CI集成.md)。

本地插件：`plugins/*.mjs`，用 `--plugins` 或 `LIVEDSO_PLUGINS` 加载；不是沙箱，只加载可信代码。详见 [`docs/07_插件API.md`](docs/07_插件API.md)。

趋势：`node src/cli.ts trend` 或 Workbench History 页查看快照趋势；`trend --all` 聚合所有 vault；只读本地 `.history/`。

模板与示例：[`templates/`](templates/)（GitHub Actions / GitLab CI）、[`examples/plugins/`](examples/plugins/)（可复制插件）。

趋势 UI：Workbench 的 **Trends** 页；插件自检：`node src/cli.ts plugin-test --plugins examples/plugins`；跨 vault 矩阵：`plugin-test --all`。

报告模板：`report --list-templates`、`report --template release --out reports/release.md`；支持 `{{#tokens}}` / `{{#issues}}` / `{{#if deprecated}}`。报告包：`report --bundle --out-dir reports/bundle`。详见 [`docs/08_报告模板.md`](docs/08_报告模板.md)。

Vaults 总览：Workbench **Vaults** 页；`GET /api/vaults/overview` 聚合所有 vault 健康分。

## 十三、发布检查

每次发布按 [`docs/05_发布检查清单.md`](docs/05_发布检查清单.md) 执行：旧版本段不可删除，发布提交后立刻打 `livedso-v*` tag。

## 十四、v1.0 案例与文档

- [`docs/09_快速开始与案例.md`](docs/09_快速开始与案例.md)；
- [`examples/minimal-vault/`](examples/minimal-vault/)：10 token / 1 契约 / 1 风格卡；
- 稳定边界：本地优先，不接云/账号/团队；写操作只写源 JSON。

## 工作区规则

> **特别约定：不适用 `lab/` 的实验豁免。** 本项目按工作区根目录通用规则执行：R01 文档体例、R02 Git/提交、R03 相对链接、R05 变更日志、AGENTS 回报；目录/命名按 M1/M2 的 projects 标准准备，迁移到 `projects/` 时接入配置。
