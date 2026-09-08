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

| 表 | 位置 | 说明 |
| --- | --- | --- |
| 成长表 | `tables/progression.csv` | 等级/所需经验/解锁 |
| 经济表 | `tables/economy.csv` | 资源产出/消耗 |
| 频道表 | `tables/channels.csv` | 频道解锁/音景/皮肤 |
| 随机表 | `tables/probability.csv` | 图鉴稀有度/保底 |
| 专注参数 | `tables/meta.json` | 番茄/碎片初值等全局 |

## 三、约定

- 与主程序约定（[`game/`](../game/README.md)）：数据驱动、字段 `snake_case`、禁止魔法数、带单位与上限说明。
- 变更走"调参闭环"（数值策划 A `02_` 文档）：登记意图 → 改表 → 验算 → 冻结。
- 数据来源需满足内容合规闸门（若含版权内容，见 GDD §内容版权）。

## 四、占位

`schema/`、`tables/` 空时以 `.gitkeep` 占位。
