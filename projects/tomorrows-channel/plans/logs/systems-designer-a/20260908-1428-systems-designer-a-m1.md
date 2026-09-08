# 工作日志：数值策划 A · M1 阶段（2026-09-08）

> 日期：2026-09-08（东八区）· 记录角色：数值策划 A
> 文件：`logs/systems-designer-a/` · 时段：M1 数值表 + 卡池

## 一、本时段工作

| 时间 | 做了什么 | 产出/落点 | 提交 |
| --- | --- | --- | --- |
| 13:xx | 冻结 meta 表（番茄 25+5/5–120/碎片初值）+ 内容卡数值字段契约 | `data/schema/meta.schema.json`、`content_card_numerics.schema.json`、`data/tables/meta.json` | `ec605a3` |
| 14:xx | 补全 M1 表（channel/timer/mixer_track + 内容卡契约） | `data/schema|tables/...` | `9b85117` |
| 14:xx | 卡池数据（3 张测试卡） | `data/tables/content_card.json` | `cbe1927` |
| 14:xx | reconcile 版权字段结构为嵌套 copyright 对象 | `data/schema/content_card.schema.json` | `900f8b3` |

## 二、遇到的主要问题

- **版权字段口径分歧**：数值侧契约用顶层 source/license/license_url/status，主策划 taxonomy 用嵌套 copyright 对象（含署名/复核留痕）。已 reconcile 定为嵌套 copyright（issues technical-001 已解决）。
- **schema/数据分离**：data/schema 定表结构、data/tables 存数据；先定 meta 表（唯一无依赖、可立即冻结）。内容卡版权字段为程序强制，数值侧只提供 rarity/collect_frag 数值位。

## 三、心得 / 经验

- **M1 数值 = 参数非曲线**：先让番茄 25+5、1 次正反馈、收藏 1 卡跑得通；完整解锁/碎片曲线推迟 M3——避免在未验证手感前锁死经济。
- **"无惩罚"纪律落地**：碎片递减带保底 1、无扣减、今日信号不计碎片，从数值设计上防"断签焦虑"。合规用 status 状态机（approved 才入池）+ CI 闸门。
- **数值位与版权位分离**：内容卡的 rarity/collect_frag（数值位）与 copyright 块（合规位）解耦——数值侧不触碰版权结构，责任清晰。
- **token 引用一致性**：channel 表引用的 LUT/容器 token 与主美术基线完全一致，避免虚构。

## 四、关键决策 / 变更

- meta 表 5 参数冻结；内容卡数值契约 rarity(common/rare/cult)+collect_frag(3/5/8)；版权字段嵌套 copyright。

## 五、遗留 / 待办

- 【待定】图鉴稀有度配比（70/25/5）、完整解锁/碎片曲线（M3）。
- 【待定】content-pool schema 冻结时版权字段引用（主程序）。
- 【待定】rarity 与 collect_frag 一致性校验。

## 六、变更记录

- 2026-09-08：新增本工作日志。
