extends RefCounted
class_name AssetSlots

static func load_glb(path: String) -> Node3D:
	var doc := GLTFDocument.new()
	var state := GLTFState.new()
	if doc.append_from_file(path, state) != OK:
		return null
	return doc.generate_scene(state)

static func load_scene(path: String) -> PackedScene:
	var node := load_glb(path)
	if node == null:
		return null
	var packed := PackedScene.new()
	if packed.pack(node) != OK:
		node.queue_free()
		return null
	node.queue_free()
	return packed
