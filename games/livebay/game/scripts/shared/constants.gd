# LiveBay · 公共常数
# 只放跨 presentation 共享的布局/色板/塔顺序；不放规则数值。
class_name LiveBayConstants
extends RefCounted

const PALETTE := {
	"paper": Color("#E9E3D5"),
	"panel": Color("#D6CEBC"),
	"cream": Color("#F5EFE2"),
	"ink": Color("#232B2F"),
	"slate": Color("#2F3A3E"),
	"teal": Color("#3E6F6B"),
	"orange": Color("#D9622B"),
	"amber": Color("#E0A22E"),
	"rust": Color("#8C4A32"),
	"sage": Color("#7C8F6B"),
}

const TOWER_ORDER := ["interceptor", "pulse", "tractor", "supply", "welder", "beacon"]

const VIEW_SIZE := Vector2(1280, 720)
const TOP_BAR_H := 56.0
const BOTTOM_BAR_H := 88.0
