# LiveBay · 任务模块
# 只负责阶段、保障度、评级、结算；不生成敌人、不画 UI。
class_name LiveBayMissionModule
extends RefCounted

enum State { PREP, WAVE, BETWEEN, WON, LOST }

var state: int = State.PREP
var integrity := 0.0
var max_integrity := 100.0
var result: Dictionary = {}


func reset(profession: Dictionary, balance: Dictionary) -> void:
	state = State.PREP
	max_integrity = float(profession.get("start_integrity", balance.get("starting_integrity", 100.0)))
	integrity = max_integrity
	result = {}


func state_name() -> String:
	match state:
		State.PREP:
			return "准备"
		State.WAVE:
			return "交战中"
		State.BETWEEN:
			return "波间整备"
		State.WON:
			return "本班结束"
		State.LOST:
			return "事故"
	return "?"


func damage(amount: float) -> void:
	integrity = maxf(0.0, integrity - amount)


func repair(amount: float) -> void:
	integrity = minf(max_integrity, integrity + amount)


func finish(won: bool, stats: Dictionary, total_waves: int, balance: Dictionary) -> Dictionary:
	state = State.WON if won else State.LOST
	result = {
		"won": won,
		"grade": _grade(won, balance),
		"integrity": integrity,
		"max_integrity": max_integrity,
		"kills": stats.kills,
		"leaked": stats.leaked,
		"built": stats.built,
		"spent": stats.spent,
		"waves_cleared": stats.waves_cleared,
		"total_waves": total_waves,
	}
	return result


func _grade(won: bool, balance: Dictionary) -> String:
	if not won:
		return "F"
	if integrity >= max_integrity * float(balance.get("grade_s_ratio", 0.9)):
		return "S"
	if integrity >= max_integrity * float(balance.get("grade_a_ratio", 0.7)):
		return "A"
	if integrity >= max_integrity * float(balance.get("grade_b_ratio", 0.4)):
		return "B"
	return "C"
