// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between screens: title, play, paused, level clear, game over and won.
//
// ?seed=N fixes the patrol jitter. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_GAME_OVER,
  EVENT_LEVEL_CLEAR,
  EVENT_PICKUP,
  EVENT_WARY,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer,
  SCREEN_LEVEL_CLEAR,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WON,
} from './render.js';
import { stageShot } from './shots.js';
import { LEVELS } from './levels.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

/** Lines for the centred screens, built from the live world state. */
function screenMessage(screen) {
  if (screen === SCREEN_LEVEL_CLEAR) {
    const last = world.levelIndex >= LEVELS.length - 1;
    return {
      lines: last
        ? ['All floors clear', `Final score ${world.score}`, 'The courier vanishes into the night']
        : [`${world.level.name} — clear`, `Score ${world.score}`, 'Press Enter for the next floor'],
    };
  }
  if (screen === SCREEN_OVER) {
    return { lines: ['Caught in the light', `Score ${world.score}`, 'Press Enter to try the floor again'] };
  }
  if (screen === SCREEN_WON) {
    return { lines: ['All floors clear — unseen', `Final score ${world.score}`, 'Press Enter to play again'] };
  }
  return { lines: [] };
}

function runShot(name) {
  const scene = stageShot(name, world);
  window.__shadowCourier = { world, getScreen: () => scene.screen };
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, readBest(), { lines: scene.lines });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Headless playtests read the live state through this handle.
  window.__shadowCourier = { world, getScreen: () => screen };

  // Screen readers (and anyone watching the page's text) hear the changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startAmbient();
    announce(`Playing. ${world.level.name}.`);
  }

  function nextLevel() {
    world.loadLevel(world.levelIndex + 1);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${world.level.name}.`);
  }

  function finishLevel() {
    audio.levelClear();
    if (world.levelIndex >= LEVELS.length - 1) {
      screen = SCREEN_WON;
      audio.gameWon();
      if (world.score > best) {
        best = world.score;
        saveBest(best);
      }
      announce(`All floors clear. Final score ${world.score}.`);
    } else {
      screen = SCREEN_LEVEL_CLEAR;
      announce(`${world.level.name} clear. Score ${world.score}.`);
    }
  }

  function endGame() {
    audio.gameOver();
    screen = SCREEN_OVER;
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    announce(`Caught. Game over. Score ${world.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_LEVEL_CLEAR) nextLevel();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_OVER || screen === SCREEN_WON)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, null, null);
      return;
    }
    const player = world.player;
    player.running = input.isRunning();
    player.crouching = input.isCrouching();
    const events = world.step(STEP, input.direction(), input.takeClick(), audio);
    if (events & EVENT_PICKUP) {
      audio.pickup();
      announce('Ledger photographed.');
    }
    if (events & EVENT_WARY) {
      audio.wary();
      announce('A guard is suspicious.');
    }
    if (events & EVENT_ALARM) {
      audio.alarm();
      announce('Alarm! A guard is chasing you.');
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      announce(world.tokens > 0 ? `Caught! ${world.tokens} chances left.` : 'Caught!');
    }
    if (events & EVENT_LEVEL_CLEAR) finishLevel();
    else if (events & EVENT_GAME_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, screenMessage(screen));
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Shadow Courier. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
