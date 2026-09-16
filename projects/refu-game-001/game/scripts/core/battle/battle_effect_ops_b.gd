extends RefCounted
class_name BattleEffectOpsB
## BattleEffectOpsB —— 效果 op 实现（二）：修复、减速场、链式触发、共鸣、伤害场、召唤。

static func run(bt: BattleState, op: String, eff: Dictionary, ctx: Dictionary) -> void:
	var tw: TowerUnit = ctx.get("tower", null)
	match op:
		"stat_buff":
			BattleEffectBuff.apply_stat_buff(bt, eff, ctx)
		"heal":
			BattleEffectHeal.apply(bt, eff, ctx, tw, ctx.get("target_tower", tw))
		"slow_field":
			_run_slow_field(bt, eff, ctx, tw)
		"trigger":
			if tw != null:
				BattleEffects.run_hooks(bt, tw, String(eff.get("event", "")), ctx)
		"resonance":
			if tw != null:
				tw.resonance_count += int(eff.get("value", 1))
		"damage_field":
			_run_damage_field(bt, eff, ctx, tw)
		"summon":
			pass  # M2（涌潮虫群）：召唤幼虫


## 减速场：来自塔的被动常驻（until<0），或阻挡单位到期后的残留（带 duration）。
static func _run_slow_field(bt: BattleState, eff: Dictionary, ctx: Dictionary, tw: TowerUnit) -> void:
	var src_uid := tw.uid if tw != null else 0
	var pos: Vector2 = ctx.get("pos", tw.pos if tw != null else Vector2.ZERO)
	var until := -1.0
	if eff.has("duration"):
		until = bt.t + float(eff["duration"])
	bt.fields.append(BattleWorld.field("slow", pos, float(eff.get("radius", 1.5)) * bt.range_unit,
		float(eff.get("value", -0.2)), "tower" if src_uid > 0 else "blocker_residual", until, src_uid))


static func _run_damage_field(bt: BattleState, eff: Dictionary, ctx: Dictionary, tw: TowerUnit) -> void:
	var pos: Vector2 = ctx.get("pos", tw.pos if tw != null else Vector2.ZERO)
	bt.fields.append(BattleWorld.field("enemy_damage", pos,
		float(eff.get("radius", 1.5)) * bt.range_unit, float(eff.get("dps", 0.0)),
		"tower", -1.0, tw.uid if tw != null else 0))
