#!/usr/bin/env python3
"""生成 LiveBay 的 SVG 概念设定图。PNG 由 tools/render_art.sh 调用 rsvg-convert 导出。

规则：ART-A1（NASApunk 四件套）、ART-C1（色板字体与比例）。
"""
from __future__ import annotations

import math
import random
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "docs-ai" / "design01" / "art" / "images"
W, H = 1600, 1000

INK = "#1E282C"
PAPER = "#F3EEE2"
CREAM = "#F7F1E3"
SLATE = "#2F3A3E"
TEAL = "#3E6F6B"
ORANGE = "#D9622B"
AMBER = "#E0A22E"
RUST = "#8C4A32"
SAGE = "#7C8F6B"
DARK = "#0D1315"
MUTED = "#8C978F"

FONT = "PingFang SC, Hiragino Sans GB, Noto Sans CJK SC, Source Han Sans SC, sans-serif"
MONO = "SFMono-Regular, Menlo, Consolas, monospace"


def f(n: float) -> str:
    return f"{n:.2f}".rstrip("0").rstrip(".")


def esc(text: str) -> str:
    return escape(str(text))


def txt(x, y, s, size=20, fill=INK, anchor="start", font=FONT, weight=400,
        opacity=1.0, spacing=None, rotate=None):
    extra = f' letter-spacing="{spacing}"' if spacing is not None else ""
    tr = f' transform="rotate({rotate} {f(x)} {f(y)})"' if rotate is not None else ""
    return (f'<text x="{f(x)}" y="{f(y)}" font-family="{font}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" '
            f'opacity="{opacity}"{extra}{tr}>{esc(s)}</text>')


def rect(x, y, w, h, fill, stroke=None, sw=1, rx=0, opacity=1.0, dash=None):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{rx}" '
            f'fill="{fill}" opacity="{opacity}"{st}{da}/>')


def line(x1, y1, x2, y2, stroke=INK, sw=1, opacity=1.0, dash=None):
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" '
            f'stroke="{stroke}" stroke-width="{sw}" opacity="{opacity}"{da}/>')


def circle(cx, cy, r, fill="none", stroke=None, sw=1, opacity=1.0, dash=None):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}" opacity="{opacity}"{st}{da}/>'


def poly(points, fill="none", stroke=None, sw=1, opacity=1.0):
    pts = " ".join(f"{f(x)},{f(y)}" for x, y in points)
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
    return f'<polygon points="{pts}" fill="{fill}" opacity="{opacity}"{st}/>'


def path(d, fill="none", stroke=None, sw=1, opacity=1.0, dash=None):
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"' if stroke else ""
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<path d="{d}" fill="{fill}" opacity="{opacity}"{st}{da}/>'


def grid(step=40, stroke=INK, opacity=0.06):
    out = []
    for x in range(0, W + 1, step):
        out.append(line(x, 0, x, H, stroke, 1, opacity))
    for y in range(0, H + 1, step):
        out.append(line(0, y, W, y, stroke, 1, opacity))
    return "".join(out)


def point(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def arc_pts(cx, cy, r, a1, a2, n=140):
    return [point(cx, cy, r, a1 + (a2 - a1) * i / (n - 1)) for i in range(n)]


def band(cx, cy, ro, ri, a1, a2, fill, stroke=None, sw=1, opacity=1.0, n=140):
    outer = arc_pts(cx, cy, ro, a1, a2, n)
    inner = list(reversed(arc_pts(cx, cy, ri, a1, a2, n)))
    d = "M " + " L ".join(f"{f(x)} {f(y)}" for x, y in outer + inner) + " Z"
    return path(d, fill, stroke, sw, opacity)


def svg(body, defs="", bg=None):
    b = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
            f'viewBox="0 0 {W} {H}"><defs>{defs}</defs>{b}{body}</svg>')


def stars(seed=11, n=240, area=(0, 0, W, H), color=CREAM):
    random.seed(seed)
    out = []
    x0, y0, x1, y1 = area
    for _ in range(n):
        x = random.uniform(x0, x1)
        y = random.uniform(y0, y1)
        r = random.choice([0.5, 0.7, 0.8, 1.0, 1.2, 1.6])
        o = random.uniform(0.15, 0.8)
        out.append(circle(x, y, r, color, opacity=o))
    return "".join(out)


def ship(x, y, rot, scale=1.0, fill=CREAM, accent=ORANGE):
    g = [poly([(0, -12), (7, 8), (0, 4), (-7, 8)], fill, INK, 1)]
    g.append(line(0, -4, 0, 14, accent, 2))
    return f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale({scale})">{"".join(g)}</g>'


def person(x, y, scale=1.0, fill=INK, accent=ORANGE, helmet=False):
    g = []
    g.append(circle(0, -28, 7, fill))
    if helmet:
        g.append(circle(0, -28, 10, "none", accent, 2))
    g.append(path("M -9 -20 L 9 -20 L 13 14 L -13 14 Z", fill))
    g.append(line(-8, 14, -11, 34, fill, 5))
    g.append(line(8, 14, 11, 34, fill, 5))
    g.append(rect(-10, -10, 20, 4, accent, opacity=0.9))
    return f'<g transform="translate({f(x)} {f(y)}) scale({scale})">{"".join(g)}</g>'


def plate(num, title, subtitle, dark=True, x=60, y=60):
    fg = CREAM if dark else INK
    sub = MUTED if dark else "#5C6868"
    out = [txt(x, y, f"LIVEBAY / {num}", 14, ORANGE, font=MONO, spacing=3)]
    out.append(txt(x, y + 44, title, 46, fg, weight=600))
    out.append(txt(x, y + 72, subtitle, 16, sub, font=MONO, spacing=1))
    out.append(line(x, y + 88, x + 280, y + 88, ORANGE, 2))
    return "".join(out)


