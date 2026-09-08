class_name ChannelLoader
extends Node
## 频道装载器（Channel bundle 抽象，M1 骨架）。
##
## 职责：把一个"频道 bundle"装载为运行时可用载体——频道主题 Token + 音景轨 + 内容池轮播。
## 对齐"可插拔 bundle"抽象（plans/00-project-plan.md §三、01_tech-stack-draft.md §4.2），
## 避免 M2 做三频道（磁带→太空→蒸汽波）时重构。
##
## 频道皮肤 Token 资源类已由图形/美术侧建立（scenes/channel/channel_skin.gd：ChannelSkin），
## 本类负责按 channel_id 装载对应 ChannelSkin 与音景/内容池，并广播 event_bus.channel_loaded。
## 频道表 channel.schema.json 【待定·M3】；M1 仅磁带单频道，用默认 ChannelSkin 占位。


## 当前装载的频道 id（M1 = "tape"）。
var current_channel_id: String = ""


func _ready() -> void:
	# 骨架占位：M1 接入时在此订阅 event_bus 或暴露装载入口。
	pass


## 装载指定频道。M1 仅支持 "tape"（磁带暖未来）。
func load_channel(channel_id: String) -> bool:
	# TODO(M1): 从配置表读频道 bundle；装载 ChannelSkin + 音景轨 + 内容池；
	# 完成后 EventBus.channel_loaded.emit(channel_id)。
	if channel_id == "":
		push_error("ChannelLoader: 空 channel_id")
		return false
	current_channel_id = channel_id
	# M1 占位：不真正装载，仅记录。
	return true
