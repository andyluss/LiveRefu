# decisions · 决策记录（ADR）

> 存放《明日频道》的**架构 / 设计 / 范围**决策，采用轻量 **ADR（Architecture Decision Record）** 方式记录：一个决策一份文档，可追溯"当时为什么这么定"，避免事后无法还原。
> 重大项目决策应记录于此，而非只留在聊天或评审纪要里。

## 一、何时记

出现以下任一情况即应新增 ADR：

- 影响跨角色的技术 / 架构选择（引擎、模块边界、数据流）；
- 需要多方确认的设计取舍（体验方向、数值边界、内容口径）；
- 有多个候选方案且最终拍板（记录候选 + 选哪个 + 为什么）；
- 推翻某个既有决策（新增一条"推翻/修订"ADR，不删旧条）。

## 二、命名约定

- 文件名：`NNNN-主题.md`，`NNNN` 为从 0001 递增的编号（不重复、不回填），主题用 kebab-case 短词。
- 示例：`0001-godot-engine-selection.md`、`0002-punish-free-numerics.md`。
- 每条 ADR 状态：`已定（accepted）/ 已否决（rejected）/ 已废弃（superseded by NNNN）`。

## 三、模板

新决策用 [`_0000-template.md`](_0000-template.md) 复制为 `NNNN-主题.md` 后填写。

## 四、与其它文档的关系

- ADR 记录**决策与理由**；具体交付看 [`docs/`](../../docs/) 下的角色文档与 GDD。
- 汇总的项目日志见 [`CHANGELOG.md`](../../CHANGELOG.md)。
