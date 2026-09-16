extends RefCounted
class_name BattleLoop
## BattleLoop —— 固定步长的一帧：按阶段调用各系统。
##
## 帧内顺序本身有语义（先算场、再算塔属性、再开火、再让敌人动），改动前请先看
## docs/02_工程结构与运行.md 的"战斗主循环"一节。

static func step(bt: BattleState, dt: float) -> void:
	bt.stats["duration"] = bt.t
	if bt.phase in [BattleState.PHASE_WON, BattleState.PHASE_LOST, BattleState.PHASE_DRAW]:
		return
	bt.t += dt
	bt.phase_t += dt
	BattleEffectHeal.tick(bt, dt)
	match bt.phase:
		BattleState.PHASE_BUILD, BattleState.PHASE_BREATH:
			_intermission(bt, dt)
		BattleState.PHASE_WAVE:
			_wave_frame(bt, dt)
	BattleFeedback.cleanup(bt)
	BattleBonds.check(bt)


static func _intermission(bt: BattleState, dt: float) -> void:
	BattleEnergy.regen(bt, dt)
	var limit := float(bt.rule.get("build_phase_sec", 15.0)) if bt.phase == BattleState.PHASE_BUILD \
		else float(bt.rule.get("wave_gap_sec", 5.0))
	if bt.phase_t >= limit:
		BattleWaves.start(bt)


static func _wave_frame(bt: BattleState, dt: float) -> void:
	BattleEnergy.regen(bt, dt)
	BattleSpawn.tick(bt, dt)
	BattleFields.update(bt, dt)
	BattleStats.recompute(bt)
	BattleTowers.update(bt, dt)
	BattleProjectiles.update(bt, dt)
	BattleEnemies.update(bt, dt)
	BattleCleanup.run(bt)
	if BattleWaves.finished(bt):
		BattleWaveEnd.run(bt)
