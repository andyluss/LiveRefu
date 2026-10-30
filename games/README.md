# Games · 游戏项目区

> 所有游戏项目统一放在 `games/`；Godot 用户数据统一在 [`games/.godot-home/`](.godot-home/)。

## 项目

| 项目 | 目录 | 说明 |
| --- | --- | --- |
| 未来残片 | [`mainline/future-debris/`](mainline/future-debris/README.md) | 主线 Godot 项目 |
| Refu Game 001 | [`refu-game-001/`](refu-game-001/README.md) | 卡片塔防垂直切片 |
| 明日频道 | [`tomorrows-channel/`](tomorrows-channel/README.md) | 复古未来氛围陪伴应用 |

## Godot 数据

- `games/.godot-home/` 是统一 `HOME` 目录，已 gitignore；
- 各项目 `run.sh` 会指向这里，避免写用户目录；
- 旧的 `projects/.godot-home` 内容暂存于 `games/.godot-home/legacy-projects/`。

## 边界

游戏项目从 `projects/` 移入后，路径深度不变；项目内相对链接保持不变。跨项目引用请使用 `games/<project>/...`。
