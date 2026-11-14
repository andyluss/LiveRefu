# LiveBay: Severed · 舱段模拟
# 纯逻辑：房间资源、故障、门、玩家状态、救援窗口。无渲染依赖。
class_name LiveBaySectionSim
extends RefCounted

var data: Dictionary = {}
var rooms: Dictionary = {}
var doors: Array = []
var room_order: Array = []
var events: Array = []
var event_index := 0

var elapsed := 0.0
var rescue_at := 720.0
var end_at := 900.0
var rescue_open := false
var rescue_warned := false

var battery := 100.0
var power_on := true
var suit_o2 := 100.0
var health := 100.0
var seal_kits := 3
var extinguishers := 1

var player_room := "corridor"
var npc: Dictionary = {}
var state := "playing" # playing / dead / evacuated / stayed / missed
var reason := ""
var stats := {"sealed": 0, "repaired": 0, "fires": 0, "rescued": 0, "power_toggles": 0}
var log: Array = []


func setup(section: Dictionary) -> void:
	data = section.duplicate(true)
	rescue_at = float(data.get("rescue_at", 720.0))
	end_at = float(data.get("end_at", 900.0))
	rooms.clear()
	room_order.clear()
	for r: Variant in data.get("rooms", []):
		var room: Dictionary = r.duplicate(true)
		room["sealed"] = false
		rooms[str(room.id)] = room
		room_order.append(str(room.id))
	doors = []
	for d: Variant in data.get("doors", []):
		doors.append(d.duplicate(true))
	npc = data.get("npc", {}).duplicate(true)
	events = data.get("events", []).duplicate(true)
	event_index = 0
	var items: Dictionary = data.get("items", {})
	battery = float(items.get("battery", 100.0))
	seal_kits = int(items.get("seal_kits", 3))
	extinguishers = int(items.get("extinguishers", 1))
	suit_o2 = 100.0
	health = 100.0
	elapsed = 0.0
	player_room = str(data.get("start_room", "corridor"))
	state = "playing"
	reason = ""
	stats = {"sealed": 0, "repaired": 0, "fires": 0, "rescued": 0, "power_toggles": 0}
	rescue_open = false
	rescue_warned = false
	log = []
	add_log("到达外环第七段。广播：局部异常，已按惯例处理。")


func room(id: String) -> Dictionary:
	return rooms.get(id, {})


func current_room() -> Dictionary:
	return room(player_room)


func step(dt: float) -> void:
	if state != "playing":
		return
	elapsed += dt
	_tick_events()
	_tick_power(dt)
	_tick_rooms(dt)
	_tick_player(dt)
	_tick_npc(dt)
	_tick_timer()
	_check_death()


func _tick_events() -> void:
	while event_index < events.size() and elapsed >= float(events[event_index].get("at", 99999.0)):
		var ev: Dictionary = events[event_index]
		event_index += 1
		var kind := str(ev.get("type", ""))
		if kind == "leak":
			var rid := str(ev.get("room", ""))
			if rooms.has(rid):
				rooms[rid]["leak"] = float(rooms[rid].get("leak", 0.0)) + float(ev.get("amount", 0.6))
		elif kind == "fire":
			var rid := str(ev.get("room", ""))
			if rooms.has(rid):
				rooms[rid]["fire"] = float(rooms[rid].get("fire", 0.0)) + float(ev.get("amount", 0.4))
		add_log(str(ev.get("text", "")))


func _tick_power(dt: float) -> void:
	if power_on:
		battery = maxf(0.0, battery - 0.25 * dt)
		if battery <= 0.0:
			power_on = false
			add_log("主电池耗尽。循环站、门和照明离线。")


func _tick_rooms(dt: float) -> void:
	for rid: String in room_order:
		var r: Dictionary = rooms[rid]
		var leak := float(r.get("leak", 0.0))
		var fire := float(r.get("fire", 0.0))
		# 生命维持：主电开启时缓慢补氧；断电则所有舱段消耗。
		if power_on:
			r["o2"] = minf(100.0, float(r.get("o2", 100.0)) + 0.55 * dt)
			r["pressure"] = minf(100.0, float(r.get("pressure", 100.0)) + 0.10 * dt)
		else:
			r["o2"] = maxf(0.0, float(r.get("o2", 100.0)) - 0.35 * dt)
		if leak > 0.0:
			r["pressure"] = maxf(0.0, float(r.get("pressure", 100.0)) - 2.2 * leak * dt)
			r["o2"] = maxf(0.0, float(r.get("o2", 100.0)) - 1.1 * leak * dt)
		if fire > 0.0:
			r["temp"] = float(r.get("temp", 22.0)) + 22.0 * fire * dt
			r["o2"] = maxf(0.0, float(r.get("o2", 100.0)) - 3.0 * fire * dt)
			r["fire"] = minf(2.0, fire + (0.02 * dt if r.get("o2", 0.0) > 5.0 else -0.5 * dt))
			if float(r.get("o2", 0.0)) <= 0.0:
				r["fire"] = 0.0
		else:
			r["temp"] = move_toward(float(r.get("temp", 22.0)), 22.0, 2.0 * dt)
		r["o2"] = clampf(float(r.get("o2", 100.0)), 0.0, 100.0)
		r["pressure"] = clampf(float(r.get("pressure", 100.0)), 0.0, 100.0)


