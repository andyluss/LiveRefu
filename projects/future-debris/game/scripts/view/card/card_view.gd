extends Control
class_name CardView
## 卡面视图：**严格按契约的六段版式**画一张卡（docs/04 §七）。
##
## 为什么把版式写成代码常量：卡牌的可读性**全靠位置**——玩家不该在每个新纪元里
## 重新找"这张卡几点费用"。位置写死在这里，纪元只改材质与颜色（风格卡），位置不动。
##
## 插画位：按 assets/cards 目录下的"卡号.png"约定加载（见 [CardArt]）。
## **没有插画时不空白、不报错**——画一个明确的插画框并标出该卡号，
## 让美术一眼看出这里要一张什么图，也让缺图在界面上一目了然，而不是悄悄变丑。

const W := 520.0
const H := 720.0
const TOP := 64.0          # 顶栏：卡名 + 费用
const ART := 300.0         # 插画区
const KEYS := 44.0         # 关键词标签
const STATS := 90.0        # 数值块：电力 / 残渣 / 战力
const TEXT := 120.0        # 说明文本
const BOTTOM := 48.0       # 底栏：阵营 + 卡号
## 余量 54px = 上 26 + 下 28（契约里定死，视觉上略偏下让卡底更稳）
const COMPACT_SCALE := 0.32

var _card: CardData
var _tokens: TokenSet
var _font: Font
var _cost := 0
var _might := 0
var _affordable := true
var _compact := false

## 完整卡面（卡牌库/详情用）。
func setup_full(card: CardData, tokens: TokenSet, font: Font) -> void:
	_apply(card, tokens, font, card.cost, card.might, true, false)

## 紧凑卡面（手牌用）：整体按比例缩小，但**六段顺序与相对位置不变**。
func setup_compact(card: CardData, tokens: TokenSet, font: Font, cost: int, might: int,
		affordable: bool) -> void:
	_apply(card, tokens, font, cost, might, affordable, true)

func _apply(card: CardData, tokens: TokenSet, font: Font, cost: int, might: int,
		affordable: bool, compact: bool) -> void:
	_card = card
	_tokens = tokens
	_font = font
	_cost = cost
	_might = might
	_affordable = affordable
	_compact = compact
	custom_minimum_size = Vector2(W, H) * _scale()
	queue_redraw()

## 绘制缩放 = **设计缩放**（紧凑/完整）× **显示缩放**（[UiScale]，出素材时放大）。
## 两者必须分开：`COMPACT_SCALE` 是契约值（有闸门断言守着），而显示缩放是运行期的事。
func _scale() -> float:
	return (COMPACT_SCALE if _compact else 1.0) * UiScale.factor()

func _draw() -> void:
	if _card == null or _tokens == null or _font == null:
		return
	var s := _scale()
	var rect := Rect2(Vector2.ZERO, Vector2(W, H) * s)
	draw_rect(rect, _tokens.color("--bg-elev-2" if _affordable else "--surface-sunken"), true)
	draw_rect(rect, _tokens.color("--line-strong" if _affordable else "--line"), false, 1.5)
	# 六段的顺序就是契约本身（顶栏 → 插画 → 关键词 → 数值 → 说明 → 底栏）
	CardBlocks.top(self, rect, s, _card, _cost, _tokens, _font)
	_draw_art(rect, s)
	CardBlocks.keys(self, rect, s, _card, _tokens, _font)
	CardBlocks.stats(self, rect, s, _card, _might, _tokens, _font)
	CardBlocks.flavor(self, rect, s, _card, _tokens, _font)
	CardBlocks.bottom(self, rect, s, _card, _tokens, _font)

## 插画区：有图就画图；没有就画**明确的占位框 + 卡号**（不空白、不报错）。
func _draw_art(rect: Rect2, s: float) -> void:
	var area := Rect2(rect.position + Vector2(12 * s, (TOP + 12) * s),
		Vector2(rect.size.x - 24 * s, (ART - 24) * s))
	draw_rect(area, _tokens.color("--bg-base"), true)
	var texture := CardArt.load_for(_card.id)
	if texture != null:
		draw_texture_rect(texture, area, false)
		return
	draw_rect(area, _tokens.color("--line"), false, 1.5)
	_draw_placeholder(area, s)

## 占位文字：居中两行（"插画位" + 卡号）。让美术一眼看出这里要一张什么图。
func _draw_placeholder(area: Rect2, s: float) -> void:
	var size := int(_tokens.size("caption") * s)
	var lines := ["插画位", _card.id]
	var line_height := float(size) * 1.4
	var offset := (area.size.y - line_height * float(lines.size())) * 0.5
	for line in lines:
		var width := _font.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		draw_string(_font, area.position + Vector2((area.size.x - width) * 0.5, offset + float(size)),
			line, HORIZONTAL_ALIGNMENT_LEFT, -1, size, _tokens.color("--text-faint"))
		offset += line_height
