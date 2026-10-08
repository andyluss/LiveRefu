extends Control
class_name SettlementScreen
## 结算界面：**一局的闭环终点**——显示评级与关键事实，并给出下一步。
##
## 为什么它比"再打一次"重要：结算界面是唯一能把"这一局发生了什么"讲清楚的地方。
## 它必须回答三件事：**赢没赢 / 赢得多好 / 接下来去哪**。
## 评级不是装饰——它是"玩家有没有理解这个系统"的反馈（S 级意味着既铺得快又没被污染拖住）。
##
## 数据来源：[CampaignSelection].last_summary（由战斗场景写入）。
## 本文件**不改战斗状态**，只负责把已经发生的事讲清楚。

var _tokens: TokenSet
var _theme: Theme
var _summary: Dictionary
var _level_id: String

func _ready() -> void:
	var loaded := ThemeIo.load_or_build(false)
	_tokens = loaded[1]
	_theme = loaded[0]
	if _theme == null:
		return
	_summary = CampaignSelection.last_summary
	_level_id = CampaignSelection.level_id
	_record_progress()
	add_child(Shell.build(_theme, _tokens, _compose()))
	SfxHost.play("grade")

## 把这一局写进存档（**只有结算时才写**：战斗中途退出不该算通关）。
func _record_progress() -> void:
	if _summary.is_empty():
		return
	var cleared := bool(_summary.get("cleared", false))
	var progress := CampaignProgress.load_or_new()
	progress.record(_level_id, str(_summary.get("grade", "-")), cleared)

func _compose() -> Control:
	var root := VBoxContainer.new()
	root.theme = _theme
	root.add_theme_constant_override("separation", int(_tokens.spacing[3]))
	if _summary.is_empty():
		root.add_child(_text("没有可展示的结算（请先打一局）", "title-2", "--warn"))
		return root
	var cleared := bool(_summary.get("cleared", false))
	root.add_child(_text("通关" if cleared else "防线失守", "title-1", "--ok" if cleared else "--accent"))
	root.add_child(_text("评级 %s" % str(_summary.get("grade", "-")), "title-1", "--text"))
	root.add_child(_facts())
	root.add_child(_buttons(cleared))
	return root

## 关键事实：只列"玩家需要据此决定下一步"的数字。
func _facts() -> Control:
	var box := VBoxContainer.new()
	box.theme = _theme
	var rows := [
		["波次", "%d / %d" % [int(_summary.get("waves_cleared", 0)),
			int(_summary.get("waves_total", 0))]],
		["基地", "%d / %d" % [int(_summary.get("base_hp", 0)), int(_summary.get("base_hp_max", 0))]],
		["回合", str(int(_summary.get("turns", 0)))],
		["出牌", str(int(_summary.get("cards_played", 0)))],
		["残渣", str(int(_summary.get("residue_total", 0)))],
	]
	for row in rows:
		var line := HBoxContainer.new()
		line.theme = _theme
		var name_label := _text(str(row[0]), "caption", "--text-dim")
		name_label.custom_minimum_size = Vector2(90, 0)
		line.add_child(name_label)
		line.add_child(_text(str(row[1]), "title-2", "--text"))
		box.add_child(line)
	return box

## 下一步：重打 / 下一关 / 回战役。
func _buttons(cleared: bool) -> Control:
	var row := HBoxContainer.new()
	row.theme = _theme
	row.add_theme_constant_override("separation", int(_tokens.spacing[2]))
	row.add_child(_button("重打本关", _on_retry))
	var next_id := _next_level_id()
	if cleared and next_id != "":
		row.add_child(_button("下一关", func() -> void: _open(next_id)))
	row.add_child(_button("回到战役", _on_back))
	return row

func _button(text: String, handler: Callable) -> Button:
	var button := Button.new()
	button.theme = _theme
	button.text = text
	button.pressed.connect(handler)
	return button

func _on_retry() -> void:
	_open(_level_id)

func _on_back() -> void:
	get_tree().change_scene_to_file("res://scenes/app/level_select.tscn")

func _open(level_id: String) -> void:
	CampaignSelection.level_id = level_id
	get_tree().change_scene_to_file("res://scenes/app/battle.tscn")

## 下一关＝按 chapter/id 排序后本关的下一项（顺序口径与关卡选择界面一致）。
func _next_level_id() -> String:
	var catalog := CardCatalog.load_all()
	var ordered := LevelSelectScreen._ordered_level_ids((catalog[0] as CardCatalog).levels)
	var index := ordered.find(_level_id)
	if index < 0 or index + 1 >= ordered.size():
		return ""
	return ordered[index + 1]

func _text(text: String, level: String, color_token: String) -> Label:
	var label := Label.new()
	label.theme = _theme
	label.text = text
	label.theme_type_variation = StringName(level)
	label.add_theme_color_override("font_color", _tokens.color(color_token))
	return label
