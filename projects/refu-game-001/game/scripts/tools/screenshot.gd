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
		var battle: Battle = instance.get("battle")
		# 用墙钟时间估算"游戏内秒数"（本节点不参与 _process，get_process_delta_time 不可靠）
		var started := Time.get_ticks_msec()
		var iterations := 0
		while true:
			var elapsed := float(Time.get_ticks_msec() - started) / 1000.0 * maxf(1.0, _speed)
			if elapsed >= _autoplay or battle.phase == Battle.PHASE_WON or battle.phase == Battle.PHASE_LOST:
				break
			AutoPlayer.deploy(battle)
			AutoPlayer.use_skills(battle)
			AutoPlayer.take_draw(battle)
			# 波间调度弹窗会暂停战场（这是设计），自动打的时候要随手关掉
			if instance.get("_modal") != null and instance.has_method("_close_modal"):
				instance.call("_close_modal")
			iterations += 1
			await get_tree().process_frame
		# 打点：把关键状态打到日志，便于"截图 + 数字"一起核对
		print("[screenshot] 自动打了 %d 帧 / %.1fs 墙钟（speed=%.0f）" % [iterations,
			float(Time.get_ticks_msec() - started) / 1000.0, maxf(1.0, _speed)])
		print("[screenshot] 战况 t=%.1fs phase=%s energy=%d 塔=%d 敌=%d 杀=%d 漏=%d 基地=%d 手牌=%d 波=%d/%d"
			% [battle.t, battle.phase, int(battle.energy), battle.towers.size(),
			   battle.enemies.size(), int(battle.stats["kills"]), int(battle.stats["leaks"]),
			   int(battle.base_hp), battle.deck.hand.size(),
			   battle.current_wave_number(), battle.total_waves()])
		for tw in battle.towers:
			print("    · %s @(%.0f,%.0f) 伤害 %.0f 杀 %d" % [tw.name, tw.pos.x, tw.pos.y, tw.damage_dealt, tw.kills])
		# 关掉可能弹出的调度弹窗，截一张干净的战场
		if instance.has_method("_close_modal"):
			instance.call("_close_modal")
			instance.set("_paused", false)
			instance.call("_refresh_all")
		await get_tree().process_frame
	for click in _clicks:
		var xy := String(click).split(",")
		if xy.size() == 2:
			var pos := Vector2(float(xy[0]), float(xy[1]))
			var down := InputEventMouseButton.new()
			down.button_index = MOUSE_BUTTON_LEFT
			down.pressed = true
			down.position = pos
			Input.parse_input_event(down)
			await get_tree().process_frame
			var up := InputEventMouseButton.new()
			up.button_index = MOUSE_BUTTON_LEFT
			up.pressed = false
			up.position = pos
			Input.parse_input_event(up)
			for i in 6:
				await get_tree().process_frame
	if _wait > 0.0:
		await get_tree().create_timer(_wait).timeout
	for i in _frames:
		await get_tree().process_frame
	var image := get_viewport().get_texture().get_image()
	var err := image.save_png(_out_path)
	if err != OK:
		push_error("[screenshot] 保存失败 %s（err=%d）" % [_out_path, err])
		get_tree().quit(1)
		return
	print("[screenshot] 已保存 %s （%dx%d）" % [_out_path, image.get_width(), image.get_height()])
	get_tree().quit(0)
