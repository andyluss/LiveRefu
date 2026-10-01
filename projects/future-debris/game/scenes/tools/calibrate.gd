extends Node
## 配额校准（`./run.sh calibrate`）：**测能力 → 按设计比例导出配额**，打印可直接写回的 JSON。
##
## 为什么做成命令而不是"当场算一算"（D28）：配额依赖卡池，卡池每改一次就该重标一次。
## 固化下来才能让"改卡池 → 重标定 → 看结果"成为可重复的三步。
##
## 它**只打印、不改数据**：换配额是一次有意的决定，应当由人过一眼再写回。
## 输出：能力曲线 + 一行 `QUOTAS_JSON={...}`。

const MEMBER_CAP := 20
const TURN_CAP := 24
const PROBE_LEVEL := "LV-ATOMIC-01"   # 探测关：用配额最松的一关量"想打多少就能打多少"

func _ready() -> void:
	var loaded := CardCatalog.load_all()
	var catalog: CardCatalog = loaded[0]
	if not bool(loaded[1]) or catalog.cards.is_empty():
		printerr("卡表装载失败：%s" % str(catalog.errors))
		get_tree().quit(1)
		return
	var factions: Array = catalog.factions.keys()
	factions.sort()
	var caps := {}
	print("能力测量（每回合输出，%d 回合上限）" % TURN_CAP)
	var weakest := -1
	for faction_id in factions:
		var measured := CapabilityProbe.measure(catalog, faction_id, PROBE_LEVEL, MEMBER_CAP, TURN_CAP)
		if not bool(measured["ok"]):
			printerr("测量失败：%s" % str(measured["reason"]))
			get_tree().quit(1)
			return
		var per_turn: Array = measured["per_turn"]
		var capacity := QuotaModel.level_capacity(per_turn)
		caps[faction_id] = capacity
		if weakest < 0 or capacity < weakest:
			weakest = capacity
		print("  %-22s 回合 %2d  总输出 %4d  峰值 %3d" % [
			faction_id, int(measured["turns"]), capacity, _max_of(per_turn)])
	print("  最弱势力总输出 = %d（配额以它为基准：难度不该由选了哪个势力决定）" % weakest)
	print(_quotas_json(catalog, weakest))
	# 按势力的配额：通用曲线 = 最弱势力能力 × 关卡比例，
	# 因此势力 f 的曲线 = 通用曲线 × (f 能力 ÷ 最弱能力)。**形状不变，只按各自能力放大。**
	print("FACTION_QUOTAS_JSON=%s" % JSON.stringify(QuotaModel.factors(catalog, caps, weakest)))

## 逐关导出配额：保持既有配额形状，把总量缩放到 `比例 × 最弱势力能力`。
func _quotas_json(catalog: CardCatalog, capacity: int) -> String:
	var level_ids: Array = catalog.levels.keys()
	level_ids.sort()
	var proposals := {}
	for index in level_ids.size():
		var level_id: String = level_ids[index]
		var level: LevelData = catalog.levels[level_id]
		var ratio := float(QuotaModel.RATIO_BY_LEVEL[mini(index, QuotaModel.RATIO_BY_LEVEL.size() - 1)])
		proposals[level_id] = QuotaModel.scale(level.quotas, capacity, ratio)
	return "QUOTAS_JSON=%s" % JSON.stringify(proposals)

func _max_of(values: Array) -> int:
	var best := 0
	for value in values:
		best = maxi(best, int(value))
	return best
