# 合订本说明（PDF / HTML 带页码合订目录）

本目录为《复古未来主义论文集》的排版合订产物，由根目录 21 篇正文与七个外编附录卷（共 91 个 Markdown 文件）合并渲染生成。

| 文件 | 说明 |
| --- | --- |
| 复古未来主义论文集_合订.pdf | 成品 PDF（A4，260 页）：页脚带页码；卷首为**自动计算页码**的合订目录（点击可跳转），与各页页脚页码一一对应 |
| 复古未来主义论文集_合订.html | 浏览器版合订（单文件、无外部依赖）：目录中每篇旁已填好与 PDF 对应的**静态页码**（点击可跳到正文锚点）；如需在浏览器打印为 PDF，分页可能与成品略有出入 |
| gen_binder.py | 再生脚本：用 WeasyPrint 排版生成 HTML 与 PDF（含目录页码自动计算） |

## 再生方法（可选）

```bash
# 环境：python3 venv + pip install markdown pypdf weasyprint；macOS 需 pango/cairo（Homebrew 安装）
python3 -m venv /tmp/rfenv
/tmp/rfenv/bin/pip install markdown pypdf weasyprint
/tmp/rfenv/bin/python gen_binder.py     # 在 doc/retro-futurism 仓库根目录运行
```

脚本输出两个成品文件于本目录；随后脚本读取成品 PDF 反解各篇起始页，把静态页码回填进 HTML（该步骤由脚本第二段完成，需在 PDF 生成后再次运行脚本的补丁逻辑——详见脚本内注释）。

## 计数口径备忘

正文汉字统计（非本合订所用）见根目录《全卷总索引与字数统计》；本合订"页码"为 A4 排版页序号，从封面起第 1 页计。

---

（2026-09 生成）
