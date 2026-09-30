extends Node
## 平衡模拟入口（`./run.sh sim [--decks 4] [--seeds 5]`）：
## **不需要人写卡组**——按阵营自动组牌，并**同时跑两档策略（节制 / 贪心）**。
##
## 为什么它是 S2 的一部分而不是"以后再说"：卡表一旦进入量产（40→150→300 张），人不可能逐张试。
## **能造出来 ≠ 平衡得了**——生成管线的最后一环必须是模拟。
## 两档策略的差距就是"玩家决策有没有意义"的度量：若两档表现一样，说明玩法没有深度。
## 度量与打印在 [SimReport]；本文件只解析参数与遍历阵营。

var _decks_per_faction := 4
var _seeds := 5

func _ready() -> void:
	_parse_args()
	print("══ 平衡模拟 · S2 ══")
	var loaded := CardCatalog.load_all()
	var catalog: CardCatalog = loaded[0]
	if not bool(loaded[1]):
		printerr("数据表装载失败：%s" % str(catalog.errors))
		get_tree().quit(1)
		return
	print("卡池 %d 张 / 势力 %d 个 / 每势力 %d 套 × %d 种子 × 2 档 = %d 局" % [
		catalog.cards.size(), catalog.factions.size(), _decks_per_faction, _seeds,
		catalog.factions.size() * _decks_per_faction * _seeds * 2,
	])
	for faction_id in catalog.factions:
		for conservative in [true, false]:
			SimReport.run_matrix(catalog, faction_id, conservative, _decks_per_faction, _seeds)
	print("模拟完成（数字为实测，不构成平衡结论）")
	get_tree().quit(0)

func _parse_args() -> void:
	var argv := OS.get_cmdline_user_args()
	for index in argv.size():
		if argv[index] == "--decks" and index + 1 < argv.size():
			_decks_per_faction = maxi(1, int(argv[index + 1]))
		elif argv[index] == "--seeds" and index + 1 < argv.size():
			_seeds = maxi(1, int(argv[index + 1]))
