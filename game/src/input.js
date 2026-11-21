// Keyboard and mouse: WASD or arrows to move, Shift to run, C to crouch,
// P or Escape to pause, M to mute, Enter or click to confirm. A mouse click
// on the floor also sets a walk target for the courier.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let clickConsumed = false;

  function keyCode(event) {
    // Lowercase everything: 'Enter', 'ArrowUp' and 'Shift' arrive capitalised.
    return event.key.toLowerCase();
  }

  function onKeyDown(event) {
    const k = keyCode(event);
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) event.preventDefault();
    keys.add(k);
    if (k === 'enter' || k === ' ') actions |= ACTION_CONFIRM;
    if (k === 'p' || k === 'escape') actions |= ACTION_PAUSE;
    if (k === 'm') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(keyCode(event));
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    click = { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    clickConsumed = false;
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);

  function held(...names) {
    return names.some((n) => keys.has(n));
  }

  return {
    direction() {
      const x = (held('d', 'arrowright') ? 1 : 0) - (held('a', 'arrowleft') ? 1 : 0);
      const y = (held('s', 'arrowdown') ? 1 : 0) - (held('w', 'arrowup') ? 1 : 0);
      return { x, y };
    },
    isRunning() {
      return keys.has('shift');
    },
    isCrouching() {
      return keys.has('c');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** A fresh click target for the courier, or null. */
    takeClick() {
      if (click && !clickConsumed) {
        clickConsumed = true;
        return click;
      }
      return null;
    },
  };
}
