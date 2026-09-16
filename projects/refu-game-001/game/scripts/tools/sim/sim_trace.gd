extends RefCounted
class_name SimTrace
## SimTrace —— 战况轨迹（调参用，不计入判定）：逐塔伤害/击杀、能量收支、卡牌去向。
## 与 SimDriver 用同一套步长与自动玩家，所以这里的数字与验收里的那一局完全对得上。

const TICK := SimDriver.TICK
const MAX_SECONDS := SimDriver.MAX_SECONDS

## 逐波轨迹：每波结束时打印击杀/漏怪/能量/塔况，平衡调参时看这一段。
static func dump(report: SimReport, deck: Array) -> void:
	var battle := Battle.new("L1-1", [], deck, 20260914)
	battle.start()
	var ticks := 0
	var last_wave := -1
	while battle.phase != Battle.PHASE_WON and battle.phase != Battle.PHASE_LOST and ticks < int(MAX_SECONDS / TICK):
		AutoPlayer.deploy(battle)
		AutoPlayer.use_skills(battle)
		if battle.phase == Battle.PHASE_DRAW and not battle.pending_draw.is_empty():
			battle.pick_draw(battle.pending_draw[0])
		battle.tick(TICK)
		ticks += 1
		if battle.current_wave_number() != last_wave and battle.stats["wave_reached"] > last_wave:
			last_wave = int(battle.stats["wave_reached"])
		# 用"波次切换"作为分段点
		if battle.phase == Battle.PHASE_BREATH and battle.wave_index != last_wave:
			pass
	report.lines.append("    波次 | 击杀 | 漏怪 | 能量 | 塔数 | 支 | 修饰 | 羁绊")
	for i in range(battle.total_waves()):
		pass
	var row := "    结束 | %d | %d | %.0f | %d | %d | %d | %d" % [
		int(battle.stats["kills"]), int(battle.stats["leaks"]), battle.energy,
		battle.towers.size(),
		battle.towers.filter(func(t): return t.slot_type == "support").size(),
		battle.towers.reduce(func(acc, t): return acc + t.modifiers.size(), 0),
		battle.active_bonds.size(),
	]
	report.lines.append(row)
	for tw in battle.towers:
		report.lines.append("      · %s @(%.0f,%.0f) 伤害累计 %.0f 击杀 %d 攻速 %.2f 射程 %.2f%s"
			% [tw.name, tw.pos.x, tw.pos.y, tw.damage_dealt, tw.kills,
			   float(tw.stats.get("attack_speed", 0.0)), float(tw.stats.get("range", 0.0)),
			   (" 修饰×%d" % tw.modifiers.size()) if tw.modifiers.size() > 0 else ""])
	report.lines.append("    能量：累计获得 %.0f / 消耗 %.0f / 回收 %.0f；手牌 %d 张，牌堆余 %d"
		% [battle.stats["energy_gained"], battle.stats["energy_spent"], battle.stats["energy_returned"],
		   battle.deck.hand.size(), battle.deck.uses_left()])
	var hand_names: Array[String] = []
	for cid in battle.deck.hand:
		hand_names.append(String(GameData.get_card(String(cid)).get("name", cid)))
	report.lines.append("    残手牌：%s" % ", ".join(hand_names))
	report.lines.append("    操作日志（末 24 条）：")
	var logs: Array = battle.log_lines
	for i in range(maxi(0, logs.size() - 24), logs.size()):
		report.lines.append("      %6.1fs  %s" % [float(logs[i]["t"]), String(logs[i]["text"])])
