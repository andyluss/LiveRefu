extends RefCounted
class_name BattleWaves
## BattleWaves —— 波次的开始、推进判定与波间调度。

static func start(bt: BattleState) -> void:
	if bt.wave_index >= bt.intern.waves.size():
		BattleWaveEnd.win(bt)
		return
	var wave: Dictionary = bt.intern.waves[bt.wave_index]
	bt.intern.spawn_queue.clear()
	for comp in wave.get("composition", []):
		for i in int(comp.get("count", 0)):
			bt.intern.spawn_queue.append(String(comp.get("enemy", "")))
	bt.intern.spawn_interval = float(wave.get("spawn_interval", 1.4))
	bt.intern.spawn_timer = 0.0
	bt.phase = BattleState.PHASE_WAVE
	bt.phase_t = 0.0
	bt.stats["wave_reached"] = bt.wave_index + 1
	BattleFeedback.log(bt, "第 %d 波开始：%s" % [bt.wave_index + 1, composition_text(wave)])
	BattleEffects.run_hooks_all(bt, "on_wave_start")


static func composition_text(wave: Dictionary) -> String:
	var parts: Array[String] = []
	for comp in wave.get("composition", []):
		var e := GameData.get_enemy(String(comp.get("enemy", "")))
		parts.append("%s×%d" % [e.get("name", "?"), int(comp.get("count", 0))])
	return " + ".join(parts)


## 本波是否打完：出兵队列空 且 场上无存活敌人。
static func finished(bt: BattleState) -> bool:
	if not bt.intern.spawn_queue.is_empty():
		return false
	for e in bt.enemies:
		if e.alive:
			return false
	return true


## 波间调度：选择一张牌进入手牌（doc 05：每波结束 1 调度点、三选一）。
static func pick_draw(bt: BattleState, card_id: String) -> bool:
	if bt.phase != BattleState.PHASE_DRAW:
		return false
	if not bt.deck.pick_draw(card_id):
		return false
	bt.pending_draw.clear()
	bt.phase = BattleState.PHASE_BREATH
	bt.phase_t = 0.0
	BattleFeedback.log(bt, "调度：获得「%s」" % GameData.get_card(card_id).get("name", card_id))
	return true
