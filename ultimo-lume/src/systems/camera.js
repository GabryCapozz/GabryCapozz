// Smooth-follow camera with room clamping, look-ahead and trauma-based shake.
import { W, H } from '../core/constants.js';
import { clamp } from '../core/math.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.trauma = 0;
    this.shakeScale = 1;
    this.ox = 0;
    this.oy = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.focus = null; // optional override target {x,y}
  }

  bounds(room) {
    return { maxX: Math.max(0, room.tw * 16 - W), maxY: Math.max(0, room.th * 16 - H) };
  }

  snap(tx, ty, room) {
    const b = this.bounds(room);
    this.x = clamp(tx - W / 2, 0, b.maxX);
    this.y = clamp(ty - H / 2, 0, b.maxY);
    this.lookX = 0;
    this.lookY = 0;
  }

  follow(tx, ty, room, dirX = 0, dirY = 0) {
    // gentle look-ahead in the movement direction
    this.lookX += (dirX * 22 - this.lookX) * 0.03;
    this.lookY += (dirY * 14 - this.lookY) * 0.03;
    let fx = tx + this.lookX, fy = ty + this.lookY;
    if (this.focus) { fx = this.focus.x; fy = this.focus.y; }
    const b = this.bounds(room);
    const gx = clamp(fx - W / 2, 0, b.maxX);
    const gy = clamp(fy - H / 2, 0, b.maxY);
    const k = this.focus ? 0.06 : 0.14;
    this.x += (gx - this.x) * k;
    this.y += (gy - this.y) * k;
    if (Math.abs(gx - this.x) < 0.05) this.x = gx;
    if (Math.abs(gy - this.y) < 0.05) this.y = gy;
  }

  shake(amount) {
    this.trauma = Math.min(1, Math.max(this.trauma, amount));
  }

  update() {
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma * 4 * this.shakeScale;
      this.ox = Math.round((Math.random() * 2 - 1) * s);
      this.oy = Math.round((Math.random() * 2 - 1) * s);
      this.trauma = Math.max(0, this.trauma - 0.035);
    } else {
      this.ox = 0;
      this.oy = 0;
    }
  }

  get rx() { return Math.round(this.x) + this.ox; }
  get ry() { return Math.round(this.y) + this.oy; }
}
