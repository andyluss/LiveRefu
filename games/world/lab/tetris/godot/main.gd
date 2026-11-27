extends Control
## NEON DRIFT · Godot adapter
## Same falling-block logic + same lab.tetris content as the web RefuWorld entry.
## RefuWorld layers: L0 fixed tick, L3 public objectives, L5 energy systems.

const Logic = preload("res://tetris_logic.gd")
const CELL := 36.0
const BOARD_POS := Vector2(470, 46)
const BOARD_SIZE := Vector2(360, 720)
const BG := Color("#070a12")
const BG_2 := Color("#0c1424")
const INK := Color("#eef8ff")
const DIM := Color("#8da6bd")
const FAINT := Color("#5f758c")
const CYAN := Color("#5ee7ff")
const PINK := Color("#ff6d9e")
const VIOLET := Color("#9b8cff")
const AMBER := Color("#ffc36a")
const GREEN := Color("#8cf0b0")
const LINE := Color(0.32, 0.75, 0.88, 0.16)
const DAS_MS := 150.0
const ARR_MS := 35.0
const SOFT_MS := 45.0

var game = null
var world: WorldNode
var pack_bytes: PackedByteArray
var seed_value := 0
var primary: Button
var refu_acc := 0.0
var refu_ticks := 0
var refu_state: Dictionary = {}
var systems: Dictionary = {}
var quests: Array = []
var quest_titles: Dictionary = {}
var loc: Dictionary = {}
var last_clear_key := ""
var das_dir := 0
var das_timer := 0.0
var arr_timer := 0.0
var soft_held := false
var soft_timer := 0.0
var message := "PRESS ENTER TO START"
var message_timer := 0.0
var refu_error := ""
var shot_path := ""
var shot_taken := false
var best_score := 0

func _ready() -> void:
	set_process(true)
	set_process_input(true)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shot="):
			shot_path = arg.trim_prefix("--shot=")
	seed_value = Time.get_ticks_msec() & 0x7fffffff
	game = Logic.new(seed_value)
	pack_bytes = FileAccess.get_file_as_bytes("res://refuworld.pack.data")
	if pack_bytes.is_empty():
		refu_error = "refuworld.pack.data missing"
	_connect_refu()
	_make_primary()
	_parse_refu()

func _connect_refu() -> void:
	if pack_bytes.is_empty():
		return
	world = WorldNode.new()
	add_child(world)
	if not world.load_pack(pack_bytes):
		refu_error = "WorldNode.load_pack failed"
		world = null
		return
	world.tick()
	refu_ticks = 1
	_parse_refu()

func _start_run() -> void:
	if world != null:
		world.queue_free()
		world = null
	_connect_refu()
	game.start(seed_value)
	last_clear_key = ""
	message = "L0 TICK · L3 OBJECTIVES · L5 GRID"
	message_timer = 2.2
	primary.hide()

func _restart_run() -> void:
	_start_run()

func _on_primary() -> void:
	if game.state == "paused":
		game.pause()
		primary.hide()
	elif game.state == "menu" or game.state == "over":
		_start_run()

func _make_primary() -> void:
	primary = Button.new()
	primary.text = "START RUN"
	primary.position = Vector2(550, 405)
	primary.size = Vector2(200, 46)
	primary.focus_mode = Control.FOCUS_NONE
	primary.add_theme_font_size_override("font_size", 14)
	primary.add_theme_color_override("font_color", BG)
	primary.add_theme_color_override("font_hover_color", BG)
	var normal := StyleBoxFlat.new()
	normal.bg_color = CYAN
	normal.set_corner_radius_all(23)
	normal.content_margin_left = 18
	normal.content_margin_right = 18
	primary.add_theme_stylebox_override("normal", normal)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color("#8df2ff")
	primary.add_theme_stylebox_override("hover", hover)
	primary.pressed.connect(_on_primary)
	add_child(primary)

