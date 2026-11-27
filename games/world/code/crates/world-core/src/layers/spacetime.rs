//! L0 · Spacetime: fixed tick, clock, space, movement, collision and navigation.
//!
//! This layer owns time and kinematic state only. It deliberately knows nothing
//! about inventory, doors, schedules, quests or scripts.

use crate::entity::Collider;
use crate::nav;
use world_pack::NavGridDef;

/// A static obstacle snapshot used by collision resolution.
#[derive(Clone, Copy, Debug)]
pub(crate) struct Body {
    pub position: [f32; 3],
    pub speed: f32,
    pub collider: Option<Collider>,
}

#[derive(Clone, Debug)]
pub(crate) struct Obstacle {
    pub position: [f32; 3],
    pub collider: Option<Collider>,
    pub open: bool,
}

#[derive(Clone, Debug)]
pub(crate) struct Spacetime {
    pub tick: u64,
    pub tick_hz: u32,
    pub start_minutes: u32,
    pub clock_minutes: u32,
    pub accumulator_us: u64,
    pub move_intent: [f32; 2],
    pub path: Vec<[f32; 2]>,
    pub path_index: usize,
    pub nav: Option<NavGridDef>,
    pub zone_bounds: Option<([f32; 3], [f32; 3])>,
}

impl Spacetime {
    pub fn new(tick_hz: u32, start_minutes: u32) -> Self {
        Self {
            tick: 0,
            tick_hz,
            start_minutes,
            clock_minutes: start_minutes,
            accumulator_us: 0,
            move_intent: [0.0, 0.0],
            path: Vec::new(),
            path_index: 0,
            nav: None,
            zone_bounds: None,
        }
    }

    pub fn tick_us(&self) -> u64 {
        1_000_000u64 / self.tick_hz.max(1) as u64
    }

    /// Advance the deterministic clock by exactly one fixed tick.
    pub fn advance_tick(&mut self) {
        self.tick = self.tick.saturating_add(1);
        let seconds = self.tick.saturating_mul(60) / self.tick_hz.max(1) as u64;
        self.clock_minutes = (self.start_minutes + (seconds / 60) as u32) % 1440;
    }

    /// Frame accumulator. Returns completed fixed ticks and whether catch-up was exhausted.
    pub fn accumulate(&mut self, frame_dt_us: u64, timescale: f64, max_catchup: u32) -> (u32, bool) {
        let scaled = (frame_dt_us as f64 * timescale).max(0.0) as u64;
        self.accumulator_us = self.accumulator_us.saturating_add(scaled);
        let tick_us = self.tick_us();
        let mut n = 0;
        while self.accumulator_us >= tick_us && n < max_catchup {
            self.accumulator_us -= tick_us;
            n += 1;
        }
        let exhausted = n == max_catchup && self.accumulator_us >= tick_us;
        if exhausted {
            self.accumulator_us = 0;
        }
        (n, exhausted)
    }

    /// Apply this tick's player intent/path. Returns the resulting player position.
    ///
    /// The caller owns the entity slab; this layer only computes kinematics and
    /// collision against the supplied obstacle snapshot.
    pub fn apply_movement(&mut self, player: &Body, obstacles: &[Obstacle]) -> Option<[f32; 3]> {
        let [x, z] = self.move_intent;
        let len = (x * x + z * z).sqrt();
        if len > 1e-6 {
            self.path.clear();
            self.path_index = 0;
            let speed = player.speed.max(0.0);
            if speed <= 0.0 {
                return None;
            }
            let step = speed / self.tick_hz.max(1) as f32;
            let magnitude = len.min(1.0);
            let dx = (x / len) * step * magnitude;
            let dz = (z / len) * step * magnitude;
            let mut position = player.position;
            if let Some(next) = self.try_move(player, obstacles, position, dx, 0.0) {
                position = next;
            }
            if let Some(next) = self.try_move(player, obstacles, position, 0.0, dz) {
                position = next;
            }
            return Some(position);
        }

        if self.path.is_empty() {
            return None;
        }
        let mut position = player.position;
        while self.path_index < self.path.len() {
            let waypoint = self.path[self.path_index];
            let dx = waypoint[0] - position[0];
            let dz = waypoint[1] - position[2];
            if dx * dx + dz * dz <= 0.04 {
                self.path_index += 1;
            } else {
                break;
            }
        }
        if self.path_index >= self.path.len() {
            self.path.clear();
            self.path_index = 0;
            return Some(position);
        }
        let waypoint = self.path[self.path_index];
        let speed = player.speed.max(0.0);
        if speed <= 0.0 {
            return None;
        }
        let dx = waypoint[0] - position[0];
        let dz = waypoint[1] - position[2];
        let distance = (dx * dx + dz * dz).sqrt();
        if distance <= 1e-6 {
            self.path_index += 1;
            return Some(position);
        }
        let step = (speed / self.tick_hz.max(1) as f32).min(distance);
        let moved_x = self
            .try_move(player, obstacles, position, dx / distance * step, 0.0)
            .map(|next| position = next)
            .is_some();
        let moved_z = self
            .try_move(player, obstacles, position, 0.0, dz / distance * step)
            .map(|next| position = next)
            .is_some();
        if !moved_x && !moved_z {
            self.path.clear();
            self.path_index = 0;
        }
        Some(position)
    }

