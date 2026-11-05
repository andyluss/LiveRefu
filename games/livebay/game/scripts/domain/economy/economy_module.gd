# LiveBay · 经济模块
# 只负责供能余额与收支；不认识塔/敌人，也不发信号。
class_name LiveBayEconomyModule
extends RefCounted

var energy := 0.0


func reset(starting_energy: float) -> void:
	energy = starting_energy


func can_afford(cost: float) -> bool:
	return energy >= cost


func spend(cost: float) -> bool:
	if not can_afford(cost):
		return false
	energy -= cost
	return true


func earn(amount: float) -> void:
	energy += maxf(0.0, amount)
