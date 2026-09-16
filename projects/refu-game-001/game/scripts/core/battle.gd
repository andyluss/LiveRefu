extends BattleApi
class_name Battle
## Battle —— 一局战斗的**领域对象**：生命周期 + 命令（写操作）。
##
## 三层分工（详见 docs/06_文件预算与拆分约定.md）：
##   BattleState（battle/battle_state.gd）   状态字段
##   BattleApi  （battle/battle_api.gd）     只读查询门面
##   Battle     （本文件）                   _init / start / tick + 命令
## 具体算法在 battle/ 下的各静态系统里（BattleWaves / BattleStats / BattleEffects …）。
##
## 时间：固定步长由外部按 balance.sim.tick_hz 驱动（30Hz），保证可复现。
## 坐标：地图卡原始像素（980×660），1 格 = 90px。

func _init(level_id: String, selected_challenges: Array, deck_card_ids: Array,
		seed_v: int = 0) -> void:
	BattleSetup.configure(self, level_id, selected_challenges, deck_card_ids, seed_v)


func start() -> void:
	var opening := deck.deal_opening_hand()
	phase = PHASE_BUILD
	phase_t = 0.0
	_log("关卡 %s 开始：卡组 %d 张，起手 %d 张，起始能量 %d"
		% [level.get("id", "?"), deck.cards.size(), opening.size(), int(energy)])
	BattleBonds.check(self)


## 推进一帧（固定步长）；表现层只调用它。
func tick(dt: float) -> void:
	BattleLoop.step(self, dt)


## 放置一张卡（塔/单位/修饰）。返回 {ok, reason, uid}
func place_card(card_id: String, pos: Vector2, extra: Dictionary = {}) -> Dictionary:
	return BattlePlacement.place(self, card_id, pos, extra)


## 施放技能卡（S01 无需目标；S02 需 target_uid 指定一座塔）。
func cast_card(card_id: String, target_uid: int = 0) -> Dictionary:
	return BattleSkills.cast(self, card_id, target_uid)


## 回收（上滑）：返还部分能量。
func sell_tower(uid: int) -> Dictionary:
	return BattleSkills.sell(self, uid)


## 波间调度：选择一张牌进入手牌。
func pick_draw(card_id: String) -> bool:
	return BattleWaves.pick_draw(self, card_id)


## 结算评级（doc 04 第五节的三维）。
func rating() -> Dictionary:
	return BattleRating.compute(self)
