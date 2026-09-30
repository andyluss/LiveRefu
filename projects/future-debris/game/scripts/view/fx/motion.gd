extends RefCounted
class_name Motion
## 动效参数：**只从 token 取**（裁决 D15：语法层是唯一来源）。
##
## 为什么要有这一层而不是各处写 `create_tween().set_trans(...)`：
## 时长与曲线是**语法层的一部分**——它们决定界面"手感是否一致"。
## 散在各处写，就会出现"有的地方 120ms、有的地方 0.15 秒、曲线还各不相同"。

## 时长（秒）。token 里是毫秒，这里换算一次，避免每处都写 `/1000.0`。
static func seconds(tokens: TokenSet, name: String) -> float:
	return float(tokens.motion.get(name, 200)) / 1000.0

## 把 token 里的三次贝塞尔控制点近似成 Godot 的 Tween 过渡。
## 说明：Godot 没有任意贝塞尔过渡（只有内置几条），因此按控制点形状**选最接近的一条**，
## 而不是假装精确——这样做的好处是"手感差异"仍然由 token 决定（改 token 会换过渡）。
static func transition(tokens: TokenSet, name: String = "ease-standard") -> int:
	var points: Array = tokens.motion.get(name, [])
	if points.size() != 4:
		return Tween.TRANS_SINE
	var x1: float = float(points[0])
	var y1: float = float(points[1])
	var x2: float = float(points[2])
	if y1 <= 0.01 and x2 >= 0.99:
		return Tween.TRANS_EXPO if x1 >= 0.15 else Tween.TRANS_QUINT
	if y1 < x1:
		return Tween.TRANS_CUBIC
	return Tween.TRANS_SINE

static func ease_type(tokens: TokenSet, name: String = "ease-standard") -> int:
	var points: Array = tokens.motion.get(name, [])
	if points.size() == 4 and float(points[3]) >= 0.999 and float(points[1]) <= 0.001:
		return Tween.EASE_OUT
	return Tween.EASE_IN_OUT
