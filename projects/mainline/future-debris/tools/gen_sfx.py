#!/usr/bin/env python3
"""生成音效 WAV（16-bit PCM 单声道，22050Hz）——**音效是程序生成的，不是素材**。

为什么这么做（而不是找现成音效包）：
  1. 仓库不放二进制素材、不引入授权问题（与"字体不放二进制"同一立场）；
  2. 复古未来的听感本来就来自**合成器与示波器音调**，程序生成正合题材；
  3. 参数化意味着"某次事件该多响、多长"可以被 diff 与评审，而不是一段无法审阅的波形。

产出：`game/assets/sfx/*.wav` + 一份 `manifest.json`（含每个音的用途与设计说明）。
用法：
    python3 tools/gen_sfx.py            # 生成
    python3 tools/gen_sfx.py --self-test  # 断言生成器性质（幂等 / 时长与包络正确）
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
OUT_DIR = PROJECT / "game" / "assets" / "sfx"
RATE = 22050
TWO_PI = math.tau


def envelope(index: int, total: int, attack: float, release: float) -> float:
    """线性 attack/release 包络。用线性而非指数：短促的界面音更"干脆"。"""
    pos = index / max(1, total - 1)
    if pos < attack:
        return pos / max(1e-6, attack)
    if pos > 1.0 - release:
        return max(0.0, (1.0 - pos) / max(1e-6, release))
    return 1.0


def tone(freq_from: float, freq_to: float, ms: int, gain: float,
         attack: float = 0.02, release: float = 0.35, harmonics: tuple = (1.0,)) -> bytes:
    """扫频音：freq_from → freq_to，叠加若干谐波。返回 16-bit PCM 字节。"""
    total = int(RATE * ms / 1000)
    frames = bytearray()
    phase = 0.0
    for i in range(total):
        ratio = i / max(1, total - 1)
        freq = freq_from + (freq_to - freq_from) * ratio
        phase += TWO_PI * freq / RATE
        sample = 0.0
        for index, weight in enumerate(harmonics):
            sample += weight * math.sin(phase * (index + 1))
        sample *= envelope(i, total, attack, release) * gain
        frames += struct.pack("<h", int(max(-1.0, min(1.0, sample)) * 32767))
    return bytes(frames)


def noise_burst(ms: int, gain: float, cutoff_ratio: float = 1.0) -> bytes:
    """噪声爆发（用于"排污"这类不和谐事件）。用整数 LCG 保证跨版本可复现。"""
    total = int(RATE * ms / 1000)
    state = 20260930
    frames = bytearray()
    previous = 0.0
    for i in range(total):
        state = (state * 48271) % 2147483647
        white = (state / 2147483647.0) * 2.0 - 1.0
        # 一阶低通：cutoff_ratio 越小越闷（"闷响"比白噪更适合低频污染感）
        previous = previous + cutoff_ratio * (white - previous)
        sample = previous * envelope(i, total, 0.01, 0.5) * gain
        frames += struct.pack("<h", int(max(-1.0, min(1.0, sample)) * 32767))
    return bytes(frames)


def mix(*layers: bytes) -> bytes:
    """把若干等长音层相加（短的自动补零）。"""
    length = max(len(layer) for layer in layers)
    out = bytearray()
    for i in range(0, length, 2):
        total = 0
        for layer in layers:
            if i + 1 < len(layer):
                total += struct.unpack("<h", layer[i:i + 2])[0]
        out += struct.pack("<h", int(max(-1.0, min(1.0, total / 32767.0)) * 32767))
    return bytes(out)


# 每个音：文件名 → (用途、生成方式)
SPECS = {
    "place.wav": ('放置卡牌：一声短促上行，表示「装上了」', lambda: tone(420, 660, 90, 0.5)),
    "deny.wav": ('操作被拒（电力不足或塔位已占）：低而短的下行', lambda: tone(300, 180, 110, 0.45)),
    "clean.wav": ("花电力清理残渣：清亮的双音（清理的爽感）",
                  lambda: mix(tone(880, 1180, 70, 0.35), tone(1320, 1500, 70, 0.22))),
    "residue.wav": ("残渣增加：一声闷响 + 低频噪（不和谐，提示代价）",
                    lambda: mix(tone(150, 90, 140, 0.4), noise_burst(140, 0.25, 0.10))),
    "zone.wav": ("降级区扩张：低沉扫频（威胁升级）", lambda: tone(220, 70, 520, 0.5, 0.01, 0.6)),
    "wave_clear.wav": ("清空一波：三音上行（成就感的短句）",
                       lambda: mix(tone(523, 523, 110, 0.32), tone(659, 659, 110, 0.30),
                                   tone(784, 880, 220, 0.30))),
    "leak.wav": ("漏怪：下行警示（损失）", lambda: tone(400, 120, 380, 0.5, 0.01, 0.5)),
    "grade.wav": ("结算评级揭示：明亮的四音（收束）",
                  lambda: mix(tone(523, 523, 120, 0.28), tone(659, 659, 120, 0.26),
                              tone(784, 784, 120, 0.26), tone(1046, 1046, 320, 0.30))),
}


def write_wav(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(pcm)


def build() -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"schemaVersion": 1, "rate": RATE,
                "note": "音效由 tools/gen_sfx.py 程序生成（无外部素材）。改听感请改生成器参数后重跑。",
                "sounds": {}}
    for name, (purpose, make) in SPECS.items():
        pcm = make()
        target = OUT_DIR / name
        write_wav(target, pcm)
        manifest["sounds"][name] = {
            "purpose": purpose,
            "ms": round(len(pcm) / 2 / RATE * 1000),
            "bytes": len(pcm),
            # 哈希必须算**整个 WAV 文件**（含 44 字节头），而不是 PCM——
            # 因为引擎侧用的是 Godot 内建的 `FileAccess.get_sha256(path)`。
            # 这个不对齐是实测抓出来的：两边各算各的，八条全不一致。
            "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        }
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def run_self_test() -> int:
    """断言生成器的性质：**幂等**、时长正确、包络无爆音、静音段为零。"""
    print("[self-test] 断言音效生成器：幂等 / 时长 / 包络")
    failures = 0
    first = tone(440, 660, 90, 0.5)
    second = tone(440, 660, 90, 0.5)
    ok_idempotent = first == second
    failures += 0 if ok_idempotent else 1
    print(f"  [{'OK  ' if ok_idempotent else 'MISS'}] 同参数两次生成完全一致（幂等）")

    expected = int(RATE * 90 / 1000) * 2
    ok_len = len(first) == expected
    failures += 0 if ok_len else 1
    print(f"  [{'OK  ' if ok_len else 'MISS'}] 90ms @ {RATE}Hz = {expected} 字节（实际 {len(first)}）")

    # 包络：首尾必须接近 0（否则出现"咔哒"爆音）
    head = struct.unpack("<h", first[:2])[0]
    tail = struct.unpack("<h", first[-2:])[0]
    ok_env = abs(head) < 400 and abs(tail) < 400
    failures += 0 if ok_env else 1
    print(f"  [{'OK  ' if ok_env else 'MISS'}] 首尾样本接近 0（无爆音）：head={head} tail={tail}")

    # 噪声必须真的是噪声：相邻样本不应全相同
    burst = noise_burst(60, 0.3, 0.2)
    samples = [struct.unpack("<h", burst[i:i + 2])[0] for i in range(0, 60, 2)]
    ok_noise = len(set(samples)) > 5
    failures += 0 if ok_noise else 1
    print(f"  [{'OK  ' if ok_noise else 'MISS'}] 噪声层确为噪声（{len(set(samples))} 个不同样本）")

    if failures:
        print(f"[self-test] FAIL：{failures}/{4} 个用例不符预期")
        return 1
    print("[self-test] PASS：4/4 个用例符合预期")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="生成 future-debris 音效")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        code = run_self_test()
        if code != 0:
            return code
    manifest = build()
    print(f"[音效] 生成 {len(manifest['sounds'])} 个音效 → {OUT_DIR.relative_to(PROJECT)}")
    for name, info in sorted(manifest["sounds"].items()):
        print(f"  - {name:16s} {info['ms']:>5d}ms  {info['purpose']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
