extends RefCounted
class_name SimSuitesB
## SimSuitesB —— 无头验收用例集（后半）：挑战卡、对空、白名单、能量经济。


static func challenges(report: SimReport, deck: Array) -> void:
	report.section("场景四：挑战卡只改环境参数")
	var r4 := SimDriver.run(deck, ["CHL-01", "CHL-05"], 20260914, true)
	report.check("加压+疾行后难度分 = 5、掉落系数 = 1.25",
		int(r4["challenge_score"]) == 5 and absf(float(r4["drop"]) - 1.25) < 0.001,
		"score=%d drop=%.2f" % [r4["challenge_score"], r4["drop"]])
	report.check("加压后敌人生命确实 ×1.3（首波小兵 78）",
		absf(float(r4["first_grunt_hp"]) - 78.0) < 0.01, "hp=%.1f" % r4["first_grunt_hp"])
	var r4b := SimDriver.run(deck, ["CHL-03"], 20260914, true)
	report.check("封锁：技能卡不可施放", bool(r4b["skill_blocked"]),
		"reason=%s" % r4b["skill_block_reason"])


static func air(report: SimReport) -> void:
	report.section("场景五：对空规则（第 4 波纯空中，ANV-T03 不能对空）")
	var r5 := SimAirTest.run()
	report.check("不可对空的塔（ANV-T03）选不到空中单位", int(r5["air_only_hits"]) == 0,
		"选中=%d" % r5["air_only_hits"])
	report.check("可对空的塔（ANV-T01）能选中空中单位", int(r5["aa_hits"]) == 1,
		"选中=%d" % r5["aa_hits"])
	report.check("地面单位出现后 ANV-T03 正常选靶", int(r5["t03_vs_ground"]) == 1,
		"选中=%d" % r5["t03_vs_ground"])


static func whitelist(report: SimReport) -> void:
	report.section("场景六：白名单（单入口图不可挂「双流」）")
	var allow := AppState.challenge_allowed("CHL-04", "L1-2")
	report.check("MAP-ANV-01 上 CHL-04 被拦截", not bool(allow["ok"]), String(allow["reason"]))
	report.check("教学关 L1-1 完全不开放挑战卡",
		not bool(AppState.challenge_allowed("CHL-01", "L1-1")["ok"]), "")


static func economy(report: SimReport, deck: Array) -> void:
	report.section("场景七：能量经济自洽")
	var r7 := SimDriver.run(deck, [], 20260914, true)
	report.check("累计获得能量 > 消耗能量（有结余）",
		float(r7["energy_gained"]) > float(r7["energy_spent"]),
		"gained=%.0f spent=%.0f" % [r7["energy_gained"], r7["energy_spent"]])
	report.check("漏怪与击杀数守恒（同波内不重复计数）",
		int(r7["kills"]) + int(r7["leaks"]) > 0, "kills=%d leaks=%d" % [r7["kills"], r7["leaks"]])
