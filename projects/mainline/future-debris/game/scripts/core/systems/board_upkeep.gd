extends RefCounted
class_name BoardUpkeep
## 回合开始时的场地维护：已放置单位**持续产出残渣**。
## 这是本作的核心张力落地处——"供电即排污"不是一句设定，而是一条每回合都会结算的规则。

## 让场上每个单位把自身 residue 记入其所在格；返回本回合新增的残渣总量。
static func accrue(board: Dictionary, residue: Dictionary) -> int:
	var added := 0
	for slot in BoardSystem.occupied_slots(board):
		var instance: CardInstance = board[slot]
		if instance.data.residue <= 0:
			continue
		ResidueSystem.add(residue, slot, instance.data.residue)
		instance.accumulated_residue += instance.data.residue
		added += instance.data.residue
	return added
