// The world: one level's live state, advanced in fixed steps. It owns the
// player, the guards, the cameras, the intel, the exit and the score, and
// reports events (pickup, caught, level clear, game over) to the loop.

import { CAMERA, GUARD, TOKENS_PER_LEVEL } from './config.js';
import { LEVELS } from './levels.js';
import { createPlayer, inShadow, updatePlayer } from './player.js';
import {
  createCamera,
  createGuard,
  guardHearsNoise,
  highestSuspicion,
  updateCamera,
  updateGuard,
} from './guards.js';
import { canSee } from './vision.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_LEVEL_CLEAR = 4;
export const EVENT_GAME_OVER = 8;
export const EVENT_ALARM = 16;
export const EVENT_WARY = 32;

export function createWorld(random) {
  const world = {
    random,
    levelIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    solids: [],
    intelTaken: [],
    intelTotal: 0,
    tokens: TOKENS_PER_LEVEL,
    score: 0,
    time: 0,
    levelTime: 0,
    /** True when the player was ever fully spotted on this level. */
    spotted: false,
    suspicion: 0,
    exitOpen: false,
    state: null,

    loadLevel(index) {
      const def = LEVELS[index];
      this.levelIndex = index;
      this.level = def;
      this.solids = [...def.walls, ...def.crates];
      this.player = createPlayer(def.playerStart);
      this.guards = def.guards.map((g, i) => createGuard(g, i));
      this.cameras = def.cameras.map((c, i) => createCamera(c, i));
      this.intelTaken = def.intel.map(() => false);
      this.intelTotal = def.intel.length;
      this.tokens = TOKENS_PER_LEVEL;
      this.levelTime = 0;
      this.spotted = false;
      this.suspicion = 0;
      this.exitOpen = false;
      this.state = null;
    },

    reset() {
      this.score = 0;
      this.time = 0;
      this.loadLevel(0);
    },

    /** Put the courier back at the start after being caught, guards reset. */
    respawn() {
      const def = this.level;
      this.player = createPlayer(def.playerStart);
      this.guards = def.guards.map((g, i) => createGuard(g, i));
      this.cameras = def.cameras.map((c, i) => createCamera(c, i));
      this.suspicion = 0;
    },

    /**
     * Advance one fixed step. `move` is the keyboard vector, `click` a fresh
     * click target. Returns an event bitmask for sounds and screens.
     */
    step(dt, move, click, audio) {
      let events = EVENT_NONE;
      const player = this.player;
      const shadowed = inShadow(player, this.level.shadows);
      this.time += dt;
      this.levelTime += dt;

      updatePlayer(player, dt, move, click, this.solids, (radius) => {
        if (audio) audio.footstep(Math.min(1, radius / 300));
        for (let i = 0; i < this.guards.length; i += 1) {
          guardHearsNoise(this.guards[i], player.x, player.y, radius);
        }
      });

      let alarmNow = false;
      for (let i = 0; i < this.guards.length; i += 1) {
        const guard = this.guards[i];
        const seen = canSee(guard, GUARD.viewRange, GUARD.viewHalfAngle, player.x, player.y, this.solids);
        const wasAlert = guard.suspicion >= 100;
        const result = updateGuard(guard, dt, seen, player, this.solids, shadowed);
        if (guard.suspicion >= 100 && !wasAlert) {
          alarmNow = true;
          this.spotted = true;
        }
        if (result === 'caught') {
          events |= EVENT_CAUGHT;
          this.tokens -= 1;
          if (this.tokens <= 0) events |= EVENT_GAME_OVER;
          else this.respawn();
          this.suspicion = highestSuspicion(this.guards, this.cameras);
          return events;
        }
      }
      for (let i = 0; i < this.cameras.length; i += 1) {
        const camera = this.cameras[i];
        const seen = canSee(camera, CAMERA.viewRange, CAMERA.viewHalfAngle, player.x, player.y, this.solids);
        const wasHigh = camera.suspicion >= 100;
        updateCamera(camera, dt, seen, player, this.guards, shadowed);
        if (camera.suspicion >= 100 && !wasHigh) {
          alarmNow = true;
          this.spotted = true;
        }
      }
      if (alarmNow) events |= EVENT_ALARM;
      else if (this.suspicion < 35 && highestSuspicion(this.guards, this.cameras) >= 35) events |= EVENT_WARY;
      this.suspicion = highestSuspicion(this.guards, this.cameras);

      for (let i = 0; i < this.level.intel.length; i += 1) {
        if (this.intelTaken[i]) continue;
        const spot = this.level.intel[i];
        if (Math.hypot(player.x - spot.x, player.y - spot.y) < 30) {
          this.intelTaken[i] = true;
          this.score += 250;
          events |= EVENT_PICKUP;
        }
      }
      const taken = this.intelTaken.filter(Boolean).length;
      if (taken === this.intelTotal) this.exitOpen = true;

      if (this.exitOpen) {
        const e = this.level.exit;
        if (player.x > e.x - 6 && player.x < e.x + e.w + 6 && player.y > e.y - 6 && player.y < e.y + e.h + 6) {
          this.score += 500 + (this.spotted ? 0 : 400);
          this.score += Math.max(0, 300 - Math.floor(this.levelTime) * 2);
          events |= EVENT_LEVEL_CLEAR;
        }
      }
      return events;
    },
  };
  world.reset();
  return world;
}

/** A plain snapshot for the renderer, the HUD and the shot autopilot. */
export function worldSnapshot(world) {
  return {
    level: world.level,
    levelIndex: world.levelIndex,
    player: world.player,
    guards: world.guards,
    cameras: world.cameras,
    solids: world.solids,
    intelTaken: world.intelTaken,
    tokens: world.tokens,
    score: world.score,
    time: world.time,
    levelTime: world.levelTime,
    suspicion: world.suspicion,
    exitOpen: world.exitOpen,
  };
}
