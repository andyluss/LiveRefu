extends RefCounted
class_name EnemyState
## EnemyState —— 一只敌方单位的**状态字段**（只有数据）。
## 与 EnemyUnit 分开的理由同 battle_state.gd：字段声明独立成文件，行为文件才不会超预算。

var uid: int = 0
var id: String = ""
var name: String = ""
var art: String = ""
var path_index: int = 0
var distance: float = 0.0          # 沿路径的里程（像素）
var base_speed: float = 0.0        # 移速换算后的 px/s（已含挑战卡倍率）
var hp: float = 0.0
var max_hp: float = 0.0
var shield: float = 0.0
var armor: float = 0.0
var alive: bool = true
var reached_end: bool = false
var spawn_time: float = 0.0
var flying: bool = false
var slow_resist: float = 0.0
var flat_reduction: float = 0.0
var dash_duration: float = 0.0
var dash_multiplier: float = 1.0
var phase_threshold: float = 0.0
var attack: float = 0.0
var attack_speed: float = 0.0
var attack_cd: float = 0.0
var attacking_uid: int = 0         # 正在攻击的阻挡单位/工事塔 uid（0 = 未交战）
var slows: Array = []              # [{value: -0.3, until: t, source: "..."}]
var corrosion_stacks: int = 0
var corrosion_until: float = -1.0
var damage_taken_bonus: float = 0.0   # 合流点等地形的易伤
var kill_energy: int = 1
var threat: int = 0
var damage_dealt_total: float = 0.0
var hit_flash_until: float = -1.0
