// Every sound is synthesised with WebAudio: no audio files, no network.
// Footsteps tick, a rising suspicion hums, the alarm stings, pickups chime,
// and winning plays a short arpeggio. Created lazily on first user gesture.

export function createAudio() {
  let context = null;
  let master = null;
  let ambient = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, volume, when, slideTo) {
    if (!ensure() || muted) return;
    const t0 = context.currentTime + (when || 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    /** Call from any key or click so the browser unlocks audio. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** A soft tick; `distance` 0..1 quiets faraway steps. */
    footstep(distance) {
      tone(150 + Math.random() * 40, 0.07, 'triangle', 0.10 * (1 - distance * 0.75));
    },
    /** A guard heard something: one short low note. */
    heard() {
      tone(220, 0.16, 'sine', 0.16, 0, 180);
    },
    /** Suspicion rising: a quiet two-note warning. */
    wary() {
      tone(330, 0.12, 'sine', 0.10);
      tone(415, 0.14, 'sine', 0.10, 0.11);
    },
    /** Full alarm: a sharp three-note sting. */
    alarm() {
      tone(620, 0.14, 'square', 0.10);
      tone(620, 0.14, 'square', 0.10, 0.15);
      tone(880, 0.3, 'square', 0.12, 0.3);
    },
    pickup() {
      tone(880, 0.1, 'sine', 0.14);
      tone(1318, 0.18, 'sine', 0.12, 0.09);
    },
    caught() {
      tone(196, 0.5, 'sawtooth', 0.12, 0, 98);
    },
    levelClear() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.14, i * 0.11));
    },
    gameWon() {
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'sine', 0.14, i * 0.13));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.13, i * 0.18));
    },
    /** A low room tone under the game, started once. */
    startAmbient() {
      if (!ensure() || ambient || muted) return;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.035;
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      lfo.start();
      ambient = { osc, lfo };
    },
  };
}
