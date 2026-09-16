extends RefCounted
class_name SimSuites
## SimSuites —— 无头验收的用例集：按"守什么规则"分成五组，逐组调用。
## 每条用例都对应一条策划文档里的判据（见 docs/05_验收与测试.md 的用例表）。


static func run_all(report: SimReport) -> void:
	var deck := data(report)
	play(report, deck)
	SimSuitesB.challenges(report, deck)
	SimSuitesB.air(report)
	SimSuitesB.whitelist(report)
	SimTrace.dump(report, deck)
	SimSuitesB.economy(report, deck)


## 数据装载：卡池规模、基准关卡威胁值、推荐卡组合法性。
static func data(report: SimReport) -> Array:
	report.section("数据装载")
	report.check("卡池 12 张 / 敌人 6 原型 / 地图 6 张",
		GameData.cards.size() == 12 and GameData.enemies.size() == 6 and GameData.maps.size() == 6,
		"cards=%d enemies=%d maps=%d" % [GameData.cards.size(), GameData.enemies.size(), GameData.maps.size()])
	report.check("WAV-ANV-A 合计威胁值 = B_ref 158",
		int(GameData.get_wave_set("WAV-ANV-A").get("total_threat", 0)) == 158, "")
	var deck := AppState.default_deck("L1-1")
	var check := AppState.validate_deck(deck)
	report.check("推荐卡组 20 张且合法", deck.size() == 20 and bool(check["ok"]),
		"size=%d %s" % [deck.size(), check["reason"]])
	return deck


## 战斗闭环：自动布防能通关、空手必败、同种子可复现。
static func play(report: SimReport, deck: Array) -> void:
	report.section("场景一：自动布防应能通关 L1-1（教学关目标胜率 80%+）")
	var r1 := SimDriver.run(deck, [], 20260914, true)
	report.check("通关（守住 6 波）", bool(r1["win"]), "phase=%s 漏怪=%d 基地=%d/%d 用时=%.0fs"
		% [r1["phase"], r1["leaks"], r1["base_hp"], r1["base_hp_max"], r1["duration"]])
	report.check("漏怪 ≤ 3（对齐 21 号文档：第 1 章应为 90%+ 稳过）", int(r1["leaks"]) <= 3,
		"leaks=%d base=%d" % [r1["leaks"], r1["base_hp"]])
	report.check("触发了羁绊（卡片融合感）", int(r1["bonds"]) >= 1, "bonds=%d" % r1["bonds"])
	report.check("评级落在 A 及以上", r1["grade"] in ["S", "A"],
		"grade=%s score=%.2f" % [r1["grade"], r1["score"]])

	report.section("场景二：不放任何卡必败（基地 20 生命会被漏怪扣光）")
	var r2 := SimDriver.run([], [], 20260914, false)
	report.check("失败且基地归零", (not bool(r2["win"])) and int(r2["base_hp"]) == 0,
		"phase=%s base=%d leaks=%d" % [r2["phase"], r2["base_hp"], r2["leaks"]])

	report.section("场景三：确定性（同种子同操作 → 同结果）")
	var a := SimDriver.run(deck, [], 777, true)
	var b := SimDriver.run(deck, [], 777, true)
	report.check("两次模拟结果一致",
		int(a["leaks"]) == int(b["leaks"]) and int(a["base_hp"]) == int(b["base_hp"])
		and absf(float(a["duration"]) - float(b["duration"])) < 0.001,
		"leaks %d/%d base %d/%d" % [a["leaks"], b["leaks"], a["base_hp"], b["base_hp"]])
