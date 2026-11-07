# LiveBay · App 路由器
# 根页面：home / lab / game；页面切换，而不是 overlay 叠加。
extends Control

const HomePageScript = preload("res://scripts/presentation/home_page.gd")
const LabPageScript = preload("res://scripts/presentation/lab_page.gd")
const GameScene = preload("res://scenes/main.tscn")

var page_host: Control
var current: Node
var current_route := ""


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	page_host = Control.new()
	page_host.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	page_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(page_host)
	open_home()


func open_home() -> void:
	_swap(HomePageScript.new(), "home")


func open_lab() -> void:
	_swap(LabPageScript.new(), "lab")


func open_game(lab_scenario: Dictionary = {}) -> void:
	var game := GameScene.instantiate()
	game.router = self
	game.launch_lab = lab_scenario
	_swap(game, "game")


func _swap(next: Node, route: String) -> void:
	if current != null:
		current.queue_free()
		current = null
	# 页面自建前先挂到树上，保证 _ready 能拿到 viewport/theme。
	current = next
	current_route = route
	page_host.add_child(next)
	if next is Control:
		next.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	if next.has_method("setup"):
		next.setup(self)
