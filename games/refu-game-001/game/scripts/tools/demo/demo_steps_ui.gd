extends RefCounted
class_name DemoStepsUi
## DemoStepsUi —— 演示片的前三段：主菜单、卡牌图鉴、关卡与挑战卡。
## 每段 = {scene, seconds, caption, events:[{at, caption, run}]}；run 里可以直接操作界面节点。

static func build_ui() -> Array:
	return [
		{
			"scene": "res://scenes/ui/main_menu.tscn", "seconds": 4.5,
			"caption": "① 主菜单 — 卡片式塔防《节点防线》：铁砧联邦垂直切片（Godot 4.7 竖屏）",
		},
		{
			"scene": "res://scenes/ui/codex.tscn", "seconds": 5.0,
			"caption": "② 卡牌图鉴：直接复用美术出图卡面，图与数值同源（改卡表即改图）",
			"events": [
				{"at": 2.6, "caption": "② 图鉴也含敌方 6 原型（生命/攻击/攻速/移速/护甲/威胁值）与 6 张地图卡",
				 "run": func(node): pass},
			],
		},
		{
			"scene": "res://scenes/ui/level_select.tscn", "seconds": 6.5,
			"caption": "③ 关卡 = 地图卡 + 波次卡组 + 事件卡组 + 规则卡（doc 06）；教学关不开放挑战卡",
			"on_ready": func(node):
				# 先把 L1-2（开放挑战卡）选上，再挂两张挑战卡
				AppState.level_id = "L1-2"
				AppState.challenge_ids.clear()
				node.set("_selected_level", "L1-2")
				node.call("_refresh"),
			"events": [
				{"at": 1.6, "caption": "③ 挑战卡：难度也是卡——「加压」敌人生命 +30%，掉落 +15%",
				 "run": func(node):
					AppState.challenge_ids = ["CHL-01"]
					node.call("_refresh")},
				{"at": 3.2, "caption": "③ 再挂「疾行」移速 +25%、击杀返还 +50%；难度分合计 5 → 掉落 ×1.25",
				 "run": func(node):
					AppState.challenge_ids = ["CHL-01", "CHL-05"]
					node.call("_refresh")},
				{"at": 5.4, "caption": "③ 双流需要双入口地图：单入口的峡谷哨站会被白名单直接拦住",
				 "run": func(node): pass},
			],
		},
	]
