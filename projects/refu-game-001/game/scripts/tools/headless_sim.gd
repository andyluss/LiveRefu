extends Node
## headless_sim —— 战斗引擎的**无头验收**（不需要画面，CI/命令行可跑）。
##
## 为什么要它：卡片塔防的规则层（能量经济、钩子、羁绊、对空、漏怪判定）一旦算错，
## 画面再好看也是错的。这里用固定种子直接驱动 core/battle.gd，把"必须成立的性质"
## 写成用例，任何一条不过就非零退出。
##
## 运行（走 game/run.sh，它会把 HOME 指到工作区内，避免 Godot 往 ~/Library 写用户数据）：
##   ./run.sh check
## 实现说明：这里刻意**不用** `--script` 模式——那种模式下 autoload（GameData/AppState）
## 不会注册成全局标识符，脚本无法编译。改成"一个最小场景 + Node 脚本"，
## 在 _ready 里跑完全部用例后 quit(退出码)，CI 只认退出码。

const TICK := 1.0 / 30.0
const MAX_SECONDS := 900.0

var _pass := 0
var _fail := 0
var _lines: Array[String] = []


func _ready() -> void:
	_run_all()
	_report()


func _run_all() -> void:
	_section("数据装载")
	_case("卡池 12 张 / 敌人 6 原型 / 地图 6 张",
		GameData.cards.size() == 12 and GameData.enemies.size() == 6 and GameData.maps.size() == 6,
		"cards=%d enemies=%d maps=%d" % [GameData.cards.size(), GameData.enemies.size(), GameData.maps.size()])
	_case("WAV-ANV-A 合计威胁值 = B_ref 158",
		int(GameData.get_wave_set("WAV-ANV-A").get("total_threat", 0)) == 158, "")
	var deck := AppState.default_deck("L1-1")
	_case("推荐卡组 20 张且合法",
		deck.size() == 20 and bool(AppState.validate_deck(deck)["ok"]),
		"size=%d %s" % [deck.size(), AppState.validate_deck(deck)["reason"]])

	_section("场景一：自动布防应能通关 L1-1（教学关目标胜率 80%+）")
	var r1 := _simulate(deck, [], 20260914, true)
	_case("通关（守住 6 波）", bool(r1["win"]), "phase=%s 漏怪=%d 基地=%d/%d 用时=%.0fs"
		% [r1["phase"], r1["leaks"], r1["base_hp"], r1["base_hp_max"], r1["duration"]])
	_case("漏怪 ≤ 3（对齐 21 号文档：第 1 章应为 90%+ 稳过）", int(r1["leaks"]) <= 3,
		"leaks=%d base=%d" % [r1["leaks"], r1["base_hp"]])
	_case("触发了羁绊（卡片融合感）", int(r1["bonds"]) >= 1, "bonds=%d" % r1["bonds"])
	_case("评级落在 A 及以上", r1["grade"] in ["S", "A"], "grade=%s score=%.2f" % [r1["grade"], r1["score"]])

	_section("场景二：不放任何卡必败（基地 20 生命会被漏怪扣光）")
	var r2 := _simulate([], [], 20260914, false)
	_case("失败且基地归零", (not bool(r2["win"])) and int(r2["base_hp"]) == 0,
		"phase=%s base=%d leaks=%d" % [r2["phase"], r2["base_hp"], r2["leaks"]])

	_section("场景三：确定性（同种子同操作 → 同结果）")
	var a := _simulate(deck, [], 777, true)
	var b := _simulate(deck, [], 777, true)
	_case("两次模拟结果一致",
		int(a["leaks"]) == int(b["leaks"]) and int(a["base_hp"]) == int(b["base_hp"])
		and absf(float(a["duration"]) - float(b["duration"])) < 0.001,
		"leaks %d/%d base %d/%d" % [a["leaks"], b["leaks"], a["base_hp"], b["base_hp"]])

	_section("场景四：挑战卡只改环境参数")
	var r4 := _simulate(deck, ["CHL-01", "CHL-05"], 20260914, true)
	_case("加压+疾行后难度分 = 5、掉落系数 = 1.25",
		int(r4["challenge_score"]) == 5 and absf(float(r4["drop"]) - 1.25) < 0.001,
		"score=%d drop=%.2f" % [r4["challenge_score"], r4["drop"]])
	_case("加压后敌人生命确实 ×1.3（首波小兵 78）",
		absf(float(r4["first_grunt_hp"]) - 78.0) < 0.01, "hp=%.1f" % r4["first_grunt_hp"])
	var r4b := _simulate(deck, ["CHL-03"], 20260914, true)
	_case("封锁：技能卡不可施放", bool(r4b["skill_blocked"]), "reason=%s" % r4b["skill_block_reason"])

	_section("场景五：对空规则（第 4 波纯空中，ANV-T03 不能对空）")
	var r5 := _air_test_wave4()
	_case("不可对空的塔（ANV-T03）选不到空中单位", int(r5["air_only_hits"]) == 0,
		"选中=%d" % r5["air_only_hits"])
	_case("可对空的塔（ANV-T01）能选中空中单位", int(r5["aa_hits"]) == 1,
		"选中=%d" % r5["aa_hits"])
	_case("地面单位出现后 ANV-T03 正常选靶", int(r5["t03_vs_ground"]) == 1,
		"选中=%d" % r5["t03_vs_ground"])

	_section("场景六：白名单（单入口图不可挂「双流」）")
	var allow := AppState.challenge_allowed("CHL-04", "L1-2")
	_case("MAP-ANV-01 上 CHL-04 被拦截", not bool(allow["ok"]), String(allow["reason"]))
	_case("教学关 L1-1 完全不开放挑战卡",
		not bool(AppState.challenge_allowed("CHL-01", "L1-1")["ok"]), "")

	_section("战况轨迹（调参用，不计入判定）")
	_trace(deck)

	_section("场景七：能量经济自洽")
	var r7 := _simulate(deck, [], 20260914, true)
	_case("累计获得能量 > 消耗能量（有结余）",
		float(r7["energy_gained"]) > float(r7["energy_spent"]),
		"gained=%.0f spent=%.0f" % [r7["energy_gained"], r7["energy_spent"]])
	_case("漏怪与击杀数守恒（同波内不重复计数）",
		int(r7["kills"]) + int(r7["leaks"]) > 0, "kills=%d leaks=%d" % [r7["kills"], r7["leaks"]])


