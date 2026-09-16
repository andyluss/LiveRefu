extends RefCounted
class_name AutoPlayer
## AutoPlayer —— 自动玩家（门面）：无头验收与自动截图共用的一只"合格玩家"。
##
## 存在的意义：验收要能无人值守地跑完一整关，所以需要一个**稳定、确定**的操盘手。
## 它不是 AI，只是几条朴素启发式（实现在 auto_*.gd 里）：
##   1. 先铺攻击型塔（对空塔优先，保证第 4 波纯空中有解）；
##   2. 塔位按"射程内能覆盖多长路径"排序；
##   3. 攻击塔 ≥2 座后才放工事塔/修饰卡，≥3 座后才补支援单位；
##   4. 波间调度固定取第一个选项（配合固定种子 → 结果可复现）。


static func deploy(battle: Battle) -> void:
	AutoDeploy.deploy(battle)


static func use_skills(battle: Battle) -> void:
	AutoSkills.use(battle)


static func take_draw(battle: Battle) -> void:
	if battle.phase == Battle.PHASE_DRAW and not battle.pending_draw.is_empty():
		battle.pick_draw(battle.pending_draw[0])
