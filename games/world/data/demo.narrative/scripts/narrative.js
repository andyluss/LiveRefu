function onEvent(ctx) {
  if (ctx.event.kind !== "narrative.terminal_opened") return [];
  ctx.after(2, [
    { op: "toast", text: "脚本：终端回应了。" },
    { op: "set_flag", flag: "flag.narrative.script", value: true }
  ]);
  return [];
}
