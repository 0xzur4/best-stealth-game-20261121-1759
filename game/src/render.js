// The renderer: one canvas, painted top-down. Floor tiles and shadow pools
// first, then the exit and intel, then walls and crates, then the vision
// cones, then the guards, cameras and courier, then the HUD and the screens.
// Cones are clipped by walls so the light shows exactly what is safe.

import { FIELD, FONT, PALETTE } from './config.js';
import { conePolygon } from './vision.js';
import { CAMERA, GUARD } from './config.js';
import { GUARD_ALERT, GUARD_SUSPICIOUS } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WON = 'won';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
  }

  function drawCone(watcher, range, halfAngle, solids, suspicion) {
    const poly = conePolygon(watcher, range, halfAngle, solids);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = suspicion >= 100 ? PALETTE.coneAlert : suspicion >= 35 ? PALETTE.coneWary : PALETTE.coneCalm;
    ctx.fill();
    // A bright edge so the cone reads even where it is clipped by a wall.
    ctx.strokeStyle = suspicion >= 100 ? 'rgba(229, 83, 75, 0.55)' : suspicion >= 35 ? 'rgba(240, 140, 60, 0.5)' : 'rgba(242, 201, 76, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuard(guard) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = guard.state === GUARD_ALERT ? PALETTE.guard : guard.state === GUARD_SUSPICIOUS ? PALETTE.guardCalm : '#c8b28a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#10131c';
    ctx.stroke();
    ctx.rotate(guard.angle);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(22, -6);
    ctx.lineTo(22, 6);
    ctx.closePath();
    ctx.fillStyle = '#10131c';
    ctx.fill();
    ctx.restore();
    if (guard.state === GUARD_ALERT) drawMark(guard.x, guard.y - 30, '!', PALETTE.danger);
    else if (guard.state === GUARD_SUSPICIOUS) drawMark(guard.x, guard.y - 30, '?', PALETTE.guardCalm);
    if (guard.suspicion > 1 && guard.suspicion < 100) {
      ctx.fillStyle = '#10131c';
      ctx.fillRect(guard.x - 16, guard.y - 42, 32, 5);
      ctx.fillStyle = guard.suspicion >= 35 ? '#f08c3c' : '#f2c94c';
      ctx.fillRect(guard.x - 15, guard.y - 41, 30 * (guard.suspicion / 100), 3);
    }
  }

  function drawMark(x, y, text, color) {
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawCamera(camera) {
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#2c3448';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = camera.suspicion >= 35 ? PALETTE.danger : '#8b93a3';
    ctx.stroke();
    ctx.rotate(camera.angle);
    ctx.fillStyle = camera.suspicion >= 35 ? PALETTE.danger : '#f2c94c';
    ctx.fillRect(4, -3, 14, 6);
    ctx.restore();
    if (camera.suspicion >= 35) drawMark(camera.x, camera.y - 26, '!', PALETTE.danger);
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(11, 14, 22, 0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#3a4358';
    ctx.stroke();
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(11, 14, 22, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, 44);
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(state.level.name, 16, 23);
    const taken = state.intelTaken.filter(Boolean).length;
    ctx.fillStyle = PALETTE.intel;
    ctx.fillText(`◆ ${taken}/${state.intelTaken.length} ledgers`, 330, 23);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Score ${state.score}`, 520, 23);
    ctx.fillText(`Best ${best}`, 650, 23);
    const mm = Math.floor(state.levelTime / 60);
    const ss = Math.floor(state.levelTime % 60).toString().padStart(2, '0');
    ctx.fillText(`${mm}:${ss}`, 780, 23);
    ctx.fillStyle = state.tokens > 1 ? PALETTE.text : PALETTE.danger;
    ctx.fillText(`♥`.repeat(state.tokens) + `♡`.repeat(3 - state.tokens), 860, 23);
    const label = state.suspicion >= 100 ? 'SPOTTED!' : state.suspicion >= 35 ? 'Suspicious' : 'Unseen';
    ctx.fillStyle = state.suspicion >= 100 ? PALETTE.danger : state.suspicion >= 35 ? '#f08c3c' : PALETTE.exit;
    ctx.fillText(label, 990, 23);
    ctx.fillStyle = '#10131c';
    ctx.fillRect(1090, 15, 150, 14);
    ctx.fillStyle = state.suspicion >= 100 ? PALETTE.danger : state.suspicion >= 35 ? '#f08c3c' : PALETTE.exit;
    ctx.fillRect(1091, 16, 148 * Math.min(1, state.suspicion / 100), 12);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'center';
    ctx.fillText('WASD move · Shift run · C crouch · Click to walk · P pause · M mute', FIELD.width / 2, FIELD.height - 16);
    if (!state.exitOpen) {
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'left';
      ctx.fillText(state.level.hint, 16, FIELD.height - 40);
    } else {
      ctx.fillStyle = PALETTE.exit;
      ctx.textAlign = 'left';
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText('All ledgers photographed — reach the green exit!', 16, FIELD.height - 40);
    }
  }

  function drawScreenTitle(state, best) {
    ctx.fillStyle = 'rgba(11, 14, 22, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(290, 130, 700, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText('SHADOW COURIER', FIELD.width / 2, 205);
    ctx.font = `19px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('A quiet night in the Meridian Archive. Photograph the', FIELD.width / 2, 255);
    ctx.fillText('sealed ledgers, dodge the patrols, and leave unseen.', FIELD.width / 2, 282);
    ctx.font = `17px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('WASD / arrows — move      Shift — run (loud)      C — crouch (quiet)', FIELD.width / 2, 340);
    ctx.fillText('Click — walk there      P — pause      M — mute', FIELD.width / 2, 368);
    ctx.fillStyle = PALETTE.intel;
    ctx.fillText('◆ Gold diamonds are ledgers — photograph them all to open the exit.', FIELD.width / 2, 412);
    ctx.fillStyle = PALETTE.exit;
    ctx.fillText('Green door is the exit. Yellow cones are watching eyes.', FIELD.width / 2, 440);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText('Press Enter or click to begin', FIELD.width / 2, 505);
    if (best > 0) {
      ctx.font = `16px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 542);
    }
  }

  function drawCentred(lines, accent) {
    ctx.fillStyle = 'rgba(11, 14, 22, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(340, 210, 600, 300);
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? `bold 40px ${FONT}` : `18px ${FONT}`;
      ctx.fillStyle = i === 0 ? (accent || PALETTE.text) : PALETTE.text;
      ctx.fillText(line, FIELD.width / 2, 290 + i * 44);
    });
  }

  return {
    draw(state, screen, best, message) {
      fitCanvas();
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      const level = state.level;
      for (let y = 0; y < FIELD.height; y += 64) {
        for (let x = 0; x < FIELD.width; x += 64) {
          ctx.fillStyle = ((x + y) / 64) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
          ctx.fillRect(x, y, 64, 64);
        }
      }
      for (let i = 0; i < level.shadows.length; i += 1) {
        const s = level.shadows[i];
        const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
        grad.addColorStop(0, 'rgba(6, 8, 16, 0.85)');
        grad.addColorStop(1, 'rgba(6, 8, 16, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      const exit = level.exit;
      ctx.save();
      ctx.shadowColor = state.exitOpen ? PALETTE.exit : PALETTE.exitLocked;
      ctx.shadowBlur = state.exitOpen ? 22 : 4;
      ctx.fillStyle = state.exitOpen ? PALETTE.exit : PALETTE.exitLocked;
      ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
      ctx.restore();
      ctx.fillStyle = '#0b0e16';
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.exitOpen ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2);
      for (let i = 0; i < level.intel.length; i += 1) {
        if (state.intelTaken[i]) continue;
        const spot = level.intel[i];
        const pulse = 1 + 0.12 * Math.sin(state.time * 4 + i);
        ctx.save();
        ctx.translate(spot.x, spot.y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = PALETTE.intel;
        ctx.shadowBlur = 14;
        ctx.fillStyle = PALETTE.intel;
        const s = 11 * pulse;
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
      for (let i = 0; i < level.walls.length; i += 1) {
        const w = level.walls[i];
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(w.x, w.y, w.w, 4);
      }
      for (let i = 0; i < level.crates.length; i += 1) {
        const c = level.crates[i];
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = PALETTE.crateTop;
        ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, 6);
        ctx.strokeStyle = '#3d2f1c';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      }
      for (let i = 0; i < state.cameras.length; i += 1) {
        const cam = state.cameras[i];
        drawCone(cam, CAMERA.viewRange, CAMERA.viewHalfAngle, state.solids, cam.suspicion);
      }
      for (let i = 0; i < state.guards.length; i += 1) {
        const g = state.guards[i];
        drawCone(g, GUARD.viewRange, GUARD.viewHalfAngle, state.solids, g.suspicion);
      }
      for (let i = 0; i < state.cameras.length; i += 1) drawCamera(state.cameras[i]);
      for (let i = 0; i < state.guards.length; i += 1) drawGuard(state.guards[i]);
      const p = state.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.player;
      ctx.shadowColor = PALETTE.player;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(20, -5);
      ctx.lineTo(20, 5);
      ctx.closePath();
      ctx.fillStyle = PALETTE.playerDark;
      ctx.fill();
      ctx.restore();
      if (p.crouching) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 19, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(63, 210, 192, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawHud(state, best);
      if (screen === SCREEN_TITLE) drawScreenTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawCentred(['Paused', 'Press P or click to keep sneaking'], PALETTE.text);
      else if (screen === SCREEN_LEVEL_CLEAR) drawCentred(message.lines, PALETTE.exit);
      else if (screen === SCREEN_OVER) drawCentred(message.lines, PALETTE.danger);
      else if (screen === SCREEN_WON) drawCentred(message.lines, PALETTE.exit);
    },
  };
}