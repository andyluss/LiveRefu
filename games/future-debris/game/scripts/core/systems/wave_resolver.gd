extends RefCounted
class_name WaveResolver
## 波次结算：把"本回合的输出够不够"翻译成**明确后果**。
## 规则（S2 最小版）：配额打完 → 进下一波；回合耗尽而配额未清 → 漏怪，基地按缺口受伤。

const LEAK_DAMAGE_PER_QUOTA := 8   # 每欠 10 点配额扣 1 点基地生命

static func resolve(wave: Dictionary, resources: Dictionary) -> Dictionary:
	if WaveSystem.cleared(wave):
		var has_next := WaveSystem.advance(wave)
		return {"cleared": true, "leaked": false, "damage": 0, "has_next": has_next}
	if WaveSystem.turns_left(wave) <= 0:
		var shortfall := WaveSystem.remaining(wave)
		var damage := int(ceil(float(shortfall) / float(LEAK_DAMAGE_PER_QUOTA)))
		ResourceSystem.damage_base(resources, damage)
		resources["leaks"] = int(resources["leaks"]) + 1
		var has_next_after_leak := WaveSystem.advance_forced(wave)
		return {"cleared": false, "leaked": true, "damage": damage, "has_next": has_next_after_leak}
	return {"cleared": false, "leaked": false, "damage": 0, "has_next": true}
