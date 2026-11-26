import { defineQuest } from "#world-authoring";

defineQuest({
  id: "quest.first_shift",
  title: "loc:quest.first_shift.title",
  auto_start: true,
  objectives: [
    { kind: "talk", target: "demo.keeper" },
    { kind: "flag", flag: "flag.airlock.open", value: true },
  ],
  rewards: [{ kind: "flag", flag: "flag.quest.first_shift.done", value: true }],
});

defineQuest({
  id: "quest.coffee_break",
  title: "loc:quest.coffee_break.title",
  auto_start: true,
  objectives: [
    { kind: "talk", target: "demo.engineer" },
    { kind: "acquire", item: "item.coffee" },
  ],
  rewards: [{ kind: "flag", flag: "flag.quest.coffee_break.done", value: true }],
});
