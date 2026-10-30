extends RefCounted
class_name SimDriver
## SimDriver —— 用固定种子把一局推到结束，返回结算摘要（验收与轨迹共用）。
## 固定步长与超时上限保证"同一输入 → 同一输出"，这是回归验收能成立的前提。

const TICK := 1.0 / 30.0
const MAX_SECONDS := 900.0

## 跑一局。# auto_play 为 true 时用一个"贪心自动玩家"布防（用于验收战斗闭环）。
static func run(deck: Array, challenges: Array, seed_v: int, auto_play: bool) -> Dictionary:
	var battle := Battle.new("L1-1", challenges, deck, seed_v)
	battle.start()
	if auto_play:
		AutoPlayer.deploy(battle)
	var ticks := 0
	var max_ticks := int(MAX_SECONDS / TICK)
	var first_grunt_hp := -1.0
	var skill_blocked := false
	var skill_block_reason := ""
	# 用固定步长把整局推完
	while battle.phase != Battle.PHASE_WON and battle.phase != Battle.PHASE_LOST and ticks < max_ticks:
		if auto_play:
			AutoPlayer.deploy(battle)
			AutoPlayer.use_skills(battle)
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
