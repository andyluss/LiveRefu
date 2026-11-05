# LiveBay · 塔模块
# 负责塔实体、建造/升级/出售；索敌/开火仍由 Sim 编排。
class_name LiveBayTowerModule
extends RefCounted

var towers: Array = []
var defs: Dictionary = {}
var balance: Dictionary = {}
var profession: Dictionary = {}
var economy: Variant


func configure(tower_defs: Dictionary, balance_data: Dictionary, profession_data: Dictionary, economy_module: Variant) -> void:
	defs = tower_defs
	balance = balance_data
	profession = profession_data
	economy = economy_module


func reset() -> void:
	towers.clear()


func at(slot_index: int) -> Variant:
	for tower: Dictionary in towers:
		if int(tower.slot) == slot_index:
			return tower
	return null


func build(slot_index: int, tower_id: String) -> LiveBayResult:
	if not defs.has(tower_id):
		return LiveBayResult.failure(&"unknown_tower", "未知塔")
	if slot_index < 0 or at(slot_index) != null:
		return LiveBayResult.failure(&"slot_occupied", "塔位不可用")
	var def: Dictionary = defs[tower_id]
	var cost := int(round(float(def.cost) * float(profession.get("tower_cost_mult", 1.0))))
	if not economy.spend(float(cost)):
		return LiveBayResult.failure(&"insufficient_energy", "供能不足")
	towers.append({
		"slot": slot_index,
		"def": def,
		"level": 1,
		"cooldown": 0.0,
		"income_timer": 0.0,
		"invested": cost,
		"disabled_timer": 0.0,
	})
	return LiveBayResult.success("已建造", {"cost": cost})


func upgrade(slot_index: int) -> LiveBayResult:
	var tower: Variant = at(slot_index)
	if tower == null:
		return LiveBayResult.failure(&"no_tower", "该塔位没有塔")
	var max_level := int(balance.get("max_tower_level", 3))
	if int(tower.level) >= max_level:
		return LiveBayResult.failure(&"max_level", "已满级")
	var cost := int(round(float(tower.def.cost) * float(balance.get("upgrade_cost_factor", 0.8)) * float(tower.level)))
	if not economy.spend(float(cost)):
		return LiveBayResult.failure(&"insufficient_energy", "供能不足")
	tower.level += 1
	tower.invested += cost
	return LiveBayResult.success("已升级", {"cost": cost})


func sell(slot_index: int) -> LiveBayResult:
	var tower: Variant = at(slot_index)
	if tower == null:
		return LiveBayResult.failure(&"no_tower", "该塔位没有塔")
	var refund := int(floor(float(tower.invested) * float(balance.get("sell_refund", 0.7))))
	economy.earn(float(refund))
	towers.erase(tower)
	return LiveBayResult.success("已出售", {"refund": refund})
