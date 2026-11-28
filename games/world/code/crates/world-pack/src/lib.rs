pub mod bench;
pub mod types;
pub mod validate;

pub use types::*;
pub use validate::{parse_hhmm, ValidationError, ValidationReport};

use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct PackError {
    pub path: String,
    pub message: String,
}

impl std::fmt::Display for PackError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.path, self.message)
    }
}

impl std::error::Error for PackError {}

fn err(path: impl Into<String>, message: impl Into<String>) -> PackError {
    PackError {
        path: path.into(),
        message: message.into(),
    }
}

impl Pack {
    pub fn load_dir(root: impl AsRef<Path>) -> Result<Self, PackError> {
        let root = root.as_ref();
        if !root.is_dir() {
            return Err(err(
                root.display().to_string(),
                "内容包目录不存在或不是目录",
            ));
        }

        let manifest: PackManifest = read_json(&root.join("pack.json"))?;
        let world: WorldDef = read_json(&root.join(&manifest.entry.world))?;

        let zones = read_map::<ZoneDef>(&root.join("world/zones"), |d| d.id.clone())?;
        let actors = read_map::<ActorDef>(&root.join("world/actors"), |d| d.id.clone())?;
        let props = read_map::<PropDef>(&root.join("world/props"), |d| d.id.clone())?;
        let items = read_map::<ItemDef>(&root.join("world/items"), |d| d.id.clone())?;
        let rules = read_map::<RuleDef>(&root.join("rules"), |d| d.id.clone())?;
        let quests = read_map::<QuestDef>(&root.join("quests"), |d| d.id.clone())?;
        let dialogues = read_map::<DialogueDef>(&root.join("dialogue"), |d| d.id.clone())?;
        let schedules = read_map::<ScheduleDef>(&root.join("schedules"), |d| d.id.clone())?;
        let navs = read_map::<NavGridDef>(&root.join("world/nav"), |d| d.id.clone())?;

        let assets = if let Some(path) = &manifest.assets {
            read_json::<BTreeMap<String, AssetDef>>(&root.join(path))?
        } else {
            BTreeMap::new()
        };

        let loc = read_loc(&root.join("loc"))?;
        let scripts = read_scripts(&root.join("scripts"))?;

        Ok(Pack {
            manifest,
            world,
            zones,
            actors,
            props,
            items,
            rules,
            quests,
            dialogues,
            schedules,
            navs,
            assets,
            loc,
            scripts,
        })
    }

    pub fn from_bundle_bytes(bytes: &[u8]) -> Result<Self, PackError> {
        serde_json::from_slice(bytes)
            .map_err(|e| err("pack.data", format!("内容包 JSON 解析失败: {e}")))
    }

    pub fn to_bundle_bytes(&self) -> Result<Vec<u8>, PackError> {
        serde_json::to_vec(self).map_err(|e| err("pack.data", format!("内容包序列化失败: {e}")))
    }

    pub fn hash(&self) -> Result<String, PackError> {
        let bytes = self.to_bundle_bytes()?;
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        Ok(format!("sha256:{}", hex::encode(hasher.finalize())))
    }

    pub fn validate(&self) -> ValidationReport {
        validate::validate_pack(self)
    }

    /// 真实 5k 基准包：单 Zone 5,000 实体（含玩家），带碰撞/日程/规则/任务/对话/脚本/导航。
    /// 不是正式内容；用于 `worldc bench --scenario real5k`。
    pub fn real5k(seed: u64) -> Self {
        bench::real5k(seed)
    }

    /// 5k v2: v1 mixed load + sustained NPC paths / dynamic prop moves.
    pub fn real5k_v2(seed: u64) -> Self {
        bench::real5k_v2(seed)
    }

