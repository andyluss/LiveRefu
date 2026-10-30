extends RefCounted
class_name CardBlocks
## 卡面的**内容层**：六段各自的排版（顶栏 / 关键词 / 数值 / 规则+风味 / 底栏）。
##
## 与 [CardMaterial] 的分工：材质层画"这张卡是什么做的"，本文件画"这张卡说了什么"。
## 三者的位置由 [CardView] 的六段契约常量决定，本文件只负责"在给定盒子里怎么排"。
##
## 风格卡规定「只用圆角矩形 + 长反射条 + 单点镜红」，所以这里所有形状都是圆角矩形，
## 唯一的红色焦点留给费用章与数值条——不引入第二套语言。

## 顶栏：左侧"势力代号 · 势力名"，右侧费用章（搪瓷圆章 + 压印数字）
static func top(canvas: CanvasItem, rect: Rect2, s: float, card: CardData, cost: int,
		tokens: TokenSet, font: Font) -> void:
	var x := CardView.PAD_L * s
	var dark := CardView.is_dark()
	var dept := card.faction.replace("FAC-ATOMIC-", "")
	var dot := Vector2(x + 4.0 * s, 16.0 * s)
	canvas.draw_circle(dot, 3.4 * s, tokens.color(CardView.accent_token(card)))
	CardType.text(canvas, Vector2(x + 13.0 * s, 19.0 * s), dept, "caption",
		"--text-faint" if not dark else "--text-faint", s, tokens, font)
	CardType.text(canvas, Vector2(x, 50.0 * s), card.name, "title-2",
		"--text" if dark else "--material-shadow", s, tokens, font)
	# 费用章：圆章 + 压印数字（唯一的"镜红"焦点在数字下方的红环上）
	var c := Vector2(rect.size.x - 38.0 * s, 36.0 * s)
	# 搪瓷圆章：外圈米白 → 内圈深色（带势力色）× 数字**用米白**。
	# 教训：一开始把数字写成深色（以为内圈是亮的），结果深底上深字——几乎看不见。
	canvas.draw_circle(c, 24.0 * s, tokens.color("--material-hi"))
	canvas.draw_circle(c, 19.0 * s, tokens.color("--bg-elev-2").lerp(tokens.color("--accent"), 0.30))
	canvas.draw_arc(c, 22.0 * s, 0.0, TAU, 32, tokens.color("--accent"), maxf(1.0, 1.6 * s), true)
	var size := int(tokens.size("number-lg") * s)
	var label := str(cost)
	var width := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	canvas.draw_string(font, c + Vector2(-width * 0.5, size * 0.36), label,
		HORIZONTAL_ALIGNMENT_LEFT, -1, size, tokens.color("--material-hi"))

## 底栏：势力名 + 类型 + 卡号 + 条码（条码是"归档"的视觉落款）
static func bottom(canvas: CanvasItem, rect: Rect2, s: float, card: CardData,
		tokens: TokenSet, font: Font) -> void:
	var y := rect.size.y - CardView.BOTTOM * s
	canvas.draw_line(Vector2(0, y), Vector2(rect.size.x, y), Color(0, 0, 0, 0.18), maxf(1.0, s))
	var baseline := y + CardView.BOTTOM * 0.62 * s
	CardType.text(canvas, Vector2(CardView.PAD_L * s, baseline),
		card.faction.replace("FAC-ATOMIC-", ""), "caption", "--text-dim", s, tokens, font)
	var size := int(tokens.size("caption") * s)
	var width := font.get_string_size(card.id, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	CardType.text(canvas, Vector2(rect.size.x - 46.0 * s - width, baseline), card.id,
		"caption", "--text-faint", s, tokens, font)
	# 条码：12 根不等宽竖线
	for i in 12:
		var bx := rect.size.x - 42.0 * s + float(i) * 3.2 * s
		var w := 1.6 if i % 3 else 2.4
		canvas.draw_rect(Rect2(Vector2(bx, y + 14.0 * s), Vector2(w * s, 14.0 * s)),
			Color(tokens.color("--material-shadow"), 0.55))

## 关键词：圆角搪瓷小牌，前缀一颗势力色圆点
static func keys(canvas: CanvasItem, rect: Rect2, s: float, card: CardData,
		tokens: TokenSet, font: Font) -> void:
	var y := (CardView.TOP + CardView.ART) * s
	var x := CardView.PAD_L * s
	for keyword in card.keywords:
		var width := (float(keyword.length()) * 9.0 + 22.0) * s
		var box := Rect2(Vector2(x, y + 6 * s), Vector2(width, 28.0 * s))
		var chip := StyleBoxFlat.new()
		chip.bg_color = tokens.color("--bg-elev-1")
		chip.set_corner_radius_all(int(4.0 * s))
		canvas.draw_style_box(chip, box)
		canvas.draw_circle(Vector2(x + 9.0 * s, box.position.y + 14.0 * s), 2.6 * s,
			tokens.color(CardView.accent_token(card)))
		canvas.draw_string(font, Vector2(x + 16.0 * s, box.position.y + 19.0 * s), keyword,
			HORIZONTAL_ALIGNMENT_LEFT, -1, int(tokens.size("caption") * s),
			tokens.color("--text-dim"))
		x += width + 7.0 * s
