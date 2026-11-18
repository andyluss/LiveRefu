#!/usr/bin/env python3
"""把 src/ 下的单文件应用片段拼成 index.html（保持单文件交付）。"""
from pathlib import Path
HERE = Path(__file__).resolve().parent
PARTS = [
    'src/head.html', 'src/10-core.js', 'src/20-textures.js', 'src/30-audio.js',
    'src/40-world.js', 'src/50-cafe.js', 'src/60-interactions.js',
    'src/70-main.js', 'src/foot.html',
]
out = ''.join((HERE / p).read_text(encoding='utf-8') for p in PARTS)
(HERE / 'index.html').write_text(out, encoding='utf-8')
print(f'index.html written: {len(out):,} chars, {len(out.splitlines()):,} lines')
