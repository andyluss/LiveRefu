extends RefCounted
class_name BattleDestroy
## BattleDestroy —— 场上单位的退场：塔被摧毁、阻挡单位被摧毁/到期（含 on_expire 残留减速）。

static func tower(bt: BattleState, tw: TowerUnit) -> void:
	tw.alive = false
	BattleFeedback.log(bt, "「%s」被摧毁" % tw.name)
	BattleEffects.run_hooks(bt, tw, "on_destroy", {})
	BattleFeedback.floater(bt, tw.pos, "摧毁", Color(1.0, 0.4, 0.35))


static func blocker(bt: BattleState, b: BlockerUnit) -> void:
	b.alive = false
	BattleFeedback.log(bt, "「%s」被摧毁" % b.name)
	run_blocker_hooks(bt, b, "on_destroy")
	BattleFeedback.floater(bt, b.pos, "摧毁", Color(1.0, 0.4, 0.35))


static func blocker_expired(bt: BattleState, b: BlockerUnit) -> void:
	BattleFeedback.log(bt, "「%s」到期退场" % b.name)
	run_blocker_hooks(bt, b, "on_expire")
	if b.has_residual:
		bt.fields.append(BattleWorld.field("slow", b.pos, b.residual_radius, b.residual_slow,
			"blocker_residual", bt.t + b.residual_until, 0))
		BattleFeedback.floater(bt, b.pos, "残留减速", Color(0.5, 0.8, 1.0))


static func run_blocker_hooks(bt: BattleState, b: BlockerUnit, event: String) -> void:
	var hooks: Dictionary = b.card.get("hooks", {})
	for eff in hooks.get(event, []):
		BattleEffects.run_effect(bt, eff, {"card": b.card, "pos": b.pos})
