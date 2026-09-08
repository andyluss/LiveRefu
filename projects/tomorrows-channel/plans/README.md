# plans · 项目管理

> 存放《明日频道》的**项目管理文件**：里程碑、计划、会议记录、决策记录、完成情况、工作日志。与 [`docs/`](../docs/)（**设计与角色文档**）区分——docs 是"产品/角色产出"，plans 是"怎么推进项目"。
> ⚠️ **`CHANGELOG.md` 单独处理**：项目日志（对外/里程碑视角）仍在项目根 · `CHANGELOG.md`；本目录的 `logs/` 是**工作日志**（团队每日/每次工作留痕），两者目的不同、不合并。

## 一、目录结构

```
plans/
├── README.md            # 本文件(项目管理入口)
├── 00-project-plan.md   # 项目开发计划(主计划, 稳定名)
├── milestones/          # 里程碑(含里程碑草案)
├── meetings/            # 会议记录(各角色意见/评审/例会纪要)
├── decisions/           # 决策记录(ADR)
├── progress/            # 完成情况/进度跟踪
└── logs/                # 工作日志(团队工作留痕)
```

## 二、各类别用途

| 类别 | 内容 | 命名约定 |
| --- | --- | --- |
| `00-project-plan.md` | 项目开发主计划（里程碑排期/范围/依赖/风险） | 固定名 `00-project-plan.md` |
| `milestones/` | 里程碑定义与排期 | `YYYYMMDD-{keywords}.md` |
| `meetings/` | **一次会议一个文件夹**（`YYYYMMDD-HHMM-{主题}/`），内含会议纪要/各角色意见 + `000-{主题}-summary.md` 汇总 | 见下 |
| `decisions/` | ADR 架构/设计/范围决策 | `NNNN-{keywords}.md`（模板 `_0000-template.md`） |
| `progress/` | 完成情况、进度快照、验收结果 | `YYYYMMDD-HHMM-{keywords}.md` |
| `logs/` | 工作日志（非 CHANGELOG，团队工作留痕） | `YYYYMMDD-HHMM-{keywords}.md` |

## 三、命名与时间戳约定

- **临时性/随时间产生的文件**（会议/完成情况/工作日志）文件名**时间戳在关键词前**：`YYYYMMDD-HHMM-{关键词}.md`（精确到分，东八区，见根 `tech/docs-convention.md` 日期约定）。
- **稳定名文件**（主计划、ADR、模板）**不带时间戳**，用固定/递增命名，避免频繁改名。
- **时间精确到分（重要，AI 节奏快）**：所有时间记录相关处都精确到分。文件名用 `YYYYMMDD-HHMM`；文档内的变更/决策/日志等具体时刻写成 `YYYY-MM-DD HH:MM`。项目节点类日期（如"M0 通过日"）无具体时刻，保留日期不臆造。时间戳一律用系统实际时间 `date '+%Y%m%d-%H%M'` 取值，不脑内手写。
- **会议文件夹（meetings/）**：**一场会议一个文件夹**，命名 `YYYYMMDD-HHMM-{会议主题}/`；文件夹内放该场会议的文件，并以 `000-{主题}-summary.md` 作为汇总入口（一句话结论 + 文件列表），便于按会议聚焦。**新建会议**：复制 [`meetings/_meeting-template.md`](meetings/_meeting-template.md)（内含建文件夹/纪要/汇总的步骤指引）到新文件夹并填写。

## 四、与其它目录的关系

- **正式设计/角色文档** → [`docs/`](../docs/)（GDD、各角色草案/回执）。
- **项目产出资产** → [`assets/`](../assets/)、[`art/`](../art/)、[`game/`](../game/)、[`data/`](../data/)。
- **项目外/跨项目** → 工作区 [`studio/`](../../../studio/)、[`tech/`](../../../tech/)、根 [`README.md`](../../../README.md)。

## 五、空目录

空目录以 `.gitkeep` 占位。
