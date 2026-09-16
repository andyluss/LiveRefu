extends RefCounted
class_name BattleEffects
## BattleEffects —— 卡片"事件钩子"的解释器入口（doc 02 的规则层：钩子是数据，不是代码）。
##
## 支持 op 见 docs/03_数据表与校验.md 的 DSL 表；实现在 BattleEffectOps / BattleEffectOpsB，
## 目标选择在 BattleEffectTargets，持续修复在 BattleEffectHeal。


## 触发一座塔的某个事件：本卡的钩子 + 挂在它身上的修饰卡钩子（组合法则三：链式调用）。
static func run_hooks(bt: BattleState, tw: TowerUnit, event: String, ctx: Dictionary) -> void:
	if tw == null or not tw.alive:
		return
	var list: Array = (tw.card.get("hooks", {}) as Dictionary).get(event, [])
	for m in tw.modifiers:
		var mh: Dictionary = (m["def"] as Dictionary).get("hooks", {})
		list = list + (mh.get(event, []) as Array)
	if list.is_empty():
		return
	var c := ctx.duplicate()
	c["tower"] = tw
	c["card"] = tw.card
	c["pos"] = tw.pos
	for eff in list:
		run_effect(bt, eff, c)
	bt.stats["hook_triggers"] += list.size()


## 全场触发（on_wave_start / on_wave_end / on_kill_any）。
static func run_hooks_all(bt: BattleState, event: String, ctx: Dictionary = {}) -> void:
	for tw in bt.towers:
		if tw.alive:
			run_hooks(bt, tw, event, ctx)


static func run_effect(bt: BattleState, eff: Dictionary, ctx: Dictionary) -> void:
	var op := String(eff.get("op", ""))
	if op in ["energy", "pierce_bonus", "shield", "global_buff", "add_tag"]:
		BattleEffectOps.run(bt, op, eff, ctx)
		return
	BattleEffectOpsB.run(bt, op, eff, ctx)
