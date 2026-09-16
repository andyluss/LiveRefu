extends RefCounted
class_name BattleFieldLayer
## 用途 ｜ 战场图层：铺一块接收点击/移动的 Control，并在其中装配 BattleView（只画）。
## 依赖 ｜ BattleView.setup()/configure()、Battle（只读）、BattleLayout。

var view: BattleView = null


## 返回装配好的 BattleView，供主控保存为 battle 的可视化引用。
func setup(parent: Control, battle: Battle, on_input: Callable) -> BattleView:
	var field := Control.new()
	field.position = Vector2(0, BattleLayout.FIELD_TOP)
	field.size = Vector2(BattleLayout.W, BattleLayout.FIELD_H)
	field.mouse_filter = Control.MOUSE_FILTER_STOP
	field.gui_input.connect(on_input)
	parent.add_child(field)

	view = BattleView.new()
	view.setup(battle)
	view.configure(Vector2(BattleLayout.W, BattleLayout.FIELD_H - 20), Vector2(0, 10))
	field.add_child(view)
	return view
