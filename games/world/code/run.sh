#!/usr/bin/env bash
# 统一入口：默认把 CARGO_HOME 放在工作区内，避免写用户目录（也便于沙箱运行）。
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export CARGO_HOME="${CARGO_HOME:-$PWD/.cargo-home}"
exec cargo "$@"
