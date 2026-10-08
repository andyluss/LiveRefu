extends RefCounted
class_name HandLayout
## 手牌的**尺寸计算**：让 N 张牌无论视口多宽都**恰好放得下**。
##
## 为什么需要（实测教训）：手牌原来是"设计尺寸 × 视口缩放因子"，
## 在 1920 视口下 8 张牌 × 1.5 倍 = 超出可用宽度，**最后一张被切掉**。
## 手牌是唯一"数量会变、且必须一屏放完"的区域，因此它的尺寸必须
## **由可用宽度反推**，而不是简单地跟着全局缩放走。
##
## 口径：卡面最多放大到设计紧凑尺寸（[MAX_SCALE]），需要时**缩小**以放完全部手牌。

## 手牌**最大**缩放：比契约的紧凑比例更大，好让手牌在宽视口下也长得起来。
## 为什么不用契约值作上限（实测教训）：`COMPACT_SCALE = 0.32` 是**在 1280 视口里
## 放 8 张牌**的尺寸；把它当上限就等于**禁止手牌放大**，于是 1920 下 8 张牌
## 只占一半宽度、右侧一大片空白。手牌尺寸本来就该由可用宽度决定。
const MAX_SCALE := 0.52
const MIN_SCALE := 0.18
const GAP := 10.0

## 在 `available_width` 里放下 `count` 张牌所需的卡面缩放。
static func scale_for(count: int, available_width: float) -> float:
	if count <= 0 or available_width <= 0.0:
		return MAX_SCALE
	var gaps := GAP * float(count - 1) * UiScale.factor()
	var per_card := (available_width - gaps) / float(count)
	if per_card <= 0.0:
		return MIN_SCALE
	return clampf(per_card / CardView.W, MIN_SCALE, MAX_SCALE)

static func card_size(scale: float) -> Vector2:
	return Vector2(CardView.W, CardView.H) * scale

static func gap() -> float:
	return GAP * UiScale.factor()

## 一屏能否放完 `count` 张牌（验收用）：总宽必须不超过可用宽度。
## 这条守的是"手牌永远不切牌"——实测在 1920 视口下切过最后一张。
static func fits(count: int, available_width: float) -> bool:
	if count <= 0:
		return true
	var scale := scale_for(count, available_width)
	var total := card_size(scale).x * float(count) + gap() * float(count - 1)
	return total <= available_width + 0.5
