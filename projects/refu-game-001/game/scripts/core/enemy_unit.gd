extends RefCounted
class_name EnemyUnit
## EnemyUnit —— 一个敌方单位的运行时状态（纯逻辑，不含任何渲染）。
##
## 数值来自 game/data/enemies.json（引自策划 数值/04 号文档），此处只做状态与结算。

var uid: int = 0
var id: String = ""
var name: String = ""
var art: String = ""

# --- 位置 ---
var path_index: int = 0
var distance: float = 0.0          # 沿路径的里程（像素）
var base_speed: float = 0.0        # 移速换算后的 px/s（已含挑战卡倍率）

# --- 生存 ---
var hp: float = 0.0
var max_hp: float = 0.0
var shield: float = 0.0
var armor: float = 0.0
var alive: bool = true
var reached_end: bool = false
var spawn_time: float = 0.0

# --- 特性 ---
var flying: bool = false
var slow_resist: float = 0.0
var flat_reduction: float = 0.0
var dash_duration: float = 0.0
var dash_multiplier: float = 1.0
var phase_threshold: float = 0.0
var phase_triggered: bool = false

# --- 攻击 ---
var attack: float = 0.0
var attack_speed: float = 0.0
var attack_cd: float = 0.0
var attacking_uid: int = 0         # 正在攻击的阻挡单位/工事塔 uid（0 = 未交战）

# --- 状态 ---
var slows: Array = []              # [{value: -0.3, until: t, source: "..."}]
var corrosion_stacks: int = 0
var corrosion_until: float = -1.0
var damage_taken_bonus: float = 0.0   # 合流点等地形的易伤
var field_damage_accum: float = 0.0

# --- 统计 ---
var kill_energy: int = 1
var threat: int = 0
var damage_dealt_total: float = 0.0
var hit_flash_until: float = -1.0


## 当前实际移速（px/s）：基础 ×（1 + 减速合计），并按特性削减减速效果。
## extra_slow 来自本 tick 叠加的"场"减速（地形沼泽、粘网、残留减速）。
func current_speed(now: float, slow_floor: float, dash_active: bool = false, extra_slow: float = 0.0) -> float:
	var slow_sum := extra_slow
	for s in slows:
		if s["until"] < 0.0 or s["until"] >= now:
			slow_sum += s["value"]
	# 免疫减速：只吃 (1 - 抗性) 的减速
	slow_sum *= (1.0 - clampf(slow_resist, 0.0, 1.0))
	slow_sum = maxf(slow_sum, slow_floor)
	var mul := 1.0 + slow_sum
	if dash_active:
		mul *= dash_multiplier
	return base_speed * maxf(mul, 0.05)


func is_dashing(now: float) -> bool:
	return dash_duration > 0.0 and now - spawn_time <= dash_duration


## 受伤倍率：腐蚀层数（每层 +3%，上限 5 层）+ 地形易伤。
func damage_multiplier(corrosion_per_stack: float) -> float:
	return 1.0 + corrosion_stacks * corrosion_per_stack + damage_taken_bonus


## 落到该单位身上的最终伤害（护甲平砍减免；能量伤害可无视部分护甲）。
## 返回 {hp_damage, shield_absorbed, killed}
func apply_damage(amount: float, opts: Dictionary, now: float, corrosion_per_stack: float) -> Dictionary:
	var ignore: float = opts.get("armor_ignore", 0.0)
	var effective_armor := armor * (1.0 - clampf(ignore, 0.0, 1.0))
	var raw := amount * damage_multiplier(corrosion_per_stack)
	var after_armor := maxf(1.0, raw - effective_armor)
	# 装甲原型的"减伤 20%"
	if flat_reduction > 0.0:
		after_armor = maxf(1.0, after_armor * (1.0 - flat_reduction))
	var shield_absorbed := 0.0
	if shield > 0.0:
		shield_absorbed = minf(shield, after_armor)
		shield -= shield_absorbed
		after_armor -= shield_absorbed
	hp -= after_armor
	hit_flash_until = now + 0.08
	if hp <= 0.0:
		hp = 0.0
		alive = false
	return {"hp_damage": after_armor, "shield_absorbed": shield_absorbed, "killed": not alive}


func hp_ratio() -> float:
	return 0.0 if max_hp <= 0.0 else clampf(hp / max_hp, 0.0, 1.0)
