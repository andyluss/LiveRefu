import { defineZone } from "#world-authoring";

defineZone({
  id: "zone.harbor",
  name: "loc:zone.harbor.name",
  bounds: { min: [-20, 0, -20], max: [20, 8, 20] },
  nav: "nav.harbor",
  placements: [
    { actor: "demo.keeper", at: [4, 0, -2], yaw: 180, persistent_id: "keeper" },
    { prop: "demo.airlock", at: [0, 0, 6], yaw: 0, persistent_id: "airlock" },
    { item: "item.keycard", at: [2, 0, 2], yaw: 0, persistent_id: "keycard" },
    { item: "item.coffee", at: [-3, 0, -3], yaw: 0, persistent_id: "coffee" },
    { item: "item.radio", at: [3, 0, 3], yaw: 0, persistent_id: "radio" },
    { prop: "demo.console", at: [-8, 0, 5], yaw: 0, persistent_id: "console" },
    { prop: "demo.crate", at: [7, 0, -7], yaw: 0, persistent_id: "crate" },
  ],
});
