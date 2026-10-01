extends RefCounted
class_name UiScale
## 界面的**内容缩放因子**：让"为 1280×720 设计的固定像素"能填满更大的视口。
##
## 为什么需要它（实测教训）：塔位与卡面是按设计尺寸画死的（132×104 / 520×720）。
## 只把视口提到 1920×1080 时，界面仍然只占左上角一块，**下半屏空着**——
## 而 Steam 要求截图 ≥1920×1080，所以这不是"以后再说"的问题。
##
## 口径：
##   - **默认 1.0**：验收闸门与日常运行都走设计尺寸，几何断言不受影响；
##   - 出素材时用命令行 `--scale=1.5` 覆盖（1920/1280 = 1.5）。
##
## 为什么不自动按视口推算：那样"同一份数据在不同窗口下几何不同"，
## 而[几何](../../scripts/view/battle/geom.gd)与卡面断言都是按契约尺寸写的。
## **显式开关比隐式自适应更好验收。**

const DEFAULT := 1.0

static var _factor := -1.0

static func factor() -> float:
	if _factor > 0.0:
		return _factor
	_factor = DEFAULT
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--scale="):
			_factor = maxf(0.25, float(arg.substr(8)))
	return _factor

## 供测试与工具显式设定（避免依赖命令行）。
static func set_factor(value: float) -> void:
	_factor = maxf(0.25, value)

## 缩放一个尺寸/长度。
static func of(value: float) -> float:
	return value * factor()

static func int_of(value: int) -> int:
	return int(round(float(value) * factor()))
