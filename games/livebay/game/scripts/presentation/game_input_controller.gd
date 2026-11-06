# LiveBay · 输入控制器
# 把 InputEvent 翻译成 Main 语义动作；不直接改模拟状态。
class_name LiveBayGameInputController
extends RefCounted

const InputScript = preload("res://scripts/presentation/game_input.gd")

var host: Node
var tower_count := 3


func setup(host_node: Node, towers: int = 3) -> void:
	host = host_node
	tower_count = towers


func handle(event: InputEvent) -> void:
	if host == null or host.sim == null:
		return
	var action: Dictionary = InputScript.translate(event, host._slot_at, tower_count)
	match str(action.type):
		"hover":
			host.hover_slot = int(action.slot)
		"click_slot":
			host._click_slot(int(action.slot))
		"clear":
			host.selected_slot = -1
		"select_tower":
			host._select_tower(int(action.index))
		"start_wave":
			host._start_wave()
		"pause":
			host._toggle_pause()
		"speed":
			host._toggle_speed()
		"archive":
			host._show_archive(0)
		"map":
			host._show_map_picker()
		"mute":
			host._toggle_audio()
		"restart":
			host._restart()
		"upgrade":
			host._upgrade_selected()
		"sell":
			host._sell_selected()