def art_overview():
    cx, cy = 800, 620
    defs = """
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1113"/><stop offset="0.55" stop-color="#131D20"/><stop offset="1" stop-color="#0A0F11"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.2" r="0.65">
      <stop offset="0" stop-color="#E0A22E" stop-opacity="0.22"/><stop offset="1" stop-color="#E0A22E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="outer" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#53605D"/><stop offset="1" stop-color="#2A3538"/>
    </linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E7DFCD"/><stop offset="1" stop-color="#B7AC95"/>
    </linearGradient>
    <linearGradient id="inner" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4F827C"/><stop offset="1" stop-color="#294843"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="5"/></filter>
    """
    b = [rect(0, 0, W, H, "url(#bg)")]
    b.append(stars(7, 280))
    b.append(circle(330, 190, 330, "url(#glow)"))
    # orbital construction lines
    for r in (520, 490, 400, 360, 330, 250):
        b.append(circle(cx, cy, r, "none", CREAM, 1, 0.06, "4 10"))
    b.append(line(90, cy, 1510, cy, CREAM, 1, 0.05))
    b.append(line(cx, 40, cx, 900, CREAM, 1, 0.05))

    # rings
    b.append(band(cx, cy, 470, 425, 200, 340, "url(#outer)", "#8C978F", 1.5, 1))
    b.append(band(cx, cy, 415, 365, 200, 340, "url(#mid)", "#7C7466", 1.5, 1))
    b.append(band(cx, cy, 355, 305, 200, 340, "url(#inner)", "#9FB7AE", 1.5, 1))

    # structural seams
    for a in range(202, 340, 4):
        x1, y1 = point(cx, cy, 468, a); x2, y2 = point(cx, cy, 427, a)
        b.append(line(x1, y1, x2, y2, CREAM, 1, 0.18))
    for a in range(204, 340, 6):
        x1, y1 = point(cx, cy, 413, a); x2, y2 = point(cx, cy, 367, a)
        b.append(line(x1, y1, x2, y2, INK, 1, 0.18))
    for a in range(204, 340, 8):
        x1, y1 = point(cx, cy, 353, a); x2, y2 = point(cx, cy, 307, a)
        b.append(line(x1, y1, x2, y2, CREAM, 1, 0.2))

    # outer clamps and fleet
    for a in range(206, 338, 13):
        x, y = point(cx, cy, 447, a)
        b.append(f'<rect x="{f(x-9)}" y="{f(y-4)}" width="18" height="8" rx="2" fill="{ORANGE}" transform="rotate({a+90} {f(x)} {f(y)})" opacity="0.9"/>')
    for a, s in [(208, 0.8), (219, 0.55), (330, 0.7), (338, 0.5)]:
        x, y = point(cx, cy, 505, a)
        b.append(ship(x, y, a + 90, s))

    # middle habitat lights
    for a in [202 + i * 1.7 for i in range(81)]:
        x, y = point(cx, cy, 390, a)
        b.append(circle(x, y, 1.4, AMBER, opacity=0.75))
    for a in range(206, 338, 9):
        x, y = point(cx, cy, 405, a)
        b.append(f'<rect x="{f(x-6)}" y="{f(y-3)}" width="12" height="6" rx="1" fill="{SLATE}" transform="rotate({a+90} {f(x)} {f(y)})" opacity="0.8"/>')

    # inner blocks
    for a in range(208, 336, 11):
        x, y = point(cx, cy, 330, a)
        b.append(f'<rect x="{f(x-7)}" y="{f(y-12)}" width="14" height="24" rx="2" fill="#C9BBA1" stroke="{INK}" stroke-width="1" transform="rotate({a+90} {f(x)} {f(y)})" opacity="0.95"/>')

    # docking arms connect the two horns to the bay
    b.append(line(520, 516, 660, 682, TEAL, 14, 0.9))
    b.append(line(1080, 516, 940, 682, TEAL, 14, 0.9))
    b.append(line(520, 516, 660, 682, CREAM, 2, 0.35))
    b.append(line(1080, 516, 940, 682, CREAM, 2, 0.35))
    for t in (0.25, 0.5, 0.75):
        b.append(circle(520 + (660-520)*t, 516 + (682-516)*t, 3.2, AMBER))
        b.append(circle(1080 + (940-1080)*t, 516 + (682-516)*t, 3.2, AMBER))
    # bay
    b.append(f'<ellipse cx="{cx}" cy="705" rx="215" ry="58" fill="#0B1416" stroke="{TEAL}" stroke-width="2" opacity="0.95"/>')
    b.append(f'<ellipse cx="{cx}" cy="705" rx="175" ry="38" fill="none" stroke="{AMBER}" stroke-width="1" opacity="0.35" stroke-dasharray="5 7"/>')
    for i in range(-5, 6):
        x = cx + i * 30
        b.append(line(x, 682, x, 728, TEAL, 1, 0.25))
    for a in range(214, 330, 10):
        x, y = point(cx, cy, 300, a)
        b.append(circle(x, y, 2.0, ORANGE, opacity=0.8))
    b.append(txt(cx, 710, "湾 口", 20, CREAM, "middle", weight=600, spacing=4))

    # callouts
    def callout(x1, y1, x2, y2, label, sub, color=CREAM):
        return (line(x1, y1, x2, y2, color, 1.5, 0.8) + circle(x1, y1, 3, ORANGE) +
                rect(x2 - 8, y2 - 24, 240, 58, "#0E1618", color, 1, 2, 0.9) +
                txt(x2, y2 - 4, label, 18, color, weight=600) +
                txt(x2, y2 + 18, sub, 12, MUTED, font=MONO))

    b.append(callout(455, 320, 90, 240, "外环", "OUTER / GUARD · HARVEST · POWER", CREAM))
    b.append(callout(1090, 330, 1210, 230, "中环", "MIDDLE / LIVE · CARE · LEARN", CREAM))
    b.append(callout(800, 300, 800, 90, "内环", "INNER / POLITICS · ECONOMY · CULTURE", CREAM))
    b.append(callout(800, 735, 800, 830, "湾口", "BAY MOUTH / DOCK · TRANSFER", CREAM))
    b.append(callout(354, 383, 90, 640, "舰队集群", "FLEET CLUSTER / ESCORT · COLLECT", CREAM))

    # title
    b.append(line(60, 872, 520, 872, ORANGE, 2))
    b.append(txt(60, 920, "逍遥湾", 60, CREAM, weight=600))
    b.append(txt(62, 950, "LIVEBAY / CRESCENT BAY", 16, AMBER, font=MONO, spacing=4))
    b.append(txt(62, 976, "移动月牙形太空城 · 概念总览", 15, MUTED))

    # right meta
    b.append(txt(1540, 80, "CONCEPT 01", 14, ORANGE, "end", MONO, spacing=3))
    b.append(txt(1540, 108, "CRESCENT OVERVIEW", 14, MUTED, "end", MONO, spacing=2))
    b.append(txt(1540, 930, "SCALE 1 : 20,000", 12, MUTED, "end", MONO))
    b.append(line(1320, 944, 1540, 944, MUTED, 1, 0.6))
    b.append(line(1320, 938, 1320, 950, MUTED, 1, 0.6))
    b.append(line(1540, 938, 1540, 950, MUTED, 1, 0.6))

    return svg("".join(b), defs)


