extends RefCounted
class_name PlacePolicy
## 出牌与清理的**决策规则**（不是 AI，是可被玩家学会的判据）。
##
## 为什么独立成文件：策略是**可替换的实验变量**。模拟要比较"节制 vs 贪心"两档，
## 就应该只换这一个文件的行为，而不是把策略散在自动玩家与战斗里。

const RESIDUE_PER_TURN_OK := 5   # 全阵每回合残渣增量上限（超过就不再往上放）
## 塔位上限。**S3 实测改判**：原先设 6 是"留转向余地"的自我约束，
## 但它把自动玩家能力压在 27–28 输出/回合（电力其实充裕），导致后期波次结构上不可赢。
## 放开到物理塔位数（[BoardSystem.MAX_SLOTS] = 8）后能力与配额才可比。
const SLOT_CAP := BoardSystem.MAX_SLOTS
const SLOT_DANGER := 3           # 残渣达到 每点战力损失 × 此值 后视为危险格
const CLEAN_TARGET := 2          # 把危险格清到该值以下（2 点残渣 = 1 点战力损失，可接受）

## 该不该清理某一格？只清"已经在吃掉战力"的格，避免把电力浪费在无痛的地方。
static func wants_clean(battle, slot: int) -> bool:
	var present := ResidueSystem.at(battle.residue, slot)
	if present <= CLEAN_TARGET:
		return false
	var cost := (present - CLEAN_TARGET) * ResidueSystem.CLEAN_COST
	return cost <= ResourceSystem.power(battle.resources)

## 该不该把 card 放到 slot 上？保守策略会拒绝"会把这一格压垮"的放置。
static func accept(battle, card: CardData, slot: int) -> bool:
	if BoardSystem.size(battle.board) >= SLOT_CAP:
		return false
	# 只有**已有塔**的格子才因残渣被拒绝。
	# 实测教训：`moves` 姿态把残渣搬到空位，若把空位也当"脏位"拒放，
	# 该势力会几乎无法扩阵（实测只铺 5 张、输出 8/回合，而 feeds 铺 6 张、输出 29）——
	# 空位上的残渣**没有塔可被削弱**，拒放它没有任何玩法理由。
	if battle.board.has(slot) and ResidueSystem.at(battle.residue, slot) > CLEAN_TARGET:
		return false
	var inflow := card.residue
	for occupied in BoardSystem.occupied_slots(battle.board):
		inflow += (battle.board[occupied] as CardInstance).data.residue
	return inflow <= RESIDUE_PER_TURN_OK

## 选出**既付得起、又放得下**的最高战力手牌；并列取更靠前者（决策必须确定，否则无法复跑）。
##
## 为什么必须一起判断（踩过的坑）：若先按战力选牌、再判断"能不能放"，
## 那被拒的那张会**挡住整轮其它可放的牌**——表现是"手里有牌、电力也够，却几乎不出牌"。
## 这个 bug 不会报错，只会让模拟结果整体偏低，极难从数字上看出原因。
static func best_playable(battle, conservative: bool) -> int:
	var slot := BoardSystem.next_free_slot(battle.board)
	var best := -1
	var best_might := -1
	for index in battle.hand.size():
		var card: CardData = battle.hand[index]
		if CardCost.of(battle, card, slot) > ResourceSystem.power(battle.resources):
			continue
		if conservative and not accept(battle, card, slot):
			continue
		if card.might > best_might:
			best = index
			best_might = card.might
	return best
