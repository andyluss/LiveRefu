use std::cmp::Reverse;
use std::collections::BinaryHeap;
use world_pack::NavGridDef;

/// 4 邻接 A*；节点用网格索引，堆按 (f, index) 排序，保证确定性。
pub fn find_path(nav: &NavGridDef, start: [f32; 2], goal: [f32; 2]) -> Option<Vec<[f32; 2]>> {
    find_path_with_open(nav, start, goal, &[])
}

/// A* with dynamic pass-through cells for opened doors.
///
/// The baked nav grid treats doors as static blockers. When a door is open its
/// AABB no longer blocks movement, so the cells covered by that AABB must be
/// temporarily treated as free; otherwise click-to-move around a door would
/// still fail even though the collision layer allows walking through it.
pub fn find_path_with_open(
    nav: &NavGridDef,
    start: [f32; 2],
    goal: [f32; 2],
    open_boxes: &[([f32; 2], [f32; 2])],
) -> Option<Vec<[f32; 2]>> {
    let width = nav.width as i32;
    let height = nav.height as i32;
    if width <= 0 || height <= 0 {
        return None;
    }
    let mut blocked = blocked_mask(nav);
    if !open_boxes.is_empty() {
        let total = (width * height) as usize;
        for index in 0..total {
            if !blocked[index] {
                continue;
            }
            let center = cell_center(nav, index as i32);
            if open_boxes
                .iter()
                .any(|(box_center, half)| point_in_box(center, *box_center, *half))
            {
                blocked[index] = false;
            }
        }
    }

    let start_cell = nearest_free(nav, &blocked, start)?;
    let goal_cell = nearest_free(nav, &blocked, goal)?;
    if start_cell == goal_cell {
        return Some(vec![cell_center(nav, start_cell)]);
    }

    let total = (width * height) as usize;
    let mut g = vec![u32::MAX; total];
    let mut came = vec![i32::MIN; total];
    let mut closed = vec![false; total];
    let mut heap: BinaryHeap<(Reverse<u32>, Reverse<usize>)> = BinaryHeap::new();

    let si = start_cell as usize;
    let gi = goal_cell as usize;
    g[si] = 0;
    heap.push((
        Reverse(heuristic(start_cell, goal_cell, width)),
        Reverse(si),
    ));

    while let Some((_, Reverse(current))) = heap.pop() {
        if closed[current] {
            continue;
        }
        if current == gi {
            return Some(reconstruct(nav, &came, si, gi));
        }
        closed[current] = true;
        let cx = (current as i32) % width;
        let cy = (current as i32) / width;
        let neighbors = [(cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)];
        for (nx, ny) in neighbors {
            if nx < 0 || ny < 0 || nx >= width || ny >= height {
                continue;
            }
            let ni = (ny * width + nx) as usize;
            if blocked[ni] || closed[ni] {
                continue;
            }
            let tentative = g[current].saturating_add(10);
            if tentative < g[ni] {
                g[ni] = tentative;
                came[ni] = current as i32;
                let f = tentative.saturating_add(heuristic(nx + ny * width, gi as i32, width));
                heap.push((Reverse(f), Reverse(ni)));
            }
        }
    }
    None
}

fn point_in_box(point: [f32; 2], center: [f32; 2], half: [f32; 2]) -> bool {
    (point[0] - center[0]).abs() <= half[0] + 1e-4
        && (point[1] - center[1]).abs() <= half[1] + 1e-4
}

fn blocked_mask(nav: &NavGridDef) -> Vec<bool> {
    let total = (nav.width as usize).saturating_mul(nav.height as usize);
    let mut blocked = vec![false; total];
    for index in &nav.blocked {
        if let Some(slot) = blocked.get_mut(*index as usize) {
            *slot = true;
        }
    }
    blocked
}

fn cell_of(nav: &NavGridDef, point: [f32; 2]) -> (i32, i32) {
    let x = ((point[0] - nav.origin[0]) / nav.cell.max(0.01)).floor() as i32;
    let z = ((point[1] - nav.origin[1]) / nav.cell.max(0.01)).floor() as i32;
    (x, z)
}

