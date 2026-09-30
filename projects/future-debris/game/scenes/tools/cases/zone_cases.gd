extends RefCounted
class_name ZoneCases
## E4 组：降级区**持续伤害基地**——它是本作真正的"倒计时"。
## 只有削塔惩罚时，玩家永远可以拖；有了持续伤害，残渣才成为"必须处理"的问题。

static func zone_damages_base() -> Dictionary:
	var battle := CaseBase.new_battle()
	if ZoneSystem.damage_per_turn(0) != 0:
		return CaseBase.bad("无降级区时不应扣血")
	# 期望值由公式推导，而不是写死数字——否则调参时测试会假失败（而不是真的发现问题）
	var units := 4
	var expected := ZoneSystem.damage_per_turn(units)
	if expected != int(ceil(float(units) / float(ZoneSystem.UNITS_PER_DAMAGE))):
		return CaseBase.bad("伤害公式不符：%d 单位 → %d" % [units, expected])
	if expected <= 0:
		return CaseBase.bad("%d 个降级区单位应造成至少 1 点伤害" % units)
	var before := int(battle.resources["base_hp"])
	ResidueSystem.add(battle.residue, 0, ResidueSystem.ZONE_PER_RESIDUE * units)
	var dealt := ZoneSystem.apply(battle)
	if dealt != expected or int(battle.resources["base_hp"]) != before - expected:
		return CaseBase.bad("降级区伤害未生效：dealt=%d hp=%d" % [dealt, battle.resources["base_hp"]])
	if not battle.events.is_empty() and not str(battle.events[-1]).begins_with("降级区扩张"):
		return CaseBase.bad("降级区伤害应有事件记录")
	return CaseBase.ok()
