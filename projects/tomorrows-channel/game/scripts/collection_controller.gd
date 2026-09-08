class_name CollectionController
extends Node
## 收藏控制器（M1 最小：收藏 1 卡闭环）。
##
## 职责（事件驱动 + 数据驱动，见主程序 01_tech-stack-draft.md §4.3 合规闸门）：
##   1. 订阅 event_bus.collect_requested(card_id)——由 UI（TapeChannelPanel 收藏按钮）发出；
##   2. 从 config_loader 内容卡池读取该卡 → 校验（存在 + 版权 status 合规闸门）；
##   3. 记录到图鉴最小列表（内存 Dictionary id→{rarity, collected_at}）；
##   4. 首次收藏：读 content_card.collect_frag 记入内存碎片账本（每卡仅首次）；
##   5. 广播 event_bus.card_collected(card_id, rarity) 供 UI 反馈「已归档」。
##
## 合规边界（防漏发）：不进库的卡（缺失 / 版权未批准）拒绝收集。版权字段为**嵌套 `copyright` 对象**，
## 结构以主策划版权 taxonomy 与数值策划 A 契约（data/schema/content_card.schema.json §copyright）为权威：
##   - 强制字段：source / license / license_url / status（缺任一即拒）；
##   - status 状态机：draft / pending_review / approved / rejected / blocked —— 仅 **approved** 可入池收集。

## 允许收藏的版权 status（唯一可入池状态；见 content_card.schema.json §copyright.status）。
const APPROVED_STATUSES: Array[String] = ["approved"]

## 图鉴最小列表：card_id → { "rarity": String, "collected_at": String }（内存，M1 不做持久化）。
var gallery: Dictionary = {}

## 首次收藏碎片账本：card_id → int（每卡仅首次，来自 content_card.collect_frag）。
var _collect_frag_wallet: Dictionary = {}


func _ready() -> void:
	# 订阅收藏请求（UI/动作入口发出；逻辑层不直接依赖 UI）。
	event_bus.collect_requested.connect(_on_collect_requested)


## 响应收藏请求：走完整校验/归档/广播链路。供 event_bus.collect_requested 回调。
func _on_collect_requested(card_id: String) -> void:
	request_collect(card_id)


## 收藏入口（可编程调用，供逻辑层/自检复用）。返回是否成功归档。
## 校验顺序：卡存在 → 版权合规（status 已批准 + 强制字段齐全）→ 未重复 → 归档。
func request_collect(card_id: String) -> bool:
	if config_loader == null:
		push_error("CollectionController: config_loader autoload 缺失")
		return false
	var card := config_loader.get_content_card(card_id)
	if card.is_empty():
		push_warning("CollectionController: 收集被拒（卡不存在）-> %s" % card_id)
		return false
	if not is_compliant(card):
		push_warning("CollectionController: 收集被拒（版权未批准）-> %s" % card_id)
		return false
	if gallery.has(card_id):
		# 幂等：已归档，不重复收集/不再重复给碎片。
		_gdprint("CollectionController: 已收藏过（幂等忽略）-> %s" % card_id)
		return false
	var rarity := String(card.get("rarity", "common"))
	gallery[card_id] = {
		"rarity": rarity,
		"collected_at": Time.get_datetime_string_from_system(),
	}
	var frag := int(card.get("collect_frag", 0))
	_collect_frag_wallet[card_id] = frag
	event_bus.card_collected.emit(card_id, rarity)
	_gdprint("CollectionController: 已归档 card=%s rarity=%s first_frag=%d 图鉴=%d" % [
		card_id, rarity, frag, gallery.size(),
	])
	return true


## 版权合规闸门：卡片含**嵌套 copyright 对象**，且其四强制字段（source/license/license_url/status）
## 齐全 + status ∈ APPROVED_STATUSES（approved）。否则拒绝收集。
func is_compliant(card: Dictionary) -> bool:
	var cr = card.get("copyright")
	if not (cr is Dictionary):
		return false
	for field in ["source", "license", "license_url", "status"]:
		if not (cr as Dictionary).has(field):
			return false
	var status := String((cr as Dictionary).get("status", ""))
	return status in APPROVED_STATUSES


## 图鉴最小列表（card_id → 收藏条目）。
func get_gallery() -> Dictionary:
	return gallery


## 该卡是否已收藏。
func is_collected(card_id: String) -> bool:
	return gallery.has(card_id)


## 已收藏卡片数（M1 最小列表长度）。
func get_collected_count() -> int:
	return gallery.size()


## 该卡首次收藏碎片数（未收藏返回 0）。每卡仅首次给。
func get_collect_frag(card_id: String) -> int:
	return int(_collect_frag_wallet.get(card_id, 0))


## 调试输出：无头（CI/脚本）下走 stderr（判定可见）。
func _gdprint(msg: String) -> void:
	if DisplayServer.get_name() == "headless":
		printerr(msg)
