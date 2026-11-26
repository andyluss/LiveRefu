import { defineRule } from "#world-authoring";

defineRule({
  id: "rule.airlock",
  on: "interact",
  target: "demo.airlock",
  when: [{ kind: "has_item", item: "item.keycard" }],
  then: [
    { kind: "open_door" },
    { kind: "play_sound", id: "sfx.airlock.open" },
    { kind: "set_flag", flag: "flag.airlock.open", value: true },
    { kind: "emit", event: "airlock.opened" },
  ],
  else: [{ kind: "toast", text: "loc:airlock.locked" }],
});

defineRule({
  id: "rule.console",
  on: "interact",
  target: "demo.console",
  then: [
    { kind: "set_flag", flag: "flag.console.checked", value: true },
    { kind: "toast", text: "loc:console.checked" },
    { kind: "emit", event: "console.checked" },
  ],
});

defineRule({
  id: "rule.crate",
  on: "interact",
  target: "demo.crate",
  then: [
    { kind: "toast", text: "loc:crate.empty" },
    { kind: "emit", event: "crate.checked" },
  ],
});
