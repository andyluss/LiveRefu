extends Node

const Logic = preload("res://tetris_logic.gd")

var failures := 0

func check(name: String, value: bool) -> void:
	if value:
		print("PASS ", name)
	else:
		failures += 1
		push_error("FAIL " + name)

func _ready() -> void:
	var game = Logic.new(42)
	check("7-bag size", game.queue.size() >= 6)
	game.start(42)
	check("playing state", game.state == "playing")
	check("4 cells", game.get_cells().size() == 4)
	check("next queue", game.next_queue.size() == 5)
	game.current = {"type": "O", "rot": 0, "x": 4, "y": 0}
	var distance: int = game.hard_drop()
	check("hard drop distance", distance >= 0)
	check("board occupied", game.board.any(func(row): return row.any(func(cell): return cell != "")))
	game.board = []
	for y in range(Logic.ROWS):
		var row: Array = []
		for x in range(Logic.COLS):
			row.append("I" if y == Logic.ROWS - 1 else "")
		game.board.append(row)
	var cleared: Array = game.clear_lines()
	check("line clear", cleared.size() == 1 and game.board.size() == Logic.ROWS)
	check("7-bag unique", _bag_unique())
	check("ts pin false on T-move", _ts_check())

	var file := FileAccess.open("res://refuworld.pack.data", FileAccess.READ)
	check("pack exists", file != null)
	if file != null:
		var bytes := file.get_buffer(file.get_length())
		var world := WorldNode.new()
		add_child(world)
		check("RefuWorld load_pack", world.load_pack(bytes))
		world.tick()
		var raw_state := world.ui_state()
		var state = JSON.parse_string(raw_state)
		check("RefuWorld UI state", state is Dictionary)
		if state is Dictionary:
			check("L5 systems", state.get("systems", null) is Dictionary)
			check("L3 quests", state.get("quests", null) is Array and state["quests"].size() > 0)
		check("command_json set_flag", world.command_json(JSON.stringify({"op": "set_flag", "flag": "flag.tetris.first_clear", "value": true})))
		world.tick()
		var after = JSON.parse_string(world.ui_state())
		check("flag visible", after is Dictionary and after.get("flags", {}).get("flag.tetris.first_clear", false) == true)
		world.queue_free()

	var main_scene := preload("res://main.tscn").instantiate()
	add_child(main_scene)
	main_scene._start_run()
	check("UI start state", main_scene.game.state == "playing")
	check("UI holds RefuWorld", main_scene.world != null)
	main_scene.queue_free()

	if failures == 0:
		print("GODOT TETRIS TEST PASS")
	else:
		push_error("GODOT TETRIS TEST FAILED: %d" % failures)
	get_tree().quit(1 if failures > 0 else 0)

func _bag_unique() -> bool:
	var seen: Array = []
	for i in range(7):
		seen.append(Logic.TYPES[i])
	return seen.size() == 7

func _ts_check() -> bool:
	var game = Logic.new(42)
	game.start(42)
	game.board = []
	for y in range(20):
		var row: Array = []
		for x in range(10):
			row.append("")
		game.board.append(row)
	for cell in [[3,0],[5,0],[3,2],[5,2]]:
		game.board[cell[1]][cell[0]] = "I"
	game.current = {"type": "T", "rot": 1, "x": 3, "y": 0}
	game.last_action = "rotate"
	return game.tspin()
