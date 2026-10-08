extends RefCounted
class_name FactionFeedCases
## L3 组：`feeds` 姿态把残渣从**惩罚**翻转为**燃料**。

static func feed_posture_flips_residue() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-ROA"          # feeds：残渣当燃料
	battle.resources["power"] = 10
	CardPlayer.play(battle, 0, 2)
	var instance: CardInstance = battle.board[2]
	var clean := StatQuery.effective_might(instance, battle.residue, battle)
	ResidueSystem.add(battle.residue, 2, FactionMods.FEED_RESIDUE_PER_MIGHT * 4)
	var fed := StatQuery.effective_might(instance, battle.residue, battle)
	if fed <= clean:
		return CaseBase.bad("feeds 姿态下残渣应提升战力：干净 %d → 积渣 %d" % [clean, fed])
	var other := CaseBase.new_battle()
	other.faction_id = "FAC-ATOMIC-AEC"          # 非 feeds
	other.resources["power"] = 10
	CardPlayer.play(other, 0, 2)
	var other_instance: CardInstance = other.board[2]
	var other_clean := StatQuery.effective_might(other_instance, other.residue, other)
	ResidueSystem.add(other.residue, 2, FactionMods.FEED_RESIDUE_PER_MIGHT * 4)
	var hurt := StatQuery.effective_might(other_instance, other.residue, other)
	if hurt >= other_clean:
		return CaseBase.bad("非 feeds 势力在积渣后应受损：干净 %d → 积渣 %d" % [other_clean, hurt])
	return CaseBase.ok()
