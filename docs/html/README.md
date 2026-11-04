# 知识库 HTML 生成器

> 一套可复用的 Markdown → HTML 阅读版工具：样式、主题脚本与生成脚本放在 `docs/html/`，各知识库只放自己的生成结果。
>
> 首次使用：复古未来主义文集，输出到 [`docs/retro-futurism/html/`](../retro-futurism/html/index.html)。

## 一、目录

| 文件 | 作用 |
| --- | --- |
| `build_knowledge_html.py` | 通用生成器：发现 Markdown 树、生成索引与嵌套页面、重写链接、生成目录与上下篇 |
| `assets/style.css` | 复用 LiveBay design01 HTML 阅读版的样式（三态主题、打印浅色、卡片、目录、正文） |
| `assets/theme.js` | 主题切换脚本（`localStorage['lrds-theme']`，系统 / 浅色 / 深色） |

## 二、用法

在仓库根目录：

```bash
python3 docs/html/build_knowledge_html.py \
  --source docs/retro-futurism \
  --output docs/retro-futurism/html \
  --title "复古未来主义论文集" \
  --include-dir-prefix 附录_
```

参数：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `--source` | `docs/retro-futurism` | Markdown 根目录 |
| `--output` | `<source>/html` | HTML 输出目录 |
| `--title` | `复古未来主义论文集` | 站点标题 |
| `--subtitle` | 内置 | 首页副标题 |
| `--include-dir-prefix` | `附录_` | 只把以此开头的子目录当作附录卷；空字符串表示所有含 `README.md` 的子目录 |
| `--exclude-dir` | `html`、`合订本`、`原朋克五卷残留` | 可重复传，排除目录 |

依赖：`pandoc`。样式与主题脚本不需要构建工具，直接静态引用。

## 三、输出约定

```text
<source>/
  README.md                 -> html/README.html
  00_总论.md                -> html/00_总论.html
  附录_X/README.md          -> html/附录_X/index.html
  附录_X/00_对读.md         -> html/附录_X/00_对读.html
  html/index.html           # 首页（生成器创建）
```

- 首页：主卷卡片、附录卡片、参考卡片、读法；
- 每页：左侧目录（总览 / 卷首 / 主卷 / 附录 / 当前附录 / 参考）、本页目录、上下篇、源 Markdown 链接；
- 链接：知识库内的 `.md` 自动映射到对应 HTML；图片与其他文件按真实相对路径重写；
- 生成物不要手改；改 Markdown 或 `docs/html/assets/` 后重跑。

## 四、三态主题

页面遵循工作区 R-016：

- 默认系统态，可切浅色 / 深色；
- 统一 `localStorage['lrds-theme']`；
- `<head>` 内联预绘制，样式表加载前设置 `data-theme`；
- 三态按钮有 `aria-pressed`；
- 打印强制浅色；
- 无 JS 时正文可读。

验收：

```bash
node design/tools/check_html_theme.ts $(find docs/retro-futurism/html -name '*.html')
```

## 五、复用到其他知识库

1. 复制 `docs/html/` 到新知识库可接受的位置，或直接引用本目录的脚本与 `assets/`；
2. 传入新的 `--source` / `--output` / `--title`；
3. 如果新知识库没有附录目录，传 `--include-dir-prefix ""` 或调整排除列表；
4. 生成后跑 R-016 与本地链接检查。

样式以 LiveBay design01 的阅读版为基线；如果后续知识库需要不同的信息密度，优先在 `assets/style.css` 里加变量/覆盖，不要在每个页面写内联样式。
