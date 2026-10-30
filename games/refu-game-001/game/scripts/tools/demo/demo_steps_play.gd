extends RefCounted
class_name DemoStepsPlay
## DemoStepsPlay —— 演示片的后两段：卡组编辑、峡谷哨站六波实战。
## 战斗段的字幕跟"当前波次"走（wave_captions），不按秒硬编码，改倍速/改平衡都不会错位。

static func build_play() -> Array:
	return [
		{
			"scene": "res://scenes/ui/deck_builder.tscn", "seconds": 5.5,
			"caption": "④ 卡组编辑：20 张、同名最多 2 张、至少 2 个不同标签（doc 05）",
		},
		{
			"scene": "res://scenes/battle/battle.tscn", "seconds": 999.0, "battle": true,
			"caption": "⑤ 布防期 15s：起始能量 10、+1/s（这里用自动玩家演示布防与调度）",
			"events": [
				{"at": 1.0, "caption": "⑤ 点一下手牌看完整卡面（长按同理）：卡面数值与策划卡表同源",
				 "run": func(node): node.call("_show_card_detail", "ANV-T01")},
				{"at": 4.6, "caption": "⑤ 开始布防：先铺塔 → 再挂修饰卡 → 最后补支援（齿轮帮）",
				 "run": func(node): node.call("_close_modal")},
			],
			"wave_captions": [
				"小兵×8（威胁 16）——击杀返还能量，滚起第一波雪球",
				"快速×6 + 小兵×4（26）——冲刺 2s，沼泽地带会拖慢它们",
				"装甲×4 + 小兵×6（32）——护甲 5、减伤 20%，穿透与能量伤害更有效",
				"空中×5（20）——只有模块炮塔 / 交叉火力网能对空：这是硬检查点",
				"精英×2 + 小兵×8（32）——精英免疫 50% 减速；羁绊「火力网/加固阵列」此时已生效",
				"BOSS×1 + 小兵×6（32）——2200 生命 / 35 攻击 / 护甲 15，50% 血量放阶段技",
			],
			"finish_caption": "⑤ 结算：评级三维（基地生命 40% / 能量效率 30% / 组合触发 30%）+ 挑战卡难度分加成",
		},
	]
