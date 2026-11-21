// Shadow Courier: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  runSpeed: 265,
  crouchSpeed: 95,
  /** Noise radius in pixels: walk / run / crouch footsteps. */
  noiseWalk: 46,
  noiseRun: 120,
  noiseCrouch: 20,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  chaseSpeed: 175,
  searchSpeed: 110,
  /** Vision cone: how far a guard sees, and its half-angle. */
  viewRange: 235,
  viewHalfAngle: 0.61,
  /** Suspicion 0..100: gain per second while the player is seen. */
  gainNear: 95,
  gainFar: 42,
  gainShadow: 0.45,
  gainCrouch: 0.55,
  decay: 26,
  /** Above this the guard grows suspicious and stares; at 100 it raises the alarm. */
  suspiciousAt: 35,
  /** Seconds a guard stares at a noise before giving up and patrolling on. */
  stareSeconds: 1.1,
  searchSeconds: 3.2,
};

export const CAMERA = {
  viewRange: 215,
  viewHalfAngle: 0.5,
  gainNear: 80,
  gainFar: 36,
  decay: 30,
  /** Degrees per second the camera sweeps. */
  sweepSpeed: 0.55,
};

export const TOKENS_PER_LEVEL = 3;

export const PALETTE = {
  backdrop: '#0b0e16',
  floor: '#171c28',
  floorAlt: '#1a2030',
  wall: '#333d52',
  wallTop: '#4a5878',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  shadowPool: '#0a0d18',
  player: '#3fd2c0',
  playerDark: '#1d7f73',
  guard: '#e5534b',
  guardCalm: '#d8a24a',
  intel: '#f2c94c',
  exit: '#43d17c',
  exitLocked: '#5a6b62',
  coneCalm: 'rgba(242, 201, 76, 0.28)',
  coneWary: 'rgba(240, 140, 60, 0.36)',
  coneAlert: 'rgba(229, 83, 75, 0.42)',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: '#202634',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'shadow-courier.best';
