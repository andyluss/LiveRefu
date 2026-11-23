# demo.harbor · 港湾值班室

M0 垂直切片：一个区域、一个 NPC、一扇需要钥匙卡的气闸、一个任务、一段对话。

## 跑一遍

```bash
cd games/world/code
./run.sh run -q -p world-cli -- demo
```

预期事件序列（节选）：

- tick 9：无钥匙卡交互 → toast「气闸锁着。需要钥匙卡。」
- tick 19：拾取钥匙卡 → `item_acquired`
- tick 29：有钥匙卡交互 → `door_opened` / `sound` / `flag_changed` / `airlock.opened`
- tick 39：和值班员说话 → `quest_completed` / `dialogue_started`

600 tick 最终哈希：`0x9c4032a29d99274d`。

内容测试：`./worldc content-test`（`first_shift` / `airlock_locked_without_key` / `pickup_keycard`）。

## 目录

| 路径 | 内容 |
| --- | --- |
| `pack.json` | 清单：ID、版本、kits、entry、tick_hz |
| `world/harbor.world.json` | 世界根：起始区域、时间、种子、玩家 |
| `world/zones/harbor.zone.json` | 区域边界与 3 个 placement |
| `world/actors/keeper.actor.json` | NPC：属性、日程、对话 |
| `world/props/airlock.prop.json` | 气闸：交互、锁（钥匙卡） |
| `world/items/*.json` | 钥匙卡、咖啡、对讲机 |
| `rules/airlock.rule.json` | 有钥匙卡 → 开门；否则 toast |
| `quests/first_shift.quest.json` | 「第一班」：说话 + 开门 |
| `dialogue/keeper.dlg.json` | 三段对话 |
| `schedules/keeper.schedule.json` | 工作 / 闲逛 / 睡觉 |
| `loc/zh-CN.json` | 文案 key → 中文 |
| `tests/m0.trace.json` | 600 tick 输入轨迹 |
| `tests/first_shift.test.json` | 内容测试：说话 + 开门 + 任务完成 |
| `tests/airlock_locked.test.json` | 内容测试：无钥匙卡时门不开 |
| `tests/pickup_keycard.test.json` | 内容测试：拾取后背包有钥匙卡 |