func _process(delta: float) -> void:
	if game == null:
		return
	if world != null and (game.state == "playing" or game.state == "menu"):
		refu_acc += delta
		var step := 1.0 / 60.0
		var guard := 0
		while refu_acc >= step and guard < 4:
			world.tick()
			refu_ticks += 1
			refu_acc -= step
			guard += 1
		if refu_ticks % 4 == 0:
			_parse_refu()
	if game.state == "playing":
		_update_held(delta)
		game.update(delta * 1000.0 * _gravity_multiplier())
		_detect_clear()
		message_timer = maxf(0.0, message_timer - delta)
	if message_timer <= 0.0 and game.state == "playing":
		message = "SRS · HOLD · T-SPIN · B2B"
	if game.score > best_score:
		best_score = game.score
		var config := ConfigFile.new()
		config.set_value("score", "best", best_score)
		config.save("user://neon_drift.cfg")
	if shot_path != "" and not shot_taken and refu_ticks >= 45:
		shot_taken = true
		var image := get_viewport().get_texture().get_image()
		image.save_png(shot_path)
		get_tree().quit()
	queue_redraw()

func _update_held(delta: float) -> void:
	if das_dir != 0:
		das_timer += delta * 1000.0
		if das_timer >= DAS_MS:
			arr_timer += delta * 1000.0
			while arr_timer >= ARR_MS:
				arr_timer -= ARR_MS
				if game.move(das_dir):
					pass
	if soft_held:
		soft_timer += delta * 1000.0
		while soft_timer >= SOFT_MS:
			soft_timer -= SOFT_MS
			game.soft_drop()

func _input(event: InputEvent) -> void:
	if game == null or not (event is InputEventKey):
		return
	var key := event as InputEventKey
	if not key.pressed:
		if key.keycode == KEY_LEFT or key.keycode == KEY_RIGHT:
			das_dir = 0
			das_timer = 0.0
			arr_timer = 0.0
		elif key.keycode == KEY_DOWN:
			soft_held = false
		return
	if key.echo:
		return
	match key.keycode:
		KEY_ENTER, KEY_SPACE:
			if game.state == "menu" or game.state == "over":
				_start_run()
				return
			if game.state == "paused":
				game.pause()
				primary.hide()
				return
			if key.keycode == KEY_SPACE:
				game.hard_drop()
				message = "HARD DROP"
		KEY_LEFT:
			das_dir = -1
			das_timer = 0.0
			arr_timer = 0.0
			game.move(-1)
		KEY_RIGHT:
			das_dir = 1
			das_timer = 0.0
			arr_timer = 0.0
			game.move(1)
		KEY_DOWN:
			soft_held = true
			soft_timer = 0.0
			game.soft_drop()
		KEY_X, KEY_UP:
			game.rotate(1)
		KEY_Z:
			game.rotate(-1)
		KEY_C:
			game.hold_piece()
		KEY_P, KEY_ESCAPE:
			if game.state == "playing" or game.state == "paused":
				game.pause()
				primary.text = "RESUME" if game.state == "paused" else "START RUN"
				primary.visible = game.state == "paused"
		KEY_R:
			_restart_run()

func _parse_refu() -> void:
	if world == null:
		return
	var parsed = JSON.parse_string(world.ui_state())
	if not (parsed is Dictionary):
		return
	refu_state = parsed
	systems = parsed.get("systems", {})
	quests = parsed.get("quests", [])
	quest_titles = {}
	loc = {}

func _gravity_multiplier() -> float:
	if systems.is_empty():
		return 1.0
	var battery := float(systems.get("battery_kwh", 100.0))
	if battery < 24.0:
		return 1.24
	if battery < 48.0:
		return 1.12
	return 1.0

