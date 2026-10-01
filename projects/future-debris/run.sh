#!/usr/bin/env bash
# Future Debris（未来残片）· 统一入口：所有 Godot 调用与验收都从这里走。
#
# 为什么设置 HOME：Godot 会在 ~/Library/Application Support/Godot 写用户数据（日志/缓存）。
# 指到工作区内的 .godot-home 既不污染真实用户目录，也让沙箱/CI 无需额外权限（沿用 refu-game-001 的做法）。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME="$HERE/game"
# 上溯找工作区根（含 .git 的那一层），而不是靠数 ".." 的层数：
# 层数一旦写错就会把 HOME 指到工作区外（沙箱会拒绝写入），且错误信息只有一行 mkdir。
WS_ROOT="$HERE"
while [ "$WS_ROOT" != "/" ] && [ ! -d "$WS_ROOT/.git" ]; do
  WS_ROOT="$(dirname "$WS_ROOT")"
done
export HOME="$WS_ROOT/.godot-home"
mkdir -p "$HOME"
GODOT="${GODOT:-godot}"

need_godot() {
  if ! command -v "$GODOT" >/dev/null 2>&1; then
    echo "找不到 Godot（$GODOT）。请安装 Godot 4.7 或设置 GODOT=/path/to/godot" >&2
    exit 2
  fi
}

# 无头跑一个场景并断言：脚本错误、解析错误、加载失败都算失败。
# 为什么不用退出码就够：Godot 对部分脚本错误仍返回 0，必须扫日志（既有教训）。
headless_assert() {
  local scene="$1"; shift
  local out
  set +e
  out="$("$GODOT" --headless --path "$GAME" --quit-after 300 "$scene" "$@" 2>&1)"
  local status=$?
  set -e
  echo "$out"
  if echo "$out" | grep -qE "SCRIPT ERROR|Parse Error|Failed to load|BOOT FAILED|Cannot open"; then
    echo "── 失败详情 ──" >&2
    echo "$out" | grep -E "SCRIPT ERROR|Parse Error|Failed to load|BOOT FAILED|Cannot open" -A3 | head -30 >&2
    return 1
  fi
  if [ "$status" -ne 0 ]; then
    echo "── Godot 退出码 $status ──" >&2
    return 1
  fi
  if ! echo "$out" | grep -q "BOOT OK"; then
    echo "── 未观察到成功标记 BOOT OK ──" >&2
    return 1
  fi
  return 0
}

