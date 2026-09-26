// Ending: a short sequence of illustrated slides that depends on the final choice,
// then play statistics and credits, then back to the title screen.
import { W, H } from '../core/constants.js';
import { P } from '../gfx/palette.js';
import { font } from '../gfx/font.js';
import { SPR } from '../gfx/sprites/index.js';
import { paragraph } from '../ui/draw.js';
import { formatTime } from '../systems/save.js';
import { TOTAL_PAGES, TOTAL_HEART_PIECES } from '../data/items.js';
import { bayer, mulberry32 } from '../core/math.js';

const SLIDES = {
  light: [
    { scene: 'altar', text: 'Porgi le mani alla fiamma. Il calore non brucia: ti riconosce, e tu la lasci entrare.' },
    { scene: 'stairs', text: 'La luce corre giù per i gradini, oltre il cancello, fino ai tetti sfondati del paese.' },
    { scene: 'village', text: 'Maren apre gli occhi per prima. Poi il fornaio, poi le guardie alle mura, poi tutti gli altri.' },
    { scene: 'castle', text: 'Nel castello le campane suonano da sole. Nella foresta, un bambino chiama la sua mamma per cena.' },
    { scene: 'flame', text: 'Del Viandante resta soltanto una sciarpa rossa, annodata all\'altare. Da allora, il Lume non ha mai smesso di ardere.' },
  ],
  keep: [
    { scene: 'altar', text: 'Chiudi le mani. La fiamma si fa piccola, poi più piccola ancora, come un respiro trattenuto.' },
    { scene: 'dark', text: 'Quando si spegne, nessuno se ne accorge. A Velmora dormono tutti.' },
    { scene: 'stairs', text: 'Scendi i gradini all\'alba. Il portale di pietra si richiude alle tue spalle, senza rumore.' },
    { scene: 'road', text: 'Il regno continuerà a sognare. Tu, per la prima volta, sei sveglio davvero.' },
    { scene: 'road', text: 'Oltre le montagne c\'è una strada. Nessuno ti aspetta, alla fine. Nessuno ti ha mai chiesto di tornare.' },
  ],
};

export class EndingScene {
  constructor(app, progress, choice) {
    this.app = app;
    this.progress = progress;
    this.choice = choice;
    this.slides = SLIDES[choice] || SLIDES.light;
    this.i = 0;
    this.t = 0;
    this.stage = 'slides';
    this.embers = [];
    app.audio.playMusic(choice === 'light' ? 'ending' : 'title', 2);
  }

  update() {
    this.t++;
    const inp = this.app.input;
    const adv = inp.pressed('confirm') || inp.pressed('attack');
    if (Math.random() < 0.4) this.embers.push({ x: Math.random() * W, y: H + 2, vy: -0.3 - Math.random() * 0.5, life: 400 });
    for (const e of this.embers) { e.y += e.vy; e.x += Math.sin((e.y + e.life) * 0.03) * 0.2; e.life--; }
    this.embers = this.embers.filter((e) => e.life > 0 && e.y > -4);
    if (this.stage === 'slides') {
      if ((adv && this.t > 40) || this.t > 420) {
        this.i++;
        this.t = 0;
        this.app.audio.play('uiMove');
        if (this.i >= this.slides.length) this.stage = 'stats';
      }
    } else if (this.stage === 'stats') {
      if ((adv && this.t > 60) || this.t > 900) { this.stage = 'credits'; this.t = 0; }
    } else if (this.stage === 'credits') {
      if ((adv && this.t > 60) || this.t > 1200) {
        this.app.audio.stopMusic(1.5);
        this.app.toTitle();
      }
    }
  }

