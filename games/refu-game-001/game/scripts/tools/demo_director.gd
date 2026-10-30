extends Node
## DemoDirector —— 把"一局完整流程"演一遍并录成视频（**录像导演**）。
##
## 为什么不用真人操作：录像要可复现、无人值守。本节点是**唯一的根场景**，自己实例化各个
## 界面（不用 change_scene_to_file，否则会把自己换掉），按固定时间轴推进，并叠加字幕。
##
## 时间轴用 delta 累加而不是墙钟：Godot Movie Maker 模式下引擎以固定帧率"能渲多快渲多快"，
## 墙钟与游戏时间不再对应，只有 delta 是准的。
##
## 录制：tools/record_demo.sh（Godot 帧序列 → tools/make_video.swift 编 H.264 MP4）。
## 时间轴在 demo/demosteps_ui.gd 与 demo/demosteps_play.gd，字幕条在 demo/demo_overlay.gd。

var steps: Array = []
var step_index: int = -1
var step_time: float = 0.0
var current: Node = null
var finished := false
var labels: Dictionary = {}
var battle: Battle = null
var battle_screen: Node = null
var autoplay_done := false
var post_time := 0.0
var last_wave := -1


func _ready() -> void:
	labels = DemoOverlay.build(self)
	steps = DemoStepsUi.build_ui() + DemoStepsPlay.build_play()
	_advance()


func _advance() -> void:
	if DemoScene.advance(self, steps) == null:
		finish()


func _process(delta: float) -> void:
	if finished or current == null or not is_instance_valid(current):
		return
	step_time += delta
	var step: Dictionary = steps[step_index]
	_fire_events(step)
	if bool(step.get("battle", false)) and battle != null:
		if DemoBattleDriver.step(self, step, delta):
			finish()
		return
	if step_time >= float(step["seconds"]):
		_advance()


func _fire_events(step: Dictionary) -> void:
	DemoScene.fire_events(self, step)

func set_caption(text: String) -> void:
	DemoOverlay.set_text(labels, text, step_index, steps.size())


func finish() -> void:
	if finished:
		return
	finished = true
	print("[Demo] 演示结束（游戏内 %d 步）" % steps.size())
	# 多等几帧，保证最后一帧被写进录像
	await get_tree().create_timer(0.4).timeout
	get_tree().quit(0)
