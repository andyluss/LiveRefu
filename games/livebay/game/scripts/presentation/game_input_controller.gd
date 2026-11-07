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
	var action: Dictionary = InputScript.translate(event, host.commands.slot_at, tower_count)
	match str(action.type):
		"hover":
			host.hover_slot = int(action.slot)
		"click_slot":
			host.commands.click_slot(int(action.slot))
		"clear":
			host.selected_slot = -1
		"select_tower":
			host.commands.select_tower(int(action.index))
		"start_wave":
			host.commands.start_wave()
		"pause":
			host.commands.toggle_pause()
		"speed":
			host.commands.toggle_speed()
		"archive":
			host.commands.show_archive(0)
		"map":
			host.commands.show_map_picker()
		"contract":
			host.commands.show_contracts()
		"residents":
			host.commands.show_residents()
		"lab":
			host.commands.show_lab()
		"home":
			host.commands.show_home()
		"quit":
			host.commands.request_quit()
		"mute":
			host.commands.toggle_audio()
		"restart":
			host.commands.restart()
		"upgrade":
			host.commands.upgrade_selected()
		"sell":
			host.commands.sell_selected()
