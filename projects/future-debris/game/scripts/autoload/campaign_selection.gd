extends Node
## 场景之间的**选择结果**（autoload）。
##
## 为什么需要它：`change_scene_to_file` 不共享内存，关卡选择的结果必须放在
## 双方都能拿到的一处。放在 autoload 而不是"塞进场景参数"，
## 是因为它同时会被战斗场景与结算场景读取（结算需要知道刚打完哪一关）。

var level_id := "LV-ATOMIC-01"
## 上一局的结算摘要（由战斗场景写入，结算场景读取）。为空表示"没有可展示的一局"。
var last_summary: Dictionary = {}
