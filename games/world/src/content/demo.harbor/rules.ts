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