func _detect_clear() -> void:
	var count := int(game.last_clear.get("count", 0))
	if count <= 0:
		return
	var key := "%d:%d:%d" % [game.pieces, count, int(game.last_clear.get("points", 0))]
	if key == last_clear_key:
		return
	last_clear_key = key
	if world != null:
		_send_flag("flag.tetris.first_clear")
		if count == 4:
			_send_flag("flag.tetris.tetris")
		if float(systems.get("battery_kwh", 100.0)) < 48.0:
			_send_flag("flag.tetris.power_saved")
	var tspin := bool(game.last_clear.get("tspin", false))
	if tspin:
		message = "T-SPIN +%d" % int(game.last_clear.get("points", 0))
	elif count == 4:
		message = "TETRIS +%d" % int(game.last_clear.get("points", 0))
	else:
		message = "%s +%d" % [["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS"][count], int(game.last_clear.get("points", 0))]
	message_timer = 1.8
	if bool(game.last_clear.get("level_up", false)):
		message = "LEVEL %02d · SPEED UP" % game.level

func _send_flag(flag_name: String) -> void:
	world.command_json(JSON.stringify({"op": "set_flag", "flag": flag_name, "value": true}))

func _draw() -> void:
	draw_rect(Rect2(0, 0, 1280, 800), BG)
	_draw_background()
	_draw_header()
	_draw_board()
	_draw_hold()
	_draw_next()
	_draw_right_panels()
	_draw_overlay()
	_draw_footer()

func _draw_background() -> void:
	draw_circle(Vector2(120, 160), 240, Color(0.36, 0.30, 0.85, 0.10))
	draw_circle(Vector2(1160, 90), 260, Color(0.22, 0.78, 0.92, 0.08))
	draw_circle(Vector2(850, 820), 300, Color(0.95, 0.28, 0.55, 0.07))
	for x in range(0, 1281, 48):
		draw_line(Vector2(x, 0), Vector2(x, 800), Color(0.32, 0.75, 0.88, 0.035))
	for y in range(0, 801, 48):
		draw_line(Vector2(0, y), Vector2(1280, y), Color(0.32, 0.75, 0.88, 0.035))

func _draw_header() -> void:
	_text("NEON DRIFT", Vector2(64, 48), 22, INK)
	_text("GODOT LAB / REFUWORLD L0 · L3 · L5", Vector2(64, 68), 10, CYAN)
	_text("SAME PACK · SAME RULES · DIFFERENT HOST", Vector2(1216, 46), 9, FAINT, HORIZONTAL_ALIGNMENT_RIGHT)
	_text("SCORE", Vector2(64, 110), 9, FAINT)
	_text("%d" % game.score, Vector2(64, 148), 30, INK)
	_text("BEST   %d" % best_score, Vector2(64, 168), 10, AMBER)
	_text("LEVEL %02d" % game.level, Vector2(64, 206), 10, DIM)
	_text("LINES %d" % game.lines, Vector2(64, 224), 10, DIM)
	_text("TICK %d" % refu_ticks, Vector2(64, 242), 9, FAINT)

func _draw_board() -> void:
	_panel(Rect2(BOARD_POS - Vector2(8, 8), BOARD_SIZE + Vector2(16, 16)), BG_2, LINE, 16)
	for x in range(Logic.COLS + 1):
		var px := BOARD_POS.x + x * CELL
		draw_line(Vector2(px, BOARD_POS.y), Vector2(px, BOARD_POS.y + BOARD_SIZE.y), LINE)
	for y in range(Logic.ROWS + 1):
		var py := BOARD_POS.y + y * CELL
		draw_line(Vector2(BOARD_POS.x, py), Vector2(BOARD_POS.x + BOARD_SIZE.x, py), LINE)
	for y in range(Logic.ROWS):
		for x in range(Logic.COLS):
			var kind: String = game.board[y][x]
			if kind != "":
				_block(BOARD_POS + Vector2(x * CELL, y * CELL), CELL, Logic.COLORS[kind])
	if game.state == "playing" or game.state == "paused":
		for cell in game.ghost_cells():
			if cell.y >= 0:
				draw_rect(Rect2(BOARD_POS + Vector2(cell.x * CELL + 3, cell.y * CELL + 3), Vector2(CELL - 6, CELL - 6)), Color(Logic.COLORS[game.current["type"]], 0.30), false, 2.0)
		for cell in game.get_cells():
			if cell.y >= 0:
				_block(BOARD_POS + Vector2(cell.x * CELL, cell.y * CELL), CELL, Logic.COLORS[game.current["type"]])

