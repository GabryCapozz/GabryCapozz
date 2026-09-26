// Ultimo Lume — bootstrap: screen, input, audio, sprites, scenes and main loop.
import { STEP, DEBUG, W, H } from './core/constants.js';
import { Screen, startLoop } from './core/screen.js';
import { Input } from './core/input.js';
import { GameAudio } from './audio/index.js';
import { buildSprites } from './gfx/sprites/index.js';
import { font } from './gfx/font.js';
import { P } from './gfx/palette.js';
import { loadSettings } from './systems/save.js';
import { TitleScene } from './scenes/titleScene.js';
import { GameScene } from './scenes/gameScene.js';
import { EndingScene } from './scenes/endingScene.js';

class App {
  constructor(canvas) {
    this.screen = new Screen(canvas);
    this.settings = loadSettings();
    this.input = new Input(this.settings.bindings);
    this.audio = new GameAudio();
    this.input.onFirstGesture = () => this.audio.init();
    // resume audio on any later gesture too (browsers may suspend it)
    window.addEventListener('keydown', () => this.audio.init());
    window.addEventListener('pointerdown', () => this.audio.init());
    this.scene = null;
    this.applySettings();
  }

  boot() {
    const ctx = this.screen.ctx;
    ctx.fillStyle = P.void;
    ctx.fillRect(0, 0, W, H);
    font.draw(ctx, 'Caricamento...', W / 2, H / 2, P.sand, { align: 'center' });
    // let the loading text paint before generating every sprite
    requestAnimationFrame(() => setTimeout(() => {
      buildSprites();
      this.scene = new TitleScene(this);
      startLoop(STEP, () => this.update(), () => this.render());
    }, 0));
  }

  applySettings() {
    const s = this.settings;
    this.screen.setIntegerScaling(s.integerScale);
    this.audio.setVolumes(s.music / 10, s.sfx / 10);
    this.input.bindings = s.bindings;
    if (this.scene && this.scene.applyShake) this.scene.applyShake();
  }

  startGame(slot, progress, isNew) {
    this.scene = new GameScene(this, slot, progress, { newGame: isNew });
  }

  toTitle() {
    this.scene = new TitleScene(this);
  }

  toEnding(progress, choice) {
    this.scene = new EndingScene(this, progress, choice);
  }

  setScene(scene) {
    this.scene = scene;
  }

  update() {
    this.input.update();
    if (this.scene) this.scene.update();
  }

  render() {
    if (this.scene) this.scene.render(this.screen.ctx);
  }
}

const app = new App(document.getElementById('game'));
app.boot();
if (DEBUG) window.__app = app;
