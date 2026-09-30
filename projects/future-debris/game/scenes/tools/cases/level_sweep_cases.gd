extends RefCounted
class_name LevelSweepCases
## K 组：**逐关扫描**。断言的是不变量，不是难度——
## 每一关都必须：能终止、能在回合上限内给出一个确定的终局、波数等于关卡声明。
##
## 为什么值得单独一条用例：S3 的三个 bug（凭空多出一波 / 清完不结束 / 配额没生效）
## **都只在"换一关"时才暴露**，用固定关卡的用例守不住。
## 难度（S/A/B）属标定问题，**作为报告值打印**，不写成断言（见 D14）。

static func all_levels_sane() -> Dictionary:
	var probe := CaseBase.new_battle()
	var level_ids := probe.catalog.levels.keys()
	level_ids.sort()
	if level_ids.size() < 8:
		return CaseBase.bad("关卡表应至少有 8 关，实际 %d" % level_ids.size())
	var lines: Array[String] = []
	for level_id in level_ids:
		var battle := Battle.new()
		battle.level_id = level_id
		battle.player = AutoPlayer.new(true)
		if not battle.setup(CaseBase.DECK.split(","), 20, 60):
			return CaseBase.bad("关卡 %s 初始化失败：%s" % [level_id, str(battle.events)])
		var expected_waves := WaveSystem.wave_count(battle.wave)
		if expected_waves != battle.level.waves:
			return CaseBase.bad("关卡 %s 波数 %d 与声明 %d 不一致" % [level_id, expected_waves, battle.level.waves])
		var summary := battle.run_to_end()
		if int(summary["turns"]) > int(summary["max_turns"]):
			return CaseBase.bad("关卡 %s 超出回合上限" % level_id)
		if int(summary["turns"]) <= 0:
			return CaseBase.bad("关卡 %s 未产生任何回合" % level_id)
		# 终局必须是二者之一：通关（finished）或基地被打爆
		var cleared := battle.finished
		var wiped := int(summary["base_hp"]) <= 0
		if not cleared and not wiped:
			return CaseBase.bad("关卡 %s 既未通关也未打爆（跑了 %d 回合）——终局条件有漏" % [
				level_id, int(summary["turns"])])
		if cleared and WaveSystem.index(battle.wave) != expected_waves - 1:
			return CaseBase.bad("关卡 %s 通关却不在最后一波（index=%d）" % [level_id, WaveSystem.index(battle.wave)])
		lines.append("%s %s 剩血%d 回合%d %s" % [
			level_id, "通关" if cleared else "打爆", int(summary["base_hp"]),
			int(summary["turns"]), str(summary["grade"]),
		])
	for line in lines:
		print("      " + line)
	return CaseBase.ok()
