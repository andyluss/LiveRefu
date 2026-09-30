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
