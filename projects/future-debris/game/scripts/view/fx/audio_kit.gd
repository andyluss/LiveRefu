extends RefCounted
class_name AudioKit
## 音频资源加载与音效映射。**音效是程序生成的**（`tools/gen_sfx.py`），仓库不放素材。
##
## 两层分开的理由（与发布形态有关）：
##   - [AudioKit]：**技术上把音放出来**（加载、缓存、并发上限）；
##   - [AudioSettings]（autoload）：**用户意图**（总开关、音量），跨场景与录像都生效。
## 混在一起会让"关掉声音"变成一次资源层的事——那是错的。

const SFX_DIR := "res://assets/sfx"
const MANIFEST := SFX_DIR + "/manifest.json"

## 事件 → 音效文件。**事件名是游戏语言，文件名是实现细节**（改文件名不必改调用点）。
const EVENTS := {
	"place": "place.wav",
	"deny": "deny.wav",
	"clean": "clean.wav",
	"residue": "residue.wav",
	"zone": "zone.wav",
	"wave_clear": "wave_clear.wav",
	"leak": "leak.wav",
	"grade": "grade.wav",
}

static var _cache: Dictionary = {}

## 取某个事件的音频流；不存在时返回 null（**不静默播放替代音**——
## 缺失应当被验收发现，而不是让玩家听到一个错误的音）。
static func stream(event: String) -> AudioStream:
	if _cache.has(event):
		return _cache[event]
	var file: String = EVENTS.get(event, "")
	if file == "":
		return null
	var path := "%s/%s" % [SFX_DIR, file]
	if not ResourceLoader.exists(path):
		return null
	var loaded := load(path) as AudioStream
	_cache[event] = loaded
	return loaded

## 清单里的音效名（供验收核对"文件齐全"）。
static func manifest_names() -> PackedStringArray:
	var out := PackedStringArray()
	var text := FileAccess.get_file_as_string(MANIFEST)
	if text.is_empty():
		return out
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return out
	var sounds: Dictionary = (parsed as Dictionary).get("sounds", {})
	for name in sounds:
		out.append(str(name))
	out.sort()
	return out