# ==================================================================== 模拟驱动

## 跑一局。# auto_play 为 true 时用一个"贪心自动玩家"布防（用于验收战斗闭环）。
func _simulate(deck: Array, challenges: Array, seed_v: int, auto_play: bool) -> Dictionary:
	var battle := Battle.new("L1-1", challenges, deck, seed_v)
	battle.start()
	if auto_play:
		_auto_deploy(battle)
	var ticks := 0
	var max_ticks := int(MAX_SECONDS / TICK)
	var first_grunt_hp := -1.0
	var skill_blocked := false
	var skill_block_reason := ""
	# 用固定步长把整局推完
	while battle.phase != Battle.PHASE_WON and battle.phase != Battle.PHASE_LOST and ticks < max_ticks:
		if auto_play:
			_auto_deploy(battle)
			_auto_skill(battle)
		# 调度阶段必须推进，否则模拟会停在等待态（无牌可调度时 Battle 会自行跳过）
		if battle.phase == Battle.PHASE_DRAW:
			if not battle.pending_draw.is_empty():
				battle.pick_draw(battle.pending_draw[0])
			else:
				battle.phase = Battle.PHASE_BREATH
		# 记录首波小兵的实际上限生命（验证挑战卡只改环境参数）
		if first_grunt_hp < 0.0 and not battle.enemies.is_empty():
			first_grunt_hp = battle.enemies[0].max_hp
		# 试探技能卡是否被封锁（只在第一个 wave 阶段试一次）
		if not skill_blocked and battle.phase == Battle.PHASE_WAVE and battle.hand_cards().any(
				func(c): return String(c.get("type", "")) == "skill"):
			for c in battle.hand_cards():
				if String(c.get("type", "")) == "skill":
					var res := battle.cast_card(String(c["id"]), 0)
					if not bool(res["ok"]):
						skill_blocked = true
						skill_block_reason = String(res["reason"])
					break
		battle.tick(TICK)
		ticks += 1
	var rat := battle.rating()
	return {
		"phase": battle.phase, "win": battle.phase == Battle.PHASE_WON,
		"leaks": rat["leaks"], "base_hp": rat["base_hp"], "base_hp_max": rat["base_hp_max"],
		"grade": rat["grade"], "score": rat["score"], "bonds": rat["bonds"],
		"duration": battle.t, "energy_gained": battle.stats["energy_gained"],
		"energy_spent": battle.stats["energy_spent"], "kills": battle.stats["kills"],
		"challenge_score": rat["challenge_score"], "drop": rat["drop_multiplier"],
		"first_grunt_hp": first_grunt_hp, "skill_blocked": skill_blocked,
		"skill_block_reason": skill_block_reason,
		"hook_triggers": rat["hook_triggers"],
	}


