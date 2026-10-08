extends RefCounted
class_name ViewFinder
## 在场景树里按**类名**找视图（用于断言"装配出的是预期的那几块"）。
## 只数子节点是不够的：一个空 Shell 也会通过，而那正是"界面白屏"的形态。
##
## 写法说明：这里显式标注所有类型、且不用三元表达式——
## GDScript 对"三元 + Variant 下标"的类型推断不稳定（实测编译失败），
## 而这类推断失败的报错会指向**调用方**，很难定位（本次就绕了一圈）。

## 递归收集所有带 class_name 的节点类名。
static func names(root: Node) -> PackedStringArray:
	var out := PackedStringArray()
	_collect(root, out)
	return out

## 找第一个类名等于 kind 的节点；找不到返回 null。
static func first_of(root: Node, kind: String) -> Node:
	if _class_of(root) == kind:
		return root
	for child in root.get_children():
		var hit: Node = first_of(child, kind)
		if hit != null:
			return hit
	return null

## 实例化战斗界面并断言它装配出了 `required` 里的每一块视图。
## 返回**失败说明**（空串表示通过）。
##
## 为什么"不只数子节点"：一个空 Shell 也会有子节点，而那正是白屏的形态。
static func check_battle_screen(parent: Node, required: Array) -> String:
	var scene := load("res://scenes/app/battle.tscn") as PackedScene
	if scene == null:
		return "加载不到战斗场景"
	var screen := scene.instantiate()
	if screen == null:
		return "战斗场景实例化失败"
	parent.add_child(screen)
	await parent.get_tree().process_frame
	var found := names(screen)
	var missing := PackedStringArray()
	for kind in required:
		if not found.has(str(kind)):
			missing.append(str(kind))
	if not missing.is_empty():
		return "战斗界面缺少视图：%s" % ", ".join(missing)
	return ""

static func _collect(node: Node, out: PackedStringArray) -> void:
	var name: String = _class_of(node)
	if name != "":
		out.append(name)
	for child in node.get_children():
		_collect(child, out)

static func _class_of(node: Node) -> String:
	var script: GDScript = node.get_script() as GDScript
	if script == null:
		return ""
	var global: StringName = script.get_global_name()
	return String(global) if global != &"" else ""
