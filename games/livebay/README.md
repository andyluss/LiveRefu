# LiveBay（逍遥湾）

> **一句话**：在一座月牙形的移动太空城里，你换过很多份工作，守过很多次夜班。
> **形态**：NASA 朋克 · 岗位塔防 + 沉浸体验 + 放置养成｜**当前**：v0.1 可玩垂直切片（1 职业 / 1 图 / 5 波）
> **引擎**：Godot 4.7（GL Compatibility）｜**平台**：PC 优先（待裁决）

![v0.1 战斗画面](docs-ai/design01/shots/v0.1_combat.png)

## 目录

| 路径 | 是什么 | 谁维护 |
| --- | --- | --- |
| [`docs-human/`](docs-human/) | **人类原始设定**（项目宪法）；AI 只读，不改写 | 人类 |
| [`docs-ai/`](docs-ai/) | AI 生成的概念与策划参考；含 [design01 策划文档集](docs-ai/design01/README.md) | AI 起草，人类裁决 |
| [`game/`](game/) | Godot 工程与可运行切片 | 工程 |
| [`run.sh`](run.sh) | 统一入口（运行 / 编辑器 / 测试 / 检查） | 工程 |

## 快速开始

```bash
./run.sh          # 启动游戏
./run.sh editor   # 打开 Godot 编辑器
./run.sh test     # 无头模拟测试（24 项断言）
./run.sh check    # 无头启动 180 帧，抓脚本错误
./run.sh import   # 首次导入资源
```

首次运行前如未导入资源，先执行 `./run.sh import`。`HOME` 会自动指向工作区的 `games/.godot-home/`，不写用户目录。

## 当前能玩什么

- 1 张月牙外弧地图（外环第七段），7 个固定塔位；
- 1 个示例职业：护湾卫兵；
- 3 种塔：拦截炮（单体）、脉冲环（范围 + 减速）、补给塔（经济 + 维修）；
- 3 种敌人：碎片、乱流、重壳；
- 5 波敌人，准备 / 交战 / 波间整备 / 胜负结算；
- 建造、升级、出售、暂停、1x/2x、最高记录存档；
- 无头测试可复现胜利与失败路径。

**操作**：鼠标点击塔位建造；点已有塔选中（U 升级 / X 出售）；`1/2/3` 选塔；空格开波；`P` 暂停；`Tab` 加速；`R` 重开。

## 文档入口

| 你想 | 去哪 |
| --- | --- |
| 看人类原始设定 | [`docs-human/概念设定.md`](docs-human/概念设定.md) |
| 看策划文档集总览 | [`docs-ai/design01/README.md`](docs-ai/design01/README.md) |
| 看还需要你拍板什么 | [`docs-ai/design01/11_待人类裁决清单.md`](docs-ai/design01/11_待人类裁决清单.md) |
| 看 NASA 朋克美学 | [`docs/retro-futurism/附录_Nasa朋克卷/`](../../docs/retro-futurism/附录_Nasa朋克卷/README.md) |
| 看工程结构 | [`docs-ai/design01/12_技术方案_Godot工程.md`](docs-ai/design01/12_技术方案_Godot工程.md) |
| 看改了什么 | [`CHANGELOG.md`](CHANGELOG.md) |

## 设计状态

当前工程里的**所有中文名词与数值都是【工程占位】**，不是设定定案。人类改主意时，优先改 `game/data/*.json`，不需要重写代码。

最需要先回答的五个问题（详见 [待裁决清单](docs-ai/design01/11_待人类裁决清单.md)）：

1. **D01 基调**：逍遥湾是善意的、有裂缝的，还是温柔的牢笼？
2. **D02 敌人**：外部碎片、内部故障，还是两者混合？
3. **D03 三生**：「慢好三生」的「三生」指什么？
4. **D05 第一职业**：先做护卫兵、护理师，还是别的职业？
5. **D16 范围**：先做 10 分钟切片，还是奔完整游戏？

## 边界

- 本项目的**人类意图**只在 [`docs-human/`](docs-human/)；AI 生成的策划文档在 [`docs-ai/`](docs-ai/)，标记为「参考，非决定」。
- `docs-ai/` 里的候选不自动成为设定；未裁决前，工程只做可逆占位。
- 工程性文档（本 README、[`CHANGELOG.md`](CHANGELOG.md)、代码注释）不放在 `docs-ai/`。

## 素材与许可

- 当前画面全部由 Godot 程序化绘制，无外部美术资源；
- 字体使用系统字体回退（PingFang / Noto Sans CJK / 微软雅黑）；
- 音效与音乐尚未接入。
