# -*- coding: utf-8 -*-
import os, re, html as H
os.environ.setdefault('XDG_CACHE_HOME','/tmp/fc')
import markdown

ROOT='/Users/lu/work/fab/LiveRefu/doc/punks'
OUTDIR=os.path.join(ROOT,'合订本')
os.makedirs(OUTDIR, exist_ok=True)

essays=[]
vols=['atompunk','biopunk','cyberpunk','dieselpunk','steampunk']

md=markdown.Markdown(extensions=['tables','fenced_code','sane_lists','attr_list','def_list','md_in_html'], output_format='html')

def conv(path):
    md.reset()
    text=open(path,encoding='utf-8').read()
    return md.convert(text)

def esc(s): return H.escape(s, quote=False)

order=[]
def add(relpath):
    order.append(relpath)

for e in essays: add(e)
for v in vols:
    vp=os.path.join(ROOT,v)
    files=sorted(f for f in os.listdir(vp) if f.endswith('.md'))
    # README first then 00..08/05...
    files=sorted(files,key=lambda f:(f!='README.md', f))
    for f in files: add(os.path.join(v,f))

# ---------- build content ----------
sections_html=[]
for rel in order:
    name=os.path.basename(rel)
    vol=os.path.dirname(rel)
    body=conv(os.path.join(ROOT,rel))
    voltag = '' if not vol else esc(vol)+' / '
    sec_id='s-'+str(len(sections_html))
    banner=f'<h2 class="banner">{voltag}{esc(name[:-3])}</h2>'
    sections_html.append(f'<section class="sec" id="{sec_id}">\n{banner}\n{body}\n</section>')
content='\n'.join(sections_html)

# ---------- TOC ----------
toc_rows=[]
cur_vol=None
def row(rel):
    name=os.path.basename(rel)
    sec_id='s-'+str(order.index(rel))
    return f'<tr><td class="tname"><a href="#{sec_id}">{esc(name[:-3])}</a></td><td class="tpage"><a href="#{sec_id}"></a></td></tr>'

toc_rows.append('')
for rel in [e for e in order if os.path.dirname(e)=='' and os.path.basename(e) in essays]:
    toc_rows.append(row(rel))
for v in vols:
    toc_rows.append(f'<tr><td class="vol" colspan="2">卷 · {esc(v)}</td></tr>')
    for rel in [r for r in order if os.path.dirname(r)==v]:
        toc_rows.append(row(rel))
toc='\n'.join(toc_rows)

CSS=r'''
@page { size:A4; margin: 20mm 15mm 18mm 15mm;
  @bottom-center { content: "— " counter(page) " —"; font-size: 9pt; color:#888; } }
@page cover { margin:0; @bottom-center{content:none;} }
html { font-size: 11pt; }
@font-face{font-family:"AU";src:url("file:///System/Library/Fonts/Supplemental/Arial Unicode.ttf");}
body { font-family: "AU","PingFang SC","Hiragino Sans GB","Songti SC",serif; line-height:1.75; color:#1a1a1a; }
h1,h2,h3,h4 { font-family:"PingFang SC","Heiti SC",sans-serif; }
.cover { page: cover; text-align:center; padding-top:60mm; }
.cover h1 { font-size:26pt; }
.cover .sub { font-size:12pt; color:#555; margin-top:10mm;}
h2.banner { font-size:13pt; border-left:5px solid #7a5c3e; padding-left:8px; background:#f4efe8; margin:0 0 10px 0; page-break-after: avoid;}
section.sec { page-break-before: always; }
section.sec.first { page-break-before: auto; }
table { border-collapse: collapse; width:100%; }
th,td { border:1px solid #ccc; padding:3px 6px; font-size:9.5pt; }
table.toc td { border:none; padding:1px 4px; font-size:10.5pt;}
table.toc td.tname { width:80%; }
table.toc td.tpage { text-align:right; width:15%; }
table.toc td.tpage a::after { content: target-counter(attr(href), page); }
table.toc td.vol { font-weight:bold; padding-top:6pt; color:#7a5c3e;}
blockquote { color:#444; margin:6px 0 6px 12px; padding-left:10px; border-left:3px solid #ccc;}
a { color:#1a1a1a; text-decoration:none;}
h1 { page-break-before: avoid; }
'''

cover=f'''<div class="cover">
<h1>朋克专题五卷合订</h1>
<div class="sub">（含页码目录）· atompunk / biopunk / cyberpunk / dieselpunk / steampunk 五卷，共 50 个文件</div>
<div class="sub" style="font-size:10pt;">合订生成于 WeasyPrint 排版引擎；目录页码为自动计算的真实页码，与下方各页页脚页码一致。</div>
</div>
<div>
<h2 style="font-size:16pt;">合订目录</h2>
<table class="toc">{toc}</table>
<p style="font-size:9pt;color:#777;">注：五卷各自 README 已作卷首收入正文；目录页码与各页页脚页码一致（正文汉字用 Arial Unicode 显式嵌入）。</p>
</div>'''

doc_html=f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>朋克专题五卷 · 合订本</title>
<style>{CSS}</style></head>
<body>
{cover}
<section class="sec first">{content}</section>
</body></html>'''

open(os.path.join(OUTDIR,'朋克五卷合订_v2.html'),'w',encoding='utf-8').write(doc_html)
print('html written, files:',len(order))

# ---------- render PDF ----------
from weasyprint import HTML
pdf_path=os.path.join(OUTDIR,'朋克五卷合订_v2.pdf')
HTML(string=doc_html, base_url=OUTDIR).write_pdf(pdf_path)
print('pdf written:', pdf_path)

# ---------- page numbers per file ----------
from pypdf import PdfReader
r=PdfReader(pdf_path)
texts=[(p.extract_text() or '') for p in r.pages]
def find_page(name, start):
    key=name[:-3]
    for i in range(start, len(texts)):
        if key in texts[i]:
            return i+1  # 1-based
    return None
res=[]
cur=0
for rel in order:
    name=os.path.basename(rel)
    if os.path.dirname(rel)=='' and name in essays:
        pass
    pg=find_page(name, cur)
    res.append((rel,pg))
    if pg is not None: cur=max(cur, pg-1)
with open('/tmp/page_map.txt','w',encoding='utf-8') as f:
    for rel,pg in res:
        f.write(f'{rel}\t{pg}\n')
print('page map saved')
print('total pages:',len(texts))