def art_section():
    cx, cy = 560, 600
    defs = """
    <linearGradient id="outer2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8D0BE"/><stop offset="1" stop-color="#B4A992"/></linearGradient>
    <linearGradient id="mid2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0E7D5"/><stop offset="1" stop-color="#C9BEAA"/></linearGradient>
    <linearGradient id="inner2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E817B"/><stop offset="1" stop-color="#2B4B47"/></linearGradient>
    """
    b = [rect(0, 0, W, H, PAPER), grid(40, INK, 0.055)]
    # faint big arc construction
    for r in (400, 360, 320):
        b.append(circle(cx, cy, r, "none", INK, 1, 0.08, "4 10"))

    b.append(band(cx, cy, 360, 320, 200, 340, "url(#outer2)", INK, 1.5))
    b.append(band(cx, cy, 310, 270, 200, 340, "url(#mid2)", INK, 1.5))
    b.append(band(cx, cy, 260, 220, 200, 340, "url(#inner2)", INK, 1.5))

    for a in range(202, 340, 5):
        x1, y1 = point(cx, cy, 358, a); x2, y2 = point(cx, cy, 322, a)
        b.append(line(x1, y1, x2, y2, INK, 1, 0.25))
    for a in range(204, 340, 6):
        x1, y1 = point(cx, cy, 308, a); x2, y2 = point(cx, cy, 272, a)
        b.append(line(x1, y1, x2, y2, INK, 1, 0.22))
    for a in range(206, 338, 7):
        x1, y1 = point(cx, cy, 258, a); x2, y2 = point(cx, cy, 222, a)
        b.append(line(x1, y1, x2, y2, CREAM, 1, 0.28))

    # modules
    for a in range(206, 338, 12):
        x, y = point(cx, cy, 340, a)
        b.append(f'<rect x="{f(x-6)}" y="{f(y-3)}" width="12" height="6" rx="1" fill="{ORANGE}" transform="rotate({a+90} {f(x)} {f(y)})"/>')
    for a in [202 + i * 1.8 for i in range(76)]:
        x, y = point(cx, cy, 290, a)
        b.append(circle(x, y, 1.2, TEAL, opacity=0.65))
    for a in range(208, 336, 10):
        x, y = point(cx, cy, 242, a)
        b.append(f'<rect x="{f(x-5)}" y="{f(y-9)}" width="10" height="18" rx="1" fill="#D8CBB2" stroke="{INK}" stroke-width="1" transform="rotate({a+90} {f(x)} {f(y)})"/>')

    # section cut
    b.append(line(cx, cy, cx, 190, ORANGE, 2, 0.95, "8 7"))
    b.append(txt(cx + 12, 190, "A", 16, ORANGE, font=MONO, weight=600))
    b.append(txt(cx + 12, 620, "A", 16, ORANGE, font=MONO, weight=600))
    b.append(txt(cx, 178, "剖面 A—A / SECTION", 13, ORANGE, "middle", MONO, spacing=2))

    # people / scale
    b.append(person(450, 540, 0.7, INK, ORANGE))
    b.append(person(485, 545, 0.7, INK, TEAL))
    b.append(person(690, 545, 0.7, INK, AMBER))

    # right panels
    panels = [
        ("外环 / OUTER", "护卫 · 采集 · 能源", "GUARD / HARVEST / POWER", "任务时间 / MISSION TIME", ORANGE, 230),
        ("中环 / MIDDLE", "居住 · 养生 · 娱乐 · 教育", "LIVE / CARE / LEARN", "人的时间 / HUMAN TIME", TEAL, 440),
        ("内环 / INNER", "政治 · 经济 · 文化", "POLITICS / ECONOMY / CULTURE", "机构时间 / INSTITUTION TIME", AMBER, 650),
    ]
    for title, zh, en, time_note, color, y in panels:
        b.append(rect(960, y, 560, 160, CREAM, INK, 1.2, 4, 0.92))
        b.append(rect(960, y, 8, 160, color))
        b.append(txt(990, y + 38, title, 22, INK, weight=600))
        b.append(txt(990, y + 66, zh, 17, "#4D5A59"))
        b.append(txt(990, y + 92, en, 12, MUTED, font=MONO, spacing=1.5))
        b.append(line(990, y + 108, 1480, y + 108, INK, 1, 0.18))
        b.append(txt(990, y + 134, time_note, 13, INK, opacity=0.75))

    # leader lines
    b.append(line(880, 290, 960, 300, ORANGE, 1.5, 0.8))
    b.append(line(820, 500, 960, 510, TEAL, 1.5, 0.8))
    b.append(line(714, 420, 960, 720, AMBER, 1.5, 0.8))

    # flow arrows at bottom
    flow_y = 860
    b.append(txt(60, flow_y - 18, "三环的流动 / FLOWS", 13, MUTED, font=MONO, spacing=2))
    flows = [
        (60, "能源与资源 →", "POWER / RESOURCE", ORANGE),
        (430, "人力与轮岗 ↔", "LABOR / ROTATION", TEAL),
        (800, "决策与预算 ←", "DECISION / BUDGET", AMBER),
        (1170, "事故与低报 ↗", "INCIDENT / UNDERREPORT", RUST),
    ]
    for x, zh, en, color in flows:
        b.append(line(x, flow_y + 12, x + 320, flow_y + 12, color, 2))
        b.append(poly([(x + 320, flow_y + 4), (x + 340, flow_y + 12), (x + 320, flow_y + 20)], color))
        b.append(txt(x, flow_y + 40, zh, 16, INK))
        b.append(txt(x, flow_y + 60, en, 10, MUTED, font=MONO, spacing=1))

    b.append(plate("02", "三环剖面", "RING SECTION / 外环 · 中环 · 内环", dark=False))
    b.append(txt(1540, 80, "CONCEPT 02", 14, ORANGE, "end", MONO, spacing=3))
    b.append(txt(1540, 108, "SECTION A—A", 12, MUTED, "end", MONO, spacing=2))
    b.append(txt(1540, 950, "NOSCALE / DIAGRAM", 10, MUTED, "end", MONO, spacing=2))
    return svg("".join(b), defs)


