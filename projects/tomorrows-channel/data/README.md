# data · 数值与配置表

> 存放《明日频道》的**数值与配置表**（数据驱动内容），由数值策划 A 维护、程序加载。
> 权威框架见 [`docs/systems-designer-a/01_numerics-framework.md`](../docs/systems-designer-a/01_numerics-framework.md) 与[`02_numerics-workbook-template.md`](../docs/systems-designer-a/02_numerics-workbook-template.md)。

## 一、子目录

| 子目录 | 内容 |
| --- | --- |
| [`schema/`](schema/) | 表结构定义：JSON Schema / 字段说明，规定每张表的列、类型、取值范围（程序据此校验） |
| [`tables/`](tables/) | 数据本身：CSV / JSON 配置（玩家成长、经济、频道、随机、数值参数等），程序加载 |

`schema/` 与 `tables/` 分离：**schema 定"表长什么样"，tables 存"实际数值"**——改数据不动结构，改结构才动 schema。

## 二、表清单（对齐 GDD §7 / 数值策划 A 附表）

> 状态标注：**已落** = schema + 数据已交付；**【待定·M3】** = 推迟到 M3 垂直切片前冻结（数值策划 A devplan 意见 §2）。

| 表 | 结构 schema | 数据 | 说明 | 状态 |
| --- | --- | --- | --- | --- |
| 专注参数（meta） | `schema/meta.schema.json` | `tables/meta.json` | 番茄参数 + 聚焦反馈初值等全局（`pomodoro_work/pomodoro_break/focus_min/focus_max/fragment_base_per_tomato`）。M1 入口冻结 | **已落**（M1） |
| 内容卡（M1 卡池） | `schema/content_card.schema.json` + `schema/content_card_numerics.schema.json` | `tables/content_card.json` | M1 测试卡池 3 张（common/rare/cult，collect_frag=3/5/8）+ 版权四字段 `source`/`license`/`license_url`/`status`；版权用默认入池档（`original_own`），**不含 BY-SA**；图鉴稀有度配比仍【待定·M3】（见下行） | **已落 M1 卡池(测试)** |
| 频道表 | `schema/channel.schema.json` | `tables/channel.json` | 单频道 `tape_warm`（视觉 LUT/音景/皮肤 token）；schema 支持多频道、为 M2 扩展预留。频道解锁时间线（M3）不在此 | **已落**（M1） |
| 计时时段表 | `schema/timer.schema.json` | `tables/timer.json` | 番茄时段预设（专注 25 / 休息 5 + 正反馈 `signal_frag`）；由 `meta` 派生，不与其双重权威、不冲突 | **已落**（M1） |
| 混音轨表 | `schema/mixer_track.schema.json` | `tables/mixer_track.json` | M1 ≥2 轨（嗡鸣 / 磁带底噪）：id、默认音量、bus；schema 支持 3–4 轨 | **已落**（M1） |
| 图鉴稀有度/保底 | `schema/probability_rarity.schema.json` | `tables/probability_rarity.json` | 稀有度配比（70/25/5）/保底 | 【待定·M3】 |
| 完整解锁/碎片曲线 | `schema/economy_fragments.schema.json` | `tables/economy_fragments.json` | 碎片递减倍率/档位、收藏、消耗 | 【待定·M3】 |

## 三、约定

- 与主程序约定（[`game/`](../game/README.md)）：数据驱动、字段 `snake_case`、禁止魔法数、带单位与上限说明。
- 变更走"调参闭环"（数值策划 A `02_` 文档）：登记意图 → 改表 → 验算 → 冻结。
- 数据来源需满足内容合规闸门（若含版权内容，见 GDD §内容版权）。

## 四、占位

`schema/`、`tables/` 空时以 `.gitkeep` 占位。
