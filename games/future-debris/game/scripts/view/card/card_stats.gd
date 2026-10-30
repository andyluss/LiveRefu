extends RefCounted
class_name CardStats
## 卡面的**数值与文字段落**：三项数值 / 规则 + 风味。
##
## 为什么从 [CardBlocks] 拆出来：这两段是"会变宽变长"的部分（文案长度不固定），
## 排版细节比顶栏/底栏多得多；拆开后每段都比 100 行预算窄，也不容易被一次改动牵动整张卡。

## 数值块：三格等宽（电力 / 残渣 / 战力），**位置固定**（玩家不该重新找数字）
static func stats(canvas: CanvasItem, rect: Rect2, s: float, card: CardData, might: int,
		tokens: TokenSet, font: Font) -> void:
	var y := (CardView.TOP + CardView.ART + CardView.KEYS) * s
	var gap := 6.0 * s
	var w := (rect.size.x - CardView.PAD_L * s - 14.0 * s - gap * 2.0) / 3.0
	var entries := [
		["电力", card.power, "--power"],
		["残渣", card.residue, "--residue"],
		["战力", might, "--material-hi"],
	]
	for index in entries.size():
		var box := Rect2(Vector2(CardView.PAD_L * s + float(index) * (w + gap), y),
			Vector2(w, CardView.STATS * s))
		var well := StyleBoxFlat.new()
		well.bg_color = tokens.color("--bg-elev-1")
		well.set_corner_radius_all(int(6.0 * s))
		canvas.draw_style_box(well, box)
		canvas.draw_rect(Rect2(box.position, Vector2(w, 3.0 * s)),
			tokens.color(str(entries[index][2])))
		CardType.centered(canvas, Rect2(box.position + Vector2(0, 30.0 * s),
			Vector2(w, 22.0 * s)), str(entries[index][1]), "title-1", "--text", s, tokens, font)
		CardType.centered(canvas, Rect2(box.position + Vector2(0, 58.0 * s),
			Vector2(w, 20.0 * s)), str(entries[index][0]), "caption", "--text-faint", s,
			tokens, font)

## 规则 + 风味：规则在上（可读性优先、自动折行不截断），风味在下（更小、更暗、带引号）
static func flavor(canvas: CanvasItem, rect: Rect2, s: float, card: CardData,
		tokens: TokenSet, font: Font) -> void:
	var y := (CardView.TOP + CardView.ART + CardView.KEYS + CardView.STATS) * s
	var width := rect.size.x - CardView.PAD_L * s - 14.0 * s
	var size := int(tokens.size("caption") * s)
	var line_height := float(size) * 1.55
	var offset := 0.0
	var line := ""
	for word in card.text.split(" "):
		var probe := line + ("" if line == "" else " ") + word
		if font.get_string_size(probe, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > width and line != "":
			_draw(canvas, Vector2(CardView.PAD_L * s, y + 22.0 * s + offset), line, size,
				tokens.color("--text-dim"), font)
			offset += line_height
			line = word
		else:
			line = probe
	if line != "":
		_draw(canvas, Vector2(CardView.PAD_L * s, y + 22.0 * s + offset), line, size,
			tokens.color("--text-dim"), font)
		offset += line_height
	# 风味：只有在有数据时才画（没写风味的卡不留空洞）
	if card.flavor != "":
		var fy := y + 22.0 * s + offset + 4.0 * s
		canvas.draw_rect(Rect2(CardView.PAD_L * s, fy - 11.0 * s, 2.0 * s, 15.0 * s),
			tokens.color(CardView.accent_token(card)))
		_draw(canvas, Vector2((CardView.PAD_L + 7.0) * s, fy), "「%s」" % card.flavor,
			int(tokens.size("caption") * s) - 1, tokens.color("--text-faint"), font)

static func _draw(canvas: CanvasItem, at: Vector2, value: String, size: int, color: Color,
		font: Font) -> void:
	canvas.draw_string(font, at, value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
