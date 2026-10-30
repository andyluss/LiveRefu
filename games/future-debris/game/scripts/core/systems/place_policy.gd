extends RefCounted
class_name PlacePolicy
## 出牌与清理的**决策规则**（不是 AI，是可被玩家学会的判据）。
##
## 为什么独立成文件：策略是**可替换的实验变量**。模拟要比较"节制 vs 贪心"两档，
## 就应该只换这一个文件的行为，而不是把策略散在自动玩家与战斗里。

## 单格残渣的"可接受上限"：机制只惩罚**单格**残渣（[StatQuery.effective_might] 按格扣战力），
## 因此判据也必须是**单格**的。
##
## **踩过的大坑（后果极其严重）**：这里原来是"全阵每回合残渣增量 ≤ 5"，而且把**已放塔的残渣
## 也重复计入**。于是盘面残渣一旦超过 5，之后**任何牌都放不下**——自动玩家把自己锁死在 4 张牌上，
## 电力却一路涨到 235（空转）。实测表现是"四个势力能力差 3 倍"，
## 我一度以为是卡池问题、去改了生成器的数值体系（其实根因在这里）。
## 教训：**判据必须与它要防的那个机制同口径**。
const SLOT_RESIDUE_OK := 4
## 塔位上限。**S3 实测改判**：原先设 6 是"留转向余地"的自我约束，
## 但它把自动玩家能力压在 27–28 输出/回合（电力其实充裕），导致后期波次结构上不可赢。
## 放开到物理塔位数（[BoardSystem.MAX_SLOTS] = 8）后能力与配额才可比。
const SLOT_CAP := BoardSystem.MAX_SLOTS
const SLOT_DANGER := 3           # 残渣达到 每点战力损失 × 此值 后视为危险格
const CLEAN_TARGET := 2          # 把危险格清到该值以下（2 点残渣 = 1 点战力损失，可接受）

## 该不该清理某一格？只清"已经在吃掉战力"的格，避免把电力浪费在无痛的地方。
##
## **实测教训（这条判据曾让收益机制完全测不到）**：原来只清"残渣 > 2"的格，
## 于是自动玩家几乎从不清理——我为 `cleans`/`avoids` 加的"清理返还"与"未污染利息"
## 在逐关扫描里**一点效果都没有**（数字完全没变）。
## 收益机制必须有人去用才测得到；而"电力有富余时顺手清理"本来就是玩家会做的事。
static func wants_clean(battle, slot: int) -> bool:
	var present := ResidueSystem.at(battle.residue, slot)
	if present <= 0:
		return false
	var cost := maxi(0, present - CLEAN_TARGET) * ResidueSystem.CLEAN_COST
	if cost == 0:
		# 已经不算脏：只在**电力明显富余**时顺手清干净（阈值取"当前电力的 1/3"，
		# 保证不会挤占出牌的钱——出牌才是主要输出手段）
		return present > 0 and ResourceSystem.power(battle.resources) >= 3 * present
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
	# 只看**这张牌会对它落地的格子**造成什么：该格当前残渣 + 这张牌的入场残渣。
	# 若这一格会因此进入"战力被吃掉"的状态，就换一格或换一张牌。
	return ResidueSystem.at(battle.residue, slot) + card.residue <= SLOT_RESIDUE_OK

## 某张牌此刻能否真的出出去（付得起 + 放得下）。
## **判据只有这一处**：`CardFlow.playable_count` 与 [best_playable] 都调它。
## 踩过的坑：`playable_count` 原来只判断"付得起"，于是自动玩家手里握着
## "付得起但放不下"的牌时，既不出牌也不补抽——**空转到电力 74**（实测）。
static func can_play(battle, card: CardData, conservative: bool) -> bool:
	var slot := BoardSystem.next_free_slot(battle.board)
	if slot < 0:
		return false
	if CardCost.of(battle, card, slot) > ResourceSystem.power(battle.resources):
		return false
	if conservative and not accept(battle, card, slot):
		return false
	return true

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
