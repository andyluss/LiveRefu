extends RefCounted
class_name CardBlocks
## 卡面的三段**绘制原语**：关键词 / 数值块 / 说明文本。
##
## 为什么从 [CardView] 拆出来：卡面绘制天然会越写越长（每段都有自己的排版细节），
## 而"按顺序装配六段"与"某一段怎么排版"是两件事。拆开后 CardView 只读顺序，
## 每段的排版改动不会牵动整张卡。
##
## 三者都是 static、接收 `canvas`（由 CardView 把自己传进来）与显式参数：
## 它们只调用 canvas 的 draw_* 与取 token，自己不持有任何状态。

## 顶栏：左侧卡名，右侧费用（`number-lg` 等宽数字，不抖动）。
static func top(canvas: CanvasItem, rect: Rect2, s: float, card: CardData, cost: int,
		tokens: TokenSet, font: Font) -> void:
	var y := CardView.TOP * s
	canvas.draw_line(rect.position + Vector2(0, y), rect.position + Vector2(rect.size.x, y),
		tokens.color("--line"), 1.0)
	draw_text(canvas, rect.position + Vector2(12 * s, y * 0.62), card.name, "title-2", "--text",
		s, tokens, font)
	var label := "费 %d" % cost
	var size := int(tokens.size("number-lg") * s)
	var width := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	draw_text(canvas, rect.position + Vector2(rect.size.x - 12 * s - width, y * 0.7), label,
		"number-lg", "--text", s, tokens, font)

## 底栏：左侧阵营名（去掉 FAC-ATOMIC- 前缀），右侧卡号。
static func bottom(canvas: CanvasItem, rect: Rect2, s: float, card: CardData,
		tokens: TokenSet, font: Font) -> void:
	var y := rect.size.y - CardView.BOTTOM * s
	canvas.draw_line(rect.position + Vector2(0, y), rect.position + Vector2(rect.size.x, y),
		tokens.color("--line"), 1.0)
	var baseline := y + CardView.BOTTOM * 0.62 * s
	draw_text(canvas, rect.position + Vector2(12 * s, baseline),
		card.faction.replace("FAC-ATOMIC-", ""), "caption", "--text-faint", s, tokens, font)
	var size := int(tokens.size("caption") * s)
	var width := font.get_string_size(card.id, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	draw_text(canvas, rect.position + Vector2(rect.size.x - 12 * s - width, baseline), card.id,
		"caption", "--text-faint", s, tokens, font)

## 单行文字（左对齐，位置由调用方给）。
static func draw_text(canvas: CanvasItem, at: Vector2, text: String, level: String,
		color_token: String, s: float, tokens: TokenSet, font: Font) -> void:
	canvas.draw_string(font, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1,
		int(tokens.size(level) * s), tokens.color(color_token))

## 关键词：胶囊形标签，从左排。
static func keys(canvas: CanvasItem, rect: Rect2, s: float, card: CardData,
		tokens: TokenSet, font: Font) -> void:
	var y := (CardView.TOP + CardView.ART) * s
	var x := 12.0 * s
	for keyword in card.keywords:
		var width := (float(keyword.length()) * 9.0 + 20.0) * s
		var box := Rect2(Vector2(x, y + 8 * s), Vector2(width, (CardView.KEYS - 18) * s))
		canvas.draw_rect(box, tokens.color("--bg-elev-1"), true)
		canvas.draw_rect(box, tokens.color("--line-strong"), false, 1.0)
		centered(canvas, box, keyword, "caption", "--text-dim", s, tokens, font)
		x += width + 8 * s

## 数值块：三格等宽（电力 / 残渣 / 战力），**位置固定**。
static func stats(canvas: CanvasItem, rect: Rect2, s: float, card: CardData, might: int,
		tokens: TokenSet, font: Font) -> void:
	var y := (CardView.TOP + CardView.ART + CardView.KEYS) * s
	var cell := rect.size.x / 3.0
	var entries := [
		["电力", card.power, "--power"],
		["残渣", card.residue, "--residue"],
		["战力", might, "--text"],
	]
	for index in entries.size():
		var box := Rect2(Vector2(cell * index, y), Vector2(cell, CardView.STATS * s))
		canvas.draw_rect(box, tokens.color("--bg-elev-1"), true)
		canvas.draw_rect(box, tokens.color("--line"), false, 1.0)
		centered(canvas, Rect2(box.position, Vector2(box.size.x, box.size.y * 0.42)),
			str(entries[index][0]), "caption", "--text-dim", s, tokens, font)
		centered(canvas, Rect2(box.position + Vector2(0, box.size.y * 0.40),
			Vector2(box.size.x, box.size.y * 0.6)), str(entries[index][1]),
			"title-2", str(entries[index][2]), s, tokens, font)

## 说明文本：按宽度**自动折行**（卡牌说明必须完整可读，不能截断）。
static func flavor(canvas: CanvasItem, rect: Rect2, s: float, card: CardData,
		tokens: TokenSet, font: Font) -> void:
	var y := (CardView.TOP + CardView.ART + CardView.KEYS + CardView.STATS) * s
	var area := Rect2(Vector2(12 * s, y + 6 * s),
		Vector2(rect.size.x - 24 * s, (CardView.TEXT - 12) * s))
	var size := int(tokens.size("caption") * s)
	var line_height := float(size) * 1.5
	var offset := 0.0
	var line := ""
	for word in card.text.split(" "):
		var probe := line + ("" if line == "" else " ") + word
		var too_wide := font.get_string_size(probe, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > area.size.x
		if too_wide and line != "":
			_draw_line(canvas, area.position + Vector2(0, offset + float(size)), line, size, tokens, font)
			offset += line_height
			line = word
		else:
			line = probe
	if line != "":
		_draw_line(canvas, area.position + Vector2(0, offset + float(size)), line, size, tokens, font)

static func _draw_line(canvas: CanvasItem, at: Vector2, text: String, size: int,
		tokens: TokenSet, font: Font) -> void:
	canvas.draw_string(font, at, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, tokens.color("--text-dim"))

## 在盒子里居中画一行字（标签与数值都用它）。
static func centered(canvas: CanvasItem, box: Rect2, text: String, level: String,
		color_token: String, s: float, tokens: TokenSet, font: Font) -> void:
	var size := int(tokens.size(level) * s)
	var width := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	canvas.draw_string(font, box.position + Vector2((box.size.x - width) * 0.5, box.size.y * 0.78),
		text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, tokens.color(color_token))
