extends Control
## 主界面（S1 占位）：只证明"场景能装载、autoload 能读到、数据表目录能枚举"。
## 真正的界面在 S4/S5 才写；此处保持极简，避免在 Q5（平台）与 Q6（美术）裁决前固化任何布局。

@onready var _boot_label: Label = $Boot

func _ready() -> void:
	var tables := AppInfo.list_data_tables()
	_boot_label.text = "%s\n%s\n数据表：%d 个" % [
		AppInfo.PROJECT_CODENAME,
		AppInfo.PROJECT_PHASE,
		tables.size(),
	]
