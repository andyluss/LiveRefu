# Games · 游戏项目区

> 所有游戏项目统一放在 `games/`；Godot 用户数据统一在 [`games/.godot-home/`](.godot-home/)。

## 项目

| 项目 | 目录 | 说明 |
| --- | --- | --- |
| 逍遥湾 · LiveBay | [`livebay/`](livebay/README.md) | **当前主线**：NASApunk · 岗位塔防 + 沉浸 + 放置；v0.1 可玩切片 |
| 未来残片 | [`future-debris/`](future-debris/README.md) | 历史主线候选（2026-11-04 起归档，不再投入主线资源） |
| Refu Game 001 | [`refu-game-001/`](refu-game-001/README.md) | 第二轨预研 / 卡片塔防垂直切片 |
| 明日频道 | [`tomorrows-channel/`](tomorrows-channel/README.md) | 复古未来氛围陪伴应用（卫星项目） |

## Godot 数据

- `games/.godot-home/` 是统一 `HOME` 目录，已 gitignore；
- 各项目 `run.sh` 会指向这里，避免写用户目录；
- 旧的 `projects/.godot-home` 内容暂存于 `games/.godot-home/legacy-projects/`。

## 边界

游戏项目从 `projects/` 移入后，路径深度不变；项目内相对链接保持不变。跨项目引用请使用 `games/<project>/...`。
