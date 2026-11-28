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
    battery_low_warned: bool,
    water_low_warned: bool,
}

impl Systems {
    pub fn new(def: &SystemsDef) -> Self {
        Self {
            def: def.clone(),
            state: SystemsSnapshot {
                weather: "clear".to_string(),
                solar_kw: 0.0,
                wind_kw: 0.0,
                battery_kwh: def
                    .initial_battery_kwh
                    .unwrap_or(def.battery_kwh)
                    .clamp(0.0, def.battery_kwh.max(1.0)),
                water_m3: def
                    .initial_water_m3
                    .unwrap_or(def.water_m3)
                    .clamp(0.0, def.water_m3.max(1.0)),
                load_kw: def.base_load_kw,
                policy: def.policy.clone(),
                last_update_tick: 0,
            },
            battery_low_warned: false,
            water_low_warned: false,
        }
    }

    /// Advance every fixed tick; emit coarse (1 s) events only.
    pub fn update(&mut self, tick: u64, clock_minutes: u32) -> Vec<(&'static str, Value)> {
        const DT: f32 = 1.0 / 60.0;
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
        let compute_ai = if self.state.policy == "compute" {
            self.def.ai_count as f32 * 0.8
        } else {
            0.0
        };
        let ai_load = self.def.ai_count as f32 * 1.8 + compute_ai;
        let policy_load = match self.state.policy.as_str() {
            "irrigate" => 8.0,
            "compute" => 12.0,
            "profit" => -6.0,
            "commons" => 9.0,
            _ => 0.0,
        };
        let load = self.def.base_load_kw + ai_load + policy_load;
        let net = solar + wind - load;
        self.state.battery_kwh =
            (self.state.battery_kwh + net * DT / 3600.0).clamp(0.0, self.def.battery_kwh.max(1.0));

        // Water is a rate, not a per-tick absolute: rain recharges, every policy draws.
        let water_rate = match self.state.policy.as_str() {
            "irrigate" => -0.08,
            "commons" => -0.02,
            "profit" => -0.004,
            "compute" => -0.012,
            _ => -0.006,
        };
        let rain_rate = if weather == "rain" { 0.06 } else { 0.0 };
        self.state.water_m3 = (self.state.water_m3 + (rain_rate + water_rate) * DT)
            .clamp(0.0, self.def.water_m3.max(1.0));

        self.state.weather = weather.clone();
        self.state.solar_kw = solar;
        self.state.wind_kw = wind;
        self.state.load_kw = load;
        self.state.last_update_tick = tick;

        let battery_pct = if self.def.battery_kwh > 0.0 {
            self.state.battery_kwh / self.def.battery_kwh * 100.0
        } else {
            0.0
        };
        let water_pct = if self.def.water_m3 > 0.0 {
            self.state.water_m3 / self.def.water_m3 * 100.0
        } else {
            0.0
        };
        let mut events = Vec::new();
        if tick % 60 == 0 {
            events.push((
                "energy_updated",
                json!({
                    "solar_kw": solar, "wind_kw": wind, "battery_kwh": self.state.battery_kwh,
                    "battery_pct": battery_pct, "water_m3": self.state.water_m3,
                    "water_pct": water_pct, "load_kw": load, "net_kw": net,
                    "ai_load_kw": ai_load, "daylight": daylight,
                    "weather": self.state.weather, "policy": self.state.policy
                }),
            ));
        }
        if tick % 600 == 0 {
            events.push(("weather_changed", json!({"weather": self.state.weather})));
        }
        if tick > 0 && battery_pct < 10.0 && !self.battery_low_warned {
            self.battery_low_warned = true;
            events.push((
                "system_warning",
                json!({"system": "battery", "level": "low", "value": self.state.battery_kwh, "pct": battery_pct}),
            ));
        } else if battery_pct >= 20.0 {
            self.battery_low_warned = false;
        }
        if tick > 0 && water_pct < 10.0 && !self.water_low_warned {
            self.water_low_warned = true;
            events.push((
                "system_warning",
                json!({"system": "water", "level": "low", "value": self.state.water_m3, "pct": water_pct}),
            ));
        } else if water_pct >= 20.0 {
            self.water_low_warned = false;
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
        SystemsDef {
            solar_kw: 100.0,
            wind_kw: 80.0,
            battery_kwh: 200.0,
            initial_battery_kwh: None,
            water_m3: 500.0,
            initial_water_m3: None,
            ai_count: 3,
            base_load_kw: 20.0,
            policy: "balance".into(),
        }
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
    fn policy_affects_water_and_ai_load() {
        let mut balanced = Systems::new(&def());
        let mut irrigating = Systems::new(&def());
        let mut computing = Systems::new(&def());
        balanced.set_policy("balance").unwrap();
        irrigating.set_policy("irrigate").unwrap();
        computing.set_policy("compute").unwrap();
        for tick in 1..=120 {
            balanced.update(tick, 12 * 60);
            irrigating.update(tick, 12 * 60);
            computing.update(tick, 12 * 60);
        }
        assert!(irrigating.snapshot().water_m3 < balanced.snapshot().water_m3);
        assert!(computing.snapshot().load_kw > balanced.snapshot().load_kw);
        assert!(balanced.snapshot().battery_kwh >= 0.0);
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
        self.battery_low_warned = false;
        self.water_low_warned = false;
    }
}
