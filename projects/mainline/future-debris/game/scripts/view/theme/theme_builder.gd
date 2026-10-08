extends RefCounted
class_name ThemeBuilder
## 把 token 契约编译成 Godot `Theme` 资源（**语法层的可执行形态**）。
##
## 立场：**代码里不允许出现字面量颜色或字号**——一律通过主题取值。
## 只要守住这一条，换纪元就只是换一份 `tokens.json`（风格卡），控件代码一行不改。

const THEME_PATH := "res://assets/theme/future_debris.tres"

static func build(tokens: TokenSet, font: Font) -> Theme:
	var theme := Theme.new()
	theme.default_font = font
	theme.default_font_size = tokens.size("body")
	LabelStyles.register_all(theme, tokens, font)
	_apply_containers(theme, tokens)
	_apply_controls(theme, tokens)
	return theme

static func save(theme: Theme) -> Error:
	return ResourceSaver.save(theme, THEME_PATH)

## 容器类：PanelContainer 与 Panel 用同一套面板样式（语法层同构）。
static func _apply_containers(theme: Theme, tokens: TokenSet) -> void:
	var panel := StyleBoxes.panel(tokens, "panel")
	for type_name in ["PanelContainer", "Panel"]:
		theme.set_stylebox("panel", type_name, panel)
	# 窗口背景：Godot 没有全局背景色，必须由根面板提供（否则每个场景各写一个 ColorRect 就各自取色）
	theme.add_type("RootBackground")
	theme.set_stylebox("panel", "RootBackground", StyleBoxes.root_background(tokens))
	theme.set_constant("separation", "VBoxContainer", int(tokens.spacing[1]))
	theme.set_constant("separation", "HBoxContainer", int(tokens.spacing[1]))

## 控件类：按钮（默认 / 悬停 / 按下 / 焦点 / 禁用）与容器分隔。
static func _apply_controls(theme: Theme, tokens: TokenSet) -> void:
	# 常态/悬停的底色**必须显式给出**：只靠 panel() 的兜底会让两者同色
	# （--bg-elev-2 是控件兜底色，与悬停色相同）——这个坑同样由"三态可区分"断言抓出。
	# 常态用 --bg-elev-2 而非 --bg-elev-1：后者与 --bg-base 亮度只差 0.007，按钮"浮不起来"
	# （截图验收发现：按钮看起来像没有底色的文字标签）。
	var normal := StyleBoxes.panel(tokens, "control", tokens.color("--bg-elev-2"))
	# 悬停再抬一档到镀铬中调 --material-mid（与原子纪"镀铬"材质语言一致，且明显更亮）
	var hover := StyleBoxes.panel(tokens, "control-hover", tokens.color("--material-mid"))
	var pressed := StyleBoxes.panel(tokens, "control", tokens.color("--accent"))
	var focus := StyleBoxes.panel(tokens, "focus")
	theme.set_stylebox("normal", "Button", normal)
	theme.set_stylebox("hover", "Button", hover)
	theme.set_stylebox("pressed", "Button", pressed)
	theme.set_stylebox("focus", "Button", focus)
	theme.set_stylebox("disabled", "Button", StyleBoxes.panel(tokens, "control", tokens.color("--surface-sunken")))
	theme.set_color("font_color", "Button", tokens.color("--text"))
	theme.set_color("font_pressed_color", "Button", tokens.color("--text"))
	theme.set_color("font_disabled_color", "Button", tokens.color("--text-faint"))
	theme.set_font("font", "Button", theme.default_font)
	theme.set_font_size("font_size", "Button", tokens.size("body"))
	theme.set_constant("separation", "Button", int(tokens.spacing[1]))
