extends RefCounted
class_name UiKit
## UiKit —— 界面的色板与控件工厂。
##
## 全部颜色取自 doc/refu-game-001/美术/美术设定002/12_键色与光照配方.md 的六族键色表，
## 用法遵循该文档的配比约定（键色 1 占 60%、键色 2 占 25%、键色 3 占 10%、点缀 ≤5%）。
## 界面一律用代码构建（不用 .tscn 拖控件），好处是配色/间距/字号集中在这里，
## 改一处即全局生效，也便于在无头环境里跑逻辑。

# ---------------------------------------------------------------- 色板
const BG_DEEP := Color("#0b1220")
const BG_PANEL := Color("#0f1a26")
const BG_PANEL_SOFT := Color("#111820")
const LINE := Color("#F2F7FA")
const TEXT := Color("#F7FBFF")
const TEXT_DIM := Color("#9FB3C4")
const TEXT_FAINT := Color("#7f93a8")

const TEAL := Color("#5FE3D0")      # 铁砧内芯青/星辉护盾青（主强调）
const BLUE := Color("#4FD8FF")      # 广播高亮
const PURPLE := Color("#B26BFF")    # 角度紫
const AMBER := Color("#FFD86B")     # 蓄力琥珀
const DANGER := Color("#E4533C")    # 摧毁红
const BRASS := Color("#B08D4F")     # 铁砧黄铜
const GREEN := Color("#7FD08A")

const FACTION_COLORS := {
	"ANV": Color("#4FA8D8"),
	"TID": Color("#5BF0C0"),
	"AST": Color("#5FE3D6"),
	"COG": Color("#FFD23F"),
}

## 卡类配色（色标 + 图标双编码，doc 07 第四节：色盲友好）
const TYPE_COLORS := {
	"tower": Color("#4FA8D8"),
	"unit": Color("#7FD08A"),
	"skill": Color("#FFD86B"),
	"modifier": Color("#B26BFF"),
	"map": Color("#5FE3D0"),
	"wave": Color("#E4533C"),
	"rule": Color("#F2F7FA"),
}

const TYPE_LABELS := {
	"tower": "塔卡", "unit": "单位卡", "skill": "技能卡",
	"modifier": "修饰卡", "map": "地图卡", "wave": "波次卡", "rule": "规则卡",
}

const SLOT_LABELS := {
	"standard": "标准槽", "support": "支援槽", "modifier": "修饰槽",
	"path": "路径", "none": "无需槽位",
}

const SLOT_COLORS := {
	"standard": Color("#2F4A63"),
	"support": Color("#7C3AED"),
	"modifier": Color("#D97706"),
}


# ---------------------------------------------------------------- 字号
const FS_TITLE := 34
const FS_H1 := 26
const FS_H2 := 20
const FS_BODY := 16
const FS_SMALL := 13
const FS_TINY := 11


# ---------------------------------------------------------------- 工厂

static func panel(color: Color = BG_PANEL, radius: int = 14, border: Color = LINE,
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


static func label(text: String, size: int = FS_BODY, color: Color = TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func button(text: String, size: int = FS_BODY, color: Color = TEAL) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", size)
	b.add_theme_color_override("font_color", BG_DEEP)
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


static func ghost_button(text: String, size: int = FS_BODY, color: Color = LINE) -> Button:
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


## 分隔线
static func divider(color: Color = LINE) -> ColorRect:
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


## 常用：带边框的"卡片式"容器（doc 07 第五节：一切可交互对象都呈现为卡）
static func card_panel(accent: Color, radius: int = 12, alpha: float = 0.94) -> PanelContainer:
	return panel(Color("#101a24"), radius, accent, 2, alpha)
