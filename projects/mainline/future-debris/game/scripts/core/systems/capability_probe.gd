extends RefCounted
class_name CapabilityProbe
## **能力测量**：把"自动玩家在一关里每回合能打出多少输出"测出来，作为配额曲线的基准。
##
## 为什么必须有它（D28 的方法论）：配额不该由人拍脑袋定，也不该反复手调——
## 应当**先测出能力，再按能力的一个固定比例生成配额**。
## 之前"手调配额"效果差的根因就是：卡池一换，能力就变了，而配额是绝对数字。
##
## 测法（踩过一个大坑）：**必须给一个打不死的目标**。
## 最初用默认 20 点基地，结果四个势力的"总输出"都是 144——因为真正测到的是
## "基地能撑几个回合"，而不是"能打多少"（每回合输出被基地血量截断）。
## 因此这里把基地生命设成一个大数，并且**直接逐回合 tick**（不走 run_to_end，
## 它对基地血量极敏感，会放大这类测量错误）。

## 测量用的"打不死的基地"（足够大即可，不追求精确）。
const NO_LIMIT_HP := 100000

## 返回 {ok, reason, per_turn, turns, total}；per_turn 是各回合输出的数组。
static func measure(catalog: CardCatalog, faction_id: String, level_id: String,
		member_cap: int = 20, turn_cap: int = 24) -> Dictionary:
	var battle := Battle.new()
	battle.level_id = level_id
	battle.faction_id = faction_id
	battle.player = AutoPlayer.new(true)
	# 打不死的目标：否则测到的是防御力，不是输出能力
	var setup_ok := battle.setup(SweepDecks.for_faction(catalog, faction_id), NO_LIMIT_HP, turn_cap)
	if not setup_ok:
		return {"ok": false, "reason": "初始化失败：%s" % str(battle.events)}
	var per_turn: Array[int] = []
	var total := 0
	# 逐回合推进，且**不因波次打完而提前结束**：配额会随波次耗尽，
	# 因此测量只受回合上限约束，才能看到"铺满之后能打多少"。
	while battle.turn < turn_cap and ResourceSystem.alive(battle.resources):
		var info := battle.tick()
		var output := int(info.get("output", 0))
		per_turn.append(output)
		total += output
	return {"ok": true, "per_turn": per_turn, "turns": per_turn.size(), "total": total}

## 把测量结果转成**建议配额**：第 `wave` 波的配额 = 该波结束时能力累计的 `ratio` 倍。
##
## 为什么要按"累计"而不是"单回合"：配额是**一波的总量**，
## 而玩家的输出随时间增长（塔越铺越多），因此"到那一波时累计能打多少"才是正确口径。
static func suggest_quota(per_turn: Array[int], wave_index: int, turns_per_wave: int,
		ratio: float) -> int:
	var upto := mini(per_turn.size(), (wave_index + 1) * turns_per_wave)
	var cumulative := 0
	for i in upto:
		cumulative += per_turn[i]
	var wave_turns := mini(turns_per_wave, maxi(0, upto - wave_index * turns_per_wave))
	# 这一波期间的能力 ≈ 该波区间的实际输出
	var wave_capacity := 0
	for i in range(wave_index * turns_per_wave, upto):
		wave_capacity += per_turn[i]
	if wave_turns == 0 or cumulative == 0:
		return 0
	return int(round(float(wave_capacity) * ratio))
