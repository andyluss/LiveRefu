extends Node3D

const STEP := 1.0 / 60.0
var world: WorldNode
var accumulator := 0.0
var camera: Camera3D

func _ready() -> void:
	camera = $Camera
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("pack.data 不存在")
		return
	var bytes := file.get_buffer(file.get_length())
	world = WorldNode.new()
	add_child(world)
	if not world.load_pack(bytes):
		push_error("WorldNode.load_pack failed")
		return
	var ground := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(80, 80)
	ground.mesh = plane
	add_child(ground)
	world.sync_views()
	_update_camera()

func _process(delta: float) -> void:
	if world == null:
		return
	var move := Vector2.ZERO
	if Input.is_key_pressed(KEY_W): move.y -= 1.0
	if Input.is_key_pressed(KEY_S): move.y += 1.0
	if Input.is_key_pressed(KEY_A): move.x -= 1.0
	if Input.is_key_pressed(KEY_D): move.x += 1.0
	if Input.is_key_pressed(KEY_ESCAPE):
		get_tree().quit()
		return
	accumulator += delta
	while accumulator >= STEP:
		world.set_move(move.x, move.y)
		if world.tick() < 0:
			push_error("world tick failed")
			get_tree().quit(2)
			return
		accumulator -= STEP
	world.sync_views()
	_update_camera()

func _update_camera() -> void:
	var target := world.player_position()
	camera.position = target + Vector3(8, 8, 10)
	camera.look_at(target + Vector3(0, 0.8, 0), Vector3.UP)