fn cell_center(nav: &NavGridDef, index: i32) -> [f32; 2] {
    let width = nav.width as i32;
    let x = index % width;
    let z = index / width;
    [
        nav.origin[0] + (x as f32 + 0.5) * nav.cell,
        nav.origin[1] + (z as f32 + 0.5) * nav.cell,
    ]
}

fn nearest_free(nav: &NavGridDef, blocked: &[bool], point: [f32; 2]) -> Option<i32> {
    let width = nav.width as i32;
    let height = nav.height as i32;
    let (cx, cz) = cell_of(nav, point);
    let cx = cx.clamp(0, width - 1);
    let cz = cz.clamp(0, height - 1);
    let mut best: Option<(u32, i32)> = None;
    for radius in 0..=6i32 {
        for dz in -radius..=radius {
            for dx in -radius..=radius {
                if dx.abs() != radius && dz.abs() != radius {
                    continue;
                }
                let x = cx + dx;
                let z = cz + dz;
                if x < 0 || z < 0 || x >= width || z >= height {
                    continue;
                }
                let index = z * width + x;
                if blocked[index as usize] {
                    continue;
                }
                let distance = (dx * dx + dz * dz) as u32;
                if best.map(|(d, _)| distance < d).unwrap_or(true) {
                    best = Some((distance, index));
                }
            }
        }
        if best.is_some() {
            break;
        }
    }
    best.map(|(_, index)| index)
}

fn heuristic(a: i32, b: i32, width: i32) -> u32 {
    let ax = a % width;
    let ay = a / width;
    let bx = b % width;
    let by = b / width;
    ((ax - bx).abs() + (ay - by).abs()) as u32 * 10
}

fn reconstruct(nav: &NavGridDef, came: &[i32], start: usize, goal: usize) -> Vec<[f32; 2]> {
    let mut out = Vec::new();
    let mut current = goal as i32;
    while current >= 0 {
        out.push(cell_center(nav, current));
        if current as usize == start {
            break;
        }
        let prev = came[current as usize];
        if prev == i32::MIN {
            break;
        }
        current = prev;
    }
    out.reverse();
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn grid() -> NavGridDef {
        let mut blocked = Vec::new();
        for z in 0..10 {
            for x in 0..10 {
                if x == 5 && z != 9 {
                    blocked.push(z * 10 + x);
                }
            }
        }
        NavGridDef {
            id: "nav.test".to_string(),
            zone: "zone.test".to_string(),
            cell: 1.0,
            origin: [0.0, 0.0],
            width: 10,
            height: 10,
            blocked,
        }
    }

    #[test]
    fn finds_path_around_wall() {
        let path = find_path(&grid(), [1.5, 1.5], [8.5, 1.5]).unwrap();
        assert!(path.len() > 2);
        assert!(path.iter().any(|p| p[1] > 8.0));
    }

    #[test]
    fn open_door_clears_baked_blocker() {
        // Same wall as `grid()`: x=5 blocks every z except z=9. A door at
        // (5.5, 5.5) would be baked into the grid; opening it should let A*
        // cross directly through the middle instead of walking to z=9.
        let open = [([5.5, 5.5], [0.5, 0.5])];
        let path = find_path_with_open(&grid(), [1.5, 1.5], [8.5, 5.5], &open).unwrap();
        assert!(path.iter().any(|p| p[0] >= 5.0 && p[1] < 8.0));
    }

    #[test]
    fn closed_door_stays_blocked() {
        let path = find_path_with_open(&grid(), [1.5, 1.5], [8.5, 5.5], &[]).unwrap();
        assert!(path.iter().any(|p| p[1] > 8.0), "closed door must detour to the gap");
        assert!(
            path.iter()
                .all(|p| !(p[0] > 4.5 && p[0] < 6.0 && p[1] < 8.0)),
            "closed door must not cross the wall near the door"
        );
    }

    #[test]
    fn no_path_when_fully_blocked() {
        let mut nav = grid();
        nav.blocked = (0..100).collect();
        assert!(find_path(&nav, [1.5, 1.5], [8.5, 1.5]).is_none());
    }
}
