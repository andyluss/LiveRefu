extends Node
## MainBoot —— 启动引导：确认数据表装载无误，然后进主菜单。
## 数据错误在这里就暴露（GameData 的自检结果），不让它拖到战斗里才炸。

func _ready() -> void:
	if not GameData.load_errors.is_empty():
		push_error("[MainBoot] 数据表存在问题，请先修数据：%s" % ", ".join(GameData.load_errors))
	get_tree().change_scene_to_file("res://scenes/ui/main_menu.tscn")