func _draw_hold() -> void:
	_panel(Rect2(64, 275, 300, 145), Color(0.04, 0.07, 0.12, 0.78), LINE, 14)
	_text("HOLD", Vector2(82, 300), 9, FAINT)
	if game.hold != "":
		_draw_piece_rect(game.hold, Rect2(64, 305, 300, 100), 28)

func _draw_next() -> void:
	_panel(Rect2(64, 435, 300, 335), Color(0.04, 0.07, 0.12, 0.78), LINE, 14)
	_text("NEXT / 5", Vector2(82, 460), 9, FAINT)
	for i in range(mini(5, game.next_queue.size())):
		_draw_piece_rect(game.next_queue[i], Rect2(64, 470 + i * 58, 300, 54), 13)

func _draw_right_panels() -> void:
	_panel(Rect2(890, 90, 326, 190), Color(0.04, 0.07, 0.12, 0.78), LINE, 14)
	_text("SCORE", Vector2(912, 118), 9, FAINT)
	_text("%d" % game.score, Vector2(912, 158), 30, INK)
	_text("BEST   %d" % best_score, Vector2(912, 182), 10, AMBER)
	_panel(Rect2(890, 298, 326, 96), Color(0.04, 0.07, 0.12, 0.78), LINE, 14)
	_text("STREAK", Vector2(912, 324), 9, FAINT)
	_text("COMBO  %s" % ("x%d" % game.combo if game.combo > 0 else "-"), Vector2(912, 350), 11, DIM)
	_text("B2B    %s" % ("x%d" % game.b2b if game.b2b > 1 else "-"), Vector2(912, 370), 11, DIM)
	_panel(Rect2(890, 412, 326, 358), Color(0.04, 0.07, 0.12, 0.78), Color(0.95, 0.65, 0.28, 0.45), 14)
	_text("RW CORE / L3 + L5", Vector2(912, 440), 9, AMBER)
	_text("CORE LINKED" if world != null else "CORE OFFLINE", Vector2(912, 466), 9, CYAN if world != null else PINK)
	var battery := float(systems.get("battery_kwh", 0.0))
	var solar := float(systems.get("solar_kw", 0.0))
	var wind := float(systems.get("wind_kw", 0.0))
	var load := float(systems.get("load_kw", 0.0))
	_text("GRAVITY  %.2fx" % _gravity_multiplier(), Vector2(912, 496), 10, INK)
	_text("BATTERY  %.0f kWh" % battery, Vector2(912, 518), 10, INK)
	draw_rect(Rect2(912, 526, 280, 4), Color(1, 1, 1, 0.10))
	draw_rect(Rect2(912, 526, 280 * clampf(battery / 120.0, 0.0, 1.0), 4), AMBER)
	_text("SOLAR %.0f kW   WIND %.0f kW" % [solar, wind], Vector2(912, 550), 9, DIM)
	_text("LOAD  %.0f kW   %s" % [load, str(systems.get("weather", "clear"))], Vector2(912, 568), 9, DIM)
	_text("L3 OBJECTIVES", Vector2(912, 602), 9, FAINT)
	var objective_labels := [
		["flag:flag.tetris.first_clear", "CLEAR 1 LINE"],
		["flag:flag.tetris.tetris", "MAKE A TETRIS"],
		["flag:flag.tetris.power_saved", "CLEAR ON LOW BATTERY"],
	]
	var progress: Dictionary = {}
	for entry in quests:
		if entry is Dictionary and entry.get("progress"):
			progress = entry.get("progress")
			break
	var yy := 626.0
	for pair in objective_labels:
		var done := bool(progress.get(pair[0], false))
		_text(("✓ " if done else "● ") + pair[1], Vector2(912, yy), 9, GREEN if done else FAINT)
		yy += 20.0
	_text("ENTER  START / PAUSE", Vector2(912, 746), 8, FAINT)