    /// M1 基准用合成包：一个区域 + N 个相同 Actor 的 placement。
    /// 不写文件，也不进入正式内容；只用于量级/性能基线。
    pub fn synthetic(entities: usize) -> Self {
        let n = entities.max(1);
        let side = (n as f64).sqrt().ceil() as i32;
        let spacing = 2.0f32;
        let half = (side as f32 * spacing) / 2.0 + 4.0;
        let mut placements = Vec::with_capacity(n);
        for i in 0..n {
            let x = (i % side as usize) as f32 * spacing - half;
            let z = (i / side as usize) as f32 * spacing - half;
            placements.push(Placement {
                actor: Some("bench.actor".to_string()),
                prop: None,
                item: None,
                at: [x, 0.0, z],
                yaw: 0.0,
                persistent_id: format!("bench.{i}"),
            });
        }
        let manifest = PackManifest {
            schema: 1,
            id: "bench.synthetic".to_string(),
            version: "0.1.0".to_string(),
            core_api: ">=0.1 <0.2".to_string(),
            kits: vec!["core".to_string()],
            entry: Entry {
                world: "world/bench.world.json".to_string(),
                start_zone: "zone.bench".to_string(),
            },
            sim_profile: "arcade".to_string(),
            tick_hz: 60,
            assets: None,
            loc: vec![],
            requires: vec![],
            optional: vec![],
            conflicts: vec![],
        };
        let world = WorldDef {
            id: "world.bench".to_string(),
            start_zone: "zone.bench".to_string(),
            start_time: "08:00".to_string(),
            seed: 1,
            player: PlayerSpawn {
                at: [0.0, 0.0, 0.0],
                inventory: vec![],
            },
            social: None,
            systems: None,
        };
        let zone = ZoneDef {
            id: "zone.bench".to_string(),
            name: "bench".to_string(),
            bounds: Bounds {
                min: [-half, 0.0, -half],
                max: [half, 8.0, half],
            },
            nav: None,
            placements,
        };
        let mut zones = BTreeMap::new();
        zones.insert(zone.id.clone(), zone);
        let mut actors = BTreeMap::new();
        actors.insert(
            "bench.actor".to_string(),
            ActorDef {
                id: "bench.actor".to_string(),
                name: "bench.actor".to_string(),
                tags: vec!["bench".to_string()],
                body: BodyDef {
                    shape: "capsule".to_string(),
                    radius: Some(0.35),
                    height: Some(1.7),
                    size: None,
                },
                stats: StatsDef {
                    health: 100,
                    speed: 0.0,
                },
                brain: None,
                inventory: None,
                dialogue: None,
                visual: None,
            },
        );
        Pack {
            manifest,
            world,
            zones,
            actors,
            props: BTreeMap::new(),
            items: BTreeMap::new(),
            rules: BTreeMap::new(),
            quests: BTreeMap::new(),
            dialogues: BTreeMap::new(),
            schedules: BTreeMap::new(),
            navs: BTreeMap::new(),
            assets: BTreeMap::new(),
            loc: BTreeMap::new(),
            scripts: BTreeMap::new(),
        }
    }

    pub fn default_locale(&self) -> &BTreeMap<String, String> {
        self.loc
            .get("zh-CN")
            .or_else(|| self.loc.values().next())
            .unwrap_or_else(|| EMPTY_LOC.get_or_init(BTreeMap::new))
    }

    pub fn loc_has(&self, key: &str) -> bool {
        let key = key.strip_prefix("loc:").unwrap_or(key);
        self.default_locale().contains_key(key)
    }

    /// 用静态 Prop 的 AABB 烘焙一个区域的导航网格（M1 网格 + 4 邻接）。
    pub fn bake_zone_nav(
        &self,
        zone_id: &str,
        cell: f32,
        player_radius: f32,
    ) -> Option<NavGridDef> {
        let zone = self.zones.get(zone_id)?;
        let nav_id = zone.nav.clone().unwrap_or_else(|| format!("nav.{zone_id}"));
        let cell = if cell.is_finite() && cell > 0.0 {
            cell
        } else {
            1.0
        };
        let min = zone.bounds.min;
        let max = zone.bounds.max;
        let width = (((max[0] - min[0]) / cell).ceil() as u32).max(1);
        let height = (((max[2] - min[2]) / cell).ceil() as u32).max(1);
        let mut blocked = Vec::new();
        for y in 0..height {
            for x in 0..width {
                let cx = min[0] + (x as f32 + 0.5) * cell;
                let cz = min[2] + (y as f32 + 0.5) * cell;
                let inside_any = zone.placements.iter().any(|p| {
                    let Some(prop_id) = &p.prop else {
                        return false;
                    };
                    let Some(prop) = self.props.get(prop_id) else {
                        return false;
                    };
                    let Some(size) = prop.body.size else {
                        return false;
                    };
                    let half_x = size[0] * 0.5 + player_radius;
                    let half_z = size[2] * 0.5 + player_radius;
                    (cx - p.at[0]).abs() < half_x && (cz - p.at[2]).abs() < half_z
                });
                if inside_any {
                    blocked.push(y * width + x);
                }
            }
        }
        Some(NavGridDef {
            id: nav_id,
            zone: zone.id.clone(),
            cell,
            origin: [min[0], min[2]],
            width,
            height,
            blocked,
        })
    }

