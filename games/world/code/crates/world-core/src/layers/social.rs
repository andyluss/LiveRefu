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
    Faction { faction: String, trust: i32 },
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
        self.apply_delta(actor_id, target_id, 1, 1, 1, 0)
    }

    pub fn apply_action(
        &mut self,
        actor_id: &str,
        target_id: Option<&str>,
        action: &str,
    ) -> Result<Vec<SocialEvent>, String> {
        let target = target_id.ok_or_else(|| "social action 缺少 target".to_string())?;
        let (trust, affinity, reputation) = match action {
            "support" => (2, 2, 2),
            "thank" => (1, 1, 1),
            "propose" => (3, 2, 2),
            "mediate" => (2, 1, 1),
            "insult" => (-4, -4, -3),
            _ => return Err(format!("未知 social action: {action}")),
        };
        Ok(self.apply_delta(actor_id, target, trust, affinity, reputation, trust))
    }

    fn apply_delta(
        &mut self,
        actor_id: &str,
        target_id: &str,
        trust_delta: i32,
        affinity_delta: i32,
        reputation_delta: i32,
        faction_delta: i32,
    ) -> Vec<SocialEvent> {
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
        rel.trust = (rel.trust + trust_delta).clamp(-100, 100);
        rel.affinity = (rel.affinity + affinity_delta).clamp(-100, 100);
        rel.interactions = rel.interactions.saturating_add(1);
        let rel = rel.clone();
        let rep = self
            .state
            .reputation
            .entry(actor_id.to_string())
            .or_insert(0);
        *rep = (*rep + reputation_delta).clamp(-100, 100);
        let mut events = vec![
            SocialEvent::Relationship(rel),
            SocialEvent::Reputation {
                who: actor_id.to_string(),
                value: *rep,
            },
        ];

        let faction_id = self
            .state
            .factions
            .iter()
            .find(|(_, faction)| faction.members.contains(target_id))
            .map(|(id, _)| id.clone());
        if faction_delta != 0 {
            if let Some(faction_id) = faction_id {
                if let Some(faction) = self.state.factions.get_mut(&faction_id) {
                    faction.trust = (faction.trust + faction_delta).clamp(-100, 100);
                    events.push(SocialEvent::Faction {
                        faction: faction_id,
                        trust: faction.trust,
                    });
                }
            }
        }
        events
    }

    pub fn snapshot(&self) -> SocialSnapshot {
        self.state.clone()
    }
}

fn canonical_pair(a: &str, b: &str) -> (String, String) {
    if a <= b {
        (a.to_string(), b.to_string())
    } else {
        (b.to_string(), a.to_string())
    }
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
        SocialEvent::Reputation { who, value } => {
            ("reputation_changed", json!({"who": who, "value": value}))
        }
        SocialEvent::Faction { faction, trust } => (
            "faction_trust_changed",
            json!({"faction": faction, "trust": trust}),
        ),
    }
}

impl Social {
    pub fn from_snapshot(state: SocialSnapshot) -> Self {
        Self { state }
    }
}
