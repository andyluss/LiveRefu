extends RefCounted
class_name TetrisGame
## Pure deterministic falling-block logic for the Godot Lab entry.
## No Node, no rendering. The UI passes milliseconds into update().

const COLS := 10
const ROWS := 20
const LOCK_DELAY_MS := 500
const MAX_LOCK_RESETS := 15
const TYPES := ["I", "J", "L", "O", "S", "T", "Z"]
const COLORS := {
	"I": Color("#5ee7ff"), "J": Color("#6b8cff"), "L": Color("#ffb45e"),
	"O": Color("#ffe36e"), "S": Color("#7ded9b"), "T": Color("#d38bff"), "Z": Color("#ff6d8f"),
}

const SHAPES := {
	"I": [
		[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
		[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
		[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
	],
	"J": [
		[[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
	],
	"L": [
		[[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
		[[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
	],
	"O": [
		[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
	],
	"S": [
		[[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
		[[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
		[[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
	],
	"T": [
		[[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
		[[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
	],
	"Z": [
		[[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
		[[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
	],
}

const JLSTZ_KICKS := {
	"0>1": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
	"1>0": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
	"1>2": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
	"2>1": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
	"2>3": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
	"3>2": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
	"3>0": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
	"0>3": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
}
const I_KICKS := {
	"0>1": [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
	"1>0": [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
	"1>2": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
	"2>1": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
	"2>3": [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
	"3>2": [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
	"3>0": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
	"0>3": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
}

class Bag extends RefCounted:
	var rng: RandomNumberGenerator
	var bag: Array = []
	func _init(source_rng: RandomNumberGenerator) -> void:
		rng = source_rng
		refill()
	func refill() -> void:
		bag = TYPES.duplicate()
		for i in range(bag.size() - 1, 0, -1):
			var j := rng.randi_range(0, i)
			var tmp = bag[i]
			bag[i] = bag[j]
			bag[j] = tmp
	func take() -> String:
		if bag.is_empty():
			refill()
		return str(bag.pop_back())

var rng := RandomNumberGenerator.new()
var bag: Bag
var board: Array = []
var state := "menu"
var score := 0
var lines := 0
var level := 1
var combo := -1
var b2b := 0
var current = null
var hold := ""
var can_hold := true
var queue: Array = []
var next_queue: Array = []
var gravity_acc := 0.0
var lock_timer := 0.0
var lock_resets := 0
var last_action := ""
var last_clear := {"rows": [], "count": 0, "tspin": false, "perfect": false, "b2b": false, "points": 0, "level_up": false}
var pieces := 0
var elapsed_ms := 0.0
var started_at := 0

func _init(seed_value: int = 0) -> void:
	rng.seed = seed_value if seed_value != 0 else Time.get_ticks_msec()
	reset()

func reset() -> void:
	board = []
	for y in range(ROWS):
		var row: Array = []
		for x in range(COLS):
			row.append("")
		board.append(row)
	state = "menu"
	score = 0
	lines = 0
	level = 1
	combo = -1
	b2b = 0
	current = null
	hold = ""
	can_hold = true
	queue = []
	next_queue = []
	gravity_acc = 0.0
	lock_timer = 0.0
	lock_resets = 0
	last_action = ""
	last_clear = {"rows": [], "count": 0, "tspin": false, "perfect": false, "b2b": false, "points": 0, "level_up": false}
	pieces = 0
	elapsed_ms = 0.0
	bag = Bag.new(rng)
	refill_queue()

func start(seed_value: int = -1) -> void:
	if seed_value >= 0:
		rng = RandomNumberGenerator.new()
		rng.seed = seed_value
	reset()
	state = "playing"
	started_at = Time.get_ticks_msec()
	spawn()

func refill_queue() -> void:
	while queue.size() < 6:
		queue.append(bag.take())
	next_queue = queue.slice(0, 5)

func take_next() -> String:
	var result := ""
	if queue.is_empty():
		result = bag.take()
	else:
		result = queue.pop_front()
	refill_queue()
	return result

func spawn(piece_type: String = "") -> bool:
	var kind := piece_type if piece_type != "" else take_next()
	var piece := {"type": kind, "rot": 0, "x": 3, "y": 0 if kind == "O" else -1}
	if collides(piece):
		current = piece
		state = "over"
		return false
	current = piece
	gravity_acc = 0.0
	lock_timer = 0.0
	lock_resets = 0
	last_action = "spawn"
	pieces += 1
	return true

func cells_of(piece: Dictionary) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var shape: Array = SHAPES[piece["type"]][piece["rot"]]
	for y in range(4):
		for x in range(4):
			if shape[y][x] == 1:
				out.append(Vector2i(piece["x"] + x, piece["y"] + y))
	return out

func collides(piece: Dictionary) -> bool:
	for cell in cells_of(piece):
		if cell.x < 0 or cell.x >= COLS or cell.y >= ROWS:
			return true
		if cell.y >= 0 and board[cell.y][cell.x] != "":
			return true
	return false

func grounded(piece = null) -> bool:
	var target = current if piece == null else piece
	if target == null:
		return false
	var next_piece: Dictionary = target.duplicate()
	next_piece["y"] += 1
	return collides(next_piece)

func move(dx: int) -> bool:
	if state != "playing" or current == null:
		return false
	var next_piece: Dictionary = current.duplicate()
	next_piece["x"] += dx
	if collides(next_piece):
		return false
	current = next_piece
	last_action = "move"
	reset_lock_if_grounded()
	return true

func rotate(dir: int = 1) -> bool:
	if state != "playing" or current == null:
		return false
	var from: int = current["rot"]
	var to := (from + dir + 4) % 4
	var kicks: Dictionary = I_KICKS if current["type"] == "I" else JLSTZ_KICKS
	var offsets: Array = kicks.get("%d>%d" % [from, to], [[0, 0]])
	for offset in offsets:
		var candidate: Dictionary = current.duplicate()
		candidate["rot"] = to
		candidate["x"] += offset[0]
		candidate["y"] += offset[1]
		if not collides(candidate):
			current = candidate
			last_action = "rotate"
			reset_lock_if_grounded()
			return true
	return false

func reset_lock_if_grounded() -> void:
	if grounded() and lock_resets < MAX_LOCK_RESETS:
		lock_timer = 0.0
		lock_resets += 1

func soft_drop() -> bool:
	if state != "playing" or current == null:
		return false
	var next_piece: Dictionary = current.duplicate()
	next_piece["y"] += 1
	if collides(next_piece):
		return false
	current = next_piece
	score += 1
	last_action = "drop"
	lock_timer = 0.0
	return true

func hard_drop() -> int:
	if state != "playing" or current == null:
		return 0
	var distance := 0
	while not collides(_offset_piece(current, 0, 1)):
		current["y"] += 1
		distance += 1
	score += distance * 2
	last_action = "harddrop"
	lock_piece()
	return distance

func _offset_piece(piece: Dictionary, dx: int, dy: int) -> Dictionary:
	var out: Dictionary = piece.duplicate()
	out["x"] += dx
	out["y"] += dy
	return out

func hold_piece() -> bool:
	if state != "playing" or current == null or not can_hold:
		return false
	var current_type: String = current["type"]
	if hold != "":
		var swap := hold
		hold = current_type
		can_hold = false
		spawn(swap)
	else:
		hold = current_type
		can_hold = false
		spawn()
	return true

func gravity_interval() -> float:
	var table := [800.0, 717.0, 633.0, 550.0, 467.0, 383.0, 300.0, 217.0, 133.0, 100.0, 83.0, 83.0, 83.0, 67.0, 67.0, 67.0, 50.0, 50.0, 50.0, 33.0]
	return table[mini(level - 1, table.size() - 1)]

func update(dt_ms: float) -> void:
	if state != "playing" or current == null:
		return
	elapsed_ms += dt_ms
	if grounded():
		lock_timer += dt_ms
		if lock_timer >= LOCK_DELAY_MS:
			lock_piece()
		return
	lock_timer = 0.0
	gravity_acc += dt_ms
	var interval := gravity_interval()
	while gravity_acc >= interval:
		gravity_acc -= interval
		if not collides(_offset_piece(current, 0, 1)):
			current["y"] += 1
			last_action = "gravity"
		else:
			break

func tspin() -> bool:
	if current == null or current["type"] != "T" or last_action != "rotate":
		return false
	var center_x: int = current["x"] + 1
	var center_y: int = current["y"] + 1
	var corners := 0
	for offset in [[-1,-1],[1,-1],[-1,1],[1,1]]:
		var x: int = center_x + offset[0]
		var y: int = center_y + offset[1]
		if x < 0 or x >= COLS or y >= ROWS or (y >= 0 and board[y][x] != ""):
			corners += 1
	return corners >= 3

func lock_piece() -> void:
	if current == null:
		return
	var is_tspin := tspin()
	var top_out := false
	for cell in cells_of(current):
		if cell.y < 0:
			top_out = true
		elif cell.y < ROWS and cell.x >= 0 and cell.x < COLS:
			board[cell.y][cell.x] = current["type"]
	var cleared := clear_lines()
	apply_score(cleared.size(), is_tspin)
	last_clear["rows"] = cleared
	current = null
	can_hold = true
	if top_out:
		state = "over"
		return
	spawn()

func clear_lines() -> Array:
	var rows: Array = []
	for y in range(ROWS):
		var full := true
		for x in range(COLS):
			if board[y][x] == "":
				full = false
				break
		if full:
			rows.append(y)
	if rows.is_empty():
		return rows
	var kept: Array = []
	for y in range(ROWS):
		if not rows.has(y):
			kept.append(board[y])
	while kept.size() < ROWS:
		var empty: Array = []
		for x in range(COLS):
			empty.append("")
		kept.push_front(empty)
	board = kept
	return rows

func apply_score(count: int, is_tspin: bool) -> void:
	var points := 0
	var difficult := false
	if count > 0:
		var bases := [0, 100, 300, 500, 800]
		var tspin_bases := [0, 800, 1200, 1600]
		points = (tspin_bases[count] if is_tspin and count < tspin_bases.size() else bases[count]) * level
		difficult = count == 4 or is_tspin
		if difficult and b2b > 0:
			points = int(points * 1.5)
		combo += 1
		if combo > 0:
			points += 50 * combo * level
		b2b = b2b + 1 if difficult else 0
		lines += count
		var old_level := level
		level = int(lines / 10) + 1
		last_clear = {"rows": [], "count": count, "tspin": is_tspin, "perfect": false, "b2b": difficult and b2b > 1, "points": points, "level_up": level > old_level}
	else:
		combo = -1
		b2b = 0
		last_clear = {"rows": [], "count": 0, "tspin": false, "perfect": false, "b2b": false, "points": 0, "level_up": false}
	if count > 0 and _board_empty():
		points += 2000 * level
		last_clear["perfect"] = true
	score += points
	last_clear["points"] = points

func _board_empty() -> bool:
	for row in board:
		for cell in row:
			if cell != "":
				return false
	return true

func ghost() -> Variant:
	if current == null:
		return null
	var y: int = current["y"]
	while not collides(_offset_piece(current, 0, y - current["y"] + 1)):
		y += 1
	var out: Dictionary = current.duplicate()
	out["y"] = y
	return out

func ghost_cells() -> Array:
	var target = ghost()
	return cells_of(target) if target != null else []

func get_cells() -> Array:
	return cells_of(current) if current != null else []

func pause() -> bool:
	if state == "playing":
		state = "paused"
		return true
	if state == "paused":
		state = "playing"
		return true
	return false
