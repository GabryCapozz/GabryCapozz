// Canvas setup with pixel-perfect integer scaling (device-pixel aware).
import { W, H } from './constants.js';

export class Screen {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.integer = true;
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('fullscreenchange', () => this.resize());
    this.resize();
  }

  setIntegerScaling(on) {
    this.integer = on;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth * dpr;
    const vh = window.innerHeight * dpr;
    let s = Math.min(vw / W, vh / H);
    if (this.integer && s >= 1) s = Math.floor(s);
    this.scale = s;
    this.canvas.style.width = (W * s) / dpr + 'px';
    this.canvas.style.height = (H * s) / dpr + 'px';
  }

  toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    } catch {
      /* fullscreen not allowed in this context */
    }
  }
}

// Fixed-timestep main loop. Rendering only happens after at least one update.
export function startLoop(step, update, render) {
  let acc = 0;
  let last = performance.now();
  let errors = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    try {
      tick(now);
    } catch (e) {
      // never let a single bad frame freeze the game
      if (errors++ < 20) console.error(e);
      acc = 0;
    }
  }
  function tick(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    let steps = 0;
    // small tolerance keeps exactly one update per frame on 60Hz displays
    while (acc >= step * 0.9 && steps < 4) {
      update();
      acc -= step;
      steps++;
    }
    if (steps >= 4) acc = 0;
    if (steps > 0) render();
  }
  requestAnimationFrame(frame);
}