def art_care_pod():
    defs = """
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1E8D5"/><stop offset="1" stop-color="#D8CBB4"/></linearGradient>
    <linearGradient id="space" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1113"/><stop offset="1" stop-color="#172225"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.28"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.05"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.16"/></linearGradient>
    <radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD98A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
    <filter id="soft2"><feGaussianBlur stdDeviation="8"/></filter>
    """
    b = [rect(0, 0, W, H, "url(#wall)")]
    # ceiling
    b.append(rect(0, 0, W, 150, "#BDB19B"))
    b.append(line(0, 150, W, 150, INK, 2))
    for x in range(0, W, 160):
        b.append(line(x, 0, x, 150, INK, 1, 0.18))
    b.append(rect(0, 150, W, 18, "#8D8372"))
    # ceiling pipes
    b.append(line(0, 78, W, 78, "#6B6558", 10, 0.75))
    b.append(line(0, 104, W, 104, "#6B6558", 5, 0.5))
    for x in (220, 560, 930, 1320):
        b.append(rect(x - 36, 58, 72, 16, "#E8D9B9", INK, 1, 4))
        b.append(rect(x - 28, 110, 56, 8, "#F5E6C4", INK, 1, 2))
        b.append(circle(x, 170, 120, "url(#lamp)"))

    # back wall panels
    b.append(rect(0, 168, W, 632, "#E4D8C2", opacity=0.5))
    for x in range(0, W + 1, 80):
        b.append(line(x, 168, x, 800, INK, 1, 0.06))

    # window
    wx, wy, ww, wh = 470, 190, 670, 390
    b.append(rect(wx - 18, wy - 18, ww + 36, wh + 36, "#7A7264", INK, 2, 10))
    b.append(rect(wx, wy, ww, wh, "url(#space)", INK, 1.5, 4))
    b.append(stars(21, 90, (wx + 8, wy + 8, wx + ww - 8, wy + wh - 8)))
    # small crescent seen through window
    b.append(band(900, 350, 105, 88, 200, 340, "#DDD5C4", "#0A1113", 1.5, 0.95))
    b.append(circle(760, 300, 16, "#D9CBAE", opacity=0.8))
    b.append(circle(748, 294, 16, "#142023", opacity=0.9))
    b.append(rect(wx, wy, ww, wh, "url(#glass)", INK, 1.5, 4))
    b.append(line(wx + ww * 0.33, wy, wx + ww * 0.33, wy + wh, "#7A7264", 4, 0.85))
    b.append(line(wx + ww * 0.66, wy, wx + ww * 0.66, wy + wh, "#7A7264", 4, 0.85))
    for i in range(6):
        b.append(circle(wx + 10 + i * 130, wy + wh + 22, 2.5, INK, opacity=0.5))

    # left pods
    def pod(x, y, w, h, label, occupied=True):
        out = [rect(x, y, w, h, "#C9BDA7", INK, 2, 28)]
        out.append(rect(x + 14, y + 16, w - 28, h - 32, "#203033", INK, 1, 20))
        out.append(rect(x + 24, y + 26, w - 48, h - 52, "url(#glass)", None, 0, 16))
        out.append(rect(x + 22, y + h - 70, w - 44, 34, "#E8DDC8", INK, 1, 4))
        if occupied:
            out.append(circle(x + w * 0.34, y + h * 0.52, 20, "#D8B99A"))
            out.append(path(f"M {x+w*0.34-52} {y+h*0.52+18} L {x+w*0.34+52} {y+h*0.52+18} L {x+w*0.34+64} {y+h-74} L {x+w*0.34-64} {y+h-74} Z", "#7C8F6B"))
            out.append(line(x + w * 0.34 - 22, y + h * 0.52 + 6, x + w * 0.34 - 4, y + h * 0.52 + 24, "#D8B99A", 5))
        out.append(circle(x + w - 30, y + 28, 4, AMBER))
        out.append(circle(x + w - 30, y + 44, 4, TEAL))
        out.append(txt(x + 18, y + 22, label, 10, CREAM, font=MONO, spacing=1))
        return "".join(out)

    b.append(pod(90, 230, 300, 240, "POD 01 · 恢复"))
    b.append(pod(90, 520, 300, 250, "POD 03 · 观察", True))
    b.append(txt(110, 505, "第 3 班 · 03:40", 12, INK, opacity=0.7, font=MONO))

    # right supply wall
    b.append(rect(1210, 350, 300, 410, "#D3C6AF", INK, 2, 6))
    for i in range(4):
        y = 380 + i * 92
        b.append(rect(1230, y, 260, 72, "#E9DFCC", INK, 1, 3))
        b.append(line(1358, y, 1358, y + 72, INK, 1, 0.35))
        b.append(circle(1252, y + 36, 3.5, INK, opacity=0.7))
        b.append(txt(1244, y + 22, f"SUPPLY {i+1:02d}", 9, MUTED, font=MONO, spacing=1))
    b.append(txt(1230, 790, "药柜 / 备件 / 紧急供氧", 13, INK, opacity=0.8))
    # oxygen tanks
    for i, x in enumerate((1510, 1550)):
        b.append(rect(x - 18, 630, 36, 130, TEAL, INK, 1.5, 12))
        b.append(rect(x - 12, 620, 24, 20, "#B9C8BE", INK, 1, 4))
        b.append(line(x, 650, x, 740, CREAM, 1, 0.25))

    # nurse station
    b.append(rect(560, 650, 560, 130, "#CDBFA6", INK, 2, 6))
    b.append(rect(560, 650, 560, 22, "#8C7F6A", INK, 1, 2))
    b.append(rect(610, 690, 210, 70, "#243235", INK, 2, 4))
    b.append(rect(620, 700, 190, 50, "#3E6F6B", None, 0, 2, 0.5))
    b.append(txt(628, 720, "POD 03 / 稳定", 10, CREAM, font=MONO))
    b.append(line(628, 732, 800, 732, AMBER, 1, 0.8))
    b.append(txt(628, 744, "03:40 交接 · 待复查", 9, CREAM, font=MONO, opacity=0.8))
    # checklist on desk
    b.append(rect(850, 680, 150, 80, CREAM, INK, 1, 2))
    b.append(txt(862, 700, "检查单", 11, INK, weight=600))
    for i in range(4):
        b.append(line(862, 712 + i * 12, 930, 712 + i * 12, INK, 1, 0.35))
        b.append(rect(936, 708 + i * 12, 8, 8, "none", INK, 1))
    # plant
    b.append(rect(1030, 720, 46, 54, "#A46B44", INK, 1, 4))
    for dx, dy, rot in [(-10, -40, -30), (8, -55, 10), (22, -35, 35), (0, -25, 0)]:
        b.append(f'<ellipse cx="{1030+23+dx}" cy="{720+dy}" rx="10" ry="26" fill="{SAGE}" stroke="{INK}" stroke-width="1" transform="rotate({rot} {1030+23+dx} {720+dy})"/>')

    # people
    b.append(person(760, 780, 1.25, INK, TEAL))
    b.append(person(835, 785, 1.1, INK, ORANGE))
    # nurse cap
    b.append(rect(746, 735, 28, 8, CREAM, INK, 1, 2))
    b.append(txt(700, 900, "护理师在巡检；湾民在恢复舱里睡着，监测灯保持琥珀色。", 14, INK, opacity=0.72))

    # floor
    b.append(rect(0, 800, W, 200, "#B9AC95"))
    for x in range(0, W + 1, 100):
        b.append(line(x, 800, x, 1000, INK, 1, 0.12))
    for y in range(820, 1000, 40):
        b.append(line(0, y, W, y, INK, 1, 0.1))
    b.append(line(0, 800, W, 800, INK, 2))

    # callouts
    def tag(x, y, label, sub, color=INK):
        b.append(rect(x, y, 210, 52, CREAM, color, 1.2, 2, 0.95))
        b.append(txt(x + 12, y + 21, label, 13, INK, weight=600))
        b.append(txt(x + 12, y + 39, sub, 10, MUTED, font=MONO, spacing=1))

    tag(420, 610, "养生舱", "CARE POD / 恢复与观察", TEAL)
    tag(1160, 280, "药柜与备件", "SUPPLY / 3 SHIFTS", ORANGE)
    tag(640, 840, "值班台", "NURSE STATION", AMBER)

    b.append(rect(38, 34, 540, 142, CREAM, INK, 1.2, 4, 0.95))
    b.append(plate("03", "中环 · 养生舱", "CARE POD / NIGHT SHIFT 03:40", dark=False, x=60, y=58))
    b.append(txt(1540, 80, "CONCEPT 03", 14, ORANGE, "end", MONO, spacing=3))
    b.append(txt(1540, 108, "MIDDLE RING", 12, MUTED, "end", MONO, spacing=2))
    return svg("".join(b), defs)


