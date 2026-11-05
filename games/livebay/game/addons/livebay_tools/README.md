# LiveBay Tools · 地图编辑器 MVP

> Godot 4.7 编辑器插件。把路径点、塔位、基地直接画在 2D 视口里；保存时写回 `numbers/05_地图与塔位.md`，再由 Python bridge 导出到 `game/data/`。
>
> 规则：`TECH-A1`（单一数据源）、`TECH-B1`（可逆工程）、`DES-C1`（数值与场景引用）。

## 一、启用

插件已在 `game/project.godot` 中启用：

```ini
[editor_plugins]
enabled=PackedStringArray("res://addons/livebay_tools/plugin.cfg")
```

打开 Godot 编辑器，加载 `res://scenes/main.tscn`，右上角会出现 **LiveBay Tools** 面板与 2D 叠加层。

要求：

- Godot 4.7；
- Python 3（默认 `python3`，可用环境变量 `PYTHON` 指定）；
- `tools/export_numbers.py` 可用。

## 二、能做什么

| 操作 | 结果 |
| --- | --- |
| 点击路径点 / 塔位 / 基地 | 选中，显示坐标 |
| 拖动 | 按 5px 吸附移动 |
| 塔预览 | 选中塔位后，在面板里选塔，显示射程圈 |
| 重载 | 从 `numbers/05` 重新读取 |
| 保存 | 写回 `numbers/05` → `export_numbers.py` → `game/data/` |
| 校验 | 跑 `export_numbers.py --check` |
| 冒烟测试 | `./run.sh editor-test`（读取 7 个塔位 + numbers 校验） |
| 运行游戏 | 打开主场景运行 |
| 波次时间轴 | 每条横条是一组敌人；点击选中；左拖改 `delay`，右缘拖改 `interval` |
| 波次数值面板 | 准备 / 敌人 / 数量 / 间隔 / 延迟，点「应用」 |
| 视口预览 | 在 2D 视口内播放选中波次的敌人移动 |
| 内嵌预览 | SubViewport 内用真实 Sim 跑选中波次及后续波；左键建造/升级，右键出售，可暂停/下一波；光束、击杀、结算 |
| 操作历史 | 命名快照列表；撤销/重做同步；点击回到某动作之前，后续历史作为分支保留 |
| 数值表 | 打开塔 / 敌人数值窗口；改完可应用并写回 `numbers/02–03` |
| 加组 / 删组 / 加波 / 删波 | 直接修改 `numbers/04` 的波次结构 |

数据流：

```text
numbers/05_地图与塔位.md
  ⇅ bridge.py（读写表格）
LiveBay Tools（Godot 插件）
  ↓ 保存
bridge.py write → numbers/05
  ↓
export_numbers.py → game/data/*.json
```

## 三、MVP 边界

已做：

- 路径点拖动 / 插入 / 删除；
- 塔位拖动 / 插入 / 删除；
- 基地拖动；
- 塔射程预览；
- 撤销 / 重做（快照栈，保存前可回退）；
- 波次时间轴 + 波次数值面板（组/波次增删）；
- 时间轴左拖 `delay`、右缘拖 `interval`；
- **视口内波次预览**：播放选中波次的敌人移动；
- **SubViewport 内嵌预览**：真实 Sim 连续波次；预览塔选择；左键建造/升级、右键出售、暂停、下一波；光束与击杀飘字；WON/LOST 与详细结算；
- 命名撤销/重做历史；点击历史回到某动作之前，后续历史作为分支保留；
- 数值表：塔 / 敌人字段编辑，写回 `numbers/02–03`；
- 保存、重载、校验、运行。

未做（更高阶）：

- 多分支树可视化（当前是单条可回退历史 + 未编辑前保留的后续分支）；
- 数值表的字段依赖校验 / 批量导入；
- 内嵌预览的完整 HUD 与波间升级商店。

## 四、文件

| 文件 | 作用 |
| --- | --- |
| `plugin.cfg` | 插件声明 |
| `plugin.gd` | Dock + 2D 叠加层 + 拖拽 |
| `bridge_client.gd` | 调用 Python bridge |
| `bridge.py` | 读写 `numbers/05`、导出、校验 |

## 五、演示

- 视频 v2：[`../../../docs-ai/design01/shots/editor_usage_v2.mp4`](../../../docs-ai/design01/shots/editor_usage_v2.mp4)
- 旧版视频：[`../../../docs-ai/design01/shots/editor_usage.mp4`](../../../docs-ai/design01/shots/editor_usage.mp4)
- 程序化演示源：[`../../demo/editor_demo.gd`](../../demo/editor_demo.gd)
- 说明：[`../../demo/README.md`](../../demo/README.md)

## 六、注意

- 插件保存会直接改 `numbers/05_地图与塔位.md`；建议先提交或备份；
- 保存后 `game/data/map_bay01.json` 会由导出器重写，不要手改；
- 如果 Python 路径不对，把 `PYTHON` 环境变量指向解释器，或在 `bridge_client.gd` 里改默认命令；
- 这是 Phase 1 MVP，不是完整游戏编辑器；范围见 [15_专用游戏编辑器方案](../../../docs-ai/design01/15_专用游戏编辑器方案.md)。
