# -*- coding: utf-8 -*-
import os, re, html as H
os.environ.setdefault('XDG_CACHE_HOME','/tmp/fc')
import markdown

ROOT='/Users/lu/work/fab/LiveRefu/doc/retro-futurism'
OUTDIR=os.path.join(ROOT,'合订本')
os.makedirs(OUTDIR, exist_ok=True)

essays=['00_总论_未来的考古学与全卷地图.md','01_理论篇_怀旧乡愁与未来的遗产化.md','02_远古篇_飞天永生与自动人偶_神话中的原初未来.md','03_古典篇_异地乌托邦_从理想国到太阳城与大同.md','04_近代篇_进步的世纪_启蒙与工业时代的未来雏形.md','05_奠基篇_凡尔纳与威尔斯_未来小说的制度化.md','06_机器篇_速度与钢骨_未来主义与装饰艺术的机器乌托邦.md','07_战间篇_柴油朋克_天空舰队冒险家与明日世界.md','08_原子篇_原子朋克_幸福原子与镀铬郊区.md','09_太空篇_太空时代_Googie射线枪哥特与明日世界.md','10_红旗篇_红星照耀的未来_社会主义复古未来主义.md','11_中国篇_新中国未来_晚清到千禧年的中国未来想象.md','12_谱系篇_朋克宇宙学_从时钟朋克到磁带未来主义.md','13_蒸汽篇_蒸汽朋克_铜与汽的维多利亚回望.md','14_磁带篇_磁带未来主义_模拟接口的暖未来.md','15_赛博篇_赛博朋克_近未来的腐坏与它自己的乡愁.md','16_末日篇_被取消的未来_复古末日与废墟乡愁.md','17_蒸汽波篇_蒸汽波与合成波_时代错置的听觉乡愁.md','18_千禧篇_Y2K与FrutigerAero_千禧互联网美学.md','19_多元篇_非洲未来主义与丝绸朋克_文化星丛.md','20_结语与附录_未来年表与术语对照.md']
vols=['附录_太阳朋克卷','附录_千禧美学卷','附录_赛博朋克卷','附录_蒸汽朋克卷','附录_原子朋克卷','附录_生物朋克卷','附录_柴油朋克卷']

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

toc_rows.append('<tr><td class="vol" colspan="2">第一部分 · 主卷正文 00—20</td></tr>')
for rel in [e for e in order if os.path.dirname(e)=='' and os.path.basename(e) in essays]:
    toc_rows.append(row(rel))
for v in vols:
    toc_rows.append(f'<tr><td class="vol" colspan="2">外编附录 · {esc(v)}</td></tr>')
    for rel in [r for r in order if os.path.dirname(r)==v]:
        toc_rows.append(row(rel))
toc='\n'.join(toc_rows)

CSS=r'''
@page { size:A4; margin: 20mm 15mm 18mm 15mm;
  @bottom-center { content: "— " counter(page) " —"; font-size: 9pt; color:#888; } }
@page cover { margin:0; @bottom-center{content:none;} }
html { font-size: 11pt; }
body { font-family: "PingFang SC","Songti SC","Noto Serif CJK SC",serif; line-height:1.75; color:#1a1a1a; }
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
<h1>复古未来主义论文集</h1>
<div class="sub">全卷合订本（含页码目录）· 21 篇正文 + 7 个外编附录卷</div>
<div class="sub" style="font-size:10pt;">合订生成于 WeasyPrint 排版引擎；目录页码为自动计算的真实页码，与下方各页页脚页码一致。</div>
</div>
<div>
<h2 style="font-size:16pt;">合订目录</h2>
<table class="toc">{toc}</table>
<p style="font-size:9pt;color:#777;">注：主卷根目录另存 README.md 与《全卷总索引与字数统计》作导读与检索用，未重复收入合订本正文。</p>
</div>'''

doc_html=f'''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>复古未来主义论文集 · 全卷合订本</title>
<style>{CSS}</style></head>
<body>
{cover}
<section class="sec first">{content}</section>
</body></html>'''

open(os.path.join(OUTDIR,'复古未来主义论文集_合订.html'),'w',encoding='utf-8').write(doc_html)
print('html written, files:',len(order))

# ---------- render PDF ----------
from weasyprint import HTML
pdf_path=os.path.join(OUTDIR,'复古未来主义论文集_合订.pdf')
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
