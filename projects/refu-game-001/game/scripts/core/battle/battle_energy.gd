extends RefCounted
class_name BattleEnergy
## BattleEnergy —— 局内能量：自然增长（规则卡 × 挑战卡倍率）与获得（击杀/波间/钩子）。

static func regen(bt: BattleState, dt: float) -> void:
	var rate := float(bt.rule.get("energy_rate", 1.0)) * float(bt.intern.mods["energy_rate_mul"])
	gain(bt, rate * dt)


## 获得能量（受规则卡上限限制）；超出上限的部分不计入"累计获得"。
static func gain(bt: BattleState, amount: float) -> void:
	var cap := float(bt.rule.get("energy_cap", 99))
	var before := bt.energy
	bt.energy = minf(cap, bt.energy + amount)
	bt.stats["energy_gained"] += bt.energy - before


static func spend(bt: BattleState, card: Dictionary) -> void:
	var cost := float(card.get("cost", 0))
	bt.energy = maxf(0.0, bt.energy - cost)
	bt.stats["energy_spent"] += cost
