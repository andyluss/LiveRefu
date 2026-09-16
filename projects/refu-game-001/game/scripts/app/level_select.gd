extends Control
## LevelSelect —— 关卡选择 + 挑战卡（doc 06 第三节：难度也是卡，局前自选）。
##
## 本文件只负责组装骨架（背景 / 标题 / 三段标题 / 底部动作）与转发刷新；
## 三段内容各自成文件：level_select/level_select_levels.gd（关卡列表）、
## level_select/level_select_challenges.gd（挑战卡）、level_select/level_select_detail.gd（关卡详情）。
##
## 对外契约（tools/demo_director.gd 会 set("_selected_level") 并 call("_refresh")）：
##   _selected_level、_refresh()

const CARD_W := 112.0

var _selected_level: String = ""
var _levels: LevelSelectLevels
var _challenges: LevelSelectChallenges
var _detail: LevelSelectDetail


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_selected_level = AppState.level_id
	_build()
	_refresh()


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = UiKit.BG_DEEP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	var root := VBoxContainer.new()
	root.position = Vector2(24, 24)
	root.size = Vector2(672, 1232)
	root.add_theme_constant_override("separation", 10)
	add_child(root)

	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 10)
	var back := UiKit.ghost_button("← 返回", UiKit.FS_SMALL, UiKit.LINE)
	back.custom_minimum_size = Vector2(96, 44)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/main_menu.tscn"))
	head.add_child(back)
	head.add_child(UiKit.label("选择关卡", UiKit.FS_H1, UiKit.TEXT))
	root.add_child(head)
	root.add_child(UiKit.label("关卡 = 地图卡 + 波次卡组 + 事件卡组 + 规则卡（doc 06）。",
		UiKit.FS_SMALL, UiKit.TEXT_DIM))

	_levels = LevelSelectLevels.create(self, root)

	root.add_child(UiKit.divider())
	root.add_child(UiKit.label("挑战卡（难度也是卡）", UiKit.FS_H2, UiKit.AMBER))
	_challenges = LevelSelectChallenges.create(self, root)

	root.add_child(UiKit.divider())
	_detail = LevelSelectDetail.create(root)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var deck := UiKit.ghost_button("编辑卡组", UiKit.FS_BODY, UiKit.LINE)
	deck.pressed.connect(func():
		AppState.level_id = _selected_level
		AppState.goto("res://scenes/ui/deck_builder.tscn"))
	actions.add_child(deck)
	var go := UiKit.button("开始战斗", UiKit.FS_BODY, UiKit.TEAL)
	go.pressed.connect(func():
		AppState.level_id = _selected_level
		AppState.start_battle())
	actions.add_child(go)
	root.add_child(actions)


## 选择关卡：记下选中项、清空已挂挑战卡（不同关卡白名单不同），再整体刷新。
func _select_level(lid: String) -> void:
	_selected_level = lid
	AppState.level_id = lid
	AppState.challenge_ids.clear()
	_refresh()


func _refresh() -> void:
	_levels.refresh(_selected_level)
	_challenges.refresh(_selected_level)
	_detail.refresh(_selected_level)
