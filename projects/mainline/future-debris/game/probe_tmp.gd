extends SceneTree
func _init() -> void:
	var battle := Battle.new()
	battle.level_id = "LV-ATOMIC-03"
	battle.player = AutoPlayer.new(true)
	if not battle.setup(CaseBase.DECK.split(","), 20, 40):
		print("setup failed"); quit(); return
	var rows: Array[Dictionary] = []
	while battle.is_active() and battle.turn < battle.max_turns:
		rows.append(battle.tick())
	print("回合  输出  本波配额  剩余")
	for i in rows.size():
		var r := rows[i]
		var dealt := int(r["dealt"])
		print("%4d  %4d   %6d   %5d" % [r["turn"], dealt, WaveSystem.quota(battle.wave), WaveSystem.remaining(battle.wave)])
	print("summary=", battle.summarize())
	quit()
