// Player sub-abilities (bombs, bow, shadow step, light blade) and their costs.
import { Bomb, Projectile } from '../entities/projectiles.js';
import { P } from '../gfx/palette.js';
import { TILE_PROPS, T } from '../world/tiletypes.js';
import { boxBlocked } from './collision.js';
import { FX } from './particles.js';

export const ABILITY_ORDER = ['bombs', 'bow', 'shadow', 'light'];

export const ABILITIES = {
  dodge: { name: 'Schivata', icon: 'dodge', desc: 'Scatto rapido con un attimo di invulnerabilità. Consuma vigore.', passive: true },
  charge: { name: 'Fendente Rotante', icon: 'chargeSword', desc: 'Tieni premuto Attacco dopo un colpo, poi rilascia: un colpo circolare che spezza guardie e massi.', passive: true },
  bombs: { name: 'Bombe', icon: 'bomb', desc: 'Lancia una bomba. Apre muri crepati e ferisce tutto ciò che è vicino.' },
  bow: { name: 'Arco', icon: 'bow', desc: 'Scocca una freccia. Colpisce interruttori a occhio lontani.' },
  shadow: { name: "Passo d'Ombra", icon: 'shadowStep', desc: 'Un breve teletrasporto nella direzione scelta. Attraversa baratri e lava.' },
  light: { name: 'Lama di Luce', icon: 'lightBlade', desc: 'Un fendente di luce che vola lontano. Risveglia i sigilli luminosi.' },
  lantern: { name: 'Lanterna', icon: 'lantern', desc: 'Illumina i luoghi bui e accende le torce spente.', passive: true },
};

export function abilityCost(id) {
  switch (id) {
    case 'bombs': return { ammo: 'bombs' };
    case 'bow': return { ammo: 'arrows' };
    case 'shadow': return { stamina: 28 };
    case 'light': return { stamina: 24 };
    default: return {};
  }
}

// Called every frame of the player's 'use' state. Returns 'done' when finished.
export function useAbility(pl, id, t) {
  const g = pl.game;
  const pr = pl.prog;
  const ca = Math.cos(pl.aim), sa = Math.sin(pl.aim);
  switch (id) {
    case 'bombs':
      if (t === 4) {
        pr.bombs--;
        g.addEntity(new Bomb(g, pl.x + ca * 8, pl.y + sa * 6, ca * 2.2, sa * 2.2, 3.2));
        g.audio.play('swing');
      }
      return t >= 12 ? 'done' : null;
    case 'bow':
      if (t === 7) {
        pr.arrows--;
        g.addEntity(new Projectile(g, pl.x + ca * 8, pl.y - 2 + sa * 6, pl.aim, {
          team: 'player', kind: 'arrow', speed: 5.2, damage: 2, knock: 2, life: 70, r: 5, z: 6, flags: { arrow: true, breaks: false },
        }));
        g.audio.play('arrow');
      }
      return t >= 14 ? 'done' : null;
    case 'light':
      if (t === 4) {
        pl.stamina -= 24;
        pl.stamDelay = 40;
        g.addEntity(new Projectile(g, pl.x + ca * 10, pl.y - 2 + sa * 8, pl.aim, {
          team: 'player', kind: 'bolt', speed: 4.4, damage: 3, knock: 3, life: 55, r: 7, z: 6, pierce: true, flags: { light: true, magic: true }, light: 36,
        }));
        g.audio.play('lightBlade');
        g.addSlash(pl, pl.aim, { pal: 'light', rOut: 18, span: 2 });
      }
      return t >= 12 ? 'done' : null;
    case 'shadow':
      if (t === 0) {
        if (!shadowStep(pl)) {
          g.audio.play('uiError');
          return 'done';
        }
      }
      return 'done';
    default:
      return 'done';
  }
}

function blinkPathClear(room, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  for (let i = 1; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    const t = room.tileAtPx(x, y);
    if (TILE_PROPS[t].wall || t === T.BARRIER) return false;
    for (const s of room.solids) {
      if (!s.solid || s.dead || !s.blocksBlink) continue;
      const bw = s.bw ?? s.w, bh = s.bh ?? s.h;
      if (Math.abs(s.x - x) < bw / 2 && Math.abs(s.y - y) < bh / 2) return false;
    }
  }
  return true;
}

function shadowStep(pl) {
  const g = pl.game;
  const room = g.room;
  const ax = pl.game.input.axis;
  let dx = ax.x, dy = ax.y;
  if (!dx && !dy) { dx = Math.cos(pl.aim); dy = Math.sin(pl.aim); }
  const l = Math.hypot(dx, dy);
  dx /= l; dy /= l;
  for (let dist = 60; dist >= 20; dist -= 4) {
    const tx = pl.x + dx * dist, ty = pl.y + dy * dist;
    const tp = TILE_PROPS[room.tileAtPx(tx, ty)];
    if (tp.pit || tp.lava || tp.water) continue;
    if (boxBlocked(room, tx, ty, pl.w, pl.h, 'walk', pl)) continue;
    if (!blinkPathClear(room, pl.x, pl.y, tx, ty)) continue;
    FX.poof(g.particles, pl.x, pl.y - 8, 12, [P.purple, P.pink, P.plum]);
    for (let i = 0; i < 6; i++) pl.after.push({ x: pl.x + dx * dist * (i / 6), y: pl.y + dy * dist * (i / 6), img: pl.frame(), life: 6 + i * 2 });
    pl.x = tx;
    pl.y = ty;
    pl.stamina -= 28;
    pl.stamDelay = 45;
    pl.dodgeFrames = 10;
    pl.setState('blink');
    FX.poof(g.particles, pl.x, pl.y - 8, 12, [P.purple, P.pink, P.white]);
    g.audio.play('teleport');
    pl.recordSafe();
    return true;
  }
  return false;
}
