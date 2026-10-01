extends RefCounted
class_name Battle
## 一局战斗的**域对象**：生命周期 + 命令，状态在各 system 里。
##
## 铁律（[01 实现裁决记录 D2](../docs/01_实现裁决记录.md)）：**本文件不得引用任何场景、贴图或 Node**，
## 这样 `scenes/tools/` 才能在无渲染环境下驱动完整一局并逐项断言。

const BASE_GAIN := 6          # 每回合基础供电（S3 由关卡表覆盖）
const AUTO_SELL_LIMIT := 2    # 自动玩家最多回收几次，避免"卖出买入"抖动

var catalog: CardCatalog
var board: Dictionary = {}          # slot:int -> CardInstance
var resources: Dictionary = {}
var residue: Dictionary = {}
var wave: Dictionary = {}
var hand: Array[CardData] = []
var rules: Array[RuleData] = []
var level: LevelData = null
var level_id: String = ""
var faction_id: String = ""                        # 本局采用的势力（决定 residuePosture 机制）
var unlocked_rules: PackedStringArray = PackedStringArray()   # 局内已解锁的规则卡（累加，不删除）
var all_rules: bool = false                       # 测试/模拟开关：忽略获取途径，给全部规则
var turn: int = 0
var max_turns: int = 0
var cards_played: int = 0
## **本回合的净化爆发**（战力加成）。由 `cleans` 势力的清理动作累积、由回合循环在交战时消费。
## 为什么放在 battle 上而不是全局：它是**一回合内的状态**，
## 与"本回合清理了多少"一一对应；放全局会出现两局互相污染。
var purge_might: int = 0
var finished: bool = false   # 通关（清完最后一波）标志；与"基地被打爆"共同构成两种终局
var drawn: int = 0
var seed: int = 0
var player: AutoPlayer = null
var events: Array[String] = []

## 准备一局：装载数据表、组卡组、初始化各系统。返回是否就绪。
func setup(deck_ids: PackedStringArray, base_hp: int, turn_limit: int) -> bool:
	return BattleSetup.prepare(self, deck_ids, base_hp, turn_limit)

## 一个回合：供电 → （自动玩家）出牌 → 场地维护 → 交战 → 波次结算。
## 顺序的权威在 [TurnLoop]（见那里的说明：**结算顺序就是玩法规则**）。
func tick() -> Dictionary:
	return TurnLoop.run(self)

## 跑到结束或到达回合上限；返回终局摘要（含评级）。
func run_to_end() -> Dictionary:
	while is_active() and turn < max_turns:
		tick()
	return CardFlow.summarize(self)

## ---------- 薄转发（让调用方少认一个类；逻辑仍在 CardFlow） ----------

func playable_count() -> int:
	return CardFlow.playable_count(self)

func draw_card() -> bool:
	return CardFlow.draw(self)

## ---------- 终局 ----------

func is_active() -> bool:
	return not finished and ResourceSystem.alive(resources) and WaveSystem.index(wave) < WaveSystem.wave_count(wave)
