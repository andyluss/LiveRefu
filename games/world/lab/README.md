# RefuWorld Lab

> 这里放**真正完整的游戏切片**，不是 RefuWorld 的引擎 Demo。

| 项目 | 类型 | 状态 | 入口 |
| --- | --- | --- | --- |
| [`tetris/`](tetris/) | 完整可发布落块游戏 | 可玩 / PWA / 离线 | `http://127.0.0.1:8787/lab/tetris/` |
| [`tetris/refuworld.html`](tetris/refuworld.html) | RefuWorld 内核落块变体 | L0/L3/L5 接入 | `http://127.0.0.1:8787/lab/tetris/refuworld.html` |

## 与 Demo 的区别

- Demo 验证世界层的一个能力；Lab 游戏要能独立发布、独立计时、独立测试。
- Lab 游戏可以有完整的输入、音效、暂停、重开、最高分、触屏与移动端布局。
- 不强制依赖 RefuWorld 内核；可以把它当作“真实游戏形态”的参照，再把有复用价值的部分收回内核。

## 运行

在 `games/world/`：

```bash
node tools/serve-web.mjs --port 8787
# http://127.0.0.1:8787/lab/tetris/
```

也可以把 `lab/tetris/` 整个目录部署到任意静态托管；无需构建、无外部 CDN。