    fn try_move(
        &self,
        player: &Body,
        obstacles: &[Obstacle],
        position: [f32; 3],
        dx: f32,
        dz: f32,
    ) -> Option<[f32; 3]> {
        let radius = player
            .collider
            .as_ref()
            .map(|c| c.radius())
            .unwrap_or(0.35)
            .max(0.05);
        let mut next = [position[0] + dx, position[1], position[2] + dz];

        if let Some((min, max)) = self.zone_bounds {
            next[0] = next[0].clamp(min[0] + radius, max[0] - radius);
            next[2] = next[2].clamp(min[2] + radius, max[2] - radius);
        }

        let blocked = obstacles.iter().any(|obstacle| {
            if obstacle.open {
                return false;
            }
            match &obstacle.collider {
                Some(Collider::Aabb { half }) => circle_aabb_overlap(
                    [next[0], next[2]],
                    radius,
                    [obstacle.position[0], obstacle.position[2]],
                    *half,
                ),
                Some(Collider::Circle { radius: other }) => {
                    let ddx = next[0] - obstacle.position[0];
                    let ddz = next[2] - obstacle.position[2];
                    (ddx * ddx + ddz * ddz).sqrt() < radius + other
                }
                None => false,
            }
        });
        if blocked { None } else { Some(next) }
    }

    /// Deterministic A* entry point; moves to the navigation layer.
    pub fn find_path(&self, start: [f32; 2], goal: [f32; 2]) -> Option<Vec<[f32; 2]>> {
        self.nav
            .as_ref()
            .and_then(|nav| nav::find_path(nav, start, goal))
    }
}

fn circle_aabb_overlap(
    center: [f32; 2],
    radius: f32,
    box_center: [f32; 2],
    half: [f32; 2],
) -> bool {
    let closest = [
        center[0].clamp(box_center[0] - half[0], box_center[0] + half[0]),
        center[1].clamp(box_center[1] - half[1], box_center[1] + half[1]),
    ];
    let dx = center[0] - closest[0];
    let dz = center[1] - closest[1];
    dx * dx + dz * dz < radius * radius
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::Collider;

    fn player(x: f32, z: f32) -> Body {
        Body {
            position: [x, 0.0, z],
            speed: 4.0,
            collider: Some(Collider::Circle { radius: 0.35 }),
        }
    }

    #[test]
    fn clock_advances_one_minute_per_sixty_ticks() {
        let mut space = Spacetime::new(60, 8 * 60);
        for _ in 0..60 { space.advance_tick(); }
        assert_eq!(space.clock_minutes, 8 * 60 + 1);
    }

    #[test]
    fn movement_clamps_to_zone() {
        let mut space = Spacetime::new(60, 0);
        space.zone_bounds = Some(([-5.0, 0.0, -5.0], [5.0, 8.0, 5.0]));
        space.move_intent = [1.0, 0.0];
        let p = player(4.9, 0.0);
        let next = space.apply_movement(&p, &[]).expect("moved");
        assert!(next[0] <= 5.0 - 0.35 + 1e-5);
    }

    #[test]
    fn closed_obstacle_blocks() {
        let mut space = Spacetime::new(60, 0);
        space.move_intent = [1.0, 0.0];
        let p = player(0.0, 0.0);
        let obstacles = vec![Obstacle {
            position: [0.5, 0.0, 0.0],
            collider: Some(Collider::Aabb { half: [0.4, 0.4] }),
            open: false,
        }];
        let next = space.apply_movement(&p, &obstacles).expect("position");
        assert!(next[0] < 0.35);
    }
}
