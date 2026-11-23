export type Vec3 = [number, number, number];

export interface ItemStackDef {
  item: string;
  count?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  stack?: number;
  tags?: string[];
}

export interface BodyDef {
  shape: "capsule" | "aabb" | "sphere";
  radius?: number;
  height?: number;
  size?: Vec3;
}

export interface ActorDef {
  id: string;
  name: string;
  tags?: string[];
  body: BodyDef;
  stats: { health: number; speed: number };
  brain?: { profile: string; schedule?: string };
  inventory?: { items: ItemStackDef[] };
  dialogue?: string;
}

export interface InteractableDef {
  verbs: string[];
}

export interface PropDef {
  id: string;
  name: string;
  tags?: string[];
  body: BodyDef;
  interactable: InteractableDef;
  locked_by?: string;
}

export interface Placement {
  actor?: string;
  prop?: string;
  item?: string;
  at: Vec3;
  yaw?: number;
  persistent_id: string;
}

export interface ZoneDef {
  id: string;
  name: string;
  bounds: { min: Vec3; max: Vec3 };
  nav?: string;
  placements: Placement[];
}

export interface WorldDef {
  id: string;
  start_zone: string;
  start_time: string;
  seed: number;
  player: { at: Vec3; inventory?: ItemStackDef[] };
}

export interface PackManifest {
  schema: 1;
  id: string;
  version: string;
  core_api: string;
  kits: string[];
  entry: { world: string; start_zone: string };
  sim_profile: "arcade" | "engine_physics";
  tick_hz?: 30 | 60 | 120;
  assets?: string;
  loc?: string[];
  requires?: string[];
  optional?: string[];
  conflicts?: string[];
}

export type Condition =
  | { kind: "has_item"; item: string }
  | { kind: "flag"; flag: string; value: boolean }
  | { kind: "quest_active"; quest: string };

export type Action =
  | { kind: "set_flag"; flag: string; value: boolean }
  | { kind: "toast"; text: string }
  | { kind: "play_sound"; id: string }
  | { kind: "emit"; event: string }
  | { kind: "give_item"; item: string; count: number }
  | { kind: "start_quest"; quest: string }
  | { kind: "open_door" };

export interface RuleDef {
  id: string;
  on: "interact" | "talk" | "pickup";
  target?: string;
  when?: Condition[];
  then?: Action[];
  else?: Action[];
}

export type Objective =
  | { kind: "talk"; target: string }
  | { kind: "flag"; flag: string; value: boolean }
  | { kind: "acquire"; item: string };

export type Reward =
  | { kind: "flag"; flag: string; value: boolean }
  | { kind: "item"; item: string; count: number };

export interface QuestDef {
  id: string;
  title: string;
  auto_start?: boolean;
  objectives: Objective[];
  rewards?: Reward[];
}

export interface DialogueNode {
  speaker?: string;
  text?: string;
  choices?: { text: string; next: string }[];
  next?: string;
  end?: boolean;
}

export interface DialogueDef {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

export interface ScheduleEntry {
  from: string;
  to: string;
  behavior: string;
  at?: string;
}

export interface ScheduleDef {
  id: string;
  entries: ScheduleEntry[];
}

export type LocTable = Record<string, string>;
