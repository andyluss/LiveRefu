extends RefCounted
class_name UiKit
## UiKit —— 界面的色板与控件工厂（对外门面）。
##
## 本文件只做"转发"，实现已按职责拆到同目录的两个文件里：
##   * view/palette.gd —— 全部颜色/字号常量与配色字典（纯数据）
##   * view/widgets.gd —— 控件工厂（panel/label/button/bar/...）
##
## 这里保留全部同名常量与同名静态方法，`UiKit.XXX` 的调用方（app/、tools/）
## 一个字都不用改。新增配色请加在 Palette，新增控件请加在 Widgets。

# ---------------------------------------------------------------- 色板转发
const BG_DEEP := Palette.BG_DEEP
const BG_PANEL := Palette.BG_PANEL
const BG_PANEL_SOFT := Palette.BG_PANEL_SOFT
const LINE := Palette.LINE
const TEXT := Palette.TEXT
const TEXT_DIM := Palette.TEXT_DIM
const TEXT_FAINT := Palette.TEXT_FAINT

const TEAL := Palette.TEAL
const BLUE := Palette.BLUE
const PURPLE := Palette.PURPLE
const AMBER := Palette.AMBER
const DANGER := Palette.DANGER
const BRASS := Palette.BRASS
const GREEN := Palette.GREEN

const FACTION_COLORS := Palette.FACTION_COLORS
const TYPE_COLORS := Palette.TYPE_COLORS
const TYPE_LABELS := Palette.TYPE_LABELS
const SLOT_LABELS := Palette.SLOT_LABELS
const SLOT_COLORS := Palette.SLOT_COLORS

# ---------------------------------------------------------------- 字号转发
const FS_TITLE := Palette.FS_TITLE
const FS_H1 := Palette.FS_H1
const FS_H2 := Palette.FS_H2
const FS_BODY := Palette.FS_BODY
const FS_SMALL := Palette.FS_SMALL
const FS_TINY := Palette.FS_TINY


# ---------------------------------------------------------------- 工厂转发

static func panel(color: Color = BG_PANEL, radius: int = 14, border: Color = LINE,
		border_width: int = 1, alpha: float = 0.92) -> PanelContainer:
	return Widgets.panel(color, radius, border, border_width, alpha)


static func card_panel(accent: Color, radius: int = 12, alpha: float = 0.94) -> PanelContainer:
	return Widgets.card_panel(accent, radius, alpha)


static func label(text: String, size: int = FS_BODY, color: Color = TEXT) -> Label:
	return Widgets.label(text, size, color)


static func button(text: String, size: int = FS_BODY, color: Color = TEAL) -> Button:
	return Widgets.button(text, size, color)


static func ghost_button(text: String, size: int = FS_BODY, color: Color = LINE) -> Button:
	return Widgets.ghost_button(text, size, color)


static func bar(value: float, maximum: float, color: Color, width: float = 180.0,
		height: float = 14.0) -> ProgressBar:
	return Widgets.bar(value, maximum, color, width, height)


static func divider(color: Color = LINE) -> ColorRect:
	return Widgets.divider(color)


static func hsep(height: int = 8) -> Control:
	return Widgets.hsep(height)


static func wsep(width: int = 8) -> Control:
	return Widgets.wsep(width)


static func full_rect(c: Control) -> Control:
	return Widgets.full_rect(c)
