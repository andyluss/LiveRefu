extends Node
## DemoDirector —— 把"一局完整流程"演一遍并录成视频。
##
## 为什么不用真人操作：录像要可复现、无人值守。本节点是**唯一的根场景**，
## 自己实例化各个界面（不用 `change_scene_to_file`，否则会把自己换掉），
## 按固定时间轴推进，并在底部叠加说明字幕。
##
## 时间轴用 `delta` 累加而不是墙钟：在 Godot 的 Movie Maker 模式（`--write-movie`）下，
## 引擎以固定帧率"能渲多快渲多快"，墙钟与游戏时间不再对应，只有 delta 是准的。
##
## 录制：
##   godot --path . --write-movie .rec/frames/frame.png res://scenes/tools/demo.tscn
##   （PNG 序列 → tools/make_video.swift 编码成 MP4）

const CAPTION_HEIGHT := 64.0

# 时间轴：{scene, seconds, caption, on_start, on_tick}
var _steps: Array = []
var _step_index: int = -1
var _step_time: float = 0.0
var _current: Node = null
var _finished := false

var _caption_label: Label
var _caption_panel: PanelContainer
var _progress_label: Label
var _battle: Battle = null
var _battle_screen: Node = null
var _autoplay_done := false
var _post_time := 0.0
var _last_wave := -1


func _ready() -> void:
	_build_overlay()
	_build_timeline()
	_advance()


func _build_overlay() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)

	_caption_panel = PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.04, 0.07, 0.11, 0.86)
	sb.set_corner_radius_all(10)
	sb.border_color = Color(0.37, 0.89, 0.82, 0.55)
	sb.set_border_width_all(1)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	_caption_panel.add_theme_stylebox_override("panel", sb)
	_caption_panel.position = Vector2(20, 1280 - CAPTION_HEIGHT - 12)
	_caption_panel.size = Vector2(680, CAPTION_HEIGHT)
	layer.add_child(_caption_panel)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	_caption_panel.add_child(row)
	_caption_label = Label.new()
	_caption_label.add_theme_font_size_override("font_size", 16)
	_caption_label.add_theme_color_override("font_color", Color("#F7FBFF"))
	_caption_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_caption_label.custom_minimum_size = Vector2(560, 0)
	row.add_child(_caption_label)
	_progress_label = Label.new()
	_progress_label.add_theme_font_size_override("font_size", 13)
	_progress_label.add_theme_color_override("font_color", Color("#5FE3D0"))
	row.add_child(_progress_label)


func _build_timeline() -> void:
	_steps = [
		{
			"scene": "res://scenes/ui/main_menu.tscn", "seconds": 4.5,
			"caption": "① 主菜单 — 卡片式塔防《节点防线》：铁砧联邦垂直切片（Godot 4.7 竖屏）",
		},
		{
			"scene": "res://scenes/ui/codex.tscn", "seconds": 5.0,
			"caption": "② 卡牌图鉴：直接复用美术出图卡面，图与数值同源（改卡表即改图）",
			"events": [
				{"at": 2.6, "caption": "② 图鉴也含敌方 6 原型（生命/攻击/攻速/移速/护甲/威胁值）与 6 张地图卡",
				 "run": func(node): pass},
			],
		},
		{
			"scene": "res://scenes/ui/level_select.tscn", "seconds": 6.5,
			"caption": "③ 关卡 = 地图卡 + 波次卡组 + 事件卡组 + 规则卡（doc 06）；教学关不开放挑战卡",
			"on_ready": func(node):
				# 先把 L1-2（开放挑战卡）选上，再挂两张挑战卡
				AppState.level_id = "L1-2"
				AppState.challenge_ids.clear()
				node.set("_selected_level", "L1-2")
				node.call("_refresh"),
			"events": [
				{"at": 1.6, "caption": "③ 挑战卡：难度也是卡——「加压」敌人生命 +30%，掉落 +15%",
				 "run": func(node):
					AppState.challenge_ids = ["CHL-01"]
					node.call("_refresh")},
				{"at": 3.2, "caption": "③ 再挂「疾行」移速 +25%、击杀返还 +50%；难度分合计 5 → 掉落 ×1.25",
				 "run": func(node):
					AppState.challenge_ids = ["CHL-01", "CHL-05"]
					node.call("_refresh")},
				{"at": 5.4, "caption": "③ 双流需要双入口地图：单入口的峡谷哨站会被白名单直接拦住",
				 "run": func(node): pass},
			],
		},
		{
			"scene": "res://scenes/ui/deck_builder.tscn", "seconds": 5.5,
			"caption": "④ 卡组编辑：20 张、同名最多 2 张、至少 2 个不同标签（doc 05）",
		},
		{
			"scene": "res://scenes/battle/battle.tscn", "seconds": 999.0, "battle": true,
			"caption": "⑤ 布防期 15s：起始能量 10、+1/s（这里用自动玩家演示布防与调度）",
			"events": [
				{"at": 1.0, "caption": "⑤ 点一下手牌看完整卡面（长按同理）：卡面数值与策划卡表同源",
				 "run": func(node): node.call("_show_card_detail", "ANV-T01")},
				{"at": 4.6, "caption": "⑤ 开始布防：先铺塔 → 再挂修饰卡 → 最后补支援（齿轮帮）",
				 "run": func(node): node.call("_close_modal")},
			],
			"wave_captions": [
				"小兵×8（威胁 16）——击杀返还能量，滚起第一波雪球",
				"快速×6 + 小兵×4（26）——冲刺 2s，沼泽地带会拖慢它们",
				"装甲×4 + 小兵×6（32）——护甲 5、减伤 20%，穿透与能量伤害更有效",
				"空中×5（20）——只有模块炮塔 / 交叉火力网能对空：这是硬检查点",
				"精英×2 + 小兵×8（32）——精英免疫 50% 减速；羁绊「火力网/加固阵列」此时已生效",
				"BOSS×1 + 小兵×6（32）——2200 生命 / 35 攻击 / 护甲 15，50% 血量放阶段技",
			],
			"finish_caption": "⑤ 结算：评级三维（基地生命 40% / 能量效率 30% / 组合触发 30%）+ 挑战卡难度分加成",
		},
	]


