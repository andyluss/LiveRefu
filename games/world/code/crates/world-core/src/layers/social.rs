//! L4 · Social: factions, relationships and reputation.
//!
//! L4 observes durable social facts from interactions. It doesn't move bodies,
//! open doors or own narrative objectives.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use world_pack::SocialDef;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct FactionState {
    pub name: String,
    pub color: String,
    pub members: BTreeSet<String>,
    pub trust: i32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct RelationshipState {
    pub a: String,
    pub b: String,
    pub trust: i32,
    pub affinity: i32,
    pub interactions: u32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SocialSnapshot {
    pub factions: BTreeMap<String, FactionState>,
    pub relationships: BTreeMap<String, RelationshipState>,
    pub reputation: BTreeMap<String, i32>,
}

#[derive(Clone, Debug)]
pub enum SocialEvent {
    Relationship(RelationshipState),
    Reputation { who: String, value: i32 },
}

pub(crate) struct Social {
    pub(crate) state: SocialSnapshot,
}

impl Social {
    pub fn new(def: &SocialDef) -> Self {
        let mut factions = BTreeMap::new();
        for (id, faction) in &def.factions {
            factions.insert(
                id.clone(),
                FactionState {
                    name: faction.name.clone(),
                    color: faction.color.clone(),
                    members: faction.members.iter().cloned().collect(),
                    trust: 0,
                },
            );
        }
        let mut relationships = BTreeMap::new();
        for rel in &def.relationships {
            let (a, b) = canonical_pair(&rel.a, &rel.b);
            relationships.insert(
                relationship_key(&a, &b),
                RelationshipState {
                    a,
                    b,
                    trust: rel.trust,
                    affinity: rel.affinity,
                    interactions: 0,
                },
            );
        }
        let mut reputation = def.reputations.clone();
        reputation.entry("player".to_string()).or_insert(0);
        Self {
            state: SocialSnapshot {
                factions,
                relationships,
                reputation,
            },
        }
    }

    /// Record a conversation; deterministic and content-id keyed.
    pub fn record_talk(&mut self, actor_id: &str, target_id: &str) -> Vec<SocialEvent> {
        let (a, b) = canonical_pair(actor_id, target_id);
        let key = relationship_key(&a, &b);
        let rel = self
            .state
            .relationships
            .entry(key)
            .or_insert_with(|| RelationshipState {
                a: a.clone(),
                b: b.clone(),
                trust: 0,
                affinity: 0,
                interactions: 0,
            });
        rel.trust = (rel.trust + 1).clamp(-100, 100);
        rel.affinity = (rel.affinity + 1).clamp(-100, 100);
        rel.interactions = rel.interactions.saturating_add(1);
        let rel = rel.clone();
        let rep = self
            .state
            .reputation
            .entry(actor_id.to_string())
            .or_insert(0);
        *rep = (*rep + 1).clamp(-100, 100);
        vec![
            SocialEvent::Relationship(rel),
            SocialEvent::Reputation {
                who: actor_id.to_string(),
                value: *rep,
            },
        ]
    }

    pub fn apply_action(&mut self, actor_id: &str, target_id: Option<&str>, action: &str) -> Result<Vec<SocialEvent>, String> {
        match action {
            "support" | "thank" | "propose" => {
                let target = target_id.ok_or_else(|| "social action 缺少 target".to_string())?;
                Ok(self.record_talk(actor_id, target))
            }
            _ => Err(format!("未知 social action: {action}")),
        }
    }

    pub fn snapshot(&self) -> SocialSnapshot {
        self.state.clone()
    }
}

fn canonical_pair(a: &str, b: &str) -> (String, String) {
    if a <= b { (a.to_string(), b.to_string()) } else { (b.to_string(), a.to_string()) }
}
fn relationship_key(a: &str, b: &str) -> String {
    format!("{a}|{b}")
}

pub fn event_json(event: &SocialEvent) -> (&'static str, Value) {
    match event {
        SocialEvent::Relationship(rel) => (
            "relationship_changed",
            json!({"a": rel.a, "b": rel.b, "trust": rel.trust, "affinity": rel.affinity, "interactions": rel.interactions}),
        ),
        SocialEvent::Reputation { who, value } => (
            "reputation_changed",
            json!({"who": who, "value": value}),
        ),
    }
}

impl Social {
    pub fn from_snapshot(state: SocialSnapshot) -> Self {
        Self { state }
    }
}
