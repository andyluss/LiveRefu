extends Node
## screenshot —— 在**带渲染器的真实运行**里截图（用于自动验收画面，不依赖 macOS 录屏权限）。
##
## 用法：
##   godot --path . res://scenes/tools/screenshot.tscn -- --scene=res://scenes/battle/battle.tscn \
##         --out=/abs/path/shot.png --frames=90 --wait=1.5
## 说明：--headless 没有真实渲染（dummy driver），截图会是空白，所以必须带窗口跑；
## 本工具跑完会自己 quit，适合在 CI/脚本里无人值守调用（窗口会一闪而过）。

var _target_scene := "res://scenes/ui/main_menu.tscn"
var _out_path := "user://screenshot.png"
var _frames := 60
var _wait := 1.0
var _clicks: Array = []
var _autoplay := 0.0        # >0 时用 AutoPlayer 自动打这一局，N 秒后再截图
var _speed := 1.0


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		var parts := String(arg).split("=", true, 1)
		if parts.size() != 2:
			continue
		match parts[0]:
			"--scene": _target_scene = parts[1]
			"--out": _out_path = parts[1]
			"--frames": _frames = int(parts[1])
			"--wait": _wait = float(parts[1])
			"--click": _clicks.append(parts[1])
			"--autoplay": _autoplay = float(parts[1])
			"--speed": _speed = float(parts[1])
	_run()


func _run() -> void:
	var packed := load(_target_scene)
	if packed == null:
		push_error("[screenshot] 无法加载场景：%s" % _target_scene)
		get_tree().quit(1)
		return
	var instance: Node = packed.instantiate()
	add_child(instance)
	# 等场景初始化（_ready + 首帧布局）
	for i in 8:
		await get_tree().process_frame
	# 自动打一局：让画面里真的有塔、有敌人、有弹道（否则截到的是空战场）
	if _autoplay > 0.0 and instance.get("battle") != null:
		AppState.speed_multiplier = maxf(1.0, _speed)
		await ShotAutoplay.run(get_tree(), instance, instance.get("battle"), _autoplay, _speed)
		if instance.has_method("_close_modal"):
			instance.call("_close_modal")
			instance.set("_paused", false)
			instance.call("_refresh_all")
		await get_tree().process_frame

	get_tree().quit(0 if ShotCapture.save_png(get_viewport(), _out_path) else 1)
