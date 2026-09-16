extends RefCounted
class_name BattleState
## BattleState —— 一局战斗的**状态容器**（只有数据，没有逻辑）。
##
## 为什么数据与逻辑要分文件：GDScript 没有 partial class，而"一局战斗"的状态字段本身
## 就有 40 行上下；把字段与算法混在一个文件里，任何一处改动都要在千行文件里找位置。
## 分层约定见 docs/06_文件预算与拆分约定.md：状态 → 查询门面 → 命令与循环。
## 坐标：地图卡原始像素（980×660），1 格 = 90px；射程以格为单位，用时再乘 range_unit。

const PHASE_BUILD := "build"        # 布防期
const PHASE_WAVE := "wave"          # 波次进行中
const PHASE_BREATH := "breath"      # 波间喘息
const PHASE_DRAW := "draw"          # 波间调度三选一（暂停等待玩家）
const PHASE_WON := "won"
const PHASE_LOST := "lost"

# ---------------------------------------------------------------- 配置 / 世界
var level: Dictionary = {}
var map_data: Dictionary = {}
var rule: Dictionary = {}
var wave_set: Dictionary = {}
var challenge_ids: Array[String] = []
var seed_value: int = 0

var paths: Array[PathGeom] = []
var geom: Dictionary = {}             # 平衡参数（balance.json）快捷引用
var board_cell: float = 90.0
var range_unit: float = 90.0
var px_per_speed: float = 20.75       # 敌方移速 1.0 对应的 px/s
var fields: Array = []                # 地形 / 残留减速 / 伤害场

# ---------------------------------------------------------------- 运行态
var phase: String = PHASE_BUILD
var t: float = 0.0
var phase_t: float = 0.0
var wave_index: int = 0               # 0-based；= waves.size() 表示波次已放完
var energy: float = 0.0
var base_hp: float = 20.0
var base_hp_max: float = 20.0
var population_used: int = 0

# ---------------------------------------------------------------- 场上对象
var enemies: Array[EnemyUnit] = []
var towers: Array[TowerUnit] = []
var blockers: Array[BlockerUnit] = []
var projectiles: Array[Projectile] = []

var deck: Deck = null
var rng := RandomNumberGenerator.new()
var pending_draw: Array[String] = []

# ---------------------------------------------------------------- 增益 / 记账
var active_bonds: Array = []          # 当前已触发的羁绊
var played_cards: Dictionary = {}     # card_id -> true（本局上过场的卡，羁绊按它计数）
var global_buffs: Array = []          # [{stat, value, until, source, scope, card}]
var heal_effects: Array = []          # [{uids, per_sec, until, source}]
var floaters: Array = []              # 飘字（只给表现层读）
var log_lines: Array = []             # 文本日志

var stats: Dictionary = {}            # 统计（结算与评级用）
var challenge_score: int = 0
var challenge_drop: float = 1.0
var challenge_rating: float = 0.0

var intern := BattleInternals.new()   # 内部记账（外部不读）