def art_outer_defense():
    cx, cy = 800, 760
    defs = """
    <linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1012"/><stop offset="1" stop-color="#172326"/></linearGradient>
    <linearGradient id="wall4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B5857"/><stop offset="1" stop-color="#273235"/></linearGradient>
    <radialGradient id="range" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#3E6F6B" stop-opacity="0.18"/><stop offset="1" stop-color="#3E6F6B" stop-opacity="0"/></radialGradient>
    """
    b = [rect(0, 0, W, H, "url(#bg4)"), stars(31, 220)]
    # orbital grid
    for r in (520, 470, 420, 370, 320):
        b.append(circle(cx, cy, r, "none", CREAM, 1, 0.07, "2 10"))
    for a in range(200, 341, 10):
        x1, y1 = point(cx, cy, 320, a); x2, y2 = point(cx, cy, 540, a)
        b.append(line(x1, y1, x2, y2, CREAM, 1, 0.04))

    # wall band
    b.append(band(cx, cy, 480, 410, 200, 340, "url(#wall4)", "#8C978F", 2))
    for a in range(202, 340, 5):
        x1, y1 = point(cx, cy, 478, a); x2, y2 = point(cx, cy, 412, a)
        b.append(line(x1, y1, x2, y2, CREAM, 1, 0.15))
    for a in range(205, 338, 14):
        x, y = point(cx, cy, 445, a)
        b.append(f'<rect x="{f(x-10)}" y="{f(y-5)}" width="20" height="10" rx="2" fill="{ORANGE}" opacity="0.9" transform="rotate({a+90} {f(x)} {f(y)})"/>')

    # path
    path_pts = arc_pts(cx, cy, 440, 200, 340, 160)
    b.append(path("M " + " L ".join(f"{f(x)} {f(y)}" for x, y in path_pts), "none", AMBER, 3, 0.55, "10 10"))

    # slots and towers
    slot_angles = [208, 228, 248, 268, 288, 308, 328]
    tower_colors = [ORANGE, AMBER, SAGE, ORANGE, AMBER, ORANGE, SAGE]
    towers = []
    for i, (a, color) in enumerate(zip(slot_angles, tower_colors), 1):
        x, y = point(cx, cy, 362, a)
        towers.append((x, y, a, color, i))
        b.append(circle(x, y, 105 if i in (3, 5) else 120, "url(#range)", opacity=0.9))
        b.append(circle(x, y, 22, "#1A2426", CREAM, 1.5))
        b.append(circle(x, y, 17, color, INK, 1.5))
        barrel = a - 90
        bx, by = math.cos(math.radians(barrel)) * 30, math.sin(math.radians(barrel)) * 30
        b.append(line(x, y, x + bx, y + by, INK, 7))
        b.append(line(x, y, x + bx * 0.75, y + by * 0.75, CREAM, 2))
        b.append(txt(x, y + 42, f"T-{i:02d}", 10, CREAM, "middle", MONO, spacing=1))
        if i in (1, 4, 7):
            b.append(circle(x + 14, y - 14, 3, AMBER))

    # enemies: triangles along path
    def enemy(x, y, rot, color=ORANGE, r=10, kind="tri"):
        if kind == "tri":
            pts = [(0, -r), (r * 0.86, r * 0.55), (-r * 0.86, r * 0.55)]
        elif kind == "diamond":
            pts = [(0, -r), (r * 0.72, 0), (0, r * 0.72), (-r * 0.72, 0)]
        else:
            pts = [(0, -r), (r * 0.8, -r * 0.4), (r * 0.8, r * 0.5), (0, r), (-r * 0.8, r * 0.5), (-r * 0.8, -r * 0.4)]
        p = " ".join(f"{f(x+px)} {f(y+py)}" for px, py in pts)
        return (f'<g transform="rotate({rot} {f(x)} {f(y)})"><polygon points="{p}" fill="{color}" stroke="{CREAM}" stroke-width="1.5"/></g>')

    for a, kind, speed in [(214, "tri", 1), (220, "tri", 1), (226, "diamond", 1), (232, "tri", 1), (238, "diamond", 1), (244, "tri", 1), (250, "hex", 1)]:
        x, y = point(cx, cy, 440, a)
        b.append(enemy(x, y, a + 90, ORANGE if kind == "tri" else AMBER, 11 if kind != "hex" else 13, kind))

    # fault reverse from bay side
    fa = 322
    fx, fy = point(cx, cy, 440, fa)
    trail = arc_pts(cx, cy, 440, fa, 338, 30)
    b.append(path("M " + " L ".join(f"{f(x)} {f(y)}" for x, y in trail), "none", RUST, 3, 0.8, "4 8"))
    b.append(f'<rect x="{f(fx-12)}" y="{f(fy-12)}" width="24" height="24" fill="{TEAL}" stroke="{CREAM}" stroke-width="2" transform="rotate(45 {f(fx)} {f(fy)})"/>')
    b.append(circle(fx, fy, 30, "none", RUST, 2, 0.8, "2 6"))
    b.append(txt(fx + 38, fy - 8, "故障 / FAULT", 13, RUST, weight=600))
    b.append(txt(fx + 38, fy + 10, "反向 · 停塔 2.5s", 10, CREAM, opacity=0.75))

    # beams from towers to path
    for x, y, a, color, i in [towers[2], towers[4]]:
        ex, ey = point(cx, cy, 440, a + 2)
        b.append(line(x, y, ex, ey, color, 2, 0.85))
        b.append(circle(ex, ey, 4, CREAM))

    # HUD top
    b.append(rect(60, 60, 520, 82, "#0C1416", CREAM, 1, 2, 0.9))
    b.append(txt(82, 88, "第 4 波 / 5", 14, AMBER, font=MONO, spacing=2))
    b.append(txt(82, 122, "保障度 86 / 100", 24, CREAM, weight=600))
    b.append(rect(360, 78, 190, 8, "#2A3538"))
    b.append(rect(360, 78, 163, 8, ORANGE))
    b.append(txt(360, 106, "供能 120", 13, AMBER, font=MONO))
    b.append(txt(360, 128, "故障 ×1", 13, RUST, font=MONO))

    # callouts
    def tag(x, y, label, sub, color):
        b.append(rect(x, y, 260, 58, "#0C1416", color, 1.2, 2, 0.92))
        b.append(txt(x + 12, y + 22, label, 13, CREAM, weight=600))
        b.append(txt(x + 12, y + 42, sub, 9.5, MUTED, font=MONO, spacing=1))

    tag(60, 690, "弧线即防线", "ARC IS THE LINE / 7 SLOTS", AMBER)
    tag(1220, 760, "湾口方向", "BAY MOUTH / FAULT ORIGIN", RUST)
    tag(1220, 840, "内部故障", "C / DISABLE 2 TOWERS", TEAL)

    b.append(plate("04", "外环 · 岗位防线", "OUTER RING / SHIFT DEFENSE", dark=True, x=60, y=820))
    b.append(txt(1540, 80, "CONCEPT 04", 14, ORANGE, "end", MONO, spacing=3))
    b.append(txt(1540, 108, "TOWER DEFENSE / TOP VIEW", 11, MUTED, "end", MONO, spacing=1))
    return svg("".join(b), defs)