  drawScene(ctx, kind) {
    const light = this.choice === 'light';
    // sky
    const top = kind === 'dark' ? [P.void, P.black] : light ? ['#2c2447', P.purple, P.pink, P.salmon] : [P.black, P.navy, P.slate, P.steel];
    for (let y = 0; y < H; y++) {
      const v = (y / H) * (top.length - 1);
      for (let x = 0; x < W; x += 2) {
        const c = top[Math.min(top.length - 1, Math.max(0, Math.round(v + (bayer(x, y) - 0.5) * 0.9)))];
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 2, 1);
      }
    }
    const rng = mulberry32(3);
    if (kind !== 'village') for (let i = 0; i < 60; i++) { ctx.fillStyle = P.silver; ctx.fillRect((rng() * W) | 0, (rng() * 140) | 0, 1, 1); }
    ctx.fillStyle = P.ink;
    switch (kind) {
      case 'altar':
      case 'flame': {
        ctx.fillRect(0, 210, W, 60);
        const f = SPR.props.flameBig[(this.t >> 3) % 4];
        const s = kind === 'flame' ? 5 : light ? 3 + Math.min(2, this.t / 120) : Math.max(0.4, 3 - this.t / 90);
        ctx.drawImage(SPR.props.altar, 220, 186);
        ctx.drawImage(f, Math.round(240 - (f.width * s) / 2), Math.round(190 - f.height * s), Math.round(f.width * s), Math.round(f.height * s));
        if (kind === 'flame') {
          ctx.fillStyle = P.red;
          ctx.fillRect(232, 198, 3, 12); ctx.fillRect(235, 200, 2, 14);
        }
        break;
      }
      case 'stairs':
        for (let i = 0; i < 12; i++) ctx.fillRect(140 + i * 10, 150 + i * 10, 200 - i * 20, 10);
        ctx.fillRect(0, 262, W, 8);
        break;
      case 'village':
        ctx.fillRect(0, 220, W, 50);
        for (let i = 0; i < 6; i++) {
          const x = 30 + i * 76;
          ctx.fillRect(x, 190, 50, 30);
          for (let r = 0; r < 14; r++) ctx.fillRect(x - 4 + r, 190 - r, 58 - r * 2, 1);
          ctx.fillStyle = light ? P.gold : P.navy;
          ctx.fillRect(x + 10, 200, 8, 8);
          ctx.fillStyle = P.ink;
        }
        break;
      case 'castle':
        ctx.fillRect(0, 230, W, 40);
        ctx.fillRect(180, 120, 120, 110);
        for (let i = 0; i < 120; i += 8) ctx.fillRect(180 + i, 114, 5, 6);
        ctx.fillRect(200, 80, 20, 40); ctx.fillRect(260, 90, 20, 30);
        if (light && (this.t >> 5) % 2) { ctx.fillStyle = P.gold; ctx.fillRect(207, 94, 6, 8); }
        break;
      case 'road':
        ctx.fillRect(0, 200, W, 70);
        ctx.fillStyle = P.slate;
        for (let y = 200; y < 270; y++) { const w = 4 + (y - 200) * 2.2; ctx.fillRect(Math.round(240 - w / 2), y, Math.round(w), 1); }
        ctx.fillStyle = P.ink;
        ctx.fillRect(236, 196, 3, 6);
        ctx.fillStyle = P.red; ctx.fillRect(238, 197, 2, 1);
        break;
      default:
        break;
    }
    for (const e of this.embers) {
      if (kind === 'dark') continue;
      ctx.fillStyle = e.life > 200 ? P.yellow : P.orange;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
  }

  render(ctx) {
    ctx.fillStyle = P.void;
    ctx.fillRect(0, 0, W, H);
    if (this.stage === 'slides') {
      const s = this.slides[Math.min(this.i, this.slides.length - 1)];
      this.drawScene(ctx, s.scene);
      const a = Math.min(1, this.t / 40);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(7,6,12,0.7)';
      ctx.fillRect(40, 214, 400, 44);
      paragraph(ctx, s.text, 52, 222, 376, P.sand, 12);
      ctx.globalAlpha = 1;
      return;
    }
    if (this.stage === 'stats') {
      const pr = this.progress;
      font.draw(ctx, this.choice === 'light' ? 'FINALE: L\'ALBA' : 'FINALE: IL CREPUSCOLO', 240, 50, P.gold, { align: 'center' });
      const rows = [
        ['Tempo di gioco', formatTime(pr.playTime)],
        ['Cadute', String(pr.deaths)],
        ['Frammenti di cuore', `${pr.stats.heartPieces || 0}/${TOTAL_HEART_PIECES}`],
        ['Pagine perdute', `${pr.items.page || 0}/${TOTAL_PAGES}`],
        ['Segreti scoperti', String(pr.stats.secrets || 0)],
        ['Nemici sconfitti', String(pr.stats.kills || 0)],
        ['Spada', `livello ${pr.swordLv}`],
      ];
      rows.forEach(([a, b], i) => {
        font.draw(ctx, a, 150, 84 + i * 16, P.gray);
        font.draw(ctx, b, 330, 84 + i * 16, P.sand, { align: 'right' });
      });
      if (this.t > 60 && (this.t >> 5) % 2 === 0) font.draw(ctx, 'Premi per continuare', 240, 230, P.steel, { align: 'center' });
      return;
    }
    // credits
    const lines = [
      ['ULTIMO LUME', P.gold], ['', P.gray],
      ['Un piccolo action-adventure in pixel art', P.sand], ['', P.gray],
      ['Ogni sprite, tile, nota e suono', P.gray], ['è generato dal codice del gioco.', P.gray], ['', P.gray],
      [this.choice === 'light' ? 'Velmora si è svegliata.' : 'Velmora dorme ancora.', P.sand], ['', P.gray],
      ['Grazie per aver giocato.', P.white],
    ];
    const y0 = Math.max(40, 260 - this.t * 0.6);
    lines.forEach(([t, c], i) => font.draw(ctx, t, 240, y0 + i * 14, c, { align: 'center' }));
  }
}
