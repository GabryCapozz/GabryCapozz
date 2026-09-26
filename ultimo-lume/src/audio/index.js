// Audio facade used by the game: sfx, music and ambience.
import { AudioEngine } from './engine.js';
import { Sfx } from './sfx.js';
import { Music } from './music.js';

export class GameAudio {
  constructor() {
    this.engine = new AudioEngine();
    this.sfx = new Sfx(this.engine);
    this.music = new Music(this.engine);
    this.listener = null; // {x, y} world position used for distance attenuation
  }

  init() {
    const wasReady = this.engine.ready;
    this.engine.init();
    if (!wasReady && this.engine.ready && this.music.wanted) this.music.play(this.music.wanted, 0.5);
  }

  setVolumes(music, sfx) {
    this.engine.setVolumes(music, sfx);
  }

  // Positional-ish: sounds far from the listener get quieter.
  play(name, opts = {}) {
    if (opts.x != null && this.listener) {
      const d = Math.hypot(opts.x - this.listener.x, opts.y - this.listener.y);
      const v = Math.max(0, 1 - Math.max(0, d - 120) / 260);
      if (v <= 0.02) return;
      opts = { ...opts, vol: (opts.vol ?? 1) * v };
    }
    this.sfx.play(name, opts);
  }

  playMusic(name, fade = 1) {
    this.music.play(name, fade);
  }

  stopMusic(fade = 1) {
    this.music.wanted = null;
    if (this.engine.ready) this.music.stop(fade);
  }

  setIntensity(n) {
    this.music.setIntensity(n);
  }

  update() {
    if (this.engine.ready) this.music.update();
  }
}
