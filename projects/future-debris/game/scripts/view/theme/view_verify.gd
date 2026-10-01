extends RefCounted
class_name ViewVerify
## S4 视图验收（无头）：断言"**画得对、点得对**"。
##
## 为什么需要它（S3 的教训）：断言全绿但界面不对的情况出现过四次。
## 视图层的两类 bug 都**不会报错**：
##   1. 位置算错——点 3 号位却放在 4 号位（几何写了两套）；
##   2. 取色绕开主题——用字面量颜色，换纪元就"半新半旧"。
## 因此这里断言：几何唯一来源、点击命中原位、颜色必须来自 token。

## 返回 {ok, checks, errors}。
static func run(tokens: TokenSet) -> Dictionary:
	var checks: Array[String] = []
	var errors: Array[String] = []
	_check(errors, checks, Geom.SLOT_COUNT == BoardSystem.MAX_SLOTS,
		"塔位数量一致（Geom %d = BoardSystem %d）" % [Geom.SLOT_COUNT, BoardSystem.MAX_SLOTS])
	var cell := Vector2(100, 80)
	var gap := 10
	# 点击命中：每个塔位的中心点必须解析回它自己（顺序错位是最常见的几何 bug）
	var all_hit := true
	for slot in Geom.SLOT_COUNT:
		var center := Geom.slot_rect(slot, cell, gap).get_center()
		if Geom.slot_at(center, cell, gap) != slot:
			all_hit = false
	_check(errors, checks, all_hit, "每个塔位中心点都能解析回自身（点击命中）")
	# 边界：点在棋盘外应返回 -1
	var outside := Geom.board_size(cell, gap) + Vector2(50, 50)
	_check(errors, checks, Geom.slot_at(outside, cell, gap) == -1, "棋盘外的点不命中任何塔位")
	# 取色必须来自 token：与契约值逐一比对（不写字面量的可执行检查）
	var color_checks := [
		["--power", BattlePalette.token_color(tokens, "--power")],
		["--residue", BattlePalette.token_color(tokens, "--residue")],
	]
	var colors_ok := true
	for pair in color_checks:
		if not (pair[1] as Color).is_equal_approx(tokens.colors[pair[0]]):
			colors_ok = false
	_check(errors, checks, colors_ok, "战场取色来自 token（非字面量）")
	# 卡面版式契约：六段之和 + 余量必须等于卡高（**位置就是可读性**，
	# 任何一段被改动都必须同时改余量，否则卡面会溢出或留白错位）
	var sections := CardView.TOP + CardView.ART + CardView.KEYS + CardView.STATS + CardView.TEXT + CardView.BOTTOM
	_check(errors, checks, is_equal_approx(sections, 666.0),
		"卡面六段之和 = 666（实际 %.0f）" % sections)
	_check(errors, checks, is_equal_approx(sections + 54.0, CardView.H),
		"六段 + 余量 54 = 卡高 %.0f（实际 %.0f）" % [CardView.H, sections + 54.0])
	_check(errors, checks, CardView.COMPACT_SCALE > 0.0 and CardView.COMPACT_SCALE < 1.0,
		"紧凑模式比例在 0..1 之间（手牌用）")
	# 战役进度：解锁规则与"评级只升不降"是**长期经营**的根基，必须被守
	_check_campaign(errors, checks)
	# 残渣热力：0 点必须是背景色（否则"干净格"看起来像"有污染"）
	_check(errors, checks, BattlePalette.residue_heat(tokens, 0, 8) == tokens.color("--bg-base"),
		"残渣为 0 时热力色 = --bg-base")
	# 残渣越多越"热"：只比较亮度顺序，避免把具体颜色写死进断言
	var low := BattlePalette.residue_heat(tokens, 2, 8)
	var high := BattlePalette.residue_heat(tokens, 8, 8)
	_check(errors, checks, low != high, "残渣热力随数量变化")
	return {"ok": errors.is_empty(), "checks": checks, "errors": errors}

## 战役进度的不变量。**不写存档文件**（避免测试污染玩家数据）。
static func _check_campaign(errors: Array[String], checks: Array[String]) -> void:
	var progress := CampaignProgress.new()
	var ordered: Array = ["LV-ATOMIC-01", "LV-ATOMIC-02", "LV-ATOMIC-03"]
	_check(errors, checks, CampaignProgress.is_unlocked(progress, ordered, 0),
		"第一关永远可挑战")
	_check(errors, checks, not CampaignProgress.is_unlocked(progress, ordered, 1),
		"未通关前一关时，后一关未解锁")
	progress.cleared.append("LV-ATOMIC-01")
	_check(errors, checks, CampaignProgress.is_unlocked(progress, ordered, 1),
		"通关前一关后，后一关解锁")
	# 评级只升不降（字母序越小越好：S < A < B < C）
	progress.best_grade["LV-ATOMIC-01"] = "B"
	progress.merge_result("LV-ATOMIC-01", "S", true)
	_check(errors, checks, str(progress.best_grade["LV-ATOMIC-01"]) == "S", "更好的评级会覆盖旧的")
	progress.merge_result("LV-ATOMIC-01", "C", true)
	_check(errors, checks, str(progress.best_grade["LV-ATOMIC-01"]) == "S", "更差的评级不会覆盖旧的")
	# 未通关不该被记成通关
	var fresh := CampaignProgress.new()
	fresh.merge_result("LV-ATOMIC-02", "B", false)
	_check(errors, checks, not fresh.is_cleared("LV-ATOMIC-02"),
		"未通关的一局不会写进进度")

static func _check(errors: Array[String], checks: Array[String], passed: bool, label: String) -> void:
	checks.append(("OK   " if passed else "FAIL ") + label)
	if not passed:
		errors.append(label)
