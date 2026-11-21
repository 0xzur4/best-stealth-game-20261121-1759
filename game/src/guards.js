// Guards and security cameras: patrol routes you can learn, suspicion that
// rises while you are seen and falls when you break away, and the alert
// chase that gives you one more chance before you are caught.
//
// Guard states: patrol -> suspicious (stares at you) -> alert (chases) ->
// search (looks where you were last seen) -> patrol. A camera never moves:
// it sweeps, and at full suspicion it calls the nearest guard to investigate.

import { CAMERA, GUARD } from './config.js';
import { canSee } from './vision.js';
import { moveCircleWithCollision } from './player.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERT = 'alert';
export const GUARD_SEARCH = 'search';

export function createGuard(def, index) {
  return {
    id: index,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    angle: 0,
    waypoints: def.waypoints,
    waypointIndex: def.waypoints.length > 1 ? 1 : 0,
    /** Patrols ping-pong: forward to the last waypoint, then back. */
    waypointDir: 1,
    pause: def.pause,
    pauseTimer: 0,
    state: GUARD_PATROL,
    suspicion: 0,
    stareTimer: 0,
    searchTimer: 0,
    lastSeen: null,
    heard: null,
  };
}

export function createCamera(def, index) {
  return {
    id: index,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    angle: def.baseAngle,
    sweepTime: 0,
    suspicion: 0,
    lastSeen: null,
  };
}

function turnToward(guard, targetAngle, dt, rate) {
  let d = targetAngle - guard.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const maxTurn = rate * dt;
  guard.angle += Math.max(-maxTurn, Math.min(maxTurn, d));
}

/** Move a guard toward a point, sliding along walls like the player does. */
function guardMove(guard, tx, ty, speed, dt, solids) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const next = moveCircleWithCollision(guard.x, guard.y, GUARD.radius, (dx / dist) * speed * dt, (dy / dist) * speed * dt, solids);
  guard.x = next.x;
  guard.y = next.y;
  guard.angle = Math.atan2(dy, dx);
  return dist < 6;
}

/**
 * One guard step. `seen` says the player is in this guard's cone right now.
 * Returns 'caught' when the guard reaches the player while alert.
 */
export function updateGuard(guard, dt, seen, player, solids, shadowed) {
  const gain = seen
    ? (playerNear(guard, player) ? GUARD.gainNear : GUARD.gainFar)
      * (shadowed ? GUARD.gainShadow : 1)
      * (player.crouching ? GUARD.gainCrouch : 1)
    : -GUARD.decay;
  guard.suspicion = Math.max(0, Math.min(100, guard.suspicion + gain * dt));
  if (seen) guard.lastSeen = { x: player.x, y: player.y };

  if (guard.state === GUARD_PATROL) {
    if (guard.suspicion >= 100) {
      guard.state = GUARD_ALERT;
    } else if (guard.suspicion >= GUARD.suspiciousAt) {
      guard.state = GUARD_SUSPICIOUS;
      guard.stareTimer = GUARD.stareSeconds;
    } else if (guard.heard) {
      guard.state = GUARD_SUSPICIOUS;
      guard.stareTimer = GUARD.stareSeconds;
      turnToward(guard, Math.atan2(guard.heard.y - guard.y, guard.heard.x - guard.x), dt, 6);
    } else if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
    } else if (guard.waypoints.length > 1) {
      const target = guard.waypoints[guard.waypointIndex];
      if (guardMove(guard, target.x, target.y, GUARD.patrolSpeed, dt, solids)) {
        const last = guard.waypoints.length - 1;
        if (guard.waypointDir > 0 && guard.waypointIndex >= last) {
          guard.waypointDir = -1;
          guard.waypointIndex = last - 1;
        } else if (guard.waypointDir < 0 && guard.waypointIndex <= 0) {
          guard.waypointDir = 1;
          guard.waypointIndex = 1;
        } else {
          guard.waypointIndex += guard.waypointDir;
        }
        guard.pauseTimer = guard.pause;
      }
    }
  } else if (guard.state === GUARD_SUSPICIOUS) {
    if (guard.suspicion >= 100) {
      guard.state = GUARD_ALERT;
    } else if (seen) {
      turnToward(guard, Math.atan2(player.y - guard.y, player.x - guard.x), dt, 7);
      guard.stareTimer = GUARD.stareSeconds;
    } else {
      guard.stareTimer -= dt;
      if (guard.stareTimer <= 0) {
        guard.state = GUARD_SEARCH;
        guard.searchTimer = GUARD.searchSeconds;
        if (!guard.lastSeen) guard.state = GUARD_PATROL;
      }
    }
  } else if (guard.state === GUARD_ALERT) {
    if (seen || guard.lastSeen) {
      const target = seen ? player : guard.lastSeen;
      guardMove(guard, target.x, target.y, GUARD.chaseSpeed, dt, solids);
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.radius + 15) return 'caught';
      if (!seen && guard.lastSeen && Math.hypot(guard.lastSeen.x - guard.x, guard.lastSeen.y - guard.y) < 10) {
        guard.state = GUARD_SEARCH;
        guard.searchTimer = GUARD.searchSeconds;
      }
    } else {
      guard.state = GUARD_SEARCH;
      guard.searchTimer = GUARD.searchSeconds;
    }
  } else if (guard.state === GUARD_SEARCH) {
    if (guard.suspicion >= 100) {
      guard.state = GUARD_ALERT;
    } else if (seen) {
      guard.state = GUARD_SUSPICIOUS;
      guard.stareTimer = GUARD.stareSeconds;
    } else {
      guard.searchTimer -= dt;
      guard.angle += dt * 1.4;
      if (guard.searchTimer <= 0) {
        guard.state = GUARD_PATROL;
        guard.lastSeen = null;
        guard.suspicion = Math.min(guard.suspicion, GUARD.suspiciousAt - 1);
      }
    }
  }
  guard.heard = null;
  return null;
}

