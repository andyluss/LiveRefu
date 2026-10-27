# LiveFile · 本地优先个人档案 OS（实验）

> **代号**：LiveFile ｜ **正式名**：未定 ｜ **版本**：0.2.0 ｜ **状态**：`prototype` ｜ **日期**：2026-10-27
> **位置**：`lab/livefile/` ｜ **实验区规则**：见 [`../README.md`](../README.md)
> **一句话**：不是又一个笔记 App，而是一个**可检索、可备份、可发布、可继承的个人档案**：文件是你的，索引是你的，退出也是你的。
> **清澄**：来源、代价、权限、退路可见；透明不是曝光，开源不是自动清澄。见 [`09 清澄`](../../design/philosophy/09_清澄_透明作为方法.md)。

## 一、它是什么

LiveFile 索引一个本地 `archive/` 目录：

- 原始文件 + `*.meta.json` sidecar（来源/许可/时间/集合/保留）；
- 文件 hash、大小、mtime；
- 全文检索（Markdown/文本）与元数据检索；
- 时间线、集合、条目详情；
- 备份状态、继承安排、健康报告；
- 导出档案目录、机器清单、备份/继承报告、公开页；
- 元数据编辑与补 sidecar；
- 重复内容分组提示；
- 本地备份复制 + 恢复校验。

它不是：

- 云相册/网盘；
- 通用笔记编辑器；
- AI 识别/生成工具；
- 法律遗嘱或合规产品；
- 会自动上传/训练的服务。

## 二、用户层次

| 层 | 用户 | 需求 |
| --- | --- | --- |
| **首版** | 信息密集的普通人：研究者、设计师、自由职业者、家庭 | 找到、备份、交给家人 |
| 扩展 | 小工作室/家庭 | 共享、交接、客户资产 |
| 机构 | 研究机构/小团队 | 权限、审计、保留政策 |

真正的“普通人”是终极用户，不是首版假设；他们需要“家电级”体验，而不是配置本地优先。

## 三、跑起来

要求 Node **24+**，无第三方依赖。

```bash
cd lab/livefile
node src/cli.ts check
node src/cli.ts catalog
node src/cli.ts manifest
node src/cli.ts backup
node src/cli.ts backup-run reports/backup
node src/cli.ts restore-check reports/backup
node src/cli.ts public
node src/cli.ts serve 4175
# http://127.0.0.1:4175

npm test
```

`LIVEFILE_ARCHIVE=/path/to/archive` 可切换档案目录。

## 四、v0.2 已实现

- 文件索引：hash、大小、mtime、类型；
- sidecar 元数据：标题、类型、来源、许可、集合、标签、保留、人物；
- 搜索/过滤、时间线、集合；
- 条目抽屉：文本/图片预览、来源、许可、SHA、缺失提示；
- 元数据编辑：标题/类型/日期/来源/许可/保留/集合/标签/public；
- 未整理条目可一键补 sidecar；
- 重复内容分组（hash），只提示不自动合并；
- 本地备份：复制 archive + `backup-manifest.json` + hash 校验；
- 恢复校验：只读验证，不覆盖当前档案；
- 公开页：只导出 `public:true` 的条目，图片内嵌；
- 健康：未整理条目、缺来源/许可/保留、重复 hash、备份过期/未验证/无异地、恢复演练、继承复核；
- 备份/继承报告 + 3-2-1 恢复清单；
- 导出：档案目录 Markdown、机器清单 JSON、备份/继承报告、公开页 HTML；
- 三态主题（系统/浅色/深色）；
- 示例 archive：11 条目 / 9 集合 / 6 类型；故意保留 1 个未整理条目、1 组重复、备份/继承过期。
- 健康分 84/100（0 errors / 4 warnings）。

## 五、Archive 结构

```text
archive/
  notes/…md                     # 原始文件
  photos/…svg
  receipts/…md
  inbox/未整理照片.svg             # 无 sidecar，健康检查会标出
  inbox/电站维修记录-副本.md        # 与 notes 版本 hash 相同，重复提示
  .backup.json                  # 备份状态
  inheritance.json              # 保管/继承安排
  notes/2026-04-12-电站维修.md.meta.json
```

Sidecar 示例：

```json
{
  "title": "电站维修记录",
  "type": "note",
  "created": "2026-04-12",
  "source": "现场记录",
  "license": "private",
  "collections": ["家庭维护", "橙港"],
  "tags": ["维修", "能源"],
  "retention": "7y",
  "public": false
}
```

**原则**：原始文件不动；sidecar 记录“关于文件的事”；索引可删除重建。

## 六、健康/备份/继承

- 3-2-1：3 份副本、2 种介质、1 份异地；
- 每季度/每年做一次**恢复演练**（不是只备份）；
- `inheritance.json` 记录保管人/访问范围/密钥保管/复核日期；
- 健康分只做技术提示，不替代法律遗嘱。

## 七、架构

```text
src/
  types.ts     # Item/Archive/Health
  archive.ts   # 扫描/索引/sidecar
  health.ts    # 健康/导出/备份报告
  backup.ts    # 备份复制/恢复校验
  public.ts    # 独立公开页
  server.ts    # Node 原生 HTTP API + 静态文件（127.0.0.1）
  cli.ts       # check/catalog/manifest/backup/serve
web/
  index.html   # 档案工作台
  styles.css   # 独立视觉（非 LRDS 依赖）
  app.js       # 无框架 UI
archive/       # 示例档案
test/          # node:test
```

## 八、已做的决定

| # | 决定 | 理由 |
| --- | --- | --- |
| D1 | 本地文件 + sidecar | 不锁定；软件停止也能读 |
| D2 | 只索引，不搬文件 | 尊重已有目录；降低迁移风险 |
| D3 | 首版只读 + 导出 | 先验证“找到/备份/继承”，不做编辑器 |
| D3b | v0.2 可编辑 sidecar | 原始文件仍不动；编辑只写 sidecar |
| D4 | 健康包含备份/继承 | 普通人的“丢失”不是文件数问题 |
| D5 | 首版用户：信息密集者 | “普通人”是终局，不是配置极客 |
| D6 | 不做云/账号/AI | 先本地可信 |

## 九、工作区规则

> **特别约定：不适用 `lab/` 的实验豁免。** 本项目按工作区根目录通用规则执行：R01 文档体例、R02 Git/提交、R03 相对链接、R05 变更日志、AGENTS 回报；目录/命名按 M1/M2 的 projects 标准准备，迁移到 `projects/` 时接入配置。

## 十、边界

- 只索引文本/Markdown 与图片预览；PDF/视频暂不解析；
- 不做 OCR、AI 分类；去重只提示，不自动合并；
- 不做实时同步/云备份（备份是本地复制）；
- 不做多用户/权限/实时同步；
- 不做法律遗嘱/合规认证；
- 不自动 Git 提交。

## 十一、下一步

- v0.2 已完成：元数据编辑、重复提示、本地备份/恢复校验、公开页；
- v0.3：家庭共享/权限、恢复演练向导、机构版；
- 先用自己的 1 个真实 archive 跑 30 天。

## 十二、商品化（未来，未实施）

- 未来可选扩展：**Archive Book**（家庭/个人档案书），不是当前版本功能；
- 目标产品案例（家庭档案书/田野档案书/作品档案书）、触发条件、隐私边界、印刷路径见 [`docs/04_商品化路径.md`](docs/04_商品化路径.md)；
- **现在不做**：不做云相册/网盘/法律遗嘱；先把编辑、备份、隐私链路做稳。