func _advance() -> void:
	_step_index += 1
	_step_time = 0.0
	if _step_index >= _steps.size():
		_finish()
		return
	var step: Dictionary = _steps[_step_index]
	if _current != null and is_instance_valid(_current):
		_current.queue_free()
	_current = null
	_battle = null
	_battle_screen = null
	_autoplay_done = false
	_post_time = 0.0
	_last_wave = -1
	_set_caption(String(step.get("caption", "")))
	var packed := load(String(step["scene"]))
	if packed == null:
		push_error("[Demo] 无法加载 %s" % step["scene"])
		_finish()
		return
	_current = packed.instantiate()
	add_child(_current)
	if bool(step.get("battle", false)):
		_battle_screen = _current
		_battle = _current.get("battle")
		AppState.speed_multiplier = 4.0
	if step.has("on_ready"):
		(step["on_ready"] as Callable).call(_current)


func _process(delta: float) -> void:
	if _finished or _current == null or not is_instance_valid(_current):
		return
	_step_time += delta
	var step: Dictionary = _steps[_step_index]

	# 时间轴上的事件（字幕切换 + 操作）
	for event in step.get("events", []):
		if not event.has("_fired") and _step_time >= float(event["at"]):
			event["_fired"] = true
			if event.has("caption"):
				_set_caption(String(event["caption"]))
			if event.has("run"):
				(event["run"] as Callable).call(_current)

	# 战斗步骤：自动打，打完停在结算弹窗上。
	# 字幕跟"当前波次"走而不是跟秒数走——倍速、平衡、出怪节奏怎么变都不会错位。
	if bool(step.get("battle", false)) and _battle != null:
		if _battle.phase == Battle.PHASE_WON or _battle.phase == Battle.PHASE_LOST:
			_autoplay_done = true
		if not _autoplay_done:
			var wave := int(_battle.stats["wave_reached"])
			if wave != _last_wave:
				_last_wave = wave
				var texts: Array = step.get("wave_captions", [])
				if wave >= 1 and wave <= texts.size():
					_set_caption("⑤ 第 %d 波 / %d — %s" % [wave, _battle.total_waves(), texts[wave - 1]])
			AutoPlayer.deploy(_battle)
			AutoPlayer.use_skills(_battle)
			AutoPlayer.take_draw(_battle)
			if _current.get("_modal") != null and _current.has_method("_close_modal"):
				_current.call("_close_modal")
		else:
			_post_time += delta
			if _post_time > 0.15 and _post_time < 0.3:
				_set_caption(String(step.get("finish_caption", "⑤ 结算")))
			if _post_time > 9.0:
				_finish()
				return
		return

	if _step_time >= float(step["seconds"]):
		_advance()


func _set_caption(text: String) -> void:
	if _caption_label != null:
		_caption_label.text = text
	if _progress_label != null:
		_progress_label.text = "%d/%d" % [_step_index + 1, _steps.size()]


func _finish() -> void:
	if _finished:
		return
	_finished = true
	print("[Demo] 演示结束（游戏内 %d 步）" % _steps.size())
	# 多等几帧，保证最后一帧被写进录像
	await get_tree().create_timer(0.4).timeout
	get_tree().quit(0)
