extends RefCounted
class_name MoveRouting
## `moves` 姿态的搬运目标选择（"记到哪"与"减多少"分开）。

## `moves` 姿态下入场残渣应记到哪个格（-1 表示不搬，按原位记录）。
##
## 实测教训（两次）：最初记到"最脏格"，结果它把残渣压到**自己已建成的塔**上，
## 那格战力被压垮 → 第 8 关直接被打破（C 级）。所以"搬运"的正确目标是
## **空塔位优先**——把污染摊在还没建东西的地方，这才符合"把问题搬走"的直觉，
## 也让玩家有明确的应对（先占干净位，或接受空位变脏）。
static func target(battle, slot: int) -> int:
	if FactionMods.posture(battle) != "moves":
		return -1
	var empty_dirtiest := _dirtiest_empty(battle)
	return empty_dirtiest   # 没有空位可搬时不搬（-1）

## 残渣最多的**空**塔位；没有则返回 -1。
static func _dirtiest_empty(battle) -> int:
	var best := -1
	var best_amount := -1
	for i in BoardSystem.MAX_SLOTS:
		if battle.board.has(i) or i == 0 and false:
			continue
		var amount := ResidueSystem.at(battle.residue, i)
		if amount > best_amount:
			best = i
			best_amount = amount
	# 只搬进"已经有残渣的空位"或"完全干净的空位"（两者都可），
	# 但**优先已经有残渣的空位**以集中污染；没有任何空位时返回 -1。
	return best
