# 朋克五卷 · 合订本说明

| 文件 | 说明 |
| --- | --- |
| 朋克五卷合订_v2.pdf | 成品 PDF（A4，115 页）：五卷（atompunk/biopunk/cyberpunk/dieselpunk/steampunk，各卷 README+00–08，共 50 文件）合并排版；页脚带页码，卷首目录为自动计算的真实页码 |
| 朋克五卷合订_v2.html | 浏览器版合订（单文件）：目录已回填与 PDF 对应的静态页码，可锚点跳转 |
| gen_binder.py | 再生脚本（正文汉字采用 Arial Unicode 显式嵌入的兼容字体） |

## 再生方法

```bash
/tmp/rfenv/bin/python gen_binder.py   # 在 doc/punks 仓库根目录运行（需 venv 含 markdown/pypdf/weasyprint）
```

脚本生成两个成品后，会再跑一次页码回填逻辑（见脚本尾部）。

> 注：五卷另有逐文件字数统计，见 doc/punks/《总索引与字数统计》。

---

（2026-09 生成）
