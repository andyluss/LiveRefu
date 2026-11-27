#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
./worldc build --pack data/lab.tetris --out dist/lab.tetris
cp dist/lab.tetris/pack.data lab/tetris/refuworld.pack.data
node lab/tetris/test/refuworld.test.mjs