func _draw_overlay() -> void:
	if game.state == "playing":
		return
	draw_rect(Rect2(BOARD_POS, BOARD_SIZE), Color(0.015, 0.025, 0.045, 0.82))
	var title := "NEON DRIFT"
	var sub := "PRESS START TO DROP"
	if game.state == "paused":
		title = "PAUSED"
		sub = "SIGNAL HELD · PRESS RESUME"
		primary.text = "RESUME"
	elif game.state == "over":
		title = "GAME OVER"
		sub = "SCORE %d · %d LINES" % [game.score, game.lines]
		primary.text = "RESTART"
	else:
		primary.text = "START RUN"
	_text_centered(title, 315, 34, INK)
	_text_centered(sub, 348, 12, DIM)
	primary.visible = true

func _draw_footer() -> void:
	_text("MOVE ← →   ROTATE Z / X   SOFT ↓   HARD SPACE   HOLD C   PAUSE P   RESTART R", Vector2(64, 788), 9, FAINT)
	_text("SEED %08X · PACK lab.tetris" % seed_value, Vector2(1216, 788), 8, FAINT, HORIZONTAL_ALIGNMENT_RIGHT)
	if refu_error != "":
		_text(refu_error, Vector2(470, 798), 9, PINK)

func _draw_piece_rect(kind: String, rect: Rect2, cell: float) -> void:
	var shape: Array = Logic.SHAPES[kind][0]
	var xs: Array = []
	var ys: Array = []
	for y in range(4):
		for x in range(4):
			if shape[y][x] == 1:
				xs.append(x)
				ys.append(y)
	if xs.is_empty():
		return
	var min_x: int = xs.min()
	var max_x: int = xs.max()
	var min_y: int = ys.min()
	var max_y: int = ys.max()
	var w := (max_x - min_x + 1) * cell
	var h := (max_y - min_y + 1) * cell
	var origin := rect.position + Vector2((rect.size.x - w) / 2.0, (rect.size.y - h) / 2.0)
	for y in range(4):
		for x in range(4):
			if shape[y][x] == 1:
				_block(origin + Vector2((x - min_x) * cell, (y - min_y) * cell), cell, Logic.COLORS[kind])

func _block(pos: Vector2, size: float, color: Color) -> void:
	var inner := Rect2(pos + Vector2(3, 3), Vector2(size - 6, size - 6))
	draw_rect(Rect2(pos + Vector2(1, 1), Vector2(size - 2, size - 2)), Color(color, 0.13))
	draw_rect(inner, color)
	draw_rect(Rect2(inner.position + Vector2(4, 4), Vector2(inner.size.x - 8, 4)), Color(1, 1, 1, 0.28))
	draw_rect(Rect2(inner.position + Vector2(4, inner.size.y - 8), Vector2(inner.size.x - 8, 4)), Color(0, 0, 0, 0.18))

func _panel(rect: Rect2, fill: Color, border: Color, radius: int) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = fill
	box.border_color = border
	box.set_border_width_all(1)
	box.set_corner_radius_all(radius)
	draw_style_box(box, rect)

func _text(value: String, pos: Vector2, font_size: int, color: Color, align := HORIZONTAL_ALIGNMENT_LEFT) -> void:
	var font := ThemeDB.fallback_font
	draw_string(font, pos, value, align, -1, font_size, color)

func _text_centered(value: String, y: float, font_size: int, color: Color) -> void:
	var font := ThemeDB.fallback_font
	var w := font.get_string_size(value, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	draw_string(font, Vector2(640 - w / 2.0, y), value, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, color)
