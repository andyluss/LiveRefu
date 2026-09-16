extends RefCounted
class_name Palette
## Palette —— 全局色板与字号常量（纯数据，无逻辑）。
##
## 全部颜色取自 doc/refu-game-001/美术/美术设定002/12_键色与光照配方.md 的六族键色表，
## 用法遵循该文档的配比约定（键色 1 占 60%、键色 2 占 25%、键色 3 占 10%、点缀 ≤5%）。
## 对外仍然通过 UiKit 暴露（UiKit 里是同名 const 转发），调用方不需要改。

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
