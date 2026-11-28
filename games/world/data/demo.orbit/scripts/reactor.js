// ScriptHost module 示例：import 同包 helper，async 事件返回命令。
import { scriptEvent } from "./lib/helpers.js";

export async function onEvent(ctx) {
  if (ctx.event.kind !== "reactor.opened") return [];
  await Promise.resolve();
  return [
    { op: "set_flag", flag: scriptEvent("reactor_seen"), value: true },
    { op: "toast", text: "脚本：反应堆事件已记录" }
  ];
}