case "${1:-run}" in
  run)    need_godot; exec "$GODOT" --path "$GAME" ;;
  editor) need_godot; exec "$GODOT" -e --path "$GAME" ;;

  lint)
    shift
    exec python3 "$HERE/tools/check_file_size.py" "$@"
    ;;

  data)
    shift
    exec python3 "$HERE/tools/check_data.py" "$@"
    ;;

  boot)
    # 只跑无头自检（工程装载），用于快速确认工程还能装载。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    headless_assert "res://scenes/tools/boot_probe.tscn" "$@"
    echo "无头自检：PASS"
    ;;

  shot)
    # 渲染主界面到 PNG（人工验收用）。参数：文件名（默认 theme_preview.png）。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    # 先重建主题资源再截图：否则截到的是**上一次**的主题（.tres 只是缓存，不会自动跟随 token 变化）
    "$GODOT" --headless --path "$GAME" res://scenes/tools/theme_check.tscn >/dev/null 2>&1 || true
    # 分辨率：Steam 要求截图 >= 1920x1080，而工程的窗口是 1280x720。
    # 用 --resolution 覆盖窗口大小即可（viewport 不变，界面按 stretch 放大），
    # 因此**不需要为了出素材改工程配置**。默认 1920x1080。
    # **出 1920x1080 素材尚未打通**（诚实标注）：
    # 只加 `--resolution` 不够（stretch 会把 1280x720 的视口放大，内容仍只占左上角）；
    # 而"临时改 project.godot 的视口"这条路有个**设计缺陷**：本命令用 `exec` 启动引擎，
    # `exec` 会替换进程、**EXIT trap 不会执行**，于是覆盖被永久留在工程文件里
    # （实测踩到：默认路径因此渲染异常）。正确做法是让界面**真正响应式**（按视口重排），
    # 那是独立任务，已记入 [12 商店页与美术执行计划] 的待办。
    # 参数透传：文件名 + 可选 --scene=res://... / --theme / --with-summary
    exec "$GODOT" --path "$GAME" res://scenes/tools/screenshot.tscn -- "$@"
    ;;

  demo)
    # 演示片段（30 秒 @30fps = 900 帧）：Godot Movie Maker 录帧序列 → 自写编码器出 MP4。
    # 为什么先导入：新增的 class_name 未注册会让场景加载失败，而 Movie Maker 会**继续录**
    # 一个不存在的演示（本项目已踩过两次），所以这一步固化进命令。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    FRAMES="${1:-$HERE/.build/demo_frames}"
    OUT="${DEMO_OUT:-$HERE/docs/video/demo_30s.mp4}"
    FPS=30
    WANT=$((30 * FPS))
    mkdir -p "$FRAMES" "$HERE/docs/video"
    find "$FRAMES" -name '*.png' -delete 2>/dev/null || true
    # 分辨率可覆盖（Steam 预告片要 1080p；工程窗口是 1280x720）
    RES="${DEMO_RES:-1920x1080}"
    "$GODOT" --path "$GAME" --resolution "$RES" --write-movie "$FRAMES/frame.png" --fixed-fps "$FPS" \
      --quit-after $((WANT + 120)) res://scenes/app/demo.tscn 2>&1 \
      | grep -E 'DEMO|SCRIPT ERROR|frames at' || true
    RECORDED="$(find "$FRAMES" -name '*.png' | wc -l | tr -d ' ')"
    echo "[demo] 录制 $RECORDED 帧，目标 $WANT 帧"
    if [ "$RECORDED" -lt "$WANT" ]; then
      echo "[demo] 帧数不足（演示场景可能加载失败，检查上面的 SCRIPT ERROR）" >&2
      exit 1
    fi
    # 裁到恰好 30 秒：多出来的帧（结果卡之后的余量）不进入成片
    find "$FRAMES" -name '*.png' | sort | tail -n +$((WANT + 1)) | while read -r f; do rm -f "$f"; done
    if [ ! -x "$HERE/tools/make_video" ] || [ "$HERE/tools/make_video.swift" -nt "$HERE/tools/make_video" ]; then
      mkdir -p "$HERE/.build/swift-cache"
      swiftc -O -module-cache-path "$HERE/.build/swift-cache" -Xcc -fmodules-cache-path="$HERE/.build/swift-cache" \
        "$HERE/tools/make_video.swift" -o "$HERE/tools/make_video" 2>&1 | grep -v deprecated | grep -v '^ *|' || true
    fi
    "$HERE/tools/make_video" "$FRAMES" "$OUT" "$FPS" "${RES%x*}" "${RES#*x}"
    "$HERE/tools/make_video" --probe "$OUT"
    ;;

  calibrate)
    # 配额校准：测各势力能力 → 按设计比例生成配额（只打印，不改数据）
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    "$GODOT" --headless --path "$GAME" --quit-after 600 res://scenes/tools/calibrate.tscn 2>&1 \
      | grep -E '能力测量|  FAC-|QUOTAS_JSON|SCRIPT ERROR|BOOT OK'
    ;;

  scene)
    # 场景与视图验收：界面能装载 + 几何/点击/取色的不变量。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    headless_assert "res://scenes/tools/scene_check.tscn" "$@"
    echo "场景验收：PASS"
    ;;

  theme)
    # 从 token 契约编译 Godot 主题资源，并断言 token 真的生效（11 项）。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    headless_assert "res://scenes/tools/theme_check.tscn" "$@"
    echo "主题落地：PASS"
    ;;

  s2)
    # 只跑 S2 玩法验收（资源循环 / 出牌原子性 / 残渣 / 波次 / 确定性 / 评级）。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    headless_assert "res://scenes/tools/headless_test.tscn" "$@"
    echo "S2 玩法验收：PASS"
    ;;

  sim)
    # 平衡模拟：按阵营自动组牌并跑矩阵（不需要人写卡组）。参数形如 --decks 4 --seeds 5。
    shift
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    exec "$GODOT" --headless --path "$GAME" res://scenes/tools/sim_balance.tscn -- "$@"
    ;;

  check)
    # 六道闸门（S2）：文件预算 → 数据契约 → 视觉 token → 工程装载 → 无头自检 → 玩法行为验收。
    # 顺序有讲究：静态错误最便宜，先跑；需要引擎的后跑；最贵的玩法验收放最后。
    echo "══ Future Debris · 验收闸门（S4）══"
    echo "── 1/8 文件预算 ──"
    python3 "$HERE/tools/check_file_size.py" --self-test
    echo "── 2/8 数据契约 ──"
    python3 "$HERE/tools/check_data.py" --self-test
    echo "── 3/8 视觉 token 契约（对比度 + 层级 + 样张色彩 + 文档↔引擎对账） ──"
    python3 "$HERE/tools/check_contrast.py" --self-test
    python3 "$HERE/tools/check_tokens.py" --self-test
    echo "── 4/8 工程导入（Godot 装载） ──"
    need_godot
    "$GODOT" --headless --path "$GAME" --import >/dev/null 2>&1 || true
    echo "导入完成"
    echo "── 5/8 主题落地（token → Godot Theme） ──"
    headless_assert "res://scenes/tools/theme_check.tscn" "$@"
    echo "── 6/8 无头自检（工程装载） ──"
    headless_assert "res://scenes/tools/boot_probe.tscn" "$@"
    echo "── 7/8 玩法行为验收（核心循环） ──"
    headless_assert "res://scenes/tools/headless_test.tscn" "$@"
    echo "── 8/8 场景与视图验收（界面装载 / 几何 / 命中判定 / 取色） ──"
    headless_assert "res://scenes/tools/scene_check.tscn" "$@"
    echo "══ 全部闸门通过 ══"
    ;;

  contrast)
    shift
    exec python3 "$HERE/tools/check_contrast.py" "$@"
    ;;

  *)
    echo "用法: $0 {run|editor|check|boot|s2|sim|theme|lint|data|contrast}" >&2
    exit 2
    ;;
esac
