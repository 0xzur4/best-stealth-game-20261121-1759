// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh level for a fixed number of steps, steered by a
// patient autopilot: it plans a route around the walls with a grid search,
// walks it toward the nearest ledger (then the exit), waits in the dark
// whenever a guard's cone covers its next step, and slips away when a cone
// finds it — so the frame is what a careful game really looks like and the
// same seed always gives the same frame.

import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_LEVEL_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_WON } from './render.js';
import { canSee, hasLineOfSight } from './vision.js';
import { GUARD } from './config.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 34;
const END_LIMIT_SECONDS = 300;
const CELL = 40;

/** The next objective: the nearest ledger left, else the exit door. */
function nextTarget(world) {
  const player = world.player;
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < world.level.intel.length; i += 1) {
    if (world.intelTaken[i]) continue;
    const spot = world.level.intel[i];
    const d = Math.hypot(spot.x - player.x, spot.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = spot;
    }
  }
  if (best) return best;
  const e = world.level.exit;
  return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
}

/** True when the cell centre is too close to a wall or crate to stand in. */
function cellBlocked(world, col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  for (let i = 0; i < world.solids.length; i += 1) {
    const s = world.solids[i];
    if (x > s.x - 18 && x < s.x + s.w + 18 && y > s.y - 18 && y < s.y + s.h + 18) return true;
  }
  return false;
}

/** A grid route from the courier to the target, smoothed along clear lines. */
function findPath(world, from, to) {
  const cols = Math.ceil(1280 / CELL);
  const rows = Math.ceil(720 / CELL);
  const startCol = Math.max(0, Math.min(cols - 1, Math.floor(from.x / CELL)));
  const startRow = Math.max(0, Math.min(rows - 1, Math.floor(from.y / CELL)));
  const goalCol = Math.max(0, Math.min(cols - 1, Math.floor(to.x / CELL)));
  const goalRow = Math.max(0, Math.min(rows - 1, Math.floor(to.y / CELL)));
  const key = (c, r) => r * cols + c;
  const prev = new Map();
  const queue = [[startCol, startRow]];
  prev.set(key(startCol, startRow), null);
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === goalCol && r === goalRow) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (prev.has(key(nc, nr)) || cellBlocked(world, nc, nr)) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(goalCol, goalRow))) return null;
  const cells = [];
  let cur = [goalCol, goalRow];
  while (cur) {
    cells.unshift(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  const points = cells.map(([c, r]) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }));
  points[points.length - 1] = { x: to.x, y: to.y };
  // Smooth: keep only the farthest point still reachable in a straight line.
  const smooth = [{ x: from.x, y: from.y }];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !hasLineOfSight(points[i].x, points[i].y, points[j].x, points[j].y, world.solids)) j -= 1;
    smooth.push(points[j]);
    i = j;
  }
  return smooth.slice(1);
}

/** The watcher whose cone covers (x, y) right now, or null. */
function threateningWatcher(world, x, y) {
  const solids = world.solids;
  for (let i = 0; i < world.guards.length; i += 1) {
    const g = world.guards[i];
    if (canSee(g, GUARD.viewRange, GUARD.viewHalfAngle, x, y, solids)) return g;
  }
  for (let i = 0; i < world.cameras.length; i += 1) {
    const c = world.cameras[i];
    if (canSee(c, 215, 0.5, x, y, solids)) return c;
  }
  return null;
}

/** True when stepping to (x, y) would put the courier inside any live cone. */
function inDanger(world, x, y) {
  return threateningWatcher(world, x, y) !== null;
}

function createAutopilot(world) {
  let path = null;
  let pathTarget = null;
  let replanIn = 0;
  return {
    move() {
      const player = world.player;
      const threat = threateningWatcher(world, player.x, player.y);
      if (threat) {
        // Slip straight away from the watcher, then replan the route.
        const dx = player.x - threat.x;
        const dy = player.y - threat.y;
        const dist = Math.hypot(dx, dy) || 1;
        path = null;
        return { x: dx / dist, y: dy / dist };
      }
      const target = nextTarget(world);
      replanIn -= 1;
      if (
        !path || path.length === 0 || replanIn <= 0
        || !pathTarget || Math.hypot(pathTarget.x - target.x, pathTarget.y - target.y) > 40
      ) {
        path = findPath(world, player, target) || [target];
        pathTarget = target;
        replanIn = 120;
      }
      const node = path[0];
      const dx = node.x - player.x;
      const dy = node.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) {
        path.shift();
        return { x: 0, y: 0 };
      }
      const step = 22;
      const nx = player.x + (dx / dist) * step;
      const ny = player.y + (dy / dist) * step;
      if (inDanger(world, nx, ny)) return { x: 0, y: 0 };
      return { x: dx / dist, y: dy / dist };
    },
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the message lines. start shows the level itself mid-patrol (the cover);
 * play shows mid-game stealth; end shows the floor cleared.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0 }, null, null);
    }
    return { screen: SCREEN_PLAY, lines: [] };
  }
  const pilot = createAutopilot(world);
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let won = false;
  let caughtOut = false;
  // The play scene stops a few seconds after the first ledger: mid-game,
  // the courier en route to the next one, cones all around — never the win.
  let firstPickupAt = null;
  for (let i = 0; i < limit / STEP; i += 1) {
    const events = world.step(STEP, pilot.move(), null, null);
    if (name === 'play') {
      const taken = world.intelTaken.filter(Boolean).length;
      if (taken >= 1 && firstPickupAt === null) firstPickupAt = world.time;
      if (firstPickupAt !== null && world.time - firstPickupAt > 6) break;
      if (events & EVENT_LEVEL_CLEAR) break;
      if (events & EVENT_CAUGHT && world.tokens <= 0) break;
      continue;
    }
    if (events & EVENT_LEVEL_CLEAR) {
      won = true;
      break;
    }
    if (events & EVENT_CAUGHT && world.tokens <= 0) {
      caughtOut = true;
      break;
    }
  }
  if (name === 'end' && !won && !caughtOut) {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP && !won; i += 1) {
      const events = world.step(STEP, pilot.move(), null, null);
      if (events & EVENT_LEVEL_CLEAR) won = true;
      if (events & EVENT_CAUGHT && world.tokens <= 0) {
        caughtOut = true;
        break;
      }
    }
  }
  if (won) {
    return {
      screen: SCREEN_WON,
      lines: ['Floor clear — unseen', `Score ${world.score}`, 'The courier slips out into the night'],
    };
  }
  if (caughtOut) {
    return {
      screen: SCREEN_OVER,
      lines: ['Caught in the light', 'The archive keeps its secrets — for now', 'Press Enter to try again'],
    };
  }
  return { screen: SCREEN_PLAY, lines: [] };
}
