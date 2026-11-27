//! L5 · World systems: weather, energy, water and AI load.
//!
//! Systems advance on a coarse deterministic clock. They emit world-level
//! events and never touch entities directly.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use world_pack::SystemsDef;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct SystemsSnapshot {
    pub weather: String,
    pub solar_kw: f32,
    pub wind_kw: f32,
    pub battery_kwh: f32,
    pub water_m3: f32,
    pub load_kw: f32,
    pub policy: String,
    pub last_update_tick: u64,
}

pub(crate) struct Systems {
    def: SystemsDef,
    state: SystemsSnapshot,
}

impl Systems {
    pub fn new(def: &SystemsDef) -> Self {
        Self {
            def: def.clone(),
            state: SystemsSnapshot {
                weather: "clear".to_string(),
                solar_kw: 0.0,
                wind_kw: 0.0,
                battery_kwh: def.battery_kwh,
                water_m3: def.water_m3,
                load_kw: def.base_load_kw,
                policy: def.policy.clone(),
                last_update_tick: 0,
            },
        }
    }

    /// Advance every fixed tick; emit coarse (1 s) events only.
    pub fn update(&mut self, tick: u64, clock_minutes: u32) -> Vec<(&'static str, Value)> {
        let weather = weather_at(tick).to_string();
        let daylight = daylight_factor(clock_minutes);
        let weather_factor = match weather.as_str() {
            "clear" => 1.0,
            "breezy" => 0.82,
            "cloudy" => 0.48,
            "rain" => 0.22,
            _ => 0.7,
        };
        let wind_factor = match weather.as_str() {
            "breezy" => 1.0,
            "rain" => 0.85,
            "cloudy" => 0.55,
            "clear" => 0.35,
            _ => 0.5,
        };
        let solar = self.def.solar_kw * daylight * weather_factor;
        let wind = self.def.wind_kw * wind_factor;
        let ai_load = self.def.ai_count as f32 * 1.8;
        let policy_load = match self.state.policy.as_str() {
            "irrigate" => 8.0,
            "compute" => 12.0,
            "profit" => -6.0,
            "commons" => 9.0,
            _ => 0.0,
        };
        let load = self.def.base_load_kw + ai_load + policy_load;
        let net = solar + wind - load;
        self.state.battery_kwh = (self.state.battery_kwh + net / 3600.0)
            .clamp(0.0, self.def.battery_kwh.max(1.0));
        let rain = if weather == "rain" { 0.03 } else { -0.006 };
        self.state.water_m3 = (self.state.water_m3 + rain).clamp(0.0, self.def.water_m3.max(1.0));
        self.state.weather = weather;
        self.state.solar_kw = solar;
        self.state.wind_kw = wind;
        self.state.load_kw = load;
        self.state.last_update_tick = tick;
        let mut events = Vec::new();
        if tick % 60 == 0 {
            events.push((
                "energy_updated",
                json!({"solar_kw": solar, "wind_kw": wind, "battery_kwh": self.state.battery_kwh, "load_kw": load, "weather": self.state.weather}),
            ));
        }
        if tick % 600 == 0 {
            events.push(("weather_changed", json!({"weather": self.state.weather})));
        }
        events
    }

    pub fn set_policy(&mut self, policy: &str) -> Result<(&'static str, Value), String> {
        if !["balance", "irrigate", "compute", "profit", "commons"].contains(&policy) {
            return Err(format!("未知能源策略: {policy}"));
        }
        self.state.policy = policy.to_string();
        Ok(("system_policy_changed", json!({"policy": policy})))
    }

    pub fn snapshot(&self) -> SystemsSnapshot {
        self.state.clone()
    }
}

fn weather_at(tick: u64) -> &'static str {
    ["clear", "breezy", "cloudy", "rain"][((tick / 600) % 4) as usize]
}

fn daylight_factor(minutes: u32) -> f32 {
    let hour = (minutes % 1440) as f32 / 60.0;
    let x = ((hour - 6.0) / 12.0 * std::f32::consts::PI).clamp(0.0, std::f32::consts::PI);
    (x.sin()).max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn def() -> SystemsDef {
        SystemsDef { solar_kw: 100.0, wind_kw: 80.0, battery_kwh: 200.0, water_m3: 500.0, ai_count: 3, base_load_kw: 20.0, policy: "balance".into() }
    }

    #[test]
    fn solar_is_daylight_dependent() {
        let mut systems = Systems::new(&def());
        systems.update(60, 12 * 60);
        assert!(systems.snapshot().solar_kw > 50.0);
        systems.update(120, 0);
        assert_eq!(systems.snapshot().solar_kw, 0.0);
    }

    #[test]
    fn policy_is_validated() {
        let mut systems = Systems::new(&def());
        assert!(systems.set_policy("compute").is_ok());
        assert!(systems.set_policy("profit").is_ok());
        assert!(systems.set_policy("commons").is_ok());
        assert!(systems.set_policy("burn-coal").is_err());
    }
}

impl Systems {
    pub fn restore(&mut self, state: SystemsSnapshot) {
        self.state = state;
    }
}
