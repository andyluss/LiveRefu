extends RefCounted
class_name Widgets
## Widgets —— 界面控件工厂（全部代码构建，不用 .tscn 拖控件）。
##
## 配色/间距/字号集中在 Palette，控件样式集中在这里，改一处即全局生效，
## 也便于在无头环境里跑逻辑。对外通过 UiKit 的同名静态方法转发。

# ---------------------------------------------------------------- 容器

static func panel(color: Color = Palette.BG_PANEL, radius: int = 14, border: Color = Palette.LINE,
		border_width: int = 1, alpha: float = 0.92) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(color.r, color.g, color.b, alpha)
	sb.set_corner_radius_all(radius)
	sb.border_color = Color(border.r, border.g, border.b, 0.45)
	sb.set_border_width_all(border_width)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", sb)
	return p


## 常用：带边框的"卡片式"容器（doc 07 第五节：一切可交互对象都呈现为卡）
static func card_panel(accent: Color, radius: int = 12, alpha: float = 0.94) -> PanelContainer:
	return panel(Color("#101a24"), radius, accent, 2, alpha)


static func divider(color: Color = Palette.LINE) -> ColorRect:
	var c := ColorRect.new()
	c.color = Color(color.r, color.g, color.b, 0.18)
	c.custom_minimum_size = Vector2(0, 1)
	return c


static func hsep(height: int = 8) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, height)
	return c


static func wsep(width: int = 8) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(width, 0)
	return c


## 把 Control 铺满父节点
static func full_rect(c: Control) -> Control:
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	return c


# ---------------------------------------------------------------- 文本与按钮

static func label(text: String, size: int = Palette.FS_BODY, color: Color = Palette.TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func button(text: String, size: int = Palette.FS_BODY, color: Color = Palette.TEAL) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", size)
	b.add_theme_color_override("font_color", Palette.BG_DEEP)
	b.custom_minimum_size = Vector2(0, 52)
	var normal := StyleBoxFlat.new()
	normal.bg_color = color
	normal.set_corner_radius_all(12)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = color.lightened(0.12)
	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = color.darkened(0.2)
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	return b


static func ghost_button(text: String, size: int = Palette.FS_BODY,
		color: Color = Palette.LINE) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", size)
	b.add_theme_color_override("font_color", color)
	b.custom_minimum_size = Vector2(0, 46)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(color.r, color.g, color.b, 0.06)
	normal.set_corner_radius_all(12)
	normal.border_color = Color(color.r, color.g, color.b, 0.4)
	normal.set_border_width_all(1)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color(color.r, color.g, color.b, 0.16)
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", hover)
	return b


## 进度条（基地生命 / 能量等）。color 为主色，自动带底槽。
static func bar(value: float, maximum: float, color: Color, width: float = 180.0,
		height: float = 14.0) -> ProgressBar:
	var pb := ProgressBar.new()
	pb.max_value = maxf(1.0, maximum)
	pb.value = clampf(value, 0.0, maximum)
	pb.show_percentage = false
	pb.custom_minimum_size = Vector2(width, height)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.45)
	bg.set_corner_radius_all(int(height / 2.0))
	var fg := StyleBoxFlat.new()
	fg.bg_color = color
	fg.set_corner_radius_all(int(height / 2.0))
	pb.add_theme_stylebox_override("background", bg)
	pb.add_theme_stylebox_override("fill", fg)
	return pb
