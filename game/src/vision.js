// Line of sight and vision cones: what a guard or a camera can actually
// see, given the walls and crates between them and the player. Shadow pools
// never block sight — they only slow how fast suspicion grows.

/** True when the point lies inside any solid rectangle. */
export function pointBlocked(x, y, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

/** True when the straight segment from (x0, y0) to (x1, y1) crosses no solid. */
export function hasLineOfSight(x0, y0, x1, y1, solids) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointBlocked(x0 + dx * t, y0 + dy * t, solids)) return false;
  }
  return true;
}

/** Smallest absolute angle between two headings, 0..PI. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when the player stands inside the watcher's cone and sight is clear. */
export function canSee(watcher, range, halfAngle, px, py, solids) {
  const dx = px - watcher.x;
  const dy = py - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 4 && angleDifference(Math.atan2(dy, dx), watcher.angle) > halfAngle) return false;
  return hasLineOfSight(watcher.x, watcher.y, px, py, solids);
}

/**
 * The visible cone polygon for a watcher: cast rays across the cone and stop
 * each one at the first solid, so the cone hugs walls and crates instead of
 * shining through them. Returns the polygon points, watcher first.
 */
export function conePolygon(watcher, range, halfAngle, solids) {
  const rays = 26;
  const points = [{ x: watcher.x, y: watcher.y }];
  for (let i = 0; i <= rays; i += 1) {
    const a = watcher.angle - halfAngle + (2 * halfAngle * i) / rays;
    const stepX = Math.cos(a);
    const stepY = Math.sin(a);
    let hit = range;
    for (let d = 8; d <= range; d += 8) {
      if (pointBlocked(watcher.x + stepX * d, watcher.y + stepY * d, solids)) {
        hit = d;
        break;
      }
    }
    points.push({ x: watcher.x + stepX * hit, y: watcher.y + stepY * hit });
  }
  return points;
}
