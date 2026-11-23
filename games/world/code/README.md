# code · RefuWorld M0 Rust workspace

> 入口：`./run.sh`（默认把 `CARGO_HOME` 放在本目录的 `.cargo-home/`，避免写用户目录）。

## crates

| crate | 作用 |
| --- | --- |
| `world-pack` | 内容包类型、加载、校验、哈希 |
| `world-core` | 世界状态、固定 tick、命令/事件、规则、任务、日程、存档、回放、状态哈希 |
| `world-ffi` | C ABI（cdylib）；`include/world.h` 的 Rust 实现 |
| `world-host-headless` | 无头宿主：读包 + trace，输出 JSON 摘要 |
| `world-cli` | `worldc`：validate/build/test/replay/demo/bench/new/header/explain |
| `world-script` | QuickJS spike（原生） |
| `world-script-wasm` | QuickJS spike（wasm32，Node 可调） |
| `world-wasm` | Web 预览 wasm 门面（wasm-bindgen） |
| `hosts/c` | C 冒烟宿主（不在 workspace 内，用 `cc` 编译） |
| `include/world.h` | C 头文件（`worldc header` 生成） |

## 常用命令

```bash
./run.sh test --workspace
./run.sh run -q -p world-cli -- validate
./run.sh run -q -p world-cli -- test --events
./run.sh run -q -p world-cli -- content-test
./run.sh run -q --release -p world-cli -- bench --synthetic 5000 --ticks 6000
./run.sh run -q -p world-cli -- editor --port 8788
./run.sh run -q -p world-cli -- replay \
  --trace ../data/demo.harbor/tests/m0.trace.json --expect 0x9c4032a29d99274d
./run.sh run -q --release -p world-cli -- bench
```

Web 预览：

```bash
cd ..
./web/build.sh
cd web && python3 -m http.server 8787
```

C 宿主：

```bash
./run.sh build -q -p world-ffi
./run.sh run -q -p world-cli -- build --out ../dist/demo.harbor
cc hosts/c/main.c -I include -L target/debug -lworld_ffi \
  -Wl,-rpath,"$PWD/target/debug" -o ../dist/c_host
../dist/c_host --pack ../dist/demo.harbor/pack.data
```

wasm + QuickJS（macOS 需要 LLVM 的 `llvm-ar`；见 [ADR-006](../plans/ADR-006-quickjs-spike.md)）：

```bash
export AR=/opt/homebrew/opt/llvm/bin/llvm-ar
export RANLIB=/opt/homebrew/opt/llvm/bin/llvm-ranlib
RUSTC="$(rustup which rustc)" rustup run stable cargo build --release \
  --target wasm32-unknown-unknown -p world-script-wasm
node ../test/wasm_quickjs.mjs \
  target/wasm32-unknown-unknown/release/world_script_wasm.wasm
```

## 约定

- `.cargo-home/`、`target/` 不入库（`.gitignore`）。
- 所有玩法逻辑在 `world-core`；适配器只能依赖 `world-ffi` 的 C ABI（M1 起用依赖检查强制）。
- 存档/回放哈希只包含逻辑状态，不包含表现事件。
