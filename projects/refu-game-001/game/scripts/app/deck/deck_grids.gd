extends RefCounted
class_name DeckGrids
## 用途 ｜ 卡组区与卡池区的网格：合并同名卡显示 ×N，点击加入/移除一张，长按看卡面。
## 依赖 ｜ CardView、GameData.get_card()/pool_for_level()/get_level()、UiKit、
##        DeckBuilder（host：_deck 数组、_refresh()、_show_art()）。

var host
var _deck_grid: GridContainer
var _pool_grid: GridContainer
var _deck_views: Array[CardView] = []
var _pool_views: Array[CardView] = []


## 建一个 6 列网格并挂到 parent（卡组区/卡池区共用同一规格）。
static func make_grid(parent: Control) -> GridContainer:
	var grid := GridContainer.new()
	grid.columns = 6
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	parent.add_child(grid)
	return grid


func setup(host_ref, deck_grid: GridContainer, pool_grid: GridContainer) -> void:
	host = host_ref
	_deck_grid = deck_grid
	_pool_grid = pool_grid


func refresh() -> void:
	var deck: Array[String] = host._deck
	var counts := _counts(deck)
	# 卡组：合并同名，显示 ×N
	var deck_ids: Array = counts.keys()
	deck_ids.sort()
	_rebuild(_deck_grid, _deck_views, deck_ids, counts, true, deck)
	# 卡池
	var pool := GameData.pool_for_level(GameData.get_level(AppState.level_id))
	var pool_ids: Array = []
	for c in pool:
		pool_ids.append(String(c["id"]))
	_rebuild(_pool_grid, _pool_views, pool_ids, counts, false, deck)


func _rebuild(grid: GridContainer, views: Array[CardView], ids: Array, counts: Dictionary,
		is_deck: bool, deck: Array[String]) -> void:
	for c in grid.get_children():
		grid.remove_child(c)
		c.queue_free()
	views.clear()
	for cid in ids:
		var cv := CardView.new()
		cv.custom_minimum_size = Vector2(100, 143)
		cv.setup(GameData.get_card(String(cid)), true)
		cv.show_count = int(counts.get(cid, 0))
		if not is_deck and int(counts.get(cid, 0)) >= 2:
			cv.set_affordable(false, "已达 2 张上限")
		cv.pressed.connect(func(_view):
			if is_deck:
				deck.erase(String(cid))
			else:
				if int(counts.get(cid, 0)) >= 2 or deck.size() >= 20:
					return
				deck.append(String(cid))
			host._refresh())
		cv.long_pressed.connect(func(_view): host._show_art(String(cid)))
		grid.add_child(cv)
		views.append(cv)


func _counts(ids: Array) -> Dictionary:
	var out := {}
	for cid in ids:
		out[cid] = int(out.get(cid, 0)) + 1
	return out
