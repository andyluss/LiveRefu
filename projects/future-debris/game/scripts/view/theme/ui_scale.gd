extends RefCounted
class_name UiScale
## 界面内容的**尺寸因子**：由**视口宽度**驱动，让固定像素的设计能随窗口变化。
##
## 为什么需要它（实测教训）：塔位与卡面是按设计尺寸画死的（132×104 / 520×720）。
## 把视口提到 1920×1080 时，界面仍然只占左上角一块、下半屏空着——
## 而 Steam 要求截图 ≥1920×1080，所以这不是"以后再说"的问题。
##
## 口径：
##   - **设计基准是 1280 宽**（[DESIGN_WIDTH]）。视口更宽 → 内容按比例放大，
##     但**封顶**（[MAX_FACTOR]），否则超宽屏上元素会大到荒谬；
##   - 命令行 `--scale=N` 可**显式覆盖**（出素材时用），优先级最高；
##   - 默认视口（1280）下因子恒为 1.0，因此**验收闸门的几何断言不受影响**。

const DESIGN_WIDTH := 1280.0
## 放大上限：1.6 允许 1920/1280 = 1.5 生效，同时挡住 4K 屏上的失控放大。
const MAX_FACTOR := 1.6
const MIN_FACTOR := 1.0

static var _override := -1.0
static var _cached := -1.0
static var _cached_width := -1

## 显式覆盖（命令行或测试用）。传 -1 表示恢复"按视口推算"。
static func set_override(value: float) -> void:
	_override = value
	_cached = -1.0

static func parse_cli() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--scale="):
			set_override(maxf(0.25, float(arg.substr(8))))

## 当前因子。**按视口宽度推算并缓存**（每帧调用它也不会重复算）。
static func factor() -> float:
	if _override > 0.0:
		return _override
	var width := _viewport_width()
	if _cached > 0.0 and _cached_width == width:
		return _cached
	_cached_width = width
	_cached = clampf(float(width) / DESIGN_WIDTH, MIN_FACTOR, MAX_FACTOR)
	return _cached

## 视口宽度：优先取主窗口的可见宽度（无窗口时回落到设计宽度）。
static func _viewport_width() -> int:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null or tree.root == null:
		return int(DESIGN_WIDTH)
	var size := tree.root.get_visible_rect().size
	if size.x <= 0.0:
		return int(DESIGN_WIDTH)
	return int(size.x)

static func of(value: float) -> float:
	return value * factor()

static func int_of(value: int) -> int:
	return int(round(float(value) * factor()))