    /// 某个 Zone 的摆放所依赖的逻辑资产 ID（去重、排序）。
    pub fn zone_assets(&self, zone_id: &str) -> Vec<String> {
        let Some(zone) = self.zones.get(zone_id) else {
            return Vec::new();
        };
        let mut out = std::collections::BTreeSet::new();
        for placement in &zone.placements {
            let visual = if let Some(id) = &placement.actor {
                self.actors.get(id).and_then(|d| d.visual.clone())
            } else if let Some(id) = &placement.prop {
                self.props.get(id).and_then(|d| d.visual.clone())
            } else if let Some(id) = &placement.item {
                self.items.get(id).and_then(|d| d.visual.clone())
            } else {
                None
            };
            if let Some(visual) = visual {
                out.insert(visual);
            }
        }
        out.into_iter().collect()
    }
}

static EMPTY_LOC: std::sync::OnceLock<BTreeMap<String, String>> = std::sync::OnceLock::new();

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T, PackError> {
    let text = fs::read_to_string(path)
        .map_err(|e| err(path.display().to_string(), format!("读取失败: {e}")))?;
    serde_json::from_str(&text)
        .map_err(|e| err(path.display().to_string(), format!("JSON 解析失败: {e}")))
}

fn json_files(dir: &Path) -> Result<Vec<PathBuf>, PackError> {
    if !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(dir)
        .map_err(|e| err(dir.display().to_string(), format!("目录读取失败: {e}")))?
    {
        let entry =
            entry.map_err(|e| err(dir.display().to_string(), format!("目录项读取失败: {e}")))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            out.push(path);
        }
    }
    out.sort();
    Ok(out)
}

fn read_map<T: serde::de::DeserializeOwned>(
    dir: &Path,
    key: impl Fn(&T) -> String,
) -> Result<BTreeMap<String, T>, PackError> {
    let mut out = BTreeMap::new();
    for path in json_files(dir)? {
        let item: T = read_json(&path)?;
        let id = key(&item);
        if let Some(prev) = out.insert(id.clone(), item) {
            let _ = prev;
            return Err(err(path.display().to_string(), format!("重复的 ID: {id}")));
        }
    }
    Ok(out)
}

fn read_scripts(dir: &Path) -> Result<BTreeMap<String, String>, PackError> {
    if !dir.exists() {
        return Ok(BTreeMap::new());
    }
    let mut out = BTreeMap::new();
    collect_scripts(dir, dir, &mut out)?;
    Ok(out)
}

fn collect_scripts(
    root: &Path,
    dir: &Path,
    out: &mut BTreeMap<String, String>,
) -> Result<(), PackError> {
    let entries = fs::read_dir(dir)
        .map_err(|e| err(dir.display().to_string(), format!("读取 scripts 失败: {e}")))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_scripts(root, &path, out)?;
            continue;
        }
        if path.extension().and_then(|s| s.to_str()) != Some("js") {
            continue;
        }
        let rel = path.strip_prefix(root).unwrap_or(&path);
        let id = rel
            .with_extension("")
            .to_str()
            .ok_or_else(|| err(path.display().to_string(), "脚本文件名无效"))?
            .replace('\\', "/");
        let source = fs::read_to_string(&path)
            .map_err(|e| err(path.display().to_string(), format!("读取脚本失败: {e}")))?;
        if source.trim().is_empty() {
            return Err(err(path.display().to_string(), "脚本为空"));
        }
        out.insert(id, source);
    }
    Ok(())
}

fn read_loc(dir: &Path) -> Result<BTreeMap<String, BTreeMap<String, String>>, PackError> {
    let mut out = BTreeMap::new();
    for path in json_files(dir)? {
        let locale = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();
        let map: BTreeMap<String, String> = read_json(&path)?;
        out.insert(locale, map);
    }
    Ok(out)
}
