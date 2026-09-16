extends RefCounted
class_name LevelSelectDetail
## 用途 ｜ 关卡详情：地图卡槽位、地形与规则卡、波次卡组逐波构成、当前卡组合法性。
## 依赖 ｜ GameData.get_level()/get_map()/get_rule()/get_wave_set()/terrain_def()、AppState.deck_ids/
##        validate_deck()、UiKit。无 host（只读数据，选中关卡由参数传入）。

var _list: VBoxContainer


static func create(parent: Control) -> LevelSelectDetail:
	var p := LevelSelectDetail.new()
	p._list = VBoxContainer.new()
	p._list.add_theme_constant_override("separation", 6)
	parent.add_child(p._list)
	return p


func refresh(selected_level: String) -> void:
	for c in _list.get_children():
		_list.remove_child(c)
		c.queue_free()
	var level := GameData.get_level(selected_level)
	var map_data := GameData.get_map(level.get("map", ""))
	var rule := GameData.get_rule(level.get("rule", ""))
	var wave_set := GameData.get_wave_set(level.get("wave_set", ""))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	row.add_child(UiKit.label("地图卡", UiKit.FS_SMALL, UiKit.TEXT_DIM))
	row.add_child(UiKit.label("%s　%s" % [map_data.get("id", ""), map_data.get("name", "")],
		UiKit.FS_BODY, UiKit.TEXT))
	row.add_child(UiKit.label("标准 %d / 支援 %d / 修饰 %d" % [
		(map_data.get("slots", {}) as Dictionary).get("standard", []).size(),
		(map_data.get("slots", {}) as Dictionary).get("support", []).size(),
		(map_data.get("slots", {}) as Dictionary).get("modifier", []).size()],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	_list.add_child(row)

	var terrain_names: Array[String] = []
	for tile in map_data.get("terrain", []):
		var def := GameData.terrain_def(String(tile.get("id", "")))
		var label := String(def.get("label", ""))
		if not terrain_names.has(label):
			terrain_names.append(label)
	_list.add_child(UiKit.label("地形：%s　｜　规则卡 %s（基地 %d / 起始能量 %d / 人口 %d）"
		% ["、".join(terrain_names), level.get("rule", ""), int(rule.get("base_hp", 20)),
		   int(rule.get("start_energy", 10)), int(rule.get("population_cap", 5))],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))

	var waves: Array = wave_set.get("waves", [])
	var lines: Array[String] = []
	for w in waves:
		var parts: Array[String] = []
		for comp in w.get("composition", []):
			parts.append("%s×%d" % [GameData.get_enemy(String(comp.get("enemy", ""))).get("name", ""),
				int(comp.get("count", 0))])
		lines.append("W%d %s" % [int(w.get("index", 0)), " + ".join(parts)])
	_list.add_child(UiKit.label("波次卡组 %s（合计威胁值 B=%d）：%s"
		% [wave_set.get("id", ""), int(wave_set.get("total_threat", 0)), "　".join(lines)],
		UiKit.FS_TINY, UiKit.TEXT_DIM))

	var deck_check := AppState.validate_deck(AppState.deck_ids)
	_list.add_child(UiKit.label("当前卡组 %d 张　%s" % [AppState.deck_ids.size(),
		"✅ 合法" if bool(deck_check["ok"]) else "❌ " + String(deck_check["reason"])],
		UiKit.FS_SMALL, UiKit.GREEN if bool(deck_check["ok"]) else UiKit.DANGER))
