extends RefCounted
class_name TowerUnit
## TowerUnit —— 一座已放置的塔 / 支援单位 / 召唤物的运行时状态（纯逻辑）。
##
## 属性用"基础值 → 修正累加 → 最终值"的管线：每 tick 由 Battle 重算一次
## （塔数 ≤ 20，30Hz 下开销可忽略），这样增益的来源（修饰卡 / 羁绊 / 光环 /
## 技能 / 地形 / 挑战卡）彼此正交，删掉任一来源都不会让别的来源算错。

var uid: int = 0
var card_id: String = ""
var name: String = ""
var card: Dictionary = {}
var slot_type: String = "standard"   # standard / support / modifier(不会成为塔) / path
var pos: Vector2 = Vector2.ZERO
var faction: String = "ANV"
var sub_faction: String = ""

# 标签可变：ANV-X03「模块化基座」会给本塔附加标签，从而改变羁绊/光环判定
var tags: Array[String] = []

# 挂在塔上的修饰卡（组合法则一：同槽位多张修饰卡叠加，按声明顺序结算）
var modifiers: Array = []            # [{card_id, def, choice}]

# --- 属性 ---
var base: Dictionary = {}            # 卡的 stats 原值（未修正）
var stats: Dictionary = {}           # 本 tick 的最终值
var buffs: Array = []                # [{stat, value, until, source, id}] 限时增益

# --- 生存 ---
var hp: float = 0.0
var max_hp: float = 0.0
var shield: float = 0.0
var shield_until: float = -1.0
var alive: bool = true
var is_field: bool = false           # 工事/不攻击塔（有生命、可被攻击）
var build_time: float = 0.0
var expires_at: float = -1.0         # <0 表示常驻

# --- 战斗 ---
var cd: float = 0.0
var target_uid: int = 0
var kills: int = 0
var damage_dealt: float = 0.0
var hit_flash_until: float = -1.0

# --- 钩子计数（用于羁绊/评级与"组合触发次数"统计）---
var hook_stacks: Dictionary = {}     # key -> 累计层数（如 on_hit 攻速叠层）
var energy_returned: float = 0.0

# --- 光环/场（由 Battle 每 tick 重算）---
var aura_sources: Array = []         # 本 tick 生效的光环来源 id
var slow_field_sources: Array = []
var heal_field_sources: Array = []
var resonance_count: int = 0


func setup(uid_value: int, card_def: Dictionary, slot: String, position: Vector2) -> void:
	uid = uid_value
	card = card_def
	card_id = card_def.get("id", "")
	name = card_def.get("name", "")
	slot_type = slot
	pos = position
	faction = String(card_def.get("faction", "ANV"))
	# JSON 里的 null 取出来是 Nil，不能用带默认值的 get 兜住
	var sf = card_def.get("sub_faction")
	sub_faction = "" if sf == null else String(sf)
	base = (card_def.get("stats", {}) as Dictionary).duplicate(true)
	tags = []
	for t in card_def.get("tags", []):
		tags.append(String(t))
	max_hp = float(base.get("max_hp", 0.0))
	hp = max_hp
	is_field = max_hp > 0.0


func has_tag(tag: String) -> bool:
	return tags.has(tag)


func is_attacker() -> bool:
	return float(base.get("damage", 0.0)) > 0.0 and float(base.get("attack_speed", 0.0)) > 0.0


func attack_interval() -> float:
	var aps := float(stats.get("attack_speed", 0.0))
	return INF if aps <= 0.0 else 1.0 / aps


func hp_ratio() -> float:
	return 0.0 if max_hp <= 0.0 else clampf(hp / max_hp, 0.0, 1.0)


func add_buff(stat: String, value: float, until: float, source: String, buff_id: String = "") -> void:
	buffs.append({"stat": stat, "value": value, "until": until, "source": source, "id": buff_id})


## 施加伤害；返回 {killed, shield_broken}
func apply_damage(amount: float, now: float) -> Dictionary:
	var shield_broken := false
	var remaining := amount
	if shield > 0.0 and (shield_until < 0.0 or shield_until >= now):
		var absorbed := minf(shield, remaining)
		shield -= absorbed
		remaining -= absorbed
		if shield <= 0.0:
			shield_broken = true
	hp -= remaining
	hit_flash_until = now + 0.12
	if hp <= 0.0:
		hp = 0.0
		alive = false
	return {"killed": not alive, "shield_broken": shield_broken}


func heal(amount: float) -> float:
	if max_hp <= 0.0:
		return 0.0
	var before := hp
	hp = minf(max_hp, hp + amount)
	return hp - before
