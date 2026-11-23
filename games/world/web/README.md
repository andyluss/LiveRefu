# web · RefuWorld M1 Web 预览

> 一个不依赖引擎编辑器的预览：wasm 内核 + 最小 Canvas 视图 + 点击/键盘交互 + M0 trace 回放。

## 编辑器

```bash
cd games/world
./worldc editor --port 8788
# 打开 http://127.0.0.1:8788/
```

编辑器 v0.5：拖动摆放、字段表单、定义/规则 JSON、对话图、撤销/重做、校验、构建并打开预览。
它编辑的是 `data/demo.harbor` 的 JSON 包；TS 源 `src/content/demo.harbor` 不会自动同步。

## 构建与运行

```bash
cd games/world
./web/build.sh
cd web
python3 -m http.server 8787
# 打开 http://127.0.0.1:8787/
```

`web/build.sh` 会：

1. `worldc build` 生成 `dist/demo.harbor/pack.data`；
2. 编译 `world-wasm` 到 `wasm32-unknown-unknown`；
3. 用 `wasm-bindgen --target web` 生成 `web/pkg/`；
4. 用 `wasm-bindgen --target nodejs` 生成 `web/node-pkg/`（供 `test_preview.cjs`）；
5. 复制 `pack.data` 与 `m0.trace.json`。

`web/pkg/`、`web/node-pkg/`、`pack.data`、`m0.trace.json` 都是生成物，已 gitignore。

## 操作

| 操作 | 方式 |
| --- | --- |
| 移动 | `WASD` / 方向键；关闭的门与 NPC 会挡住玩家 |
| 寻路 | 点击空地；A* 沿烘焙导航网格走，虚线显示路径 |
| 拾取物品 | 点击黄色菱形，或 `F` / 「拾取 F」 |
| 与 NPC 对话 | 点击绿色圆点，或 `T` / 「对话 T」 |
| 与门交互 | 点击橙色方块，或 `E` / 「交互 E」 |
| 暂停 | `P` / 「暂停」 |
| 重置 | `R` / 「重置」 |
| 回放 M0 trace | 「回放 M0 trace」 |

> 目标在玩家 8 米内才可操作；移动是 2D 运动学 + 圆形/AABB 碰撞，点击移动走 A*，不含跳跃与物理。
> 导航网格由 `./worldc bake nav` 生成；编辑器「构建并试玩」会先烘焙。

## 验收

- `worldc ts-build --compare ../data/demo.harbor`：TS 包与 JSON 包同哈希。
- `node web/test_preview.cjs`：wasm 预览的 replay 与 600 tick 点击序列都得到 `0xc840fe2090a0a085`。
- 浏览器 CDP 实测：拾取 → 交互 → 对话后任务完成；回放 `PASS`；`system/light/dark` 三态与 `aria-pressed` 正确。

## 主题（R-016）

`index.html` 在 CSS 加载前预绘制主题，默认 `system`，存储键为 `localStorage['lrds-theme']`；三态按钮可键盘访问，当前项 `aria-pressed="true"`。
