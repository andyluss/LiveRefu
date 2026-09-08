class_name AppController
extends Node
## App 壳控制器（M1 骨架）。
##
## 职责：单实例 + 窗口/生命周期 + 后台常驻（最小化后仍跑计时+氛围）。对齐 M1 去风险项"App 壳 spike"
## （plans/00-project-plan.md §三 M1 App 壳；01_tech-stack-draft.md §六）。
## 系统级托盘/迷你窗/全局快捷键需插件或 GDExtension（Godot 无原生托盘/系统级热键 API），
## 作为独立 spike 先行；原生缺口已记风险（plans/00-project-plan.md §五）。当前仅为骨架占位。


## 后台常驻是否启用（低功耗模式，见 01_tech-stack-draft.md §二）。
var _enable_background: bool = false


func _ready() -> void:
	# 骨架占位：M1 接入时在此做单实例检测、主窗口生命周期、后台常驻配置。
	_setup_low_processor_usage()


## 后台常驻（低功耗）：开启 OS 低功耗模式，允许最小化后仍运行计时+氛围。
func _setup_low_processor_usage() -> void:
	# 骨架占位：验证 OS.low_processor_usage_mode 是否适用（最小化后仍跑，见 01_ §二）。
	_append_todo("OS.low_processor_usage_mode / 动态降刷新")


## 骨架占位说明：记录待接入项。
func _append_todo(item: String) -> void:
	# 骨架：接入时替换为实际实现。
	pass