func _tick_player(dt: float) -> void:
	suit_o2 = maxf(0.0, suit_o2 - 0.22 * dt)
	var r: Dictionary = current_room()
	if float(r.get("o2", 0.0)) < 12.0:
		health -= 2.0 * dt
	if float(r.get("pressure", 100.0)) < 15.0:
		health -= 2.5 * dt
	if float(r.get("temp", 22.0)) > 55.0:
		health -= 3.0 * dt
	if suit_o2 <= 0.0:
		health -= 3.0 * dt
	health = clampf(health, 0.0, 100.0)


func _tick_npc(dt: float) -> void:
	if npc.is_empty() or bool(npc.get("rescued", false)) or int(npc.get("health", 0)) <= 0:
		return
	var r: Dictionary = room(str(npc.get("room", "med")))
	if float(r.get("fire", 0.0)) > 0.0 or float(r.get("o2", 100.0)) < 15.0:
		npc["health"] = maxi(0, int(npc.get("health", 100)) - int(ceil(2.0 * dt)))
		if int(npc.health) <= 0:
			add_log("岚失去了生命体征。")


func _tick_timer() -> void:
	if not rescue_open and elapsed >= rescue_at:
		rescue_open = true
		add_log("救援船进入对接窗口。到救援对接臂按 E 撤离。")
	if elapsed >= end_at and state == "playing":
		finish("missed", "救援窗口关闭，未能撤离。")


func _check_death() -> void:
	if state != "playing":
		return
	if health <= 0.0:
		finish("dead", "伤情/缺氧导致死亡。")
	elif suit_o2 <= 0.0 and health <= 0.0:
		finish("dead", "suit 氧气耗尽。")


func finish(new_state: String, why: String) -> void:
	if state != "playing":
		return
	state = new_state
	reason = why
	add_log("班次结束：" + why)


func toggle_power() -> void:
	if battery <= 0.0 and not power_on:
		add_log("电池没有余量，无法复电。")
		return
	power_on = not power_on
	stats.power_toggles += 1
	add_log("主电已" + ("接通。" if power_on else "切断。"))


func seal_door(door_id: String) -> bool:
	if seal_kits <= 0:
		add_log("没有封条了。")
		return false
	for d: Dictionary in doors:
		if str(d.id) != door_id:
			continue
		if bool(d.get("sealed", false)):
			return false
		d["sealed"] = true
		d["open"] = false
		seal_kits -= 1
		stats.sealed += 1
		add_log("封门：" + door_id + "。")
		return true
	return false


func toggle_door(door_id: String) -> void:
	for d: Dictionary in doors:
		if str(d.id) == door_id:
			if bool(d.get("sealed", false)):
				add_log("门已封死，需要切割器才能打开。")
				return
			d["open"] = not bool(d.get("open", true))
			add_log("门已" + ("打开。" if bool(d.open) else "关闭。"))
			return


func repair_leak(room_id: String) -> bool:
	var r: Dictionary = room(room_id)
	if float(r.get("leak", 0.0)) <= 0.0:
		return false
	r["leak"] = 0.0
	stats.repaired += 1
	add_log("修补完成：" + str(r.get("name", room_id)) + " 压力不再下降。")
	return true


func extinguish(room_id: String) -> bool:
	var r: Dictionary = room(room_id)
	if float(r.get("fire", 0.0)) <= 0.0:
		return false
	if extinguishers <= 0:
		add_log("灭火器空了。")
		return false
	extinguishers -= 1
	r["fire"] = 0.0
	stats.fires += 1
	add_log("火已扑灭：" + str(r.get("name", room_id)) + "。烟仍在。")
	return true


func refill_suit() -> bool:
	if player_room != "life" or not power_on:
		return false
	suit_o2 = 100.0
	health = minf(100.0, health + 5.0)
	add_log("在循环站补充 suit 氧气。")
	return true


func rescue_npc() -> bool:
	if npc.is_empty() or bool(npc.get("rescued", false)) or int(npc.get("health", 0)) <= 0:
		return false
	if player_room != str(npc.get("room", "med")):
		return false
	npc["rescued"] = true
	npc["following"] = true
	stats.rescued += 1
	add_log("岚已获救。她会跟着你。")
	return true


func evacuate() -> bool:
	if player_room != "dock":
		add_log("需要到救援对接臂才能撤离。")
		return false
	if not rescue_open:
		add_log("救援船还没到。")
		return false
	finish("evacuated", "主动撤离。")
	return true


func stay() -> bool:
	if not rescue_open or player_room != "dock":
		return false
	finish("stayed", "救援离开，你选择留下。")
	return true


func add_log(text: String) -> void:
	if text.is_empty():
		return
	log.append({"t": elapsed, "text": text})
	if log.size() > 30:
		log.pop_front()
