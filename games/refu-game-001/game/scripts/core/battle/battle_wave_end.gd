extends RefCounted
class_name BattleWaveEnd
## BattleWaveEnd —— 波末结算与胜负落定。

static func run(bt: BattleState) -> void:
	var clear_bonus := float(GameData.balance.get("energy", {}).get("wave_clear_bonus", 5))
	BattleEnergy.gain(bt, clear_bonus)
	BattleEffects.run_hooks_all(bt, "on_wave_end")
	BattleFeedback.log(bt, "第 %d 波清空：能量 +%d（波间奖励）" % [bt.wave_index + 1, int(clear_bonus)])
	bt.wave_index += 1
	if bt.wave_index >= bt.intern.waves.size():
		win(bt)
		return
	bt.phase = BattleState.PHASE_DRAW
	bt.phase_t = 0.0
	bt.pending_draw = bt.deck.offer_draw()
	if bt.pending_draw.is_empty():
		# 牌堆已空：没有可调度的牌，直接进入喘息期，避免流程卡在等待态
		bt.phase = BattleState.PHASE_BREATH
		BattleFeedback.log(bt, "牌堆已空，跳过调度")


static func win(bt: BattleState) -> void:
	bt.phase = BattleState.PHASE_WON
	BattleCleanup.run(bt)
	BattleFeedback.log(bt, "通关：守住全部 %d 波" % bt.intern.waves.size())


static func lose(bt: BattleState) -> void:
	bt.phase = BattleState.PHASE_LOST
	BattleFeedback.log(bt, "失败：基地生命归零")
