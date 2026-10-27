# LiveDSO · 设计系统操作台（实验）

> **正式名（暂定）**：LiveDesign / 灵动设计 ｜ **代号**：LiveDSO

> **代号**：LiveDSO ｜ **正式名**：未定 ｜ **版本**：0.2.0 ｜ **状态**：`prototype` ｜ **日期**：2026-10-27
> **位置**：`lab/livedso/` ｜ **实验区规则**：见 [`../README.md`](../README.md)
> **一句话**：把设计系统当成一套持续运行的系统：Token 源 → 组件契约 → 风格卡 → 闸门 → 投影 → 健康报告。
> **首批用户**：独立开发者 ｜ **许可**：**Apache-2.0**（核心） + 商业托管/团队/审计 ｜ **贡献者政策**：DCO 1.1

## 一、它是什么

LiveDSO 是一个**本地优先、零运行时依赖**的设计系统操作台：

- 读取一个 `vault/`（DTCG 风格 token JSON + 契约 + 风格卡）；
- 解析别名、计算对比度、检查语义层裸值；
- 检查组件契约的完整性与 token 引用；
- 预览风格卡；
- 生成健康报告与 CSS 投影；
- 在 Web Workbench 里搜索、查看、改值、重跑闸门。

它不是：

- 另一个 Figma/组件画布；
- 另一个静态文档站；
- 云协作平台（v0.2 没有账号、同步、计费）；
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
node src/cli.ts serve 4173   # 打开 http://127.0.0.1:4173
LIVEDSO_VAULT="$PWD/vault-lrds" node src/cli.ts serve 4173  # 用真实 case
```

也可以：

```bash
npm test                     # Node 内置测试
LIVEDSO_VAULT=/path/to/vault node src/cli.ts serve
```

Web Workbench 的 `Run checks`、`Tokens` 编辑、`Report & projection` 都走本地 API；不上传 vault。

## 四、v0.2 已实现

- Token 解析：`ref` / `sys` / `product` 分层、别名递归、断链检测；
- 检查：坏别名、语义层裸色、对比度、焦点复用、契约字段/状态/token 引用、风格卡引用；
- 组件契约：anatomy / states / tokens / keyboard / a11y / do / dont；
- 风格卡：色板、时代、维护说明；
- 健康分与问题列表；
- Markdown 健康报告；
- CSS variables 投影；
- Web UI：总览、Tokens 搜索/过滤/改值、Contracts、Style cards、Checks、Report；
- 三态主题（系统/浅色/深色）；
- CLI：`check` / `report` / `build` / `serve` / `import`；
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

注意：v0.2 的编辑只写回 token 源 JSON；不会自动提交 Git。真实项目应先开分支/PR。

## 六、架构

```text
src/
  types.ts       # 领域类型
  tokens.ts      # 解析/别名/CSS 投影
  checks.ts      # 闸门/健康分/Markdown 报告
  vault.ts       # vault 读取/保存/状态
  server.ts      # Node 原生 HTTP + API + 静态文件
  cli.ts         # check/report/build/serve
web/
  index.html     # Workbench
  styles.css     # 独立视觉（非 LRDS 依赖）
  app.js         # 无框架 UI
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

## 八、路线图（待验证）

- **v0.2（当前）**：LRDS 真实 case 导入；契约编辑、视觉预览、采用扫描仍待做。
- **v0.3**：团队/多 vault、私有 registry、风格卡对比、版本/弃用。
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

- 不读/写 LRDS 的组件 CSS 或产品代码（v0.2）；
- 不做自动 Git 提交；
- 不做云同步/账号/计费；
- 不做完整的 token 编辑器（v0.2 只改值，不建树）。
