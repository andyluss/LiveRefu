extends RefCounted
class_name RunCases
## H 组：完整一局的可复跑性与确定性。
## **这是"数值改动可被 diff"的前提**：不能复跑，就无法判断一次改动是好是坏。

static func determinism() -> Dictionary:
	var first := CaseBase.new_battle().run_to_end()
	var second := CaseBase.new_battle().run_to_end()
	for key in ["turns", "base_hp", "leaks", "residue_total", "zone", "cards_played", "score", "grade"]:
		if str(first[key]) != str(second[key]):
			return CaseBase.bad("同卡组两次运行结果应一致，但 %s 不同：%s vs %s" % [key, first[key], second[key]])
	if int(first["cards_played"]) <= 0:
		return CaseBase.bad("一局里应至少出了牌，实际 %d" % first["cards_played"])
	print("      基准一局：%d 回合 / 基地 %d/%d / 漏怪 %d / 残渣 %d / 降级区 %d / 出牌 %d / %s(%.3f)" % [
		first["turns"], first["base_hp"], first["base_hp_max"], first["leaks"],
		first["residue_total"], first["zone"], first["cards_played"], first["grade"], first["score"],
	])
	return CaseBase.ok()

## 局面必须在有限步内收敛：**要么打完所有波，要么基地被打爆，不得无限循环**。
##
## 为什么这里**不**断言"必须赢"：胜负是**数值标定**问题，不是不变量。
## 把它写成断言会产生两种坏结果——要么为了变绿而偷偷调数（掩盖问题），
## 要么让闸门长期为红（变成噪声，人被训练成忽略它）。
## 胜负因此**降级为报告值**（见下方 print），真正的门槛是"能终止、且在回合上限内"。
## 立场：**闸门守不变量，报告露事实**。
static func run_terminates() -> Dictionary:
	var battle := CaseBase.new_battle()
	var summary := battle.run_to_end()
	if int(summary["turns"]) > int(summary["max_turns"]):
		return CaseBase.bad("回合数超出上限：%d > %d" % [summary["turns"], summary["max_turns"]])
	if int(summary["turns"]) <= 0:
		return CaseBase.bad("一局应至少经历一个回合")
	print("      基准局结算：基地 %d/%d / 漏怪 %d / 清完 %d 波 / 残渣 %d｜胜负属待标定项，见 docs/07" % [
		summary["base_hp"], summary["base_hp_max"], summary["leaks"],
		summary["waves_cleared"], summary["residue_total"],
	])
	return CaseBase.ok()

## **清完最后一波必须立即结束**，不得空转到回合上限。
## 实测 bug：这一条没守时，一局在第 12 回合就清完 7 波却跑到第 40 回合，
## 评分被系统性低估（S → A），而且**没有任何报错**。
static func finishes_on_clear() -> Dictionary:
	var battle := CaseBase.new_battle()
	while battle.is_active() and battle.turn < battle.max_turns:
		battle.tick()
	if int(battle.resources["base_hp"]) <= 0:
		return CaseBase.ok()   # 打爆的局不适用（另一种终局）
	if not battle.finished:
		return CaseBase.bad("清完最后一波后应标记 finished，实际未标记（跑了 %d 回合）" % battle.turn)
	if WaveSystem.index(battle.wave) != WaveSystem.wave_count(battle.wave) - 1:
		return CaseBase.bad("结束时应在最后一波，实际 index=%d" % WaveSystem.index(battle.wave))
	if battle.turn >= battle.max_turns:
		return CaseBase.bad("通关不应耗满回合上限（%d）" % battle.max_turns)
	return CaseBase.ok()
