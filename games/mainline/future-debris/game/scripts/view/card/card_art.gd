extends RefCounted
class_name CardArt
## 卡面插画位的**资源约定与加载**。
##
## 约定：`res://assets/cards/<卡号>.png`（例：`RC-ATOMIC-001.png`）。
## 为什么用"按卡号命名"而不是一份清单：清单会与卡表脱钩（加了卡忘了登记），
## 而按卡号命名是**零登记**的——把图放进目录就生效。
##
## 立场：**缺图不是错误**。美术尚未启动时，界面必须能带着占位正常运行；
## 但缺哪些图必须**可被机器查出来**（见 `missing_ids`），否则会一直缺到发布。

const DIR := "res://assets/cards"

static var _cache: Dictionary = {}

## 取某张卡的插画；没有则返回 null（调用方画占位）。
static func load_for(card_id: String) -> Texture2D:
	if _cache.has(card_id):
		return _cache[card_id]
	var path := "%s/%s.png" % [DIR, card_id]
	var texture: Texture2D = null
	if ResourceLoader.exists(path):
		texture = load(path) as Texture2D
	_cache[card_id] = texture
	return texture

## 卡表里**还没有插画**的卡号（供闸门报告"美术还欠多少张"）。
static func missing_ids(catalog: CardCatalog) -> PackedStringArray:
	var out := PackedStringArray()
	var ids := catalog.cards.keys()
	ids.sort()
	for id in ids:
		if load_for(str(id)) == null:
			out.append(str(id))
	return out

## 已就绪的插画数量（用于进度报告）。
static func ready_count(catalog: CardCatalog) -> int:
	return catalog.cards.size() - missing_ids(catalog).size()
