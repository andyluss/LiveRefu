extends RefCounted
class_name FactionCases
## L 组：**势力机制差异**——`residuePosture` 必须真的改变结果，而不是只写在描述里。
##
## 为什么这组用例重要：若四势力的差异只体现在卡池，玩家会读成"换皮"。
## 因此断言针对的是**同一个数字在不同势力下算出不同结果**（战力/残渣），而不是描述文本。
##
## 姿态取值以数据表为准（复数）：`avoids` / `cleans` / `moves` / `feeds`。
## 踩过的坑：实现与测试都写成单数，导致机制**静默失效**（断言全绿、玩法没变）。

static func clean_posture_works() -> Dictionary:
	var battle := CaseBase.new_battle()
	battle.faction_id = "FAC-ATOMIC-AEC"          # 原子能委员会：cleans
	ResidueSystem.add(battle.residue, 3, 5)       # 直接造污染，避免依赖某张卡的残渣值
	var removed := FactionMods.turn_start_clean(battle)
	if removed != FactionMods.CLEAN_PER_TURN:
		return CaseBase.bad("cleans 姿态每回合应清 %d 点，实际 %d" % [FactionMods.CLEAN_PER_TURN, removed])
	if ResidueSystem.at(battle.residue, 3) != 5 - removed:
		return CaseBase.bad("残渣未被清掉：%d" % ResidueSystem.at(battle.residue, 3))
	var other := CaseBase.new_battle()
	other.faction_id = "FAC-ATOMIC-SUB"           # 郊区秩序：avoids（非 cleans）
	ResidueSystem.add(other.residue, 3, 5)
	if FactionMods.turn_start_clean(other) != 0:
		return CaseBase.bad("非 cleans 姿态不应自动清理")
	return CaseBase.ok()

static func entry_residue_by_posture() -> Dictionary:
	var cases := {
		"FAC-ATOMIC-AEC": 3,   # cleans：改的是回合清理，不是入场残渣
		"FAC-ATOMIC-ROA": 3,   # feeds：不改入场残渣
		"FAC-ATOMIC-SUB": 2,   # avoids：入场残渣 -1
		"FAC-ATOMIC-HAU": 3,   # moves：值与其它姿态相同，但会**记到最脏格**（见 L4）
	}
	for faction_id in cases:
		var battle := CaseBase.new_battle()
		battle.faction_id = faction_id
		var got := FactionMods.placement_residue(battle, 3, 0)
		if got != cases[faction_id]:
			return CaseBase.bad("%s 的入场残渣应为 %d，实际 %d" % [faction_id, cases[faction_id], got])
	return CaseBase.ok()