def art_console():
    defs = """
    <linearGradient id="bg5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0C1214"/><stop offset="1" stop-color="#1A2528"/></linearGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.08"/></pattern>
    <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3E6F6B"/><stop offset="1" stop-color="#E0A22E"/></linearGradient>
    """
    b = [rect(0, 0, W, H, "url(#bg5)"), grid(20, CREAM, 0.03)]
    # outer console frame
    b.append(rect(60, 54, 1480, 892, "#263235", CREAM, 2, 14, 0.98))
    b.append(rect(84, 78, 1432, 844, "#E9E0CE", INK, 2, 6))
    # header
    b.append(rect(84, 78, 1432, 92, "#2F3A3E", INK, 1))
    b.append(txt(112, 118, "岗位控制台 / SHIFT CONSOLE", 26, CREAM, weight=600))
    b.append(txt(112, 144, "外环第七段 · 第 3 班 · 03:40", 13, AMBER, font=MONO, spacing=1))
    b.append(circle(1450, 112, 10, ORANGE))
    b.append(circle(1450, 112, 16, "none", ORANGE, 2, 0.5))
    b.append(txt(1500, 118, "LIVE", 12, ORANGE, "end", MONO, weight=600))
    b.append(txt(1470, 136, "SYSTEM NOMINAL", 10, MUTED, "end", MONO))

    # left checklist
    b.append(rect(112, 200, 410, 520, CREAM, INK, 1.5, 4))
    b.append(rect(112, 200, 410, 42, "#D6CBB6", INK, 1))
    b.append(txt(132, 228, "交接班检查单 / CHECKLIST", 14, INK, weight=600))
    items = [
        ("01", "舱壁气压", "正常", True),
        ("02", "拦截炮 T-03", "在线", True),
        ("03", "脉冲环 T-05", "在线", True),
        ("04", "补给塔 T-06", "在线", True),
        ("05", "故障 T-07", "离线 2.5s", False),
        ("06", "广播事故数", "0 起 · 待核", False),
    ]
    for i, (num, name, state, ok) in enumerate(items):
        y = 262 + i * 70
        b.append(line(134, y, 500, y, INK, 1, 0.18))
        b.append(txt(134, y + 26, num, 11, MUTED, font=MONO))
        b.append(txt(170, y + 26, name, 14, INK))
        b.append(rect(344, y + 10, 16, 16, "none", INK, 1.5))
        if ok:
            b.append(path(f"M 347 {y+18} L 351 {y+22} L 358 {y+13}", "none", TEAL, 2.5))
        b.append(txt(374, y + 24, state, 12, TEAL if ok else RUST, weight=600))
    b.append(rect(132, 676, 370, 26, "#F1D9CC", RUST, 1, 2))
    b.append(txt(142, 694, "警告：T-07 离线，检查故障链", 12, RUST, weight=600))

    # center map
    b.append(rect(550, 200, 520, 470, "#182326", CREAM, 1.5, 4))
    b.append(txt(570, 230, "月牙弧 / ARC MAP", 12, AMBER, font=MONO, spacing=2))
    # mini crescent
    mcx, mcy = 810, 430
    b.append(band(mcx, mcy, 190, 165, 200, 340, "#314043", CREAM, 1))
    b.append(band(mcx, mcy, 160, 138, 200, 340, "#C9BBA1", INK, 1))
    b.append(band(mcx, mcy, 132, 112, 200, 340, "#3E6F6B", CREAM, 1))
    for a in range(202, 340, 8):
        x1, y1 = point(mcx, mcy, 188, a); x2, y2 = point(mcx, mcy, 167, a)
        b.append(line(x1, y1, x2, y2, CREAM, 1, 0.18))
    for a in [208, 228, 248, 268, 288, 308, 328]:
        x, y = point(mcx, mcy, 150, a)
        b.append(circle(x, y, 6, ORANGE, INK, 1))
        b.append(txt(x, y + 18, "", 8, CREAM, "middle", MONO))
    # fault
    fx, fy = point(mcx, mcy, 150, 322)
    b.append(rect(fx - 7, fy - 7, 14, 14, TEAL, CREAM, 1.5, 1))
    b.append(circle(fx, fy, 20, "none", RUST, 2, 0.8, "2 5"))
    b.append(txt(570, 650, "T-07 FAULT / REVERSE", 11, RUST, font=MONO, spacing=1))
    b.append(txt(1050, 650, "WAVE 4 / 5", 11, AMBER, "end", MONO, spacing=1))

    # right gauges
    b.append(rect(1090, 200, 400, 470, CREAM, INK, 1.5, 4))
    b.append(txt(1112, 230, "资源 / RESOURCE", 12, MUTED, font=MONO, spacing=2))
    # energy bar
    b.append(txt(1112, 270, "供能", 14, INK, weight=600))
    b.append(txt(1460, 270, "120", 26, INK, "end", MONO, weight=600))
    b.append(rect(1112, 286, 350, 22, "#D6CBB6", INK, 1, 2))
    b.append(rect(1112, 286, 210, 22, "url(#bar)", None, 0, 2))
    for i in range(0, 11):
        b.append(line(1112 + i * 35, 316, 1112 + i * 35, 322, INK, 1, 0.35))
    # integrity
    b.append(txt(1112, 370, "保障度", 14, INK, weight=600))
    b.append(txt(1460, 370, "86 / 100", 26, INK, "end", MONO, weight=600))
    b.append(rect(1112, 386, 350, 22, "#D6CBB6", INK, 1, 2))
    b.append(rect(1112, 386, 301, 22, TEAL, None, 0, 2))
    # large readout
    b.append(rect(1112, 450, 350, 120, "#2F3A3E", INK, 1, 4))
    b.append(txt(1128, 482, "本班目标", 12, AMBER, font=MONO, spacing=1))
    b.append(txt(1128, 520, "守住 5 波", 26, CREAM, weight=600))
    b.append(txt(1128, 550, "下一波：重壳 ×4 · 故障 ×1", 12, MUTED, font=MONO))
    # status dots
    for i, (label, color) in enumerate([("POWER", TEAL), ("CARE", SAGE), ("FAULT", RUST)]):
        x = 1120 + i * 118
        b.append(circle(x, 610, 5, color))
        b.append(txt(x + 12, 614, label, 10, MUTED, font=MONO, spacing=1))

    # bottom log
    b.append(rect(112, 740, 1378, 150, "#2F3A3E", INK, 1.5, 4))
    b.append(txt(132, 770, "广播 / LOG", 11, AMBER, font=MONO, spacing=2))
    logs = [
        "03:42  外环事故 0 起 · 系统运行正常",
        "03:44  T-07 离线 2.5s · 故障链已隔离",
        "03:46  第 4 波接近 · 重壳信号 ×4",
        "03:48  交接记录待补 · 按惯例处理",
    ]
    for i, log in enumerate(logs):
        b.append(txt(132, 800 + i * 22, log, 13, CREAM, opacity=0.82, font=MONO))

    # screws / frame details
    for x, y in [(78, 72), (1522, 72), (78, 928), (1522, 928)]:
        b.append(circle(x, y, 6, "#8C978F", INK, 1))
        b.append(line(x - 4, y, x + 4, y, INK, 1))

    b.append(txt(1540, 980, "CONCEPT 05 / DIEGETIC UI", 12, ORANGE, "end", MONO, spacing=2))
    return svg("".join(b), defs)


