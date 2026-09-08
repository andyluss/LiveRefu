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
## 数据驱动：channel_id → 频道记录（channel.json）→ 皮肤 token 值（skins/*.tres）。


## 当前装载的频道 id（M1 = "tape_warm"）。
var current_channel_id: String = ""

## 当前装载的频道记录（channel.json，Dictionary）。
var loaded_channel: Dictionary = {}

## 当前装载的频道皮肤 Token（chasing ChannelSkin）。
var loaded_skin: ChannelSkin = null

## 频道内容池（M1 骨架：空；收藏/轮播随内容管线接入，见 README「还差什么」）。
var content_pool: Array = []

## 频道 id → 皮肤 Token 资源路径（程序侧资源路由；M1 单频道，M2 扩充）。
const SKIN_RESOURCE_BY_CHANNEL: Dictionary = {
	"tape_warm": "res://scenes/channel/skins/tape_channel_skin.tres",
}


func _ready() -> void:
	# 骨架占位：M1 接入时在此订阅 event_bus 或暴露装载入口。
	pass


## 装载指定频道（M1 = "tape_warm" 磁带暖未来）。成功后广播 event_bus.channel_loaded。
func load_channel(channel_id: String) -> bool:
	if channel_id == "":
		push_error("ChannelLoader: 空 channel_id")
		return false
	var channel := _get_channel_data(channel_id)
	if channel.is_empty():
		push_error("ChannelLoader: 频道数据缺失 %s" % channel_id)
		return false
	current_channel_id = channel_id
	loaded_channel = channel
	loaded_skin = _load_skin(channel_id)
	content_pool = []
	# 广播频道装载完成（供后处理/UI/氛围订阅）。
	event_bus.channel_loaded.emit(channel_id)
	return true


## 读取频道记录（经 ConfigLoader，数据驱动；channel.json）。
func _get_channel_data(channel_id: String) -> Dictionary:
	if config_loader == null:
		return {}
	return config_loader.get_channel(channel_id)


## 按 channel_id 装载皮肤 Token 资源（res:// 工程资源；未配置则空）。
## @pending: M2 多频道时此表扩充；皮肤热切换（热更 vs 预烘焙）由主程序 UI 拍板。
func _load_skin(channel_id: String) -> ChannelSkin:
	if not SKIN_RESOURCE_BY_CHANNEL.has(channel_id):
		push_warning("ChannelLoader: 频道无皮肤 Token 配置 -> %s" % channel_id)
		return null
	var path: String = SKIN_RESOURCE_BY_CHANNEL[channel_id]
	if not ResourceLoader.exists(path):
		push_warning("ChannelLoader: 皮肤资源不存在 -> %s" % path)
		return null
	var res := load(path)
	if res is ChannelSkin:
		return res
	push_warning("ChannelLoader: 皮肤资源类型不符 -> %s" % path)
	return null
