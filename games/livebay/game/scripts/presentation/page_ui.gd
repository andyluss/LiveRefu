# LiveBay · 页面 UI 小工具
# HomePage / LabPage 共用的字体、主题与按钮样式；不参与游戏 HUD。
class_name LiveBayPageUi
extends RefCounted

const Consts = preload("res://scripts/shared/constants.gd")


static func make_theme() -> Theme:
	var t := Theme.new()
	var f := SystemFont.new()
	f.font_names = PackedStringArray(["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "Arial Unicode MS"])
	f.allow_system_fallback = true
	t.default_font = f
	t.default_font_size = 15
	t.set_color("font_color", "Label", Color("#E9E3D5"))
	t.set_color("font_color", "Button", Color("#F5EFE2"))
	t.set_stylebox("panel", "PanelContainer", panel_style(Color("#182326"), Color("#3D4D4D"), 14))
	button_style(t, Color("#2F6B65"), Color("#F5EFE2"))
	return t


static func button_style(t: Theme, bg: Color, fg: Color, radius := 8) -> void:
	var normal := panel_style(bg, bg.darkened(0.25), radius)
	var hover := panel_style(bg.lightened(0.10), Color("#D9622B"), radius)
	var pressed := panel_style(bg.darkened(0.15), bg.darkened(0.3), radius)
	t.set_stylebox("normal", "Button", normal)
	t.set_stylebox("hover", "Button", hover)
	t.set_stylebox("pressed", "Button", pressed)
	t.set_stylebox("focus", "Button", hover)
	t.set_color("font_color", "Button", fg)
	t.set_color("font_hover_color", "Button", fg)
	t.set_color("font_pressed_color", "Button", fg)


static func panel_style(bg: Color, border: Color, radius := 0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1 if radius == 0 else 2)
	s.set_corner_radius_all(radius)
	s.content_margin_left = 14
	s.content_margin_right = 14
	s.content_margin_top = 10
	s.content_margin_bottom = 10
	return s


static func style_button(button: Button, bg: Color, fg: Color, radius := 8) -> void:
	button.add_theme_stylebox_override("normal", panel_style(bg, bg.darkened(0.25), radius))
	button.add_theme_stylebox_override("hover", panel_style(bg.lightened(0.10), Color("#D9622B"), radius))
	button.add_theme_stylebox_override("pressed", panel_style(bg.darkened(0.15), bg.darkened(0.3), radius))
	button.add_theme_stylebox_override("focus", panel_style(bg.lightened(0.10), Color("#D9622B"), radius))
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", fg)
	button.add_theme_color_override("font_pressed_color", fg)
