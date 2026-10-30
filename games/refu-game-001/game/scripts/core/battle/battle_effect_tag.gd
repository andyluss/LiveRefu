extends RefCounted
class_name BattleEffectTag
## BattleEffectTag —— 附加标签（ANV-X03 模块换装）：可带 choose_from，由界面选择。

static func run_add_tag(bt: BattleState, eff: Dictionary, ctx: Dictionary, tw: TowerUnit) -> void:
	if tw == null:
		return
	var tag := String(eff.get("tag", ""))
	var choices: Array = eff.get("choose_from", [])
	if not choices.is_empty():
		var chosen := String(ctx.get("choice", ""))
		tag = chosen if choices.has(chosen) else String(choices[0])
	if tw.tags.has(tag):
		return
	tw.tags.append(tag)
	BattleFeedback.floater(bt, tw.pos, "+标签 %s" % tag, Color(1.0, 0.82, 0.45))
