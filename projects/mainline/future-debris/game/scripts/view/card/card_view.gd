extends Control
class_name CardView
## 卡面视图：**严格按契约的六段版式**画一张卡（docs/04 §七）。
##
## 为什么把版式写成代码常量：卡牌的可读性**全靠位置**——玩家不该在每个新纪元里
## 重新找"这张卡几点费用"。位置写死在这里，纪元只改材质与颜色（风格卡），位置不动。
##
## 材质与内容分两层：[CardMaterial] 画"这张卡是什么做的"（投影/包边/搪瓷/视窗/扫描线），
## [CardBlocks] 画"这张卡说了什么"。本文件只负责**顺序**与**朝向**。
##
## 两套朝向按场景选用（同一版式，只换材质明暗）：
##   `light` 杂志式 → 卡牌库、商店页、收藏（米白搪瓷 + 凹陷视窗）
##   `dark`  暗卡   → 局内手牌（黑铬 + 发光视窗，在深色战斗界面里不刺眼）

const W := 520.0
const H := 720.0
const TOP := 64.0          # 顶栏：势力 + 卡名 + 费用
const ART := 300.0         # 插画区
const KEYS := 44.0         # 关键词标签
const STATS := 90.0        # 数值块：电力 / 残渣 / 战力
const TEXT := 120.0        # 规则 + 风味
const BOTTOM := 48.0       # 底栏：势力 + 卡号 + 条码
const PAD_L := 28.0        # 内容左缘（避开左侧打孔带）
const PAD_R := 14.0
const COMPACT_SCALE := 0.32

var _card: CardData
var _tokens: TokenSet
var _font: Font
var _cost := 0
var _might := 0
var _affordable := true
var _compact := false
var _dark := false
var _card_scale := COMPACT_SCALE

## 静态出口：CardBlocks 是 static，用它读"当前这张卡的朝向与势力色"
static var _dark_now := false
static func is_dark() -> bool:
	return _dark_now

static func accent_token(card: CardData) -> String:
	var table := {"FAC-ATOMIC-AEC": "--power", "FAC-ATOMIC-SUB": "--ok",
		"FAC-ATOMIC-HAU": "--residue", "FAC-ATOMIC-ROA": "--warn"}
	return str(table.get(card.faction, "--line-strong"))

## 完整卡面（卡牌库/商店页用）：默认杂志式。
func setup_full(card: CardData, tokens: TokenSet, font: Font, theme := "light") -> void:
	_apply(card, tokens, font, card.cost, card.might, true, false, theme)

## 紧凑卡面（手牌用）：默认暗卡；`scale` 由 [HandLayout] 按可用宽度给出。
func setup_compact(card: CardData, tokens: TokenSet, font: Font, cost: int, might: int,
		affordable: bool, scale: float = COMPACT_SCALE, theme := "dark") -> void:
	_apply(card, tokens, font, cost, might, affordable, true, theme)
	_card_scale = scale
	_relayout()

func _apply(card: CardData, tokens: TokenSet, font: Font, cost: int, might: int,
		affordable: bool, compact: bool, theme: String) -> void:
	_card = card
	_tokens = tokens
	_font = font
	_cost = cost
	_might = might
	_affordable = affordable
	_compact = compact
	_dark = theme == "dark"
	# 打不起的牌**整体压暗**（不再换底色调）——材质层已经占了底色，改色会打架
	modulate = Color(1, 1, 1, 1.0 if affordable else 0.55)
	_relayout()

func _relayout() -> void:
	custom_minimum_size = Vector2(W, H) * _scale()
	queue_redraw()

## 绘制缩放 = **设计缩放**（紧凑/完整）× **显示缩放**（[UiScale]，出素材时放大）。
func _scale() -> float:
	return _card_scale if _compact else UiScale.factor()

func _draw() -> void:
	if _card == null or _tokens == null or _font == null:
		return
	_dark_now = _dark
	var s := _scale()
	var rect := Rect2(Vector2.ZERO, Vector2(W, H) * s)
	CardMaterial.backing(self, rect, s, _tokens, _dark)
	CardMaterial.face(self, rect, s, _tokens, _dark)
	_holes(s)
	# 六段的顺序就是契约本身（顶栏 → 插画 → 关键词 → 数值 → 规则+风味 → 底栏）
	CardBlocks.top(self, rect, s, _card, _cost, _tokens, _font)
	_art(rect, s)
	CardBlocks.keys(self, rect, s, _card, _tokens, _font)
	CardStats.stats(self, rect, s, _card, _might, _tokens, _font)
	CardStats.flavor(self, rect, s, _card, _tokens, _font)
	CardBlocks.bottom(self, rect, s, _card, _tokens, _font)

## 左缘打孔：说明它是"被归档的一张卡"，不是一块 UI
func _holes(s: float) -> void:
	for index in 3:
		var center := Vector2(9.0 * s, (150.0 + float(index) * 210.0) * s)
		draw_circle(center, 4.6 * s, _tokens.color("--material-shadow"))
		draw_arc(center, 4.6 * s, 0.0, TAU, 20, Color(1, 1, 1, 0.20), maxf(1.0, s))

## 插画区：有图就画图；没有就画**明确的占位框 + 卡号**（不空白、不报错）
func _art(rect: Rect2, s: float) -> void:
	var area := Rect2(rect.position + Vector2(PAD_L * s, (TOP + 8.0) * s),
		Vector2(rect.size.x - (PAD_L + PAD_R) * s, (ART - 16.0) * s))
	CardMaterial.window(self, area, s, _tokens, _dark)
	var texture := CardArt.load_for(_card.id)
	if texture != null:
		draw_texture_rect(texture, area, false)
	else:
		draw_rect(area, _tokens.color("--line"), false, maxf(1.0, 1.5 * s))
		_placeholder(area, s)
	CardMaterial.scanlines(self, area, s, _dark)

## 占位文字：居中两行（"插画位" + 卡号）。让美术一眼看出这里要一张什么图。
func _placeholder(area: Rect2, s: float) -> void:
	var size := int(_tokens.size("caption") * s)
	var lines := ["插画位", _card.id]
	var line_height := float(size) * 1.4
	var offset := (area.size.y - line_height * float(lines.size())) * 0.5
	for line in lines:
		var width := _font.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		draw_string(_font, area.position + Vector2((area.size.x - width) * 0.5, offset + float(size)),
			line, HORIZONTAL_ALIGNMENT_LEFT, -1, size, _tokens.color("--text-faint"))
		offset += line_height
