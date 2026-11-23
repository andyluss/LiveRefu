import type {
  ActorDef,
  AssetTable,
  DialogueDef,
  ItemDef,
  LocTable,
  PackManifest,
  PropDef,
  QuestDef,
  RuleDef,
  ScheduleDef,
  WorldDef,
  ZoneDef,
} from "./types.ts";

export * from "./types.ts";

type Def =
  | { kind: "pack"; data: PackManifest }
  | { kind: "world"; data: WorldDef }
  | { kind: "zone"; data: ZoneDef }
  | { kind: "actor"; data: ActorDef }
  | { kind: "prop"; data: PropDef }
  | { kind: "item"; data: ItemDef }
  | { kind: "rule"; data: RuleDef }
  | { kind: "quest"; data: QuestDef }
  | { kind: "dialogue"; data: DialogueDef }
  | { kind: "schedule"; data: ScheduleDef }
  | { kind: "loc"; locale: string; data: LocTable }
  | { kind: "assets"; data: AssetTable };

export type CollectedDef = Def & { source: string };

let currentSource = "<unknown>";
let registry: CollectedDef[] = [];

export function setSource(file: string): void {
  currentSource = file;
}

function push(def: Def): void {
  registry.push({ ...def, source: currentSource } as CollectedDef);
}

export function reset(): void {
  registry = [];
  currentSource = "<unknown>";
}

export function take(): CollectedDef[] {
  const out = registry;
  registry = [];
  return out;
}

export function definePack(data: PackManifest): void {
  push({ kind: "pack", data });
}
export function defineWorld(data: WorldDef): void {
  push({ kind: "world", data });
}
export function defineZone(data: ZoneDef): void {
  push({ kind: "zone", data });
}
export function defineActor(data: ActorDef): void {
  push({ kind: "actor", data });
}
export function defineProp(data: PropDef): void {
  push({ kind: "prop", data });
}
export function defineItem(data: ItemDef): void {
  push({ kind: "item", data });
}
export function defineRule(data: RuleDef): void {
  push({ kind: "rule", data });
}
export function defineQuest(data: QuestDef): void {
  push({ kind: "quest", data });
}
export function defineDialogue(data: DialogueDef): void {
  push({ kind: "dialogue", data });
}
export function defineSchedule(data: ScheduleDef): void {
  push({ kind: "schedule", data });
}
export function defineLoc(locale: string, data: LocTable): void {
  push({ kind: "loc", locale, data });
}
export function defineAssets(data: AssetTable): void {
  push({ kind: "assets", data });
}
