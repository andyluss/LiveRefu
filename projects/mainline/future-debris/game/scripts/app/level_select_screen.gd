extends Control
class_name LevelSelectScreen
## 关卡选择：列出全部关卡，标出**已通关 / 可挑战 / 未解锁**与最好评级。
##
## 为什么需要它：此前"进哪一关"写死在代码里，玩家没有"我在打一条线"的感觉。
## 这张表就是战役的**可见形态**——它同时回答三件事：我打到哪了、下一关是什么、哪关我还能刷更高评级。
##
## 数据来源：[CampaignProgress]（存档）与关卡表；本文件不自己判断解锁规则。

var _progress: CampaignProgress
var _tokens: TokenSet
var _theme: Theme
var _font: Font
var _ordered: Array[String] = []
var _levels: Dictionary = {}

func _ready() -> void:
	var loaded := ThemeIo.load_or_build(false)
	_tokens = loaded[1]
	_theme = loaded[0]
	if _theme == null:
		return
	var catalog := CardCatalog.load_all()
	var catalog_data: CardCatalog = catalog[0]
	_levels = catalog_data.levels
	_ordered = _ordered_level_ids(_levels)
	_progress = CampaignProgress.load_or_new()
	add_child(Shell.build(_theme, _tokens, _compose()))

## 关卡顺序：先按 chapter，再按 id。**顺序是战役的一部分**，所以只在这里算一次。
static func _ordered_level_ids(levels: Dictionary) -> Array[String]:
	var pairs: Array = []
	for id in levels:
		pairs.append([int((levels[id] as LevelData).chapter), str(id)])
	pairs.sort_custom(func(a, b): return a[0] < b[0] if a[0] != b[0] else String(a[1]) < String(b[1]))
	var out: Array[String] = []
	for pair in pairs:
		out.append(str(pair[1]))
	return out

func _compose() -> Control:
	var root := VBoxContainer.new()
	root.theme = _theme
	root.add_theme_constant_override("separation", int(_tokens.spacing[2]))
	var header := Label.new()
	header.theme = _theme
	header.theme_type_variation = &"Title2"
	header.text = "战役 · 原子纪元　（已通关 %d / %d）" % [_progress.cleared.size(), _ordered.size()]
	root.add_child(header)
	_font = header.get_theme_font("font")
	var grid := GridContainer.new()
	grid.theme = _theme
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", int(_tokens.spacing[2]))
	grid.add_theme_constant_override("v_separation", int(_tokens.spacing[2]))
	for index in _ordered.size():
		grid.add_child(_card(index))
	root.add_child(grid)
	return root

## 一关的入口卡片：状态 + 名称 + 最好评级 + 按钮。
func _card(index: int) -> Control:
	var level_id := _ordered[index]
	var level: LevelData = _levels[level_id]
	var unlocked := CampaignProgress.is_unlocked(_progress, _ordered, index)
	var cleared := _progress.is_cleared(level_id)
	var panel := PanelContainer.new()
	panel.theme = _theme
	panel.custom_minimum_size = Vector2(300, 150)
	var box := VBoxContainer.new()
	box.theme = _theme
	panel.add_child(box)
	box.add_child(_label("第 %d 章 · %s" % [level.chapter, level.name], "title-2",
		"--text" if unlocked else "--text-faint"))
	var state := "已通关 · 最好 %s" % str(_progress.best_grade.get(level_id, "-")) if cleared \
		else ("可挑战" if unlocked else "未解锁（需先通关上一关）")
	box.add_child(_label(state, "caption", "--ok" if cleared else ("--warn" if unlocked else "--text-faint")))
	box.add_child(_label("波数 %d · 预算 %d" % [level.waves, level.budget], "caption", "--text-dim"))
	var button := Button.new()
	button.theme = _theme
	button.text = "挑战" if unlocked else "未解锁"
	button.disabled = not unlocked
	button.pressed.connect(_on_challenge.bind(level_id))
	box.add_child(button)
	return panel

func _label(text: String, level: String, color_token: String) -> Label:
	var label := Label.new()
	label.theme = _theme
	label.text = text
	label.theme_type_variation = StringName(level)
	label.add_theme_color_override("font_color", _tokens.color(color_token))
	return label

func _on_challenge(level_id: String) -> void:
	# 选择结果通过 autoload 传给战斗场景（场景切换不共享内存，必须走一处共享状态）
	CampaignSelection.level_id = level_id
	get_tree().change_scene_to_file("res://scenes/app/battle.tscn")
