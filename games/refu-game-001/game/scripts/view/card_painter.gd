extends RefCounted
class_name CardPainter
## CardPainter —— CardView 的卡面绘制逻辑（静态，无状态）。
##
## 拆出来的目的：CardView 只保留"状态 + 交互"，画法集中在这里，方便单独调样式。
## 绘制落点由调用方以 CanvasItem 传入（CardView 自己），本类不持有任何节点引用。
##
## 信息分层遵循 doc 07 第一节：小屏只显示"3 个数字 + 1 个关键词"；
## 完整卡面（美术出图 PNG）留给长按详情与图鉴，两处读到的是同一份数据。

const BODY_BG := "#101a24"
const STAT_BG := "#0f1a26"
const INK := "#1B2733"


static func draw_card(ci: CanvasItem, card: Dictionary, w: float, h: float, selected: bool,
		affordable: bool, show_count: int, font: Font) -> void:
	if card.is_empty():
		return
	var ctype := String(card.get("type", ""))
	var accent: Color = UiKit.TYPE_COLORS.get(ctype, UiKit.TEAL)
	var faction: Color = UiKit.FACTION_COLORS.get(String(card.get("faction", "ANV")), UiKit.BLUE)

	# 卡体：亚克力感（深底 + 族色描边 + 顶部族色箔带）
	var body := StyleBoxFlat.new()
	body.bg_color = Color(BODY_BG)
	body.set_corner_radius_all(12)
	body.border_color = accent if not selected else UiKit.AMBER
	body.set_border_width_all(3 if selected else 2)
	ci.draw_style_box(body, Rect2(Vector2.ZERO, Vector2(w, h)))

	var band := StyleBoxFlat.new()
	band.bg_color = Color(faction.r, faction.g, faction.b, 0.30)
	band.corner_radius_top_left = 12
	band.corner_radius_top_right = 12
	ci.draw_style_box(band, Rect2(Vector2(2, 2), Vector2(w - 4, h * 0.30)))

	_draw_cost(ci, card, w, font)
	_draw_title(ci, card, w, font)
	_draw_stats(ci, card, w, h, accent, font)
	_draw_keyword(ci, card, w, h, font)

	# 手牌张数角标
	if show_count > 1:
		ci.draw_circle(Vector2(18, h - 16), 12, Color(UiKit.AMBER.r, UiKit.AMBER.g, UiKit.AMBER.b, 0.9))
		_draw_centered(ci, "×%d" % show_count, Rect2(6, h - 28, 24, 22), 13, Color(INK), font)

	# 不可用的斜线标记
	if not affordable:
		ci.draw_line(Vector2(8, h - 10), Vector2(w - 8, 10), Color(1, 0.4, 0.35, 0.5), 2.0)


## 费用（右上）
static func _draw_cost(ci: CanvasItem, card: Dictionary, w: float, font: Font) -> void:
	var cost := int(card.get("cost", 0))
	ci.draw_circle(Vector2(w - 20, 20), 14, Color(0.95, 0.97, 1.0, 0.92))
	_draw_centered(ci, str(cost), Rect2(w - 34, 8, 28, 22), 17, Color(INK), font)


## 名称 + 卡号·槽位（卡面上半部；顺序与原始实现一致：费用 → 名称 → 卡号）
static func _draw_title(ci: CanvasItem, card: Dictionary, w: float, font: Font) -> void:
	# 名称（按可用宽度截断，避免压到右上角的费用圆）
	ci.draw_string(font, Vector2(10, 26), _fit(font, String(card.get("name", "")), w - 52, 14),
		HORIZONTAL_ALIGNMENT_LEFT, w - 48, 14, UiKit.TEXT)

	# 卡号 + 槽位
	ci.draw_string(font, Vector2(10, 42), "%s · %s" % [card.get("id", ""),
		UiKit.SLOT_LABELS.get(String(card.get("slot", "none")), "")],
		HORIZONTAL_ALIGNMENT_LEFT, w - 12, 9, UiKit.TEXT_DIM)


## 关键词 + 一句话效果（在数值块下方）
static func _draw_keyword(ci: CanvasItem, card: Dictionary, w: float, h: float, font: Font) -> void:
	var kw_y := h * 0.34 + h * 0.24 + 15.0
	ci.draw_string(font, Vector2(10, kw_y), _fit(font, "关键词：" + String(card.get("keyword", "")), w - 16, 10),
		HORIZONTAL_ALIGNMENT_LEFT, w - 12, 10, UiKit.TEXT)

	# 一句话效果（超宽截断，绝不压到相邻卡）
	ci.draw_string(font, Vector2(10, kw_y + 14), _fit(font, String(card.get("effect_line", "")), w - 16, 9),
		HORIZONTAL_ALIGNMENT_LEFT, w - 12, 9, UiKit.TEXT_DIM)


## 3 个数值块（数值在上、标签在下——与出图卡面一致）
static func _draw_stats(ci: CanvasItem, card: Dictionary, w: float, h: float, accent: Color,
		font: Font) -> void:
	var stats: Array = card.get("face_stats", [])
	var top := h * 0.34
	var block_h := h * 0.24
	var gap := 4.0
	var bw := (w - 16 - gap * 2.0) / 3.0
	for i in mini(3, stats.size()):
		var pair: Array = stats[i]
		var x := 8.0 + float(i) * (bw + gap)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(STAT_BG)
		sb.set_corner_radius_all(6)
		sb.border_color = Color(accent.r, accent.g, accent.b, 0.55)
		sb.set_border_width_all(1)
		ci.draw_style_box(sb, Rect2(Vector2(x, top), Vector2(bw, block_h)))
		_draw_centered(ci, _fit(font, String(pair[1]), bw - 4, 13),
			Rect2(x, top + 1, bw, block_h * 0.58), 13, UiKit.TEXT, font)
		_draw_centered(ci, _fit(font, String(pair[0]), bw - 4, 10),
			Rect2(x, top + block_h * 0.5, bw, block_h * 0.46), 9, UiKit.TEXT_DIM, font)


## 按像素宽度截断（draw_string 的 width 不裁剪，会溢出到相邻卡上，所以自己截）
static func _fit(font: Font, text: String, max_width: float, font_size: int) -> String:
	if font == null:
		return text
	if font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x <= max_width:
		return text
	var out := text
	while out.length() > 1 and font.get_string_size(out + "…", HORIZONTAL_ALIGNMENT_LEFT, -1,
			font_size).x > max_width:
		out = out.substr(0, out.length() - 1)
	return out + "…"


static func _draw_centered(ci: CanvasItem, text: String, rect: Rect2, font_size: int, color: Color,
		font: Font) -> void:
	var baseline := rect.position.y + rect.size.y * 0.78
	ci.draw_string(font, Vector2(rect.position.x, baseline), text,
		HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, font_size, color)
