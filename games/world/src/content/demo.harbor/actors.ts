import { defineActor } from "#world-authoring";

defineActor({
  id: "demo.keeper",
  name: "loc:actor.keeper.name",
  tags: ["npc", "human", "harbor"],
  body: { shape: "capsule", radius: 0.35, height: 1.7 },
  stats: { health: 100, speed: 3.2 },
  brain: { profile: "schedule", schedule: "schedule.keeper" },
  inventory: { items: [{ item: "item.radio", count: 1 }] },
  dialogue: "dlg.keeper.intro",
  visual: "mesh.keeper",
});

defineActor({
  id: "demo.engineer",
  name: "loc:actor.engineer.name",
  tags: ["npc", "human", "harbor", "engineer"],
  body: { shape: "capsule", radius: 0.35, height: 1.7 },
  stats: { health: 100, speed: 3.0 },
  brain: { profile: "schedule", schedule: "schedule.engineer" },
  inventory: { items: [{ item: "item.coffee", count: 1 }] },
  dialogue: "dlg.engineer.intro",
  visual: "mesh.keeper",
});
