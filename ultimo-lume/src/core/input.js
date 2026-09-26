// Keyboard + gamepad input mapped to abstract actions.
// Each action exposes held / pressed (edge this step) / released.

export const ACTIONS = [
  'up', 'down', 'left', 'right',
  'attack', 'dodge', 'ability', 'interact', 'cycle', 'potion', 'run',
  'pause', 'map', 'inventory', 'confirm', 'cancel',
];

// Actions the player can rebind from the settings menu (primary key only).
export const REBINDABLE = ['attack', 'dodge', 'ability', 'interact', 'cycle', 'potion', 'run', 'map'];

export const ACTION_LABELS = {
  up: 'Su', down: 'Giù', left: 'Sinistra', right: 'Destra',
  attack: 'Attacco', dodge: 'Schivata', ability: 'Abilità', interact: 'Interagisci',
  cycle: 'Cambia abilità', potion: 'Pozione', run: 'Corsa', map: 'Mappa',
  pause: 'Pausa', inventory: 'Inventario',
};

export const DEFAULT_BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'KeyZ'],
  dodge: ['KeyK', 'KeyX', 'Space'],
  ability: ['KeyL', 'KeyC'],
  interact: ['KeyE', 'KeyV'],
  cycle: ['KeyQ', 'Tab'],
  potion: ['KeyR', 'KeyF'],
  run: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
  map: ['KeyM'],
  inventory: ['KeyI'],
};

// Standard gamepad mapping.
const PAD = {
  attack: [0], dodge: [1], ability: [2], interact: [3], cycle: [5, 4],
  potion: [6], run: [7], pause: [9], map: [8], inventory: [],
  up: [12], down: [13], left: [14], right: [15],
  confirm: [0], cancel: [1],
};

export const PAD_LABELS = {
  attack: 'A', dodge: 'B', ability: 'X', interact: 'Y', cycle: 'RB', potion: 'LT',
  run: 'RT', pause: 'START', map: 'SELECT', confirm: 'A', cancel: 'B',
};

const PREVENT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace',
]);

const KEY_NAMES = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Space: 'SPAZIO', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'INVIO', Escape: 'ESC',
  Tab: 'TAB', Backspace: 'CANC', ControlLeft: 'CTRL', ControlRight: 'CTRL', AltLeft: 'ALT',
  AltRight: 'ALT', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'",
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '\\',
};

export function keyLabel(code) {
  if (!code) return '?';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'N' + code.slice(6);
  return code.slice(0, 6).toUpperCase();
}

export class Input {
  constructor(bindings) {
    this.keys = new Set();
    this.pressedCodes = new Set();
    this.bindings = JSON.parse(JSON.stringify(bindings || DEFAULT_BINDINGS));
    this.state = {};
    for (const a of ACTIONS) this.state[a] = { held: false, pressed: false, released: false, heldFrames: 0 };
    this.padHeldPrev = {};
    this.lastDevice = 'keyboard';
    this.anyPressed = false;
    this.captureCb = null;
    this.axis = { x: 0, y: 0 };
    this.enabled = true;
    this.onFirstGesture = null;

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('pointerdown', () => this.gesture());
  }

  gesture() {
    if (this.onFirstGesture) {
      const cb = this.onFirstGesture;
      this.onFirstGesture = null;
      cb();
    }
  }

  onKeyDown(e) {
    this.gesture();
    if (this.captureCb) {
      e.preventDefault();
      const cb = this.captureCb;
      this.captureCb = null;
      cb(e.code);
      return;
    }
    if (PREVENT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(e.code);
    this.pressedCodes.add(e.code);
    this.lastDevice = 'keyboard';
  }

  // Next physical key will be passed to cb instead of being processed.
  captureKey(cb) {
    this.captureCb = cb;
  }

  codesFor(action) {
    if (action === 'confirm') return ['Enter', 'Space', ...(this.bindings.attack || []), ...(this.bindings.interact || [])];
    if (action === 'cancel') return ['Escape', 'Backspace', ...(this.bindings.dodge || [])];
    return this.bindings[action] || [];
  }

  primaryLabel(action) {
    if (this.lastDevice === 'pad') return PAD_LABELS[action] || '?';
    return keyLabel(this.codesFor(action)[0]);
  }

  rebind(action, code) {
    // remove the code from other rebindable actions to avoid conflicts
    for (const a of REBINDABLE) {
      if (a !== action) {
        const i = this.bindings[a].indexOf(code);
        if (i === 0) this.bindings[a][0] = DEFAULT_BINDINGS[a][0] === code ? DEFAULT_BINDINGS[a][1] : DEFAULT_BINDINGS[a][0];
        else if (i > 0) this.bindings[a].splice(i, 1);
      }
    }
    this.bindings[action][0] = code;
  }

  resetBindings() {
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  }

  update() {
    let pad = null;
    if (navigator.getGamepads) {
      for (const p of navigator.getGamepads()) if (p && p.connected) { pad = p; break; }
    }
    const btn = (i) => !!(pad && pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    let lx = 0, ly = 0;
    if (pad) {
      lx = pad.axes[0] || 0;
      ly = pad.axes[1] || 0;
      if (Math.hypot(lx, ly) < 0.35) { lx = 0; ly = 0; }
    }
    this.anyPressed = this.pressedCodes.size > 0;

    for (const action of ACTIONS) {
      const st = this.state[action];
      const codes = this.codesFor(action);
      let held = false, pressed = false;
      for (const c of codes) {
        if (this.keys.has(c)) held = true;
        if (this.pressedCodes.has(c)) pressed = true;
      }
      let padHeld = false;
      if (pad) {
        for (const i of PAD[action] || []) if (btn(i)) padHeld = true;
        if (action === 'left' && lx < -0.5) padHeld = true;
        if (action === 'right' && lx > 0.5) padHeld = true;
        if (action === 'up' && ly < -0.5) padHeld = true;
        if (action === 'down' && ly > 0.5) padHeld = true;
        if (padHeld && !this.padHeldPrev[action]) {
          pressed = true;
          this.lastDevice = 'pad';
          this.anyPressed = true;
        }
      }
      this.padHeldPrev[action] = padHeld;
      held = held || padHeld;
      if (!this.enabled) { held = false; pressed = false; }
      st.released = st.held && !held;
      st.pressed = pressed;
      st.held = held || pressed;
      st.heldFrames = st.held ? st.heldFrames + 1 : 0;
    }
    this.pressedCodes.clear();

    // movement axis, snapped to 8 directions
    let x = (this.state.right.held ? 1 : 0) - (this.state.left.held ? 1 : 0);
    let y = (this.state.down.held ? 1 : 0) - (this.state.up.held ? 1 : 0);
    if (x === 0 && y === 0 && (lx || ly)) {
      const a = Math.round(Math.atan2(ly, lx) / (Math.PI / 4)) * (Math.PI / 4);
      x = Math.round(Math.cos(a));
      y = Math.round(Math.sin(a));
    }
    this.axis.x = x;
    this.axis.y = y;
  }

  held(a) { return this.state[a].held; }
  pressed(a) { return this.state[a].pressed; }
  released(a) { return this.state[a].released; }

  // Pressed or auto-repeating while held (for menus).
  repeat(a) {
    const st = this.state[a];
    if (st.pressed) return true;
    return st.held && st.heldFrames > 18 && st.heldFrames % 5 === 0;
  }

  consume(a) {
    this.state[a].pressed = false;
  }

  clearAll() {
    for (const a of ACTIONS) {
      this.state[a].pressed = false;
    }
  }
}
