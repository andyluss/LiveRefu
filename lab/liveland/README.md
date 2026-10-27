# LiveLand · 世界与时代创作工具（实验）

> **代号**：LiveLand ｜ **正式名**：未定 ｜ **版本**：0.1.0 ｜ **状态**：`prototype` ｜ **日期**：2026-10-27
> **位置**：`lab/liveland/` ｜ **实验区规则**：见 [`../README.md`](../README.md)
> **一句话**：AI 让图像变便宜，让“世界自洽”变贵。LiveLand 不生成图；它帮你管理世界的规则、时代、canon、实体、资产来源与输出。

## 一、它是什么

LiveLand 是一个**本地优先、零运行时依赖**的世界/时代创作工作台：

- 用 JSON 描述一个世界：约束、时代、canon、实体、资产、输出；
- 检查 canon 冲突、缺失依赖、缺失来源/许可、时代代价；
- 按时代预览色板、材料、光照与“谁维护/谁承担”；
- 添加 canon、维护来源；
- 导出世界圣经、风格指南、资产清单；
- Web Workbench 本地运行，不上传、不训练、不生图。

它不是：

- AI 生图器；
- 通用 Wiki/Notion；
- 游戏引擎/关卡编辑器；
- 自动“生成整个世界”；
- 与 LRDS 强耦合的产品。默认世界是示例；LiveLand 可独立使用。

## 二、用户层次

| 层 | 用户 | 需要什么 | 付费意愿 |
| --- | --- | --- | --- |
| **入口** | 世界观爱好者、TTRPG 主持人、独立作者 | 模板、时代、canon、导出、可展示 | 低；为模板/社区/省时付费 |
| **扩展** | Prosumer（接单/出版/开团）、独立工作室 | 资产来源、授权、协作、输出 | 中；为交付/授权/团队付费 |
| **专业** | 游戏/叙事团队、博物馆/品牌 | 权限、版本、审阅、合规 | 高；为流程/责任付费 |

v0.1 先服务“爱好者入口 + prosumer 的资产/输出痛点”，不假装已经是团队协作平台。

## 三、跑起来

要求 Node **24+**，无第三方依赖。

```bash
cd lab/liveland
node src/cli.ts check
node src/cli.ts report
node src/cli.ts style
node src/cli.ts assets
node src/cli.ts serve 4174
# http://127.0.0.1:4174

npm test
```

`LIVELAND_WORLD=/path/to/world.json` 可切换世界。

## 四、v0.1 已实现

- 世界模型：约束、时代、canon、实体、资产、输出；
- 世界 lint：canon 冲突/缺失依赖/未知时代、资产缺来源/许可、时代缺代价/维护、输出引用；
- 健康分与问题列表；
- 时代视图：色板、材料、光照、维护者、代价；
- Canon：搜索/过滤、来源/依赖/冲突、置信度、添加事实（写回 JSON）；
- 实体/资产/输出视图；
- 导出：世界圣经 Markdown、风格指南 Markdown、资产清单 JSON；
- 三态主题（系统/浅色/深色）；
- CLI：`check` / `report` / `style` / `assets` / `serve`；
- 示例世界「橙港」：3 时代、12 canon、8 实体、6 资产；故意保留 2 errors / 2 warnings 作为 lint 演示。

## 五、世界格式

```text
world/
  orange-harbor.world.json   # 世界、时代、canon、实体、资产、输出
```

核心字段：

```json
{
  "id": "orange-harbor",
  "title": "橙港",
  "constraints": [{ "label": "能源", "statement": "夜间降级非必要服务" }],
  "eras": [{ "id": "solar", "name": "Solar", "cost": "需要参与", "style": { "colors": ["#F3E7C9"] } }],
  "canon": [{ "id": "canon.solar.grid", "era": "solar", "statement": "...", "sources": ["..."] }],
  "assets": [{ "id": "asset-1", "source": "hand-drawn", "license": "CC-BY-4.0" }]
}
```

v0.1 的 canon 新增会写回世界 JSON；不会自动提交 Git。

## 六、架构

```text
src/
  types.ts      # World/Era/Canon/Entity/Asset
  world.ts      # 读取/写回/添加 canon/统计
  lint.ts       # 世界 lint + 导出
  server.ts     # Node 原生 HTTP API + 静态 Workbench（127.0.0.1）
  cli.ts        # check/report/style/assets/serve
web/
  index.html    # 世界工作台
  styles.css    # 独立视觉（非 LRDS 依赖）
  app.js        # 无框架 UI
world/          # 示例世界
test/           # node:test
```

## 七、已做的决定

| # | 决定 | 理由 |
| --- | --- | --- |
| D1 | 本地优先、零依赖、Node 24 | 先验证世界模型，不引入云/账号/依赖 |
| D2 | 世界 = 规则 + 时代 + canon + 实体 + 资产 + 输出 | 不做通用 Wiki |
| D3 | 不做生图器 | 生成会商品化；自洽/来源/版本更难 |
| D4 | 爱好者入口，prosumer 扩展 | 爱好者带来传播；付费靠交付/授权/团队 |
| D5 | v0.1 只做单世界 | 先证明 lint/导出，再谈多世界 |
| D6 | 许可未定 | 不在未决策前发布包/承诺商用条款 |

## 八、边界

- 资产只记录元数据，不托管图片/文件（v0.1）；
- 不做真实 AI 生成、模型训练、版权判断；
- 不做多用户协作/权限/版本；
- 不做游戏资源导出（只有 JSON 清单）；
- 世界 JSON 是权威；输出是生成物。

## 九、下一步

- v0.2：多世界、canon 编辑/删除、资产文件预览、输出 HTML 世界页；
- v0.3：团队协作、版本/审阅、风格卡对比、游戏/印刷输出；
- 先找 3 个爱好者/1 个 prosumer 做真实世界测试。

> 许可/正式名/首批用户政策待定；见 [`docs/03_决策记录.md`](docs/03_决策记录.md)。
