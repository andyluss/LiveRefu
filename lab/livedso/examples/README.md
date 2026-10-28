# 灵动构坊 · 示例

| 目录 | 用途 |
| --- | --- |
| [`plugins/`](plugins/) | 可复制的本地检查插件；不是默认加载目录 |

使用：

```bash
node src/cli.ts check --plugins examples/plugins
```

插件运行在本地进程内，**无沙箱**；只加载可信代码。详见 [`../docs/07_插件API.md`](../docs/07_插件API.md)。
