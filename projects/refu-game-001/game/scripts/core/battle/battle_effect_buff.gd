extends RefCounted
class_name BattleEffectBuff
## BattleEffectBuff —— 百分比增益的落地：叠层型写 hook_stacks，其余作为限时/永久 buff。
## 口径：final = base × (1 + Σ百分比)，所以 hook_stacks 里存的是"累计百分比"。

## 百分比增益：叠层型（有 cap/max_stacks）写进 hook_stacks，其余作为限时/永久 buff。
## 口径：final = base × (1 + Σ百分比)，所以在 hook_stacks 里存的是"累计百分比"。
static func apply_stat_buff(bt: BattleState, eff: Dictionary, ctx: Dictionary) -> void:
	var stat := String(eff.get("stat", ""))
	var value := float(eff.get("value", 0.0))
	var duration := float(eff.get("duration", 0.0))
	var until := -1.0 if duration <= 0.0 else bt.t + duration
	var tw: TowerUnit = ctx.get("tower", null)
	var max_stacks := int(eff.get("max_stacks", 0))
	var cap := float(eff.get("cap", 0.0))
	for tgt in BattleEffectTargets.resolve(bt, eff, ctx, tw, ctx.get("target_tower", tw)):
		if max_stacks > 0 or cap > 0.0:
			# 叠层型（如 ANV-T02 on_hit：每次命中 +2% 攻速，上限 +10%）
			var limit := cap if cap > 0.0 else value * float(max_stacks)
			var cur := float(tgt.hook_stacks.get(stat, 0.0))
			var next := minf(limit, cur + value)
			if next > cur:
				tgt.hook_stacks[stat] = next
		else:
			tgt.add_buff(stat, value, until, ctx.get("card", {}).get("id", ""))
