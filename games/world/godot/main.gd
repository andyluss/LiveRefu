extends Node

func _ready() -> void:
	var file := FileAccess.open("res://pack.data", FileAccess.READ)
	if file == null:
		push_error("pack.data 不存在")
		get_tree().quit(2)
		return
	var bytes := file.get_buffer(file.get_length())
	var world := WorldNode.new()
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
	var actual := world.state_hash_hex()
	print("WORLD_HASH=", actual)
	if actual != "0xc840fe2090a0a085":
		push_error("hash mismatch: expected 0xc840fe2090a0a085")
		get_tree().quit(5)
		return
	var events := world.poll_events()
	print("WORLD_EVENTS=", events.length())
	var saved := world.save()
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
	world.queue_free()
	restored.queue_free()
	get_tree().quit(0)
