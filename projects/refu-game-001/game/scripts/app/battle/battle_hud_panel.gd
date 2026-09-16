extends RefCounted
class_name BattleHudPanel
## 用途 ｜ 顶部 HUD 面板：基地生命 / 能量 / 波次与阶段 / 敌情与羁绊 / 倍速与暂停。
## 依赖 ｜ UiKit（色板与控件工厂）、Battle（只读查询）、BattleLayout、
##        BattleScreen（只用它的 _toggle_speed / _toggle_pause；为避免循环依赖，host 不加类型）。

var host
var battle: Battle = null

var _base_bar: ProgressBar
var _base_label: Label
var _energy_label: Label
var _wave_label: Label
var _phase_label: Label
var _speed_button: Button
var _enemies_label: Label
var _bonds_label: Label


static func create(host_ref) -> BattleHudPanel:
	var p := BattleHudPanel.new()
	p.host = host_ref
	p.battle = host_ref.battle
	p._build()
	return p


func _build() -> void:
	var hud := UiKit.panel(UiKit.BG_PANEL, 0, UiKit.LINE, 0)
	hud.position = Vector2(0, 0)
	hud.size = Vector2(BattleLayout.W, BattleLayout.HUD_H)
	hud.mouse_filter = Control.MOUSE_FILTER_PASS

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	hud.add_child(row)

	# 基地生命
	var base_box := VBoxContainer.new()
	base_box.custom_minimum_size = Vector2(200, 0)
	_base_label = UiKit.label("基地 20 / 20", UiKit.FS_SMALL, UiKit.TEXT)
	_base_bar = UiKit.bar(20, 20, UiKit.DANGER, 190, 12)
	base_box.add_child(_base_label)
	base_box.add_child(_base_bar)
	row.add_child(base_box)

	# 能量
	var energy_box := VBoxContainer.new()
	energy_box.custom_minimum_size = Vector2(96, 0)
	energy_box.add_child(UiKit.label("能量", UiKit.FS_TINY, UiKit.TEXT_DIM))
	_energy_label = UiKit.label("10", UiKit.FS_H1, UiKit.TEAL)
	energy_box.add_child(_energy_label)
	row.add_child(energy_box)

	# 波次 / 阶段
	var wave_box := VBoxContainer.new()
	wave_box.custom_minimum_size = Vector2(150, 0)
	_wave_label = UiKit.label("波次 1 / 6", UiKit.FS_BODY, UiKit.TEXT)
	_phase_label = UiKit.label("布防期 15s", UiKit.FS_SMALL, UiKit.AMBER)
	wave_box.add_child(_wave_label)
	wave_box.add_child(_phase_label)
	row.add_child(wave_box)

	# 场上敌人 / 羁绊
	var info_box := VBoxContainer.new()
	info_box.custom_minimum_size = Vector2(150, 0)
	_enemies_label = UiKit.label("敌人 0", UiKit.FS_TINY, UiKit.TEXT_DIM)
	_bonds_label = UiKit.label("羁绊 —", UiKit.FS_TINY, UiKit.PURPLE)
	info_box.add_child(_enemies_label)
	info_box.add_child(_bonds_label)
	row.add_child(info_box)

	# 控制
	var ctrl := HBoxContainer.new()
	ctrl.add_theme_constant_override("separation", 6)
	_speed_button = UiKit.ghost_button("1×", UiKit.FS_SMALL, UiKit.TEAL)
	_speed_button.custom_minimum_size = Vector2(56, 40)
	_speed_button.pressed.connect(func(): host._toggle_speed())
	ctrl.add_child(_speed_button)
	var pause_btn := UiKit.ghost_button("暂停", UiKit.FS_SMALL, UiKit.LINE)
	pause_btn.custom_minimum_size = Vector2(64, 40)
	pause_btn.pressed.connect(func(): host._toggle_pause())
	ctrl.add_child(pause_btn)
	row.add_child(ctrl)

	host.add_child(hud)


## 每帧刷新：基地/能量/波次/阶段/敌情/羁绊/倍速文案。
func refresh(speed: float) -> void:
	_base_bar.max_value = battle.base_hp_max
	_base_bar.value = battle.base_hp
	_base_label.text = "基地 %d / %d" % [int(battle.base_hp), int(battle.base_hp_max)]
	_energy_label.text = str(int(battle.energy))
	_wave_label.text = "波次 %d / %d" % [battle.current_wave_number(), battle.total_waves()]
	match battle.phase:
		Battle.PHASE_BUILD:
			_phase_label.text = "布防期 %.0fs" % battle.build_time_left()
			_phase_label.add_theme_color_override("font_color", UiKit.AMBER)
		Battle.PHASE_BREATH:
			_phase_label.text = "波间 %.0fs" % battle.build_time_left()
			_phase_label.add_theme_color_override("font_color", UiKit.TEAL)
		Battle.PHASE_WAVE:
			_phase_label.text = "交战中"
			_phase_label.add_theme_color_override("font_color", UiKit.DANGER)
		Battle.PHASE_DRAW:
			_phase_label.text = "调度中"
			_phase_label.add_theme_color_override("font_color", UiKit.PURPLE)
		_:
			_phase_label.text = "已结束"
	var alive := 0
	for e in battle.enemies:
		if e.alive:
			alive += 1
	_enemies_label.text = "敌 %d · 杀 %d · 漏 %d" % [alive, int(battle.stats["kills"]), int(battle.stats["leaks"])]
	if battle.active_bonds.is_empty():
		_bonds_label.text = "羁绊 —"
	else:
		var names: Array[String] = []
		for b in battle.active_bonds:
			names.append(String(b.get("name", "")))
		_bonds_label.text = "羁绊 " + "、".join(names)
	_speed_button.text = "%d×" % int(speed)
