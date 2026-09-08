#!/usr/bin/env bash
#
# 一键启用本仓库的 pre-commit 相对链接校验钩子。
#
# 背景：git 出于安全设计，不会跨 clone 传递 core.hooksPath(它存在本地 .git/config,
# 而 .git 目录不随克隆传输)。因此「clone 即自动启用」无法用 git 原生做到。
# 本脚本是业界标准做法：clone 后运行一次，即启用钩子；之后每次 git commit 自动校验。
#
# 用法：在仓库根运行
#    ./tools/install_hooks.sh
# 或在任意目录运行(会自动定位仓库根)
#    bash tools/install_hooks.sh
#
# 幂等：重复运行无副作用。
#
# 说明：core.hooksPath 用相对路径，相对"工作区根"解析，故 clone 到任意路径都有效。

set -euo pipefail

# 定位仓库根：以本脚本所在目录(tools/)的上一级为准，并校验其确实含 .git
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "错误：未在 $REPO_ROOT 找到 .git，请确认在 LiveRefu 仓库内运行。" >&2
  exit 1
fi

HOOKS_REL="tools/hooks"
if [ ! -f "$REPO_ROOT/$HOOKS_REL/pre-commit" ]; then
  echo "错误：缺少 $REPO_ROOT/$HOOKS_REL/pre-commit。" >&2
  exit 1
fi

# 设置 core.hooksPath(用相对路径, 指向仓库内 tools/hooks)
git -C "$REPO_ROOT" config --local core.hooksPath "$HOOKS_REL"

echo "✅ 已启用 pre-commit 相对链接校验钩子。"
echo "   仓库根 : $REPO_ROOT"
echo "   hooks  : $HOOKS_REL  (core.hooksPath = $(git -C "$REPO_ROOT" config --get core.hooksPath))"
echo ""
echo "验证方法(可选)："
echo "   cd 到仓库根后运行  bash tools/hooks/pre-commit   # 0=通过, 1=有失效链接"
echo "临时跳过某次提交：  git commit --no-verify"
