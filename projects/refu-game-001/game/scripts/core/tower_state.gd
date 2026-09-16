extends RefCounted
class_name TowerState
## TowerState —— 一座塔 / 支援单位的**状态字段**（只有数据）。
## 与 TowerUnit 分开的理由同 battle_state.gd：GDScript 没有 partial class，
## 字段声明本身就有 30 行上下，混进行为里会让两边都超出行数预算。

var uid: int = 0
var card_id: String = ""
var name: String = ""
var card: Dictionary = {}
var slot_type: String = "standard"   # standard / support / modifier(不会成为塔) / path
var pos: Vector2 = Vector2.ZERO
var faction: String = "ANV"
var sub_faction: String = ""
var tags: Array[String] = []
var modifiers: Array = []            # [{card_id, def, choice}]
var base: Dictionary = {}            # 卡的 stats 原值（未修正）
var stats: Dictionary = {}           # 本 tick 的最终值
var buffs: Array = []                # [{stat, value, until, source, id}] 限时增益
var hp: float = 0.0
var max_hp: float = 0.0
var shield: float = 0.0
var shield_until: float = -1.0
var alive: bool = true
var expires_at: float = -1.0         # <0 表示常驻
var cd: float = 0.0
var target_uid: int = 0
var kills: int = 0
var damage_dealt: float = 0.0
var hit_flash_until: float = -1.0
var hook_stacks: Dictionary = {}     # key -> 累计层数（如 on_hit 攻速叠层）
var resonance_count: int = 0
