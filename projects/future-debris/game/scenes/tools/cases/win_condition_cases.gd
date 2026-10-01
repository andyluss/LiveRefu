extends RefCounted
class_name WinConditionCases
## L8 组：**胜利条件**（`clear` / `survive`）的语义。
##
## 为什么单独一组：守成条件是把"机制差异"变成"玩法差异"的关键，
## 而它的两条语义（波次走完、基地还活着）都曾经写错过——
## 第一版只判"波次走完"，于是"守到 0 血"也被算成通关。

## `survive` 条件的两条语义：**守住 = 波次走完且基地还活着**。
## 第一版只判"波次走完"，于是"守到 0 血"也被算成通关——
## 那等于把"防线失守"记成胜利（这类错误不会报错，只会让难度看起来更松）。
static func survive_requires_alive_base() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.win_condition = WinCondition.SURVIVE
	var outcome := {"cleared": false, "leaked": true}
	# **必须把波次推到末波**：守成的判据是"波次走完"，而不是"任何时刻都算守住"
	while not WaveSystem.is_last_wave(battle.wave):
		if not WaveSystem.advance_forced(battle.wave):
			break
	if not WaveSystem.is_last_wave(battle.wave):
		return CaseBase.bad("测试未能把波次推到末波（关卡波数异常）")
	# 基地还有很多血 → 守住
	ResourceSystem.damage_base(battle.resources, 1)
	if not WaveCondition.holds(battle, outcome):
		return CaseBase.bad("基地还活着时，波次走完应算守住")
	# 基地被打爆 → 不算守住，哪怕波次走完
	ResourceSystem.damage_base(battle.resources, 99)
	if WaveCondition.holds(battle, outcome):
		return CaseBase.bad("基地被打爆时不应算守住")
	return CaseBase.ok()

## `clear` 条件不该被 `survive` 的逻辑影响（两个条件必须互不串味）。
static func clear_ignores_survive_path() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.win_condition = WinCondition.CLEAR
	var outcome := {"cleared": false, "leaked": true}
	if WaveCondition.holds(battle, outcome):
		return CaseBase.bad("clear 条件下不应走守成的判定")
	return CaseBase.ok()

## 未知的胜利条件必须**显式回落**到 clear，而不是"读不到就当胜利"。
static func unknown_condition_falls_back() -> Dictionary:
	if WinCondition.normalize("survive") != WinCondition.SURVIVE:
		return CaseBase.bad("survive 应被识别")
	if WinCondition.normalize("") != WinCondition.CLEAR or WinCondition.normalize("bogus") != WinCondition.CLEAR:
		return CaseBase.bad("未知条件必须回落到 clear")
	return CaseBase.ok()