function playerNear(guard, player) {
  return Math.hypot(player.x - guard.x, player.y - guard.y) < 130;
}

/** A footstep noise: guards close enough turn toward it to listen. */
export function guardHearsNoise(guard, x, y, noiseRadius) {
  const dist = Math.hypot(x - guard.x, y - guard.y);
  if (dist < noiseRadius + 30) {
    guard.heard = { x, y };
    guard.suspicion = Math.min(100, guard.suspicion + 6);
  }
}

/** One camera step: sweep back and forth, watch its cone, call for help at 100. */
export function updateCamera(camera, dt, seen, player, guards, shadowed) {
  camera.sweepTime += dt;
  camera.angle = camera.baseAngle + Math.sin(camera.sweepTime * CAMERA.sweepSpeed) * camera.sweep;
  const gain = seen
    ? (Math.hypot(player.x - camera.x, player.y - camera.y) < 120 ? CAMERA.gainNear : CAMERA.gainFar)
      * (shadowed ? 0.45 : 1)
      * (player.crouching ? 0.55 : 1)
    : -CAMERA.decay;
  camera.suspicion = Math.max(0, Math.min(100, camera.suspicion + gain * dt));
  if (seen) camera.lastSeen = { x: player.x, y: player.y };
  if (camera.suspicion >= 100 && camera.lastSeen) {
    let nearest = null;
    let nearestDist = Infinity;
    for (let i = 0; i < guards.length; i += 1) {
      const d = Math.hypot(guards[i].x - camera.lastSeen.x, guards[i].y - camera.lastSeen.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = guards[i];
      }
    }
    if (nearest && nearest.state !== GUARD_ALERT) {
      nearest.state = GUARD_ALERT;
      nearest.lastSeen = { x: camera.lastSeen.x, y: camera.lastSeen.y };
      nearest.suspicion = 100;
    }
    camera.suspicion = 60;
  }
}

/** The highest suspicion across every guard and camera: the HUD meter. */
export function highestSuspicion(guards, cameras) {
  let top = 0;
  for (let i = 0; i < guards.length; i += 1) top = Math.max(top, guards[i].suspicion);
  for (let i = 0; i < cameras.length; i += 1) top = Math.max(top, cameras[i].suspicion);
  return top;
}

/** True when any guard can see the player right now (for the shot autopilot). */
export function anyGuardSees(guards, player, solids) {
  for (let i = 0; i < guards.length; i += 1) {
    const g = guards[i];
    if (canSee(g, 235, 0.61, player.x, player.y, solids)) return true;
  }
  return false;
}
