# 合订本说明（PDF / HTML 带页码合订目录）

本目录为《复古未来主义论文集》的排版合订产物，由根目录 21 篇正文与七个外编附录卷（共 91 个 Markdown 文件）合并渲染生成。

| 文件 | 说明 |
| --- | --- |
| 复古未来主义论文集_合订.pdf | 成品 PDF v1（A4，260 页）：正文汉字使用苹方（PingFang SC）子集字体 |
| 复古未来主义论文集_合订_v2.pdf | **兼容字体版 PDF v2（257 页）**：正文汉字改用单一 TTF（Arial Unicode）显式嵌入，规避个别查看器对苹方子集字体的解析问题——若 v1 在你的查看器中乱码，请改用本版 |
| 复古未来主义论文集_合订.html / _v2.html | 浏览器版合订（静态页码分别对应同名 PDF 版本） |
| gen_binder.py / gen_binder_v2.py | 再生脚本（v2 为 @font-face 显式字体的兼容版） |

> 页码说明：两版排版行距/字体度量不同，页码各自对应本版，勿跨版使用。若 v2 仍乱码，请提供所用查看器与截图以便定位。

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
