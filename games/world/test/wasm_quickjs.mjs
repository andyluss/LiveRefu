import { readFileSync } from "node:fs";
const path = process.argv[2];
const bytes = readFileSync(path);
const imports = {
  env: {
    // rquickjs 的 wasm shim 用这个函数提供 clock；M0 只需要可实例化。
    __rquickjs_host_now_us: () => 0,
  },
};
const { instance } = await WebAssembly.instantiate(bytes, imports);
const result = instance.exports.quickjs_eval_rule();
const len = instance.exports.quickjs_error_len();
if (len > 0) {
  const ptr = instance.exports.quickjs_error_ptr();
  const mem = new Uint8Array(instance.exports.memory.buffer);
  const msg = new TextDecoder().decode(mem.slice(ptr, ptr + len));
  console.error(`wasm_quickjs error: ${msg}`);
}
console.log(`wasm_quickjs result=${result}`);
if (result !== 1) process.exit(1);