def art_crew():
    defs = """
    <linearGradient id="bg6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5EFE3"/><stop offset="1" stop-color="#E2D8C4"/></linearGradient>
    <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#1E282C" stroke-width="1" opacity="0.06"/></pattern>
    """
    b = [rect(0, 0, W, H, "url(#bg6)"), grid(40, INK, 0.05)]
    b.append(rect(0, 700, W, 300, "#D8CCB7", opacity=0.55))
    b.append(line(0, 700, W, 700, INK, 2))
    # big faint typography
    b.append(txt(1540, 660, "CREW", 220, INK, "end", weight=700, opacity=0.05, spacing=8))

    def base(skin="#D8B99A", hair="#4A3A32"):
        g = []
        g.append(circle(0, -312, 34, skin, INK, 2))
        g.append(path("M -34 -320 Q -28 -360 0 -356 Q 28 -360 34 -320 Q 20 -338 0 -340 Q -20 -338 -34 -320", hair, INK, 1.5))
        g.append(rect(-12, -282, 24, 24, skin, INK, 1.5))
        return g

    def legs(pants="#2F3A3E", shoes=INK, w=18):
        return [
            path(f"M -34 -150 L -8 -150 L -10 -8 L -32 -8 Z", pants, INK, 1.5),
            path(f"M 8 -150 L 34 -150 L 32 -8 L 10 -8 Z", pants, INK, 1.5),
            rect(-36, -12, 30, 14, shoes, INK, 1.5, 3),
            rect(8, -12, 30, 14, shoes, INK, 1.5, 3),
        ]

    def label(x, num, title, en, desc, color):
        out = [txt(x, 770, num, 12, color, "middle", MONO, spacing=2)]
        out.append(txt(x, 804, title, 22, INK, "middle", weight=600))
        out.append(txt(x, 826, en, 11, MUTED, "middle", MONO, spacing=2))
        out.append(txt(x, 852, desc, 12, "#4D5A59", "middle"))
        out.append(rect(x - 48, 870, 96, 4, color))
        return "".join(out)

    # 1 nurse
    x = 190
    g = base(hair="#3E3029")
    g += legs("#4D5A59")
    g.append(path("M -62 -270 Q -54 -286 -20 -286 L 20 -286 Q 54 -286 62 -270 L 52 -130 L -52 -130 Z", "#EDE4D3", INK, 2))
    g.append(path("M -40 -262 L 40 -262 L 34 -140 L -34 -140 Z", SAGE, INK, 1.5))
    g.append(rect(-44, -120, 88, 10, INK))
    g.append(rect(-54, -234, 22, 22, "#F2E9D8", INK, 1.5, 3))
    g.append(line(-43, -228, -43, -218, ORANGE, 3))
    g.append(line(-48, -223, -38, -223, ORANGE, 3))
    g.append(rect(52, -220, 46, 56, "#E7DCC7", INK, 2, 5))
    g.append(rect(59, -210, 32, 10, TEAL))
    g.append(path("M -72 -250 Q -86 -190 -72 -130", "none", INK, 7))
    g.append(path("M 72 -250 Q 86 -190 72 -132", "none", INK, 7))
    b.append(f'<g transform="translate({x} 720)">{"".join(g)}</g>')
    b.append(label(x, "01 / CARE", "护理师", "CARE WORKER", "监测 · 安抚 · 交接", TEAL))

    # 2 guard
    x = 500
    g = base(skin="#C9A88C")
    g += legs("#2F3A3E")
    g.append(path("M -64 -272 Q -50 -300 0 -300 Q 50 -300 64 -272 L 52 -130 L -52 -130 Z", "#3A4649", INK, 2))
    g.append(path("M -54 -266 L 54 -266 L 44 -180 L -44 -180 Z", "#4E5C5D", INK, 1.5))
    g.append(rect(-44, -238, 88, 8, ORANGE))
    g.append(rect(-36, -214, 72, 22, "#263235", INK, 1))
    g.append(circle(-48, -190, 16, ORANGE, INK, 1.5))
    g.append(circle(48, -190, 16, ORANGE, INK, 1.5))
    g.append(path("M -42 -326 Q 0 -368 42 -326 L 34 -300 L -34 -300 Z", "#3A4649", INK, 2))
    g.append(rect(-32, -328, 64, 14, AMBER, INK, 1, 3))
    g.append(path("M -70 -250 Q -90 -190 -76 -130", "none", INK, 8))
    g.append(path("M 70 -250 Q 96 -200 110 -170", "none", INK, 8))
    g.append(f'<rect x="88" y="-210" width="52" height="86" rx="8" fill="#2F3A3E" stroke="{INK}" stroke-width="2"/>')
    g.append(line(114, -200, 114, -136, ORANGE, 4))
    b.append(f'<g transform="translate({x} 720)">{"".join(g)}</g>')
    b.append(label(x, "02 / GUARD", "护卫兵", "GUARD", "巡逻 · 拦截 · 救援", ORANGE))

    # 3 harvester
    x = 810
    g = base(skin="#C9A88C", hair="#2E2922")
    g += legs("#5B4A39")
    g.append(path("M -64 -270 Q -44 -300 0 -300 Q 44 -300 64 -270 L 56 -150 L -56 -150 Z", "#8C6A4A", INK, 2))
    g.append(path("M -50 -260 L 50 -260 L 44 -170 L -44 -170 Z", "#A87B52", INK, 1.5))
    g.append(rect(-40, -230, 80, 8, AMBER))
    g.append(rect(56, -260, 46, 120, "#3E6F6B", INK, 2, 8))
    g.append(rect(64, -246, 30, 8, CREAM))
    g.append(rect(64, -226, 30, 8, CREAM))
    g.append(path("M -72 -250 L -96 -170", INK, 8))
    g.append(path("M 72 -250 L 100 -190", INK, 8))
    # pick
    g.append(line(100, -190, 150, -330, "#6B4A2F", 6))
    g.append(path("M 118 -340 Q 150 -360 176 -330", "none", "#2F3A3E", 8))
    g.append(path("M -30 -336 Q 0 -356 30 -336 L 24 -306 L -24 -306 Z", "#5E4B3A", INK, 2))
    b.append(f'<g transform="translate({x} 720)">{"".join(g)}</g>')
    b.append(label(x, "03 / HARVEST", "采集兵", "HARVESTER", "出舱 · 采矿 · 返航", AMBER))

    # 4 engineer
    x = 1120
    g = base(skin="#D8B99A", hair="#3B3029")
    g += legs("#2F3A3E")
    g.append(path("M -62 -270 Q -46 -292 0 -292 Q 46 -292 62 -270 L 52 -140 L -52 -140 Z", "#3E6F6B", INK, 2))
    g.append(path("M -42 -260 L 42 -260 L 34 -170 L -34 -170 Z", "#D6CEBC", INK, 1.5))
    g.append(rect(-52, -238, 104, 8, ORANGE))
    g.append(rect(-46, -180, 92, 12, INK))
    g.append(rect(-30, -176, 16, 16, AMBER, INK, 1))
    g.append(rect(10, -176, 20, 16, "#8C978F", INK, 1))
    g.append(path("M -60 -336 Q 0 -376 60 -336 L 52 -308 L -52 -308 Z", AMBER, INK, 2))
    g.append(rect(-54, -320, 108, 12, "#B97E17", INK, 1))
    g.append(path("M -70 -250 Q -94 -196 -80 -150", "none", INK, 8))
    g.append(path("M 70 -250 Q 96 -200 110 -170", "none", INK, 8))
    # wrench
    g.append(line(110, -170, 150, -100, "#8C978F", 6))
    g.append(circle(154, -94, 14, "none", "#8C978F", 6))
    b.append(f'<g transform="translate({x} 720)">{"".join(g)}</g>')
    b.append(label(x, "04 / ENGINEER", "工程师", "ENGINEER", "诊断 · 加固 · 冗余", TEAL))

    # 5 governor
    x = 1430
    g = base(skin="#D8B99A", hair="#5A4A3A")
    g += legs("#2F3A3E")
    g.append(path("M -66 -270 Q -50 -296 0 -296 Q 50 -296 66 -270 L 78 -80 L -78 -80 Z", "#2F3A3E", INK, 2))
    g.append(path("M -40 -262 L 40 -262 L 32 -120 L -32 -120 Z", "#E7DCC7", INK, 1.5))
    g.append(path("M -66 -270 L -34 -286 L 0 -270 L 34 -286 L 66 -270 L 50 -240 L -50 -240 Z", "#C9A86A", INK, 1.5))
    g.append(rect(-5, -258, 10, 130, "#C9A86A", INK, 1))
    g.append(circle(-40, -238, 7, ORANGE, INK, 1))
    g.append(rect(30, -220, 30, 44, "#E7DCC7", INK, 1, 2))
    g.append(line(36, -210, 54, -210, TEAL, 2))
    g.append(line(36, -200, 54, -200, TEAL, 2))
    b.append(f'<g transform="translate({x} 720)">{"".join(g)}</g>')
    b.append(label(x, "05 / GOVERNOR", "执政官", "GOVERNOR", "预算 · 听证 · 广播", "#B97E17"))

    b.append(plate("06", "岗位 / CREW", "FIVE ROLES / ONE CITY", dark=False))
    b.append(txt(1540, 80, "CONCEPT 06", 14, ORANGE, "end", MONO, spacing=3))
    b.append(txt(1540, 108, "SILHOUETTE SHEET", 12, MUTED, "end", MONO, spacing=2))
    b.append(line(60, 930, 1540, 930, INK, 1, 0.4))
    b.append(txt(60, 960, "SCALE 1 : 50", 11, MUTED, font=MONO, spacing=2))
    b.append(txt(1540, 960, "LIVEBAY / DESIGN01 / ART", 11, MUTED, "end", MONO, spacing=2))
    return svg("".join(b), defs)


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    outputs = {
        "01_crescent_bay_overview.svg": art_overview(),
        "02_ring_section.svg": art_section(),
        "03_care_pod.svg": art_care_pod(),
        "04_outer_defense.svg": art_outer_defense(),
        "05_shift_console.svg": art_console(),
        "06_crew.svg": art_crew(),
    }
    for name, text in outputs.items():
        (ART / name).write_text(text, encoding="utf-8")
        print(f"wrote {name}")


if __name__ == "__main__":
    main()
