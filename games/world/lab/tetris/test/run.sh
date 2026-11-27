#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
node lab/tetris/test/logic.test.mjs
node lab/tetris/test/static.test.mjs