## 自动玩家统一放在 scripts/tools/auto_player.gd（截图工具也用它，避免两份实现漂移）。
func _auto_deploy(battle: Battle) -> void:
	AutoPlayer.deploy(battle)


func _auto_skill(battle: Battle) -> void:
	AutoPlayer.use_skills(battle)


func _sorted_slots(battle: Battle, map_data: Dictionary, slot_type: String) -> Array:
	return AutoPlayer.along_sorted_slots(battle, map_data, slot_type)


# ==================================================================== 对空用例

## 对空规则的精确用例：把一只"空中"敌人放进两座塔的射程，看选靶结果。
## 直接测 _acquire_target 而不是跑整关——整关会被前几波的地面敌人先打光基地，测不到第 4 波。
func _air_test_wave4() -> Dictionary:
	var battle := Battle.new("L1-1", [], ["ANV-T03", "ANV-T01"], 20260914)
	battle.start()
	battle.energy = 999.0
	var map_data := GameData.get_map("MAP-ANV-01")
	var slots: Array = _sorted_slots(battle, map_data, "standard")
	var r3 := battle.place_card("ANV-T03", Vector2(slots[3][0], slots[3][1]))
	var r1 := battle.place_card("ANV-T01", Vector2(slots[4][0], slots[4][1]))
	if not bool(r3["ok"]) or not bool(r1["ok"]):
		return {"air_only_hits": -1, "aa_hits": -1, "error": "塔放置失败"}
	var t03 := battle._tower_by_uid(int(r3["uid"]))
	var t01 := battle._tower_by_uid(int(r1["uid"]))
	# 让两座塔进入可攻击状态（stats 尚未重算时攻击间隔为无限）
	battle._recompute_tower_stats()
	# 放一只空中敌人，位置取两塔射程内的路径点
	var along: float = battle.paths[0].project(t01.pos)["along"]
	battle._spawn_enemy("air")
	var air: EnemyUnit = battle.enemies[battle.enemies.size() - 1]
	air.distance = along
	var air_only_t03 := battle._acquire_target(t03)
	var air_only_t01 := battle._acquire_target(t01)
	# 再放一只地面敌人，T03 应改打地面
	battle._spawn_enemy("grunt")
	var ground: EnemyUnit = battle.enemies[battle.enemies.size() - 1]
	ground.distance = along
	var mixed_t03 := battle._acquire_target(t03)
	return {
		"air_only_hits": 0 if air_only_t03 == null else 1,
		"aa_hits": 0 if air_only_t01 == null else 1,
		"t03_vs_ground": 0 if mixed_t03 == null else 1,
	}


