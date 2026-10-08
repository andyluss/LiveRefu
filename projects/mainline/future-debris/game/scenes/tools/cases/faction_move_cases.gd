extends RefCounted
class_name FactionMoveCases
## L4 组：`moves` 姿态把入场残渣**搬到空塔位**。

static func move_posture_relocates() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-HAU"          # moves
	battle.resources["power"] = 20
	ResidueSystem.add(battle.residue, 0, 4)       # 先让 0 号格成为最脏格
	var before := ResidueSystem.at(battle.residue, 0)
	var played := CardPlayer.play(battle, 0, 5)
	if not bool(played["ok"]):
		return CaseBase.bad("出牌失败：%s" % played["reason"])
	var entry := (battle.board[5] as CardInstance).data.residue
	if ResidueSystem.at(battle.residue, 5) != 0:
		return CaseBase.bad("moves 姿态下新格不应留残渣：实际 %d" % ResidueSystem.at(battle.residue, 5))
	if entry > 0 and ResidueSystem.at(battle.residue, 0) != before + entry:
		return CaseBase.bad("moves 姿态应把 %d 点残渣搬到最脏格：%d → %d" % [
			entry, before, ResidueSystem.at(battle.residue, 0)])
	return CaseBase.ok()
