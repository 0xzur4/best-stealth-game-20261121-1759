// The three floors of the Meridian Archive. Each level is one top-down
// floor plan: outer walls, inner walls, crate cover that blocks sight,
// shadow pools where a courier is hard to spot, guard patrols, security
// cameras, intel ledgers to photograph, a player start and a roof exit.
//
// Coordinates are logical pixels in the 1280x720 field. Walls and crates are
// axis-aligned rectangles {x, y, w, h}; a shadow pool is {x, y, r}.

function rect(x, y, w, h) {
  return { x, y, w, h };
}

export const LEVELS = [
  {
    name: 'Floor 1 — The Night Archive',
    hint: 'Photograph both ledgers, then slip out the green exit. Stay out of the yellow cones.',
    playerStart: { x: 90, y: 620 },
    exit: { x: 1150, y: 70, w: 64, h: 44 },
    intel: [
      { x: 330, y: 150 },
      { x: 1010, y: 560 },
    ],
    walls: [
      rect(0, 0, 1280, 24), rect(0, 696, 1280, 24),
      rect(0, 0, 24, 720), rect(1256, 0, 24, 720),
      rect(220, 180, 260, 26), rect(220, 180, 26, 220),
      rect(700, 120, 26, 200), rect(700, 294, 240, 26),
      rect(940, 420, 26, 180), rect(560, 470, 240, 26),
      rect(1040, 180, 26, 160),
    ],
    crates: [
      rect(330, 330, 64, 64), rect(420, 330, 64, 64),
      rect(820, 480, 64, 64), rect(900, 160, 64, 64),
      rect(150, 470, 64, 64), rect(1080, 480, 64, 64),
      rect(620, 600, 64, 64),
    ],
    shadows: [
      { x: 380, y: 430, r: 78 },
      { x: 860, y: 260, r: 72 },
      { x: 1120, y: 620, r: 70 },
      { x: 160, y: 250, r: 66 },
    ],
    guards: [
      {
        waypoints: [{ x: 300, y: 110 }, { x: 620, y: 110 }, { x: 620, y: 420 }, { x: 300, y: 420 }],
        pause: 1.4,
      },
      {
        waypoints: [{ x: 980, y: 640 }, { x: 980, y: 380 }, { x: 900, y: 380 }, { x: 900, y: 640 }],
        pause: 1.0,
      },
    ],
    cameras: [],
  },
  {
    name: 'Floor 2 — Gallery of Eyes',
    hint: 'A camera sweeps the gallery. Its cone raises the alarm too — time your crossing.',
    playerStart: { x: 90, y: 90 },
    exit: { x: 1150, y: 620, w: 64, h: 44 },
    intel: [
      { x: 640, y: 120 },
      { x: 220, y: 560 },
      { x: 1130, y: 330 },
    ],
    walls: [
      rect(0, 0, 1280, 24), rect(0, 696, 1280, 24),
      rect(0, 0, 24, 720), rect(1256, 0, 24, 720),
      rect(180, 260, 300, 26), rect(180, 260, 26, 200),
      rect(800, 180, 26, 220), rect(800, 374, 220, 26),
      rect(480, 520, 300, 26), rect(1080, 120, 26, 220),
      rect(560, 120, 26, 140),
    ],
    crates: [
      rect(300, 420, 64, 64), rect(640, 300, 64, 64),
      rect(940, 520, 64, 64), rect(1120, 120, 64, 64),
      rect(120, 360, 64, 64), rect(480, 640, 64, 64),
      rect(760, 90, 64, 64),
    ],
    shadows: [
      { x: 420, y: 160, r: 72 },
      { x: 980, y: 220, r: 70 },
      { x: 330, y: 600, r: 78 },
      { x: 700, y: 470, r: 66 },
      { x: 1150, y: 470, r: 64 },
    ],
    guards: [
      {
        waypoints: [{ x: 260, y: 110 }, { x: 500, y: 110 }, { x: 500, y: 230 }, { x: 260, y: 230 }],
        pause: 1.0,
      },
      {
        waypoints: [{ x: 1100, y: 480 }, { x: 880, y: 480 }, { x: 880, y: 640 }, { x: 1100, y: 640 }],
        pause: 0.8,
      },
      {
        waypoints: [{ x: 520, y: 620 }, { x: 520, y: 580 }, { x: 900, y: 580 }, { x: 900, y: 420 }, { x: 520, y: 420 }],
        pause: 1.2,
      },
    ],
    cameras: [
      { x: 720, y: 360, baseAngle: -Math.PI / 2, sweep: 0.9 },
    ],
  },
  {
    name: 'Floor 3 — The Vault Floor',
    hint: 'Two cameras, four guards, tight patrols. Crouch (C) through the dark and run (Shift) only when clear.',
    playerStart: { x: 90, y: 640 },
    exit: { x: 640, y: 60, w: 64, h: 44 },
    intel: [
      { x: 140, y: 140 },
      { x: 1140, y: 140 },
      { x: 1140, y: 580 },
    ],
    walls: [
      rect(0, 0, 1280, 24), rect(0, 696, 1280, 24),
      rect(0, 0, 24, 720), rect(1256, 0, 24, 720),
      rect(240, 200, 240, 26), rect(800, 200, 240, 26),
      rect(240, 200, 26, 200), rect(1014, 200, 26, 200),
      rect(480, 480, 320, 26), rect(480, 480, 26, 140),
      rect(774, 480, 26, 140),
    ],
    crates: [
      rect(340, 300, 64, 64), rect(880, 300, 64, 64),
      rect(180, 480, 64, 64), rect(1030, 480, 64, 64),
      rect(610, 300, 64, 64), rect(610, 560, 64, 64),
    ],
    shadows: [
      { x: 240, y: 560, r: 72 },
      { x: 1040, y: 560, r: 72 },
      { x: 640, y: 200, r: 76 },
      { x: 120, y: 360, r: 66 },
      { x: 1160, y: 360, r: 66 },
    ],
    guards: [
      {
        waypoints: [{ x: 180, y: 110 }, { x: 520, y: 110 }, { x: 520, y: 330 }],
        pause: 0.7,
      },
      {
        waypoints: [{ x: 1100, y: 110 }, { x: 760, y: 110 }, { x: 760, y: 330 }],
        pause: 0.7,
      },
      {
        waypoints: [{ x: 300, y: 640 }, { x: 980, y: 640 }],
        pause: 0.9,
      },
      {
        waypoints: [{ x: 300, y: 430 }, { x: 980, y: 430 }],
        pause: 0.9,
      },
    ],
    cameras: [
      { x: 640, y: 130, baseAngle: Math.PI / 2, sweep: 0.8 },
      { x: 640, y: 540, baseAngle: -Math.PI / 2, sweep: 0.8 },
    ],
  },
];