# ==================================================================== 输出

func _section(title: String) -> void:
	_lines.append("")
	_lines.append("── %s" % title)


func _case(name: String, condition: bool, detail: String) -> void:
	if condition:
		_pass += 1
		_lines.append("  ✅ %s%s" % [name, ("（%s）" % detail) if detail != "" else ""])
	else:
		_fail += 1
		_lines.append("  ❌ %s%s" % [name, ("（%s）" % detail) if detail != "" else ""])


func _report() -> void:
	for l in _lines:
		print(l)
	print("")
	print("═══ 无头验收：%s（通过 %d / 失败 %d）═══" % ["PASS" if _fail == 0 else "FAIL", _pass, _fail])
	get_tree().quit(0 if _fail == 0 else 1)

## 逐波轨迹：每波结束时打印击杀/漏怪/能量/塔况，平衡调参时看这一段。
func _trace(deck: Array) -> void:
	var battle := Battle.new("L1-1", [], deck, 20260914)
	battle.start()
	var ticks := 0
	var last_wave := -1
	while battle.phase != Battle.PHASE_WON and battle.phase != Battle.PHASE_LOST and ticks < int(MAX_SECONDS / TICK):
		_auto_deploy(battle)
		_auto_skill(battle)
		if battle.phase == Battle.PHASE_DRAW and not battle.pending_draw.is_empty():
			battle.pick_draw(battle.pending_draw[0])
		battle.tick(TICK)
		ticks += 1
		if battle.current_wave_number() != last_wave and battle.stats["wave_reached"] > last_wave:
			last_wave = int(battle.stats["wave_reached"])
		# 用"波次切换"作为分段点
		if battle.phase == Battle.PHASE_BREATH and battle.wave_index != last_wave:
			pass
	_lines.append("    波次 | 击杀 | 漏怪 | 能量 | 塔数 | 支 | 修饰 | 羁绊")
	for i in range(battle.total_waves()):
		pass
	var row := "    结束 | %d | %d | %.0f | %d | %d | %d | %d" % [
		int(battle.stats["kills"]), int(battle.stats["leaks"]), battle.energy,
		battle.towers.size(),
		battle.towers.filter(func(t): return t.slot_type == "support").size(),
		battle.towers.reduce(func(acc, t): return acc + t.modifiers.size(), 0),
		battle.active_bonds.size(),
	]
	_lines.append(row)
	for tw in battle.towers:
		_lines.append("      · %s @(%.0f,%.0f) 伤害累计 %.0f 击杀 %d 攻速 %.2f 射程 %.2f%s"
			% [tw.name, tw.pos.x, tw.pos.y, tw.damage_dealt, tw.kills,
			   float(tw.stats.get("attack_speed", 0.0)), float(tw.stats.get("range", 0.0)),
			   (" 修饰×%d" % tw.modifiers.size()) if tw.modifiers.size() > 0 else ""])
	_lines.append("    能量：累计获得 %.0f / 消耗 %.0f / 回收 %.0f；手牌 %d 张，牌堆余 %d"
		% [battle.stats["energy_gained"], battle.stats["energy_spent"], battle.stats["energy_returned"],
		   battle.deck.hand.size(), battle.deck.uses_left()])
	var hand_names: Array[String] = []
	for cid in battle.deck.hand:
		hand_names.append(String(GameData.get_card(String(cid)).get("name", cid)))
	_lines.append("    残手牌：%s" % ", ".join(hand_names))
	_lines.append("    操作日志（末 24 条）：")
	var logs: Array = battle.log_lines
	for i in range(maxi(0, logs.size() - 24), logs.size()):
		_lines.append("      %6.1fs  %s" % [float(logs[i]["t"]), String(logs[i]["text"])])
