import { defineAssets, defineLoc, definePack, defineWorld } from "#world-authoring";

definePack({
  schema: 1,
  id: "demo.harbor",
  version: "0.1.0",
  core_api: ">=0.1 <0.2",
  kits: ["core", "interaction", "inventory", "quest", "dialogue", "director", "save_profile"],
  entry: { world: "world/harbor.world.json", start_zone: "zone.harbor" },
  sim_profile: "arcade",
  tick_hz: 60,
  assets: "assets/assets.index.json",
  loc: ["loc/zh-CN.json"],
  requires: [],
  optional: [],
  conflicts: [],
});

defineWorld({
  id: "world.harbor",
  start_zone: "zone.harbor",
  start_time: "08:00",
  seed: 20261123,
  player: { at: [0, 0, 0], inventory: [] },
});

defineAssets({
  "mesh.keeper": { role: "mesh", source: "art/keeper.glb" },
  "mesh.airlock": { role: "mesh", source: "art/airlock.glb" },
  "mesh.keycard": { role: "mesh", source: "art/keycard.glb" },
  "sfx.airlock.open": { role: "sfx", source: "audio/airlock_open.wav" },
});

defineLoc("zh-CN", {
  "zone.harbor.name": "港湾值班室",
  "actor.keeper.name": "值班员",
  "prop.airlock.name": "气闸",
  "item.keycard.name": "钥匙卡",
  "item.coffee.name": "咖啡",
  "item.radio.name": "对讲机",
  "quest.first_shift.title": "第一班",
  "dlg.keeper.greet": "你来得正好。外环的气闸又卡住了。",
  "dlg.keeper.shift": "先去拿钥匙卡，再去气闸。别把咖啡洒了。",
  "dlg.keeper.ask_shift": "今天做什么？",
  "dlg.keeper.bye": "回头见。",
  "airlock.locked": "气闸锁着。需要钥匙卡。",
  "door.locked": "锁着。",
  "door.already_open": "已经开了。",
  "prop.console.name": "控制台",
  "prop.crate.name": "货箱",
});
