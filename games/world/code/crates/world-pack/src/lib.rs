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

        let loc = read_loc(&root.join("loc"))?;

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
            loc,
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
