// ScriptHost 示例：监听反应堆开门事件，写一个脚本标记并发出提示。
// 只用公开的 ctx 快照与命令数组，不访问引擎或核心内部对象。
function onEvent(ctx) {
  if (ctx.event.kind !== "reactor.opened") return [];
  return [
    { op: "set_flag", flag: "flag.script.reactor_seen", value: true },
    { op: "toast", text: "脚本：反应堆事件已记录" }
  ];
}
