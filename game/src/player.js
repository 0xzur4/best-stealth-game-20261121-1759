// The courier: movement, wall collision, crouch and run, click-to-move,
// and the noise each footstep makes.

import { FIELD, PLAYER } from './config.js';
import { pointBlocked } from './vision.js';

/** Push a circle out of a solid rectangle; returns true when it overlapped. */
export function collideCircleRect(px, py, r, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < r * r;
}

/** Resolve a circle against every solid, axis by axis, so it slides along walls. */
export function moveCircleWithCollision(x, y, r, dx, dy, solids) {
  let nx = x + dx;
  for (let i = 0; i < solids.length; i += 1) {
    if (collideCircleRect(nx, y, r, solids[i])) { nx = x; break; }
  }
  let ny = y + dy;
  for (let i = 0; i < solids.length; i += 1) {
    if (collideCircleRect(nx, ny, r, solids[i])) { ny = y; break; }
  }
  nx = Math.max(r + 2, Math.min(FIELD.width - r - 2, nx));
  ny = Math.max(r + 2, Math.min(FIELD.height - r - 2, ny));
  return { x: nx, y: ny };
}

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    angle: -Math.PI / 2,
    crouching: false,
    running: false,
    moving: false,
    /** Where a mouse click told the courier to walk; null when idle. */
    clickTarget: null,
    /** Seconds until the next footstep sound while moving. */
    stepTimer: 0,
  };
}

/**
 * Advance the courier one step. `move` is {x, y} from keys (-1..1 each) and
 * `click` is a fresh click target or null; returns the noise radius of any
 * footstep taken this step, or 0.
 */
export function updatePlayer(player, dt, move, click, solids, onFootstep) {
  if (click) player.clickTarget = click;
  let mx = move.x;
  let my = move.y;
  if (mx === 0 && my === 0 && player.clickTarget) {
    const dx = player.clickTarget.x - player.x;
    const dy = player.clickTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      player.clickTarget = null;
    } else {
      mx = dx / dist;
      my = dy / dist;
    }
  } else if (mx !== 0 || my !== 0) {
    player.clickTarget = null;
  }
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  player.moving = len > 0.01;
  const speed = player.crouching
    ? PLAYER.crouchSpeed
    : player.running
      ? PLAYER.runSpeed
      : PLAYER.walkSpeed;
  if (player.moving) {
    const next = moveCircleWithCollision(player.x, player.y, PLAYER.radius, mx * speed * dt, my * speed * dt, solids);
    player.x = next.x;
    player.y = next.y;
    player.angle = Math.atan2(my, mx);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.crouching ? 0.55 : player.running ? 0.3 : 0.42;
      const noise = player.crouching ? PLAYER.noiseCrouch : player.running ? PLAYER.noiseRun : PLAYER.noiseWalk;
      if (onFootstep) onFootstep(noise);
      return noise;
    }
  }
  return 0;
}

/** True when the courier stands inside a shadow pool (hard to spot there). */
export function inShadow(player, shadows) {
  for (let i = 0; i < shadows.length; i += 1) {
    const s = shadows[i];
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    if (dx * dx + dy * dy < s.r * s.r) return true;
  }
  return false;
}
