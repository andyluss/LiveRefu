extends Node

func _ready() -> void:
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("pack.data 不存在")
		get_tree().quit(2)
		return
	var bytes := file.get_buffer(file.get_length())
	var world := WorldNode.new()
	add_child(world)
	if not world.load_pack(bytes):
		push_error("WorldNode.load_pack failed")
		get_tree().quit(3)
		return
	for i in range(600):
		if i == 9:
			if not world.interact("player", "demo.airlock"):
				get_tree().quit(6)
				return
		if i == 19:
			if not world.pickup("player", "item.keycard"):
				get_tree().quit(6)
				return
		if i == 29:
			if not world.interact("player", "demo.airlock"):
				get_tree().quit(6)
				return
		if i == 39:
			if not world.talk("player", "demo.keeper"):
				get_tree().quit(6)
				return
		if world.tick() < 0:
			push_error("WorldNode.tick failed")
			get_tree().quit(4)
			return
	var views := world.sync_views()
	print("WORLD_VIEWS=", views)
	var actual := world.state_hash_hex()
	print("WORLD_HASH=", actual)
	if actual != "0x3606a221e9990561":
		push_error("hash mismatch: expected 0x3606a221e9990561")
		get_tree().quit(5)
		return
	var events := world.poll_events()
	print("WORLD_EVENTS=", events.length())
	var event_file := FileAccess.open("res://m2-events.jsonl", FileAccess.WRITE)
	if event_file != null:
		event_file.store_string(events)
	var saved := world.save()
	var save_file := FileAccess.open("res://m2-save.bin", FileAccess.WRITE)
	if save_file != null:
		save_file.store_buffer(saved)
	var cross_file := FileAccess.open("res://headless-save.json", FileAccess.READ)
	if cross_file != null:
		var cross := WorldNode.new()
		add_child(cross)
		if not cross.load_pack(bytes):
			push_error("cross-save load_pack failed")
			get_tree().quit(12)
			return
		if not cross.load_save(cross_file.get_buffer(cross_file.get_length())):
			push_error("cross-save load_save failed")
			get_tree().quit(13)
			return
		var cross_hash := cross.state_hash_hex()
		print("WORLD_CROSS_SAVE_HASH=", cross_hash)
		if cross_hash != actual:
			push_error("cross-save hash mismatch")
			get_tree().quit(14)
			return
		cross.queue_free()
	var restored := WorldNode.new()
	if not restored.load_pack(bytes):
		push_error("restored load_pack failed")
		get_tree().quit(7)
		return
	if not restored.load_save(saved):
		push_error("restored load_save failed")
		get_tree().quit(8)
		return
	var restored_hash := restored.state_hash_hex()
	print("WORLD_SAVE_HASH=", restored_hash)
	if restored_hash != actual:
		push_error("save/load hash mismatch")
		get_tree().quit(9)
		return
	var mover := WorldNode.new()
	add_child(mover)
	if not mover.load_pack(bytes):
		push_error("mover load_pack failed")
		get_tree().quit(11)
		return
	for _i in range(10):
		mover.set_move(1.0, 0.0)
		mover.tick()
	var moved_x := mover.player_position().x
	print("WORLD_MOVE_X=", moved_x)
	if moved_x < 0.1:
		push_error("player did not move")
		get_tree().quit(10)
		return
	world.queue_free()
	restored.queue_free()
	mover.queue_free()
	get_tree().quit(0)
