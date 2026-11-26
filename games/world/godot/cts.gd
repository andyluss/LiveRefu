extends Node

var failures := 0
var bytes: PackedByteArray

func _ready() -> void:
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("pack.data 不存在")
		get_tree().quit(2)
		return
	bytes = file.get_buffer(file.get_length())
	_test_lifecycle()
	_test_time_and_determinism()
	_test_input()
	_test_events()
	_test_views()
	_test_save()
	_test_bad_pack()
	print("CTS_RESULT failures=", failures)
	get_tree().quit(0 if failures == 0 else 1)

func check(name: String, ok: bool) -> void:
	print(("PASS " if ok else "FAIL "), name)
	if not ok:
		failures += 1

func make_world() -> WorldNode:
	var world := WorldNode.new()
	add_child(world)
	if not world.load_pack(bytes):
		push_error("CTS load_pack failed")
	return world

func run_600(world: WorldNode, with_inputs: bool = true) -> void:
	for i in range(600):
		if with_inputs:
			if i == 9: world.interact("player", "demo.airlock")
			if i == 19: world.pickup("player", "item.keycard")
			if i == 29: world.interact("player", "demo.airlock")
			if i == 39: world.talk("player", "demo.keeper")
		world.tick()

func _test_lifecycle() -> void:
	var world := make_world()
	check("L create/load", world != null)
	world.queue_free()

func _test_time_and_determinism() -> void:
	var a := make_world()
	var b := make_world()
	run_600(a, true)
	run_600(b, true)
	check("T 600 ticks", a.state_hash_hex() == "0xc840fe2090a0a085")
	check("D determinism", a.state_hash_hex() == b.state_hash_hex())
	a.queue_free()
	b.queue_free()

func _test_input() -> void:
	var world := make_world()
	for _i in range(10):
		world.set_move(1.0, 0.0)
		world.tick()
	check("I move", world.player_position().x > 0.1)
	world.queue_free()

func _test_events() -> void:
	var world := make_world()
	run_600(world, true)
	var kinds: Array = []
	for line in world.poll_events().split("\n"):
		if line.strip_edges().is_empty():
			continue
		var event = JSON.parse_string(line)
		if event is Dictionary:
			kinds.append(event.get("kind", ""))
	for expected in ["interact", "item_acquired", "dialogue_started", "talk"]:
		check("E event " + expected, kinds.has(expected))
	world.queue_free()

func _test_views() -> void:
	var world := make_world()
	world.interact("player", "demo.airlock")
	world.pickup("player", "item.keycard")
	world.tick()
	check("V view pool", world.sync_views() == 3)
	world.queue_free()

func _test_save() -> void:
	var world := make_world()
	run_600(world, true)
	var expected := world.state_hash_hex()
	var saved := world.save()
	var restored := make_world()
	check("S save bytes", saved.size() > 0)
	check("S load save", restored.load_save(saved))
	check("S hash roundtrip", restored.state_hash_hex() == expected)
	world.queue_free()
	restored.queue_free()

func _test_bad_pack() -> void:
	var bad := WorldNode.new()
	add_child(bad)
	check("X bad pack rejected", not bad.load_pack(PackedByteArray([1, 2, 3, 4])))
	bad.queue_free()
