extends RefCounted
class_name BattlePalette
## 战场取色：**只从 token 取，不写字面量**（语法层是唯一来源，裁决 D15/D16）。
##
## 为什么独立成文件：战场、HUD、卡面都要用同一套语义色。
## 若各处各自 `Color("#4FD1C5")`，主题一换（纪元 2）就会出现"半新半旧"的界面。

static func token_color(tokens: TokenSet, name: String) -> Color:
	return tokens.color(name)

## 塔位底色：空格子用凹面，已放置用抬升面。
static func slot_background(tokens: TokenSet, occupied: bool) -> Color:
	return tokens.color("--bg-elev-2" if occupied else "--surface-sunken")

## 残渣热力：按格子残渣量在 0..1 之间取色（残渣色 → 警示色）。
## 用**两级混色**而不是连续渐变：分级让玩家一眼看出"这格要不要管"。
static func residue_heat(tokens: TokenSet, amount: int, danger_at: int) -> Color:
	if amount <= 0:
		return tokens.color("--bg-base")
	var ratio := clampf(float(amount) / float(maxi(1, danger_at)), 0.0, 1.0)
	var low := tokens.color("--residue")
	if ratio < 0.5:
		return low.lerp(tokens.color("--warn"), ratio * 2.0)
	return tokens.color("--warn").lerp(tokens.color("--accent"), (ratio - 0.5) * 2.0)

## 降级区覆盖色：透明叠加，不遮住塔与数字。
static func zone_overlay(tokens: TokenSet) -> Color:
	var color := tokens.color("--residue")
	color.a = 0.16
	return color
