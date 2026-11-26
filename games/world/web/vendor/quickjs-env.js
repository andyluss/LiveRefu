// QuickJS wasm 的宿主时间导入：纯预览不需要墙钟，返回 0 保持确定性。
export function __rquickjs_host_now_us() { return 0; }
