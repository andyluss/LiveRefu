// ScriptHost 场景：影像库打开后写脚本标记；只用公开 ctx 与命令数组。
function onEvent(ctx) {
  if (ctx.event.kind !== "archive.opened") return [];
  return [
    { op: "set_flag", flag: "flag.archive.script_seen", value: true },
    { op: "toast", text: "脚本：影像事件已记录" }
  ];
}
