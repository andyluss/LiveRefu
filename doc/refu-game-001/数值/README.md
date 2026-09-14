# 数值初稿（每卡一表 · 正式落地目录）

> 卡面：用途＝把 [11_数值框架表](../11_数值框架表.md) 的字段落成真值 ｜ 依赖：[11](../11_数值框架表.md)、[14](../14_卡表_铁砧联邦核心12卡.md)、[15](../15_卡表_涌潮虫群核心12卡.md)、[16](../16_卡表_星辉议会核心12卡.md) ｜ 状态：v1.0-draft · 2026-09-14

## 一、本目录文件

| 文件 | 内容 |
| --- | --- |
| [01_铁砧联邦_12卡.md](01_铁砧联邦_12卡.md) | 主族一：12 张核心卡，每卡一表 |
| [02_涌潮虫群_12卡.md](02_涌潮虫群_12卡.md) | 主族二：12 张核心卡（含进化枝变体） |
| [03_星辉议会_12卡.md](03_星辉议会_12卡.md) | 主族三：12 张核心卡（含共鸣规则参数） |
| [04_敌人数值与波次威胁值.md](04_敌人数值与波次威胁值.md) | 敌方原型、威胁值表、B 预算口径 |
| [05_能量与关卡预算曲线.md](05_能量与关卡预算曲线.md) | 能量曲线、战力 P、难度比 D、奖励系数定稿 |
| [体检报告.md](体检报告.md) | **自动生成**的数值体检报告（九项校验汇总；改动数值后重跑刷新） |

## 二、每卡一表规则（同 [11](../11_数值框架表.md)）

- 一张卡＝一张表＝一个独立数值块；卡与卡之间只通过标签与钩子交互；
- 每表固定字段：类型/费用/槽位、标签、核心数值、钩子、版本/状态；
- 改一张卡只动本表，版本号 +0.0.1，并在根 `CHANGELOG` 记一行。

## 三、数值改动后必跑清单

改动本目录任何首值后，**依次跑完九项校验（全部 PASS 才算完成），并刷新体检报告**：

```bash
S=tools/sim_refu_game_001.ts
node --experimental-strip-types $S --selftest                     # 1 模型自检（种子/单调性/解析一致）
node --experimental-strip-types $S --verify-bands --n 20000       # 2 主线五章带位
node --experimental-strip-types $S --verify-rogue --n 20000       # 3 远征 8 节点带位
node --experimental-strip-types $S --verify-faction               # 4 族专属挑战卡（平均+纯流派双口径）
node --experimental-strip-types $S --verify-seed                  # 5 每日种子与排行榜用例
node --experimental-strip-types $S --verify-anti-air              # 6 三族对空覆盖
node --experimental-strip-types $S --verify-air-matrix            # 7 空袭 × 三族 9 宫格公平性
node --experimental-strip-types $S --verify-air-mix               # 8 纯空军/混编/纯地面 三形态
node --experimental-strip-types $S --verify-pmod                  # 9 永久修饰卡 PMOD 双口径
node --experimental-strip-types $S --report --out doc/refu-game-001/数值/体检报告.md   # 刷新报告
```

- 第 1/4/5/6/7/8/9 项已接入 **pre-commit**（暂存涉及本卷或模拟脚本时自动触发）与 **CI**；
- 第 2/3 项在 CI 中跑全量（n=20000），本地钩子跑 n=5000 的快速版；
- `--report` 生成 [`体检报告.md`](体检报告.md)（九项汇总，随数值刷新）；
- 任一项 FAIL：先查 [21](../21_模拟验算表_章节胜率矩阵.md) 的模型参数（λ0/γ/cap）与本节第 1 条的目标带，再改首值——**不要反向改断言**。

## 四、冻结流程（v1.0 条件）

1. 模拟验算：常规关 D∈[0.9, 1.1] 目标胜率 55–75%；挑战关 D∈[1.25, 1.45] 目标胜率 25–50%；
2. 三族 36 卡互不依赖、逐张 remove-safe；
3. **九项校验全 PASS + 体检报告刷新**（见第三节）→ 状态由 `v1.0-draft` 升为 `v1.0`（冻结）；
4. 冻结后数值变更须走版本号与 CHANGELOG，不再直接改本目录首值。
