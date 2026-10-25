/*
 * Generatori procedurali di item. Ogni generatore riceve una difficoltà bersaglio
 * (scala theta) e costruisce un item nuovo con difficoltà stimata vicina al bersaglio,
 * così il test adattivo non esaurisce mai le domande.
 */
(function (IQ) {
  'use strict';

  IQ.random = IQ.random || Math.random;

  function rnd() { return IQ.random(); }
  function rint(lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Sceglie a caso una configurazione con difficoltà entro tol dal bersaglio, altrimenti la più vicina.
  function nearest(configs, target, tol) {
    var near = configs.filter(function (c) { return Math.abs(c.b - target) <= tol; });
    if (near.length) return pick(near);
    var best = Infinity, out = [];
    configs.forEach(function (c) {
      var d = Math.abs(c.b - target);
      if (d < best - 1e-9) { best = d; out = [c]; } else if (Math.abs(d - best) < 1e-9) out.push(c);
    });
    return pick(out);
  }

  /* ------------------------------------------------------------------ */
  /* Matrici 3x3                                                          */
  /* ------------------------------------------------------------------ */

  var NONDIR = ['circle', 'square', 'diamond', 'hexagon', 'star'];
  var DIR = ['triangle', 'arrow', 'semicircle'];
  var SIZES = [8.5, 12, 15.5];
  var LAYOUT = {
    1: [[50, 50]],
    2: [[29, 50], [71, 50]],
    3: [[50, 27], [27, 70], [73, 70]],
    4: [[29, 29], [71, 29], [29, 71], [71, 71]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[17, 32], [50, 32], [83, 32], [17, 68], [50, 68], [83, 68]]
  };
  var SHAPE_NAME = {
    circle: 'cerchio', square: 'quadrato', diamond: 'rombo', hexagon: 'esagono', star: 'stella',
    triangle: 'triangolo', arrow: 'freccia', semicircle: 'semicerchio'
  };
  var FILL_NAME = ['vuota', 'semipiena', 'piena'];
  var SIZE_NAME = ['piccola', 'media', 'grande'];

  function ring(n, r, start) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = start + i * 2 * Math.PI / n;
      pts.push((r * Math.cos(t)).toFixed(3) + ',' + (r * Math.sin(t)).toFixed(3));
    }
    return pts.join(' ');
  }
  function starPoints() {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 0.45 : 1;
      var t = -Math.PI / 2 + i * Math.PI / 5;
      pts.push((r * Math.cos(t)).toFixed(3) + ',' + (r * Math.sin(t)).toFixed(3));
    }
    return pts.join(' ');
  }
  var UNIT = {
    circle: '<circle r="1"/>',
    square: '<rect x="-.82" y="-.82" width="1.64" height="1.64"/>',
    diamond: '<polygon points="0,-1 1,0 0,1 -1,0"/>',
    hexagon: '<polygon points="' + ring(6, 1, 0) + '"/>',
    star: '<polygon points="' + starPoints() + '"/>',
    triangle: '<polygon points="0,-1 .84,.8 -.84,.8"/>',
    arrow: '<polygon points="0,-1 .8,-.1 .3,-.1 .3,1 -.3,1 -.3,-.1 -.8,-.1"/>',
    semicircle: '<path d="M-1,.35 A1,1 0 0 1 1,.35 Z"/>'
  };

  function cellSVG(cell) {
    var r = SIZES[cell.size];
    var rot = DIR.indexOf(cell.shape) >= 0 ? cell.rot * 45 : 0;
    var fill = cell.fill === 0 ? 'none' : 'currentColor';
    var op = cell.fill === 1 ? ' fill-opacity=".45"' : '';
    var body = LAYOUT[cell.count].map(function (p) {
      return '<g transform="translate(' + p[0] + ' ' + p[1] + ') rotate(' + rot + ') scale(' + r + ')" stroke-width="' +
        (2.3 / r).toFixed(3) + '">' + UNIT[cell.shape] + '</g>';
    }).join('');
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="' + fill + '"' + op +
      ' stroke="currentColor" stroke-linejoin="round">' + body + '</g></svg>';
  }

  var ATTRS = ['shape', 'count', 'fill', 'size', 'rot'];
  var MATRIX_RULES = {
    shape: ['const', 'dist'],
    count: ['const', 'prog', 'dist'],
    fill: ['const', 'prog', 'dist'],
    size: ['const', 'prog', 'dist'],
    rot: ['const', 'prog', 'dist']
  };

  // Difficoltà stimata: cresce con il numero di attributi che variano e con le regole di distribuzione.
  var MATRIX_CONFIGS = (function () {
    var out = [];
    (function rec(i, cur) {
      if (i === ATTRS.length) {
        var n = 0, d = 0;
        ATTRS.forEach(function (a) {
          if (cur[a] !== 'const') n++;
          if (cur[a] === 'dist') d++;
        });
        if (!n) return;
        var b = [0, -2.2, -1.1, 0, 1.0, 1.9][n] + 0.3 * d + (cur.rot !== 'const' ? 0.2 : 0);
        out.push({ rules: Object.assign({}, cur), b: Math.min(3.2, Math.round(b * 100) / 100) });
        return;
      }
      MATRIX_RULES[ATTRS[i]].forEach(function (r) {
        cur[ATTRS[i]] = r;
        rec(i + 1, cur);
      });
    })(0, {});
    return out;
  })();

  function domainOf(attr, shapes) {
    if (attr === 'shape') return shapes.slice();
    if (attr === 'count') return [1, 2, 3, 4, 5, 6];
    if (attr === 'rot') return [0, 1, 2, 3, 4, 5, 6, 7];
    return [0, 1, 2];
  }

  function fillAttr(attr, rule, shapes) {
    var dom = domainOf(attr, shapes);
    var V = [[], [], []];
    var info = { rule: rule };
    var r, c;
    if (rule === 'const') {
      var v = attr === 'count' ? rint(1, 4) : pick(dom);
      for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) V[r][c] = v;
      info.value = v;
    } else if (rule === 'dist') {
      var vals = shuffle(dom).slice(0, 3);
      var s = pick([1, 2]);
      for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) V[r][c] = vals[(c + s * r) % 3];
      info.values = vals;
    } else if (attr === 'count') {
      var step = pick([1, -1, 1, -1, 2]);
      var starts = shuffle(step === 2 ? [1, 2] : step === 1 ? [1, 2, 3, 4] : [3, 4, 5, 6]);
      for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) V[r][c] = starts[r % starts.length] + step * c;
      info.step = step;
    } else if (attr === 'rot') {
      var stepR = pick([1, 2, -1, -2]);
      var rs = shuffle(dom).slice(0, 3);
      for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) V[r][c] = ((rs[r] + stepR * c) % 8 + 8) % 8;
      info.step = stepR;
    } else {
      var dir = pick([1, -1]);
      for (r = 0; r < 3; r++) for (c = 0; c < 3; c++) V[r][c] = dir === 1 ? c : 2 - c;
      info.step = dir;
    }
    return { values: V, info: info };
  }

  // Valore alternativo plausibile per costruire i distrattori.
  function altValue(attr, v, grid, rule, shapes) {
    if (rule !== 'const') {
      var seen = [];
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
          if (r === 2 && c === 2) continue;
          var x = grid[r][c][attr];
          if (x !== v && seen.indexOf(x) < 0) seen.push(x);
        }
      }
      if (seen.length) return pick(seen);
    }
    if (attr === 'count') return v === 1 ? 2 : v === 6 ? 5 : v + pick([1, -1]);
    if (attr === 'rot') return (v + pick([2, 4, 6])) % 8;
    return pick(domainOf(attr, shapes).filter(function (x) { return x !== v; }));
  }

  function describeMatrix(rules, meta, shapes) {
    var out = [];
    ATTRS.forEach(function (attr) {
      var rule = rules[attr], m = meta[attr];
      if (rule === 'const') return;
      if (attr === 'shape') {
        out.push('Ogni riga contiene una volta ciascuna forma (' + m.values.map(function (s) { return SHAPE_NAME[s]; }).join(', ') + ').');
      } else if (attr === 'count') {
        out.push(rule === 'prog'
          ? 'Il numero di figure ' + (m.step > 0 ? 'aumenta' : 'diminuisce') + ' di ' + Math.abs(m.step) + ' da sinistra a destra.'
          : 'Ogni riga contiene una volta ciascuna quantità (' + m.values.join(', ') + ' figure).');
      } else if (attr === 'fill') {
        out.push(rule === 'prog'
          ? 'Il riempimento passa da ' + (m.step > 0 ? 'vuoto a pieno' : 'pieno a vuoto') + ' da sinistra a destra.'
          : 'Ogni riga contiene una figura vuota, una semipiena e una piena.');
      } else if (attr === 'size') {
        out.push(rule === 'prog'
          ? 'Le figure diventano più ' + (m.step > 0 ? 'grandi' : 'piccole') + ' da sinistra a destra.'
          : 'Ogni riga contiene le tre dimensioni: piccola, media e grande.');
      } else if (attr === 'rot') {
        out.push(rule === 'prog'
          ? 'Le figure ruotano di ' + Math.abs(m.step) * 45 + '° in senso ' + (m.step > 0 ? 'orario' : 'antiorario') + ' a ogni passo verso destra.'
          : 'Ogni riga contiene tre orientamenti diversi.');
      }
    });
    if (out.length < ATTRS.length - (shapes === DIR ? 0 : 1)) out.push('Gli altri attributi restano costanti.');
    return out.join(' ');
  }

  function genMatrix(target) {
    var cfg = nearest(MATRIX_CONFIGS, target, 0.3);
    var rules = cfg.rules;
    var dirClass = rules.rot !== 'const' || rnd() < 0.3;
    var shapes = dirClass ? DIR : NONDIR;
    var grid = [[{}, {}, {}], [{}, {}, {}], [{}, {}, {}]];
    var meta = {};
    ATTRS.forEach(function (attr) {
      var m = fillAttr(attr, rules[attr], shapes);
      meta[attr] = m.info;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) grid[r][c][attr] = m.values[r][c];
    });

    // 8 opzioni = tutte le combinazioni di 3 attributi (valore giusto o alternativo):
    // ogni valore compare in 4 opzioni su 8, quindi la frequenza non rivela la risposta.
    var answer = Object.assign({}, grid[2][2]);
    var varying = ATTRS.filter(function (a) { return rules[a] !== 'const'; });
    var perturbable = ['shape', 'count', 'fill', 'size'].concat(dirClass ? ['rot'] : []);
    var chosen = shuffle(varying).concat(shuffle(perturbable.filter(function (a) {
      return varying.indexOf(a) < 0;
    }))).slice(0, 3);
    var alt = {};
    chosen.forEach(function (a) { alt[a] = altValue(a, answer[a], grid, rules[a], shapes); });
    var opts = [];
    for (var mask = 0; mask < 8; mask++) {
      var o = Object.assign({}, answer);
      chosen.forEach(function (a, k) { if (mask & (1 << k)) o[a] = alt[a]; });
      opts.push({ cell: o, correct: mask === 0 });
    }
    opts = shuffle(opts);

    return {
      kind: 'matrix',
      a: 1.3, b: cfg.b, c: 0.125,
      grid: grid,
      options: opts.map(function (o) { return o.cell; }),
      answer: opts.findIndex(function (o) { return o.correct; }),
      explain: describeMatrix(rules, meta, shapes)
    };
  }

  function matrixHTML(grid) {
    var cells = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        cells.push(r === 2 && c === 2
          ? '<div class="mx-cell mx-missing" aria-label="Casella mancante"><span>?</span></div>'
          : '<div class="mx-cell">' + cellSVG(grid[r][c]) + '</div>');
      }
    }
    return '<div class="matrix" role="img" aria-label="Matrice 3 per 3 con l\'ultima casella mancante">' + cells.join('') + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Rotazione mentale (poliomini chirali)                                */
  /* ------------------------------------------------------------------ */

  var DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function norm(cells) {
    var mx = Infinity, my = Infinity;
    cells.forEach(function (c) { mx = Math.min(mx, c[0]); my = Math.min(my, c[1]); });
    return cells.map(function (c) { return [c[0] - mx, c[1] - my]; });
  }
  function key(cells) {
    return norm(cells).map(function (c) { return c[0] + ',' + c[1]; }).sort().join(';');
  }
  function rot90(cells) { return cells.map(function (c) { return [-c[1], c[0]]; }); }
  function mirror(cells) { return cells.map(function (c) { return [-c[0], c[1]]; }); }
  // Forma canonica invariante per rotazioni di 90°.
  function canon(cells) {
    var best = null, cur = cells;
    for (var i = 0; i < 4; i++) {
      var k = key(cur);
      if (best === null || k < best) best = k;
      cur = rot90(cur);
    }
    return best;
  }
  function chiral(cells) { return canon(cells) !== canon(mirror(cells)); }
  function has(cells, x, y) { return cells.some(function (c) { return c[0] === x && c[1] === y; }); }
  function connected(cells) {
    if (!cells.length) return false;
    var seen = [cells[0]], queue = [cells[0]];
    while (queue.length) {
      var cur = queue.shift();
      DIRS4.forEach(function (d) {
        var x = cur[0] + d[0], y = cur[1] + d[1];
        if (has(cells, x, y) && !has(seen, x, y)) {
          seen.push([x, y]);
          queue.push([x, y]);
        }
      });
    }
    return seen.length === cells.length;
  }
  function polyomino(n) {
    for (;;) {
      var cells = [[0, 0]];
      while (cells.length < n) {
        var b = pick(cells), d = pick(DIRS4);
        var x = b[0] + d[0], y = b[1] + d[1];
        if (!has(cells, x, y)) cells.push([x, y]);
      }
      if (chiral(cells)) return norm(cells);
    }
  }
  // Sposta una cella: la forma resta simile ma non coincide né con l'originale né con la sua immagine speculare.
  function modifyPoly(cells) {
    var k0 = canon(cells), k1 = canon(mirror(cells));
    for (var t = 0; t < 300; t++) {
      var i = rint(0, cells.length - 1);
      var rest = cells.filter(function (c, j) { return j !== i; });
      if (!connected(rest)) continue;
      var cand = [];
      rest.forEach(function (c) {
        DIRS4.forEach(function (d) {
          var x = c[0] + d[0], y = c[1] + d[1];
          if (!has(rest, x, y) && !(x === cells[i][0] && y === cells[i][1])) cand.push([x, y]);
        });
      });
      if (!cand.length) continue;
      var mod = rest.concat([pick(cand)]);
      var k = canon(mod);
      if (k !== k0 && k !== k1 && chiral(mod)) return norm(mod);
    }
    return null;
  }

  function centroid(cells) {
    var sx = 0, sy = 0;
    cells.forEach(function (c) { sx += c[0] + 0.5; sy += c[1] + 0.5; });
    return [sx / cells.length, sy / cells.length];
  }
  function polyScale(list) {
    var rmax = 0;
    list.forEach(function (cells) {
      var ce = centroid(cells);
      cells.forEach(function (c) {
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (o) {
          rmax = Math.max(rmax, Math.hypot(c[0] + o[0] - ce[0], c[1] + o[1] - ce[1]));
        });
      });
    });
    return Math.min(18, 54 / rmax);
  }
  function polySVG(cells, angle, scale) {
    var ce = centroid(cells);
    var rects = cells.map(function (c) {
      return '<rect x="' + c[0] + '" y="' + c[1] + '" width="1" height="1"/>';
    }).join('');
    return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><g transform="translate(60 60) rotate(' + angle +
      ') scale(' + scale.toFixed(3) + ') translate(' + (-ce[0]).toFixed(3) + ' ' + (-ce[1]).toFixed(3) +
      ')" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="' + (2.2 / scale).toFixed(3) +
      '" stroke-linejoin="round">' + rects + '</g></svg>';
  }

  var ROT_ANGLES = [45, 90, 135, 180, 225, 270, 315];
  var ROT_CONFIGS = (function () {
    var out = [];
    for (var n = 4; n <= 13; n++) {
      ROT_ANGLES.forEach(function (ang) {
        [false, true].forEach(function (rt) {
          var af = Math.min(ang, 360 - ang) / 180;
          var b = -1.8 + 0.28 * (n - 4) + 0.45 * af + (rt ? 0.3 : 0);
          out.push({ n: n, angle: ang, rotTarget: rt, b: Math.round(b * 100) / 100 });
        });
      });
    }
    return out;
  })();

  function genRotation(target) {
    var cfg = nearest(ROT_CONFIGS, target, 0.2);
    var shape, mod = null;
    while (!mod) {
      shape = polyomino(cfg.n);
      mod = modifyPoly(shape);
    }
    var t0 = cfg.rotTarget ? pick([30, 60, 120, 150, 210, 240, 300, 330]) : 0;
    var opts = shuffle([
      { cells: shape, angle: t0 + cfg.angle, correct: true },
      { cells: mirror(shape), angle: t0 + pick(ROT_ANGLES) },
      { cells: mod, angle: t0 + pick(ROT_ANGLES) },
      { cells: mirror(mod), angle: t0 + pick(ROT_ANGLES) }
    ]);
    return {
      kind: 'rotation',
      a: 1.0, b: cfg.b, c: 0.25,
      target: { cells: shape, angle: t0 },
      options: opts,
      scale: polyScale([shape, mod]),
      answer: opts.findIndex(function (o) { return o.correct; }),
      explain: 'La figura corretta è il modello ruotato di ' + cfg.angle + '°. Le altre sono speculari oppure hanno una cella spostata.'
    };
  }

  /* ------------------------------------------------------------------ */
  /* Serie numeriche                                                      */
  /* ------------------------------------------------------------------ */

  function seq(n, f) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(f(i, out));
    return out;
  }
  var PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23];

  var SERIES = [
    { id: 'add', b: -2.3, rule: 'Si aggiunge sempre lo stesso numero.', make: function () {
      var s = rint(1, 20), d = rint(2, 9);
      return seq(7, function (i) { return s + i * d; });
    } },
    { id: 'sub', b: -2.0, rule: 'Si sottrae sempre lo stesso numero.', make: function () {
      var s = rint(60, 99), d = rint(3, 9);
      return seq(7, function (i) { return s - i * d; });
    } },
    { id: 'geo', b: -1.4, rule: 'Ogni termine si moltiplica per lo stesso numero.', make: function () {
      var s = rint(1, 4), r = pick([2, 3]);
      return seq(6, function (i) { return s * Math.pow(r, i); });
    } },
    { id: 'halve', b: -1.1, rule: 'Ogni termine si divide per lo stesso numero.', make: function () {
      var r = pick([2, 3]), m = rint(1, 3);
      return seq(6, function (i) { return m * Math.pow(r, 5 - i); });
    } },
    { id: 'incr', b: -0.9, rule: 'La differenza tra termini consecutivi cresce ogni volta della stessa quantità.', make: function () {
      var s = rint(1, 10), d0 = rint(1, 3), e = pick([1, 2]);
      return seq(7, function (i, o) { return i === 0 ? s : o[i - 1] + d0 + e * (i - 1); });
    } },
    { id: 'alt', b: -0.5, rule: 'Si alternano un\'addizione e una sottrazione fisse.', make: function () {
      var s = rint(10, 30), p = rint(4, 9), q = rint(1, p - 1);
      return seq(8, function (i, o) { return i === 0 ? s : o[i - 1] + (i % 2 ? p : -q); });
    } },
    { id: 'inter', b: 0.0, rule: 'Sono due serie intrecciate: una nelle posizioni dispari e una nelle pari.', make: function () {
      var s1 = rint(1, 9), d1 = rint(2, 5), s2 = rint(30, 60), d2 = -rint(2, 5), len = pick([8, 9]);
      return seq(len, function (i) { return i % 2 === 0 ? s1 + (i / 2) * d1 : s2 + ((i - 1) / 2) * d2; });
    } },
    { id: 'sq', b: 0.2, rule: 'Quadrati di numeri consecutivi, eventualmente con uno scarto fisso.', make: function () {
      var m = rint(1, 4), k = pick([0, 0, 1, -1, 2, -2, 3]);
      return seq(6, function (i) { return (i + m) * (i + m) + k; });
    } },
    { id: 'fib', b: 0.5, rule: 'Ogni termine è la somma dei due precedenti.', make: function () {
      var a0 = rint(1, 5), a1 = rint(1, 6);
      return seq(8, function (i, o) { return i === 0 ? a0 : i === 1 ? a1 : o[i - 1] + o[i - 2]; });
    } },
    { id: 'pron', b: 0.6, rule: 'Prodotto di due numeri consecutivi: n × (n + 1).', make: function () {
      var m = rint(1, 3);
      return seq(6, function (i) { return (i + m) * (i + m + 1); });
    } },
    { id: 'mul2k', b: 0.7, rule: 'Ogni termine è il doppio del precedente più (o meno) un numero fisso.', make: function () {
      var s = rint(2, 5), k = pick([1, 2, 3, -1]);
      return seq(6, function (i, o) { return i === 0 ? s : o[i - 1] * 2 + k; });
    } },
    { id: 'mulalt', b: 0.8, rule: 'Si moltiplica alternativamente per due numeri diversi.', make: function () {
      var s = rint(1, 3), m = shuffle([2, 3]);
      return seq(7, function (i, o) { return i === 0 ? s : o[i - 1] * (i % 2 ? m[0] : m[1]); });
    } },
    { id: 'muladd', b: 0.9, rule: 'Si alternano una moltiplicazione e un\'addizione fisse.', make: function () {
      var s = rint(1, 5), m = pick([2, 3]), p = rint(1, 6);
      return seq(8, function (i, o) { return i === 0 ? s : i % 2 ? o[i - 1] * m : o[i - 1] + p; });
    } },
    { id: 'geodiff', b: 1.0, rule: 'Le differenze tra termini consecutivi formano una progressione geometrica.', make: function () {
      var s = rint(1, 9), d = rint(1, 3), r = pick([2, 3]);
      return seq(6, function (i, o) { return i === 0 ? s : o[i - 1] + d * Math.pow(r, i - 1); });
    } },
    { id: 'cube', b: 1.2, rule: 'Cubi di numeri consecutivi, eventualmente con uno scarto fisso.', make: function () {
      var m = rint(1, 2), k = pick([0, 0, 1, -1, 2]);
      return seq(6, function (i) { return Math.pow(i + m, 3) + k; });
    } },
    { id: 'sqdiff', b: 1.3, rule: 'Le differenze tra termini consecutivi sono quadrati perfetti consecutivi.', make: function () {
      var s = rint(1, 10), m = rint(1, 2);
      return seq(7, function (i, o) { return i === 0 ? s : o[i - 1] + (i + m - 1) * (i + m - 1); });
    } },
    { id: 'fact', b: 1.5, rule: 'Ogni termine è il precedente moltiplicato per 2, poi per 3, poi per 4, e così via.', make: function () {
      var s = rint(1, 3);
      return seq(6, function (i, o) { return i === 0 ? s : o[i - 1] * (i + 1); });
    } },
    { id: 'intermix', b: 1.6, rule: 'Due serie intrecciate: una aritmetica e una geometrica.', make: function () {
      var s1 = rint(1, 9), d1 = rint(2, 6), s2 = rint(1, 3), len = pick([9, 10]);
      return seq(len, function (i) { return i % 2 === 0 ? s1 + (i / 2) * d1 : s2 * Math.pow(2, (i - 1) / 2); });
    } },
    { id: 'trib', b: 1.7, rule: 'Ogni termine è la somma dei tre precedenti.', make: function () {
      var st = [rint(0, 2), rint(1, 3), rint(1, 4)];
      return seq(8, function (i, o) { return i < 3 ? st[i] : o[i - 1] + o[i - 2] + o[i - 3]; });
    } },
    { id: 'prod', b: 1.8, rule: 'Ogni termine è il prodotto dei due precedenti.', make: function () {
      var p = pick([[1, 2], [2, 3], [1, 3], [2, 2]]);
      return seq(6, function (i, o) { return i < 2 ? p[i] : o[i - 1] * o[i - 2]; });
    } },
    { id: 'prime', b: 1.9, rule: 'Le differenze tra termini consecutivi sono numeri primi consecutivi.', make: function () {
      var s = rint(1, 20), j = rint(0, 1);
      return seq(7, function (i, o) { return i === 0 ? s : o[i - 1] + PRIMES[j + i - 1]; });
    } },
    { id: 'sqalt', b: 2.1, rule: 'Quadrati di 1, 2, 3, … a cui si toglie e si aggiunge alternativamente un numero fisso.', make: function () {
      var k = rint(1, 3);
      return seq(7, function (i) { return (i + 1) * (i + 1) + (i % 2 === 0 ? -k : k); });
    } },
    { id: 'dblsub', b: 2.4, rule: 'Ogni termine è il doppio del precedente meno la sua posizione (1, 2, 3, …).', make: function () {
      var s = rint(3, 8);
      return seq(7, function (i, o) { return i === 0 ? s : o[i - 1] * 2 - i; });
    } }
  ];

  function genSeries(target, exclude) {
    exclude = exclude || [];
    var pool = SERIES.filter(function (t) { return Math.abs(t.b - target) <= 0.4 && exclude.indexOf(t.id) < 0; });
    if (!pool.length) pool = SERIES.filter(function (t) { return Math.abs(t.b - target) <= 0.4; });
    var type = pool.length ? pick(pool) : nearest(SERIES, target, 0);
    var all = type.make();
    return {
      kind: 'series',
      id: type.id,
      a: 1.4, b: type.b, c: 0,
      terms: all.slice(0, -1),
      answer: all[all.length - 1],
      explain: type.rule
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ordinamenti (ragionamento deduttivo)                                 */
  /* ------------------------------------------------------------------ */

  var PEOPLE = [['Anna', 'f'], ['Bruno', 'm'], ['Carla', 'f'], ['Davide', 'm'], ['Elena', 'f'], ['Franco', 'm'],
    ['Giulia', 'f'], ['Luca', 'm'], ['Marta', 'f'], ['Nicola', 'm'], ['Paola', 'f'], ['Sergio', 'm']];
  var ORD_F = ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima'];
  function g(p, m, f) { return p[1] === 'f' ? f : m; }

  // more(x, y): x precede y nell'ordine; less(x, y): x segue y.
  var ORDER_TPL = [
    { more: function (x, y) { return x[0] + ' è più ' + g(x, 'alto', 'alta') + ' di ' + y[0]; },
      less: function (x, y) { return x[0] + ' è più ' + g(x, 'basso', 'bassa') + ' di ' + y[0]; },
      top: 'Chi è il più alto?', bottom: 'Chi è il più basso?',
      desc: 'dal più alto al più basso', asc: 'dal più basso al più alto' },
    { more: function (x, y) { return x[0] + ' è più grande di ' + y[0]; },
      less: function (x, y) { return x[0] + ' è più giovane di ' + y[0]; },
      top: 'Chi è il più grande d\'età?', bottom: 'Chi è il più giovane?',
      desc: 'dal più grande al più giovane', asc: 'dal più giovane al più grande' },
    { intro: 'In una gara di corsa:',
      more: function (x, y) { return x[0] + ' arriva prima di ' + y[0]; },
      less: function (x, y) { return x[0] + ' arriva dopo ' + y[0]; },
      top: 'Chi arriva per primo?', bottom: 'Chi arriva per ultimo?',
      desc: 'in ordine di arrivo', asc: 'partendo dall\'ultimo arrivato' },
    { more: function (x, y) { return x[0] + ' pesa più di ' + y[0]; },
      less: function (x, y) { return x[0] + ' pesa meno di ' + y[0]; },
      top: 'Chi pesa di più?', bottom: 'Chi pesa di meno?',
      desc: 'dal più pesante al più leggero', asc: 'dal più leggero al più pesante' },
    { more: function (x, y) { return x[0] + ' guadagna più di ' + y[0]; },
      less: function (x, y) { return x[0] + ' guadagna meno di ' + y[0]; },
      top: 'Chi guadagna di più?', bottom: 'Chi guadagna di meno?',
      desc: 'da chi guadagna di più a chi guadagna di meno', asc: 'da chi guadagna di meno a chi guadagna di più' }
  ];

  var ORDER_CONFIGS = (function () {
    var out = [];
    for (var n = 3; n <= 7; n++) {
      ['top', 'bottom', 'midDesc', 'midAsc'].forEach(function (pos) {
        [false, true].forEach(function (mixed) {
          var mid = pos.indexOf('mid') === 0;
          var b = -2.0 + 0.7 * (n - 3) + (mid ? 0.45 : 0) + (pos === 'midAsc' ? 0.15 : 0) + (mixed ? 0.2 : 0);
          out.push({ n: n, pos: pos, mixed: mixed, b: Math.round(b * 100) / 100 });
        });
      });
    }
    return out;
  })();

  function genOrdering(target) {
    var cfg = nearest(ORDER_CONFIGS, target, 0.2);
    var n = cfg.n;
    var order = shuffle(PEOPLE).slice(0, n);
    var tpl = pick(ORDER_TPL);
    var wording = pick(['more', 'less']);
    function say(i, j) {
      var w = cfg.mixed ? pick(['more', 'less']) : wording;
      return w === 'more' ? tpl.more(order[i], order[j]) : tpl.less(order[j], order[i]);
    }
    var facts = [];
    for (var i = 0; i < n - 1; i++) facts.push(say(i, i + 1));
    if (n >= 5) {
      var r = rint(0, n - 3);
      facts.push(say(r, r + 2));
    }
    facts = shuffle(facts);

    var k, q;
    if (cfg.pos === 'top') { k = 0; q = tpl.top; }
    else if (cfg.pos === 'bottom') { k = n - 1; q = tpl.bottom; }
    else if (cfg.pos === 'midDesc') {
      k = rint(1, n - 2);
      q = 'Ordinando ' + tpl.desc + ', chi è in ' + ORD_F[k] + ' posizione?';
    } else {
      var kb = rint(1, n - 2);
      k = n - 1 - kb;
      q = 'Ordinando ' + tpl.asc + ', chi è in ' + ORD_F[kb] + ' posizione?';
    }
    var names = order.map(function (p) { return p[0]; }).sort();
    return {
      kind: 'ordering',
      id: 'ord',
      a: 1.2, b: cfg.b, c: 1 / n,
      intro: tpl.intro || 'Si sa che:',
      facts: facts,
      question: q,
      options: names,
      answer: names.indexOf(order[k][0]),
      explain: 'L\'ordine completo è: ' + order.map(function (p) { return p[0]; }).join(' › ') + ' (' + tpl.desc + ').'
    };
  }

  /* ------------------------------------------------------------------ */
  /* Velocità e memoria                                                   */
  /* ------------------------------------------------------------------ */

  var SPEED_CHARS = 'ACEFHKMNPRTVXY3479';
  function speedPair() {
    var s = '';
    for (var i = 0; i < 6; i++) s += pick(SPEED_CHARS);
    var same = rnd() < 0.5;
    var t = s;
    if (!same) {
      var p = rint(0, 5), ch;
      do { ch = pick(SPEED_CHARS); } while (ch === s[p]);
      t = s.slice(0, p) + ch + s.slice(p + 1);
    }
    return { left: s, right: t, same: same };
  }

  // Cifre 1-9 senza ripetizioni consecutive e con poche sequenze ovvie (3-4, 7-6).
  function digits(len) {
    var out = [];
    while (out.length < len) {
      var d = rint(1, 9), prev = out[out.length - 1];
      if (d === prev) continue;
      if (prev && Math.abs(d - prev) === 1 && rnd() < 0.7) continue;
      out.push(d);
    }
    return out;
  }

  IQ.gen = {
    rnd: rnd, rint: rint, pick: pick, shuffle: shuffle, esc: esc,
    matrix: genMatrix, matrixHTML: matrixHTML, cellSVG: cellSVG, MATRIX_CONFIGS: MATRIX_CONFIGS,
    rotation: genRotation, polySVG: polySVG, canon: canon, mirror: mirror, chiral: chiral, connected: connected,
    series: genSeries, SERIES: SERIES,
    ordering: genOrdering, ORDER_CONFIGS: ORDER_CONFIGS,
    speedPair: speedPair, digits: digits
  };
})(typeof window !== 'undefined' ? (window.IQ = window.IQ || {}) : (globalThis.IQ = globalThis.IQ || {}));
