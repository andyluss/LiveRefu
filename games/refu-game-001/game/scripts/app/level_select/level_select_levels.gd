extends RefCounted
class_name LevelSelectLevels
## 用途 ｜ 关卡列表：每关一行（编号/名称/地图/波次卡组/最佳评级），解锁后可点「选择」。
## 依赖 ｜ GameData.levels/get_map()、AppState.is_unlocked()/best_result()、UiKit、
##        LevelSelect（host：选择后回调 _select_level()）。

var host
var _list: VBoxContainer


static func create(host_ref, parent: Control) -> LevelSelectLevels:
	var p := LevelSelectLevels.new()
	p.host = host_ref
	p._list = VBoxContainer.new()
	p._list.add_theme_constant_override("separation", 8)
	parent.add_child(p._list)
	return p


func refresh(selected_level: String) -> void:
	for c in _list.get_children():
		_list.remove_child(c)
		c.queue_free()
	for level in GameData.levels:
		var lid := String(level.get("id", ""))
		var unlocked := AppState.is_unlocked(lid)
		var selected := lid == selected_level
		var row := UiKit.panel(UiKit.BG_PANEL if not selected else Color("#16283a"),
			12, UiKit.TEAL if selected else UiKit.LINE, 2 if selected else 1)
		var line := HBoxContainer.new()
		line.add_theme_constant_override("separation", 10)
		var col := VBoxContainer.new()
		col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		col.add_child(UiKit.label("%s　%s" % [lid, level.get("name", "")], UiKit.FS_H2, UiKit.TEXT))
		var map_data := GameData.get_map(level.get("map", ""))
		var best := AppState.best_result(lid)
		var sub := "%s　｜　%s　｜　%s" % [map_data.get("name", ""), level.get("wave_set", ""),
			"可挂挑战卡" if bool(level.get("challenges_allowed", false)) else "教学关（不开放挑战卡）"]
		if not best.is_empty():
			sub += "　｜　最佳 %s" % best.get("grade", "-")
		col.add_child(UiKit.label(sub, UiKit.FS_SMALL, UiKit.TEXT_DIM))
		col.add_child(UiKit.label(String(level.get("desc", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))
		line.add_child(col)
		if not unlocked:
			line.add_child(UiKit.label("未解锁", UiKit.FS_SMALL, UiKit.DANGER))
		row.add_child(line)
		if unlocked:
			var btn := UiKit.ghost_button("选择", UiKit.FS_SMALL, UiKit.TEAL)
			btn.custom_minimum_size = Vector2(80, 40)
			btn.pressed.connect(func(): host._select_level(lid))
			row.add_child(btn)
		_list.add_child(row)
