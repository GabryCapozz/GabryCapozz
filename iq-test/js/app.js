/*
 * Flusso del test: home, prove, selezione adattiva degli item (CAT), risultati.
 */
(function (IQ) {
  'use strict';

  var gen = IQ.gen, irt = IQ.irt, bank = IQ.bank, esc = gen.esc;
  var app = document.getElementById('app');
  var LETTERS = 'ABCDEFGH';
  var HKEY = 'iqtest.history.v1';

  // Norme assunte per la prova di velocità (risposte giuste meno sbagliate in 90 secondi).
  var SPEED = { seconds: 90, mean: 42, sd: 10, loading: 0.45, reliability: 0.8 };

  // Incertezza di taratura: i parametri degli item sono stimati e non derivano da un campione
  // normativo, quindi ogni intervallo include 3 punti QI di errore sistematico possibile.
  var NORM_SE = 3;
  function totalSE(seIQ) { return Math.sqrt(seIQ * seIQ + NORM_SE * NORM_SE); }

  var SPAN_PHASES = [
    { name: 'Ordine diretto', start: 3, max: 10, a: 0.9, mid: 6.5,
      text: 'Riscrivi le cifre nello stesso ordine in cui le vedi.', example: 'Se vedi 3, 8, 1 scrivi 381.' },
    { name: 'Ordine inverso', start: 2, max: 9, a: 1.1, mid: 5.0,
      text: 'Riscrivi le cifre al contrario, dall\'ultima alla prima.', example: 'Se vedi 3, 8, 1 scrivi 183.' }
  ];

  var SECTIONS = [
    { id: 'matrici', name: 'Matrici', ability: 'Ragionamento fluido', kind: 'figure', limit: 120,
      how: 'Ogni matrice segue una o più regole lungo le righe: forma, numero, riempimento, dimensione o orientamento delle figure. Trova le regole e scegli tra le 8 opzioni la figura che completa la casella vuota.' },
    { id: 'verbale', name: 'Comprensione verbale', ability: 'Lessico e ragionamento verbale', kind: 'text', limit: 45,
      how: 'Sinonimi, contrari, analogie, parole intruse e proverbi. Per ogni domanda scegli la risposta migliore tra quelle proposte.' },
    { id: 'serie', name: 'Serie numeriche', ability: 'Ragionamento induttivo', kind: 'numeric', limit: 90,
      how: 'Scopri la regola che genera la sequenza e scrivi il numero che viene dopo. Le regole vanno dalle progressioni semplici alle serie intrecciate e ricorsive.' },
    { id: 'rotazione', name: 'Rotazione mentale', ability: 'Abilità visuo-spaziale', kind: 'figure', limit: 45,
      how: 'Guarda il modello e trova l\'unica figura che è lo stesso pezzo ruotato sul piano. Le altre sono capovolte come in uno specchio oppure hanno una cella in una posizione diversa.' },
    { id: 'memoria', name: 'Memoria di cifre', ability: 'Memoria di lavoro', kind: 'span',
      how: 'Vedrai delle cifre una alla volta, al ritmo di una al secondo. Nella prima parte le riscrivi nello stesso ordine, nella seconda al contrario. Le sequenze si allungano finché non ne sbagli due della stessa lunghezza. Non annotarle su carta.' },
    { id: 'logica', name: 'Ragionamento logico', ability: 'Ragionamento deduttivo', kind: 'text', limit: 120,
      how: 'Sillogismi, condizionali, ordinamenti, enigmi con cavalieri e furfanti. Scegli la conclusione che segue con certezza dalle premesse, non quella che ti sembra più plausibile.' },
    { id: 'quantitativo', name: 'Ragionamento quantitativo', ability: 'Ragionamento numerico', kind: 'numeric', limit: 150,
      how: 'Problemi con numeri, proporzioni, probabilità e geometria. Scrivi solo il numero della risposta. Puoi usare carta e penna, non la calcolatrice.' },
    { id: 'velocita', name: 'Velocità di elaborazione', ability: 'Velocità percettiva', kind: 'speed',
      how: 'Per 90 secondi vedrai coppie di codici. Indica il più velocemente possibile se sono identici o diversi. Il punteggio è il numero di risposte giuste meno quelle sbagliate.' }
  ];

  var MODES = {
    rapido: { name: 'Rapido', minutes: '25–35', margin: '7,8',
      counts: { matrici: 6, verbale: 8, serie: 6, rotazione: 5, logica: 6, quantitativo: 6 } },
    standard: { name: 'Standard', minutes: '45–60', margin: '7,2', note: 'Consigliato',
      counts: { matrici: 12, verbale: 14, serie: 10, rotazione: 8, logica: 10, quantitativo: 10 } },
    completo: { name: 'Completo', minutes: '75–95', margin: '6,8', note: 'Massima precisione',
      counts: { matrici: 20, verbale: 24, serie: 15, rotazione: 12, logica: 16, quantitativo: 16 } }
  };

  var S = null;          // sessione di test in corso
  var keyHandler = null; // gestore tastiera della schermata corrente
  var timers = [];

  function $(sel) { return app.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(app.querySelectorAll(sel)); }
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    timers = [];
  }
  function show(html) {
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }
  function fmtTime(ms) {
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtNum(x, d) {
    return Number(x).toLocaleString('it-IT', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function fmtAnswer(x) { return String(x).replace('.', ','); }
  function itemLevel(b) { return Math.round(irt.toIQ(b)); }

  document.addEventListener('keydown', function (e) {
    if (keyHandler && !e.metaKey && !e.ctrlKey && !e.altKey) keyHandler(e);
  });

  /* ------------------------------------------------------------------ */
  /* Storico locale                                                       */
  /* ------------------------------------------------------------------ */

  function loadHistory() {
    try {
      var h = JSON.parse(localStorage.getItem(HKEY) || '[]');
      return Array.isArray(h) ? h : [];
    } catch (e) { return []; }
  }
  function saveHistory(res) {
    try {
      var h = loadHistory();
      h.unshift({ date: res.date, mode: res.mode, iq: Math.round(res.iq), lo: Math.round(res.lo), hi: Math.round(res.hi), n: res.n, partial: res.partial });
      localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 20)));
    } catch (e) { /* storico non disponibile */ }
  }
  function clearHistory() {
    try { localStorage.removeItem(HKEY); } catch (e) { /* niente da fare */ }
  }
  function historyHTML(h) {
    return '<ul class="history">' + h.map(function (r) {
      var d = new Date(r.date);
      return '<li><span>' + esc(d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })) + ' · ' +
        esc(MODES[r.mode] ? MODES[r.mode].name : r.mode) + (r.partial ? ' · interrotto' : '') + ' · ' + r.n + ' risposte</span>' +
        '<b>QI ' + r.iq + ' <span class="muted">(' + r.lo + '–' + r.hi + ')</span></b></li>';
    }).join('') + '</ul>';
  }

  /* ------------------------------------------------------------------ */
  /* Home                                                                 */
  /* ------------------------------------------------------------------ */

  function itemTotal(mode) {
    var c = MODES[mode].counts, t = 0;
    Object.keys(c).forEach(function (k) { t += c[k]; });
    return t;
  }

  function testMeta(sec, mode) {
    if (sec.kind === 'span') return '≈ 14 sequenze';
    if (sec.kind === 'speed') return SPEED.seconds + ' secondi';
    var lim = sec.limit >= 60 ? (sec.limit / 60).toLocaleString('it-IT') + ' min' : sec.limit + ' s';
    return MODES[mode].counts[sec.id] + ' item · ' + lim + ' l\'uno';
  }

  function renderHome() {
    clearTimers();
    keyHandler = null;
    S = null;
    var hist = loadHistory();
    var mode = 'standard';
    var sample = gen.matrix(0.3);

    var modes = Object.keys(MODES).map(function (k) {
      var m = MODES[k];
      return '<label class="mode"><input type="radio" name="mode" value="' + k + '"' + (k === mode ? ' checked' : '') + '>' +
        '<span class="mode-name">' + m.name + '</span>' +
        '<dl><dt>Durata</dt><dd>' + m.minutes + ' min</dd><dt>Domande</dt><dd>' + itemTotal(k) + ' + memoria e velocità</dd>' +
        '<dt>Margine</dt><dd>± ' + m.margin + ' punti</dd></dl>' +
        (m.note ? '<span class="mode-note">' + m.note + '</span>' : '') + '</label>';
    }).join('');

    var tests = SECTIONS.map(function (s) {
      return '<li><label><input type="checkbox" name="sec" value="' + s.id + '" checked>' +
        '<span><span class="t-name">' + esc(s.name) + '</span><span class="t-ab">' + esc(s.ability) + '</span></span>' +
        '<span class="t-meta" data-meta="' + s.id + '">' + testMeta(s, mode) + '</span></label></li>';
    }).join('');

    show('<div class="wrap stack-lg">' +
      '<section class="hero">' +
        '<div><span class="eyebrow">8 prove · modello IRT a 3 parametri · selezione adattiva</span>' +
          '<h1>Un test del QI che si calibra su di te</h1>' +
          '<p class="lead">Ogni risposta aggiorna la stima del tuo livello e la domanda successiva viene scelta per essere la più informativa a quel livello. Alla fine ottieni il QI sulla scala standard, con margine d\'errore, percentile e un profilo delle singole abilità.</p></div>' +
        '<figure class="hero-sample" style="margin:0">' + gen.matrixHTML(sample.grid) +
          '<figcaption><span>Una matrice generata ora, livello QI ≈ ' + itemLevel(sample.b) + '</span><button class="linkbtn" id="regen" type="button">Un\'altra</button></figcaption></figure>' +
      '</section>' +
      '<div class="facts">' +
        '<div><b>Media 100</b><span>deviazione standard 15, come le scale Wechsler</span></div>' +
        '<div><b>± 7–8 punti</b><span>margine d\'errore al 95%, taratura compresa</span></div>' +
        '<div><b>8 indici</b><span>un punteggio per ciascuna abilità misurata</span></div>' +
      '</div>' +
      '<section class="stack"><div class="section-title"><h2>Scegli la durata</h2><span class="small muted">Più domande, stima più precisa</span></div>' +
        '<div class="modes" role="radiogroup" aria-label="Durata del test">' + modes + '</div></section>' +
      '<section class="stack"><div class="section-title"><h2>Le prove</h2><span class="small muted">Togli la spunta per escluderne una</span></div>' +
        '<ul class="tests">' + tests + '</ul></section>' +
      '<aside class="notice"><h3>Prima di iniziare</h3><ul>' +
        '<li>Scegli un momento tranquillo, senza interruzioni: ogni domanda ha un tempo massimo.</li>' +
        '<li>Puoi usare carta e penna per logica e problemi numerici. Niente calcolatrice, internet o aiuti esterni.</li>' +
        '<li>Nella prova di memoria non annotare le cifre.</li>' +
        '<li>Se una domanda ti blocca, rispondi come meglio puoi oppure premi «Salta». Il calcolo tiene conto della difficoltà di ogni domanda.</li>' +
      '</ul></aside>' +
      '<div class="start-row"><button class="btn btn-drop" id="start" type="button">Inizia il test</button>' +
        '<span class="small muted" id="startinfo" role="status"></span></div>' +
      (hist.length ? '<section class="stack"><div class="section-title"><h2>I tuoi risultati precedenti</h2>' +
        '<button class="linkbtn" id="clearhist" type="button">Cancella lo storico</button></div>' + historyHTML(hist) +
        '<p class="small muted">Lo storico resta solo in questo browser.</p></section>' : '') +
      '<section class="prose"><h3>Cosa può dirti questo test, e cosa no</h3>' +
        '<p>Il risultato è una stima statistica con un intervallo di confidenza, non un numero esatto. Anche i test clinici come la WAIS-IV riportano il QI con un margine di circa ± 5 punti: nessun test può misurarlo con precisione assoluta.</p>' +
        '<p>Difficoltà e parametri delle domande sono stati stimati da chi ha costruito il test, non tarati su un campione rappresentativo della popolazione. Considera il punteggio indicativo. Per una valutazione con valore clinico serve uno psicologo con un test standardizzato.</p>' +
        '<p>Rifare il test a breve distanza alza il punteggio per effetto dell\'esercizio: il primo tentativo è il più attendibile.</p>' +
      '</section>' +
    '</div>');

    $('#regen').addEventListener('click', function () {
      var m = gen.matrix(-1 + Math.random() * 3);
      var fig = $('.hero-sample');
      fig.querySelector('.matrix').outerHTML = gen.matrixHTML(m.grid);
      fig.querySelector('figcaption span').textContent = 'Una matrice generata ora, livello QI ≈ ' + itemLevel(m.b);
    });
    $$('input[name="mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        SECTIONS.forEach(function (s) { $('[data-meta="' + s.id + '"]').textContent = testMeta(s, r.value); });
      });
    });
    if (hist.length) $('#clearhist').addEventListener('click', function () { clearHistory(); renderHome(); });
    $('#start').addEventListener('click', function () {
      var m = $('input[name="mode"]:checked').value;
      var ids = $$('input[name="sec"]:checked').map(function (c) { return c.value; });
      if (!ids.length) {
        $('#startinfo').textContent = 'Seleziona almeno una prova.';
        return;
      }
      startTest(m, ids);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Sessione                                                             */
  /* ------------------------------------------------------------------ */

  function startTest(mode, ids) {
    S = {
      mode: mode,
      plan: SECTIONS.filter(function (s) { return ids.indexOf(s.id) >= 0; }),
      si: 0,
      responses: [],
      normals: [],
      used: {},
      speed: null,
      spanBest: [0, 0],
      started: Date.now(),
      cur: null
    };
    showIntro();
  }

  function sectionCount(sec) { return MODES[S.mode].counts[sec.id]; }

  function overallBar() {
    var frac = S.cur && S.cur.N ? Math.min(1, S.cur.n / S.cur.N) : 0;
    var done = (S.si + frac) / S.plan.length;
    return '<div class="overall" aria-hidden="true"><i style="width:' + (done * 100).toFixed(1) + '%"></i></div>';
  }

  function formbar(sec, label, itemText, timeText) {
    var est = irt.estimate(S.responses, S.normals);
    return overallBar() +
      '<div class="formbar">' +
        '<div><small>Prova ' + (S.si + 1) + ' di ' + S.plan.length + '</small><span>' + esc(sec.name) + '</span></div>' +
        '<div><small>' + label + '</small><span class="mono">' + itemText + '</span></div>' +
        '<div><small>Tempo</small><span class="mono" id="clock">' + timeText + '</span></div>' +
        '<div><small>Margine 95%</small><span class="mono" title="Ampiezza attuale dell\'intervallo di confidenza sul QI">± ' +
          Math.round(1.96 * totalSE(15 * est.se)) + '</span></div>' +
      '</div>';
  }

  function quitFoot(hint) {
    return '<div class="q-foot" id="qfoot"><span class="small muted">' + (hint || '') + '</span>' +
      '<button class="linkbtn" id="quit" type="button">Termina il test</button></div>';
  }

  function bindQuit() {
    var q = $('#quit');
    if (!q) return;
    q.addEventListener('click', function () {
      var enough = S.responses.length >= 5 || S.normals.length;
      var foot = $('#qfoot');
      foot.outerHTML = '<div class="notice confirm-panel" id="qfoot"><p>' + (enough
        ? 'Vuoi terminare adesso? Il QI verrà calcolato con le ' + S.responses.length + ' risposte date finora e il margine d\'errore sarà più ampio.'
        : 'Hai risposto a meno di 5 domande: non bastano per una stima.') + '</p><div class="row">' +
        (enough ? '<button class="btn" id="qyes" type="button">Mostra il risultato</button>' : '<button class="btn" id="qhome" type="button">Esci senza risultato</button>') +
        '<button class="btn btn-ghost" id="qno" type="button">Continua il test</button></div></div>';
      if (enough) $('#qyes').addEventListener('click', function () { finish(true); });
      else $('#qhome').addEventListener('click', renderHome);
      $('#qno').addEventListener('click', function () {
        $('#qfoot').outerHTML = quitFoot();
        bindQuit();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Adattatori: trasformano item generati o di banca in item visualizzabili */
  /* ------------------------------------------------------------------ */

  function adaptMatrix(it) {
    return {
      sec: 'matrici', kind: 'figure', layout: 'matrix', a: it.a, b: it.b, c: it.c, tag: 'Matrice',
      prompt: '<p class="q-text">Quale figura completa la matrice?</p>' + gen.matrixHTML(it.grid),
      options: it.options.map(gen.cellSVG),
      answer: it.answer, explain: it.explain,
      reviewQ: gen.matrixHTML(it.grid)
    };
  }

  function adaptRotation(it) {
    var target = gen.polySVG(it.target.cells, it.target.angle, it.scale);
    return {
      sec: 'rotazione', kind: 'figure', layout: 'rot', a: it.a, b: it.b, c: it.c, tag: 'Rotazione',
      prompt: '<p class="q-text">Quale figura è il modello ruotato, senza capovolgerlo?</p>' +
        '<div class="rot-target"><span class="q-tag">Modello</span><div class="fig">' + target + '</div></div>',
      options: it.options.map(function (o) { return gen.polySVG(o.cells, o.angle, it.scale); }),
      answer: it.answer, explain: it.explain,
      reviewQ: '<figure><div class="mini">' + target + '</div>Modello</figure>'
    };
  }

  function adaptSeries(it) {
    return {
      sec: 'serie', kind: 'numeric', id: it.id, a: it.a, b: it.b, c: it.c, tag: 'Serie',
      prompt: '<p class="q-text">Quale numero viene dopo?</p><div class="series">' +
        it.terms.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '<span class="next">?</span></div>',
      answer: it.answer, explain: it.explain,
      reviewQ: esc(it.terms.join(', ') + ', ?')
    };
  }

  function adaptOrdering(it) {
    return {
      sec: 'logica', kind: 'mc', id: it.id, a: it.a, b: it.b, c: it.c, tag: 'Ordinamento',
      prompt: '<p>' + esc(it.intro) + '</p><ul class="q-facts">' +
        it.facts.map(function (f) { return '<li>' + esc(f) + '.</li>'; }).join('') + '</ul><p class="q-text">' + esc(it.question) + '</p>',
      options: it.options.map(esc),
      answer: it.answer, explain: it.explain,
      reviewQ: esc(it.facts.join('; ') + '. ' + it.question)
    };
  }

  var BANK_A = { verbale: 1.25, logica: 1.2, quantitativo: 1.4 };

  function adaptBank(secId, it) {
    var base = { sec: secId, id: it.id, a: BANK_A[secId], b: it.b, tag: it.t || null, explain: it.x || '', reviewQ: esc(it.q) };
    if (it.ans !== undefined) {
      return Object.assign(base, { kind: 'numeric', c: 0, answer: it.ans, prompt: '<p class="q-text">' + esc(it.q) + '</p>' });
    }
    var idx = it.o.map(function (o, i) { return i; });
    if (!it.keep) idx = gen.shuffle(idx);
    return Object.assign(base, {
      kind: 'mc', c: 1 / it.o.length,
      prompt: '<p class="q-text">' + esc(it.q) + '</p>',
      options: idx.map(function (i) { return esc(it.o[i]); }),
      answer: idx.indexOf(it.k)
    });
  }

  /* ------------------------------------------------------------------ */
  /* Selezione adattiva                                                   */
  /* ------------------------------------------------------------------ */

  function fromBank(secId, theta, used) {
    var a = BANK_A[secId];
    var pool = bank[secId].filter(function (it) { return used.indexOf(it.id) < 0; });
    if (!pool.length) return null;
    var scored = pool.map(function (it) {
      var c = it.ans !== undefined ? 0 : 1 / it.o.length;
      return { it: it, info: irt.info({ a: a, b: it.b, c: c }, theta) };
    }).sort(function (x, y) { return y.info - x.info; });
    // Un po' di casualità tra i tre item più informativi, così due sessioni non sono identiche.
    return adaptBank(secId, gen.pick(scored.slice(0, 3)).it);
  }

  function selectItem(sec) {
    var est = irt.estimate(S.responses, S.normals);
    // Il primo item di ogni prova è un po' più facile della stima corrente, per entrare nel compito.
    var theta = S.cur.n === 0 ? est.theta - 0.8 : est.theta;
    var jitter = (Math.random() - 0.5) * 0.5;
    var used = S.used[sec.id] || (S.used[sec.id] = []);
    var item = null;
    if (sec.id === 'matrici') item = adaptMatrix(gen.matrix(irt.optimalB(theta, 1.3, 0.125) + jitter));
    else if (sec.id === 'rotazione') item = adaptRotation(gen.rotation(irt.optimalB(theta, 1.0, 0.25) + jitter));
    else if (sec.id === 'serie') item = adaptSeries(gen.series(theta + jitter, used.slice(-4)));
    else if (sec.id === 'logica') {
      var maxGen = Math.ceil(S.cur.N * 0.35);
      if ((S.cur.genCount || 0) < maxGen && Math.random() < 0.4) {
        S.cur.genCount = (S.cur.genCount || 0) + 1;
        item = adaptOrdering(gen.ordering(irt.optimalB(theta, 1.2, 0.2) + jitter));
      } else {
        item = fromBank('logica', theta, used) || adaptOrdering(gen.ordering(irt.optimalB(theta, 1.2, 0.2) + jitter));
      }
    } else item = fromBank(sec.id, theta, used);
    if (item && item.id) used.push(item.id);
    return item;
  }

  /* ------------------------------------------------------------------ */
  /* Intro di ogni prova                                                  */
  /* ------------------------------------------------------------------ */

  function figureOptions(item, example) {
    var tag = example ? 'div' : 'button';
    return '<div class="options figure' + (item.layout === 'rot' ? ' rot' : '') + '" role="group" aria-label="Opzioni di risposta">' +
      item.options.map(function (o, i) {
        var cls = 'opt' + (example && i === item.answer ? ' is-answer' : '');
        var attrs = example ? '' : ' type="button" data-i="' + i + '" aria-pressed="false" aria-label="Opzione ' + LETTERS[i] + '"';
        return '<' + tag + ' class="' + cls + '"' + attrs + '><span class="fig">' + o + '</span><span class="bubble">' + LETTERS[i] + '</span></' + tag + '>';
      }).join('') + '</div>';
  }

  function textOptions(item) {
    var short = item.options.every(function (o) { return o.length <= 22; });
    return '<div class="options text' + (short ? ' cols2' : '') + '" role="group" aria-label="Opzioni di risposta">' +
      item.options.map(function (o, i) {
        return '<button class="opt" type="button" data-i="' + i + '" aria-pressed="false"><span class="bubble">' + LETTERS[i] +
          '</span><span class="label">' + o + '</span></button>';
      }).join('') + '</div>';
  }

  function exampleHTML(sec) {
    var it;
    if (sec.id === 'matrici') {
      it = adaptMatrix(gen.matrix(-2.2));
      return '<div class="example"><span class="q-tag">Esempio risolto</span>' + it.prompt + figureOptions(it, true) +
        '<p class="small"><b>Soluzione: ' + LETTERS[it.answer] + '.</b> ' + esc(it.explain) + '</p></div>';
    }
    if (sec.id === 'rotazione') {
      it = adaptRotation(gen.rotation(-1.8));
      return '<div class="example"><span class="q-tag">Esempio risolto</span>' + it.prompt + figureOptions(it, true) +
        '<p class="small"><b>Soluzione: ' + LETTERS[it.answer] + '.</b> ' + esc(it.explain) + '</p></div>';
    }
    var ex = {
      verbale: ['Quale significato è più vicino a «celere»?', 'Risposta: «veloce». Le altre domande chiedono contrari, analogie (A sta a B come C sta a…), la parola che non c\'entra o il senso di un proverbio.'],
      serie: ['3, 7, 11, 15, 19, ?', 'Risposta: 23, perché ogni termine aumenta di 4.'],
      logica: ['Tutti i cani sono mammiferi. Fido è un cane. Quindi?', 'Risposta: Fido è un mammifero. Conta solo ciò che segue dalle premesse.'],
      quantitativo: ['Quanto fa il 10% di 50?', 'Risposta: scrivi 5. Per i decimali puoi usare la virgola.'],
      memoria: ['3 · 8 · 1', 'Ordine diretto: 381. Ordine inverso: 183.'],
      velocita: ['K7MA3P   K7MA3P', 'Sono identici: premi «Uguali». Se differisce anche un solo carattere, premi «Diversi».']
    }[sec.id];
    return '<div class="example"><span class="q-tag">Esempio</span><p class="q-text mono">' + esc(ex[0]) + '</p><p class="small muted">' + esc(ex[1]) + '</p></div>';
  }

  function showIntro() {
    clearTimers();
    keyHandler = null;
    S.cur = null;
    var sec = S.plan[S.si];
    var chips = [];
    if (sec.kind === 'span') chips.push('Fino a 32 sequenze', 'Nessun limite per rispondere');
    else if (sec.kind === 'speed') chips.push(SPEED.seconds + ' secondi');
    else chips.push(sectionCount(sec) + ' item', 'Massimo ' + (sec.limit >= 60 ? (sec.limit / 60).toLocaleString('it-IT') + ' min' : sec.limit + ' s') + ' per item');
    show('<div class="wrap stack">' + overallBar() +
      '<section class="sheet stack intro">' +
        '<span class="eyebrow">Prova ' + (S.si + 1) + ' di ' + S.plan.length + '</span>' +
        '<h2>' + esc(sec.name) + '</h2>' +
        '<div class="intro-meta"><span class="chip drop">' + esc(sec.ability) + '</span>' +
          chips.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div>' +
        '<p>' + esc(sec.how) + '</p>' +
        exampleHTML(sec) +
        '<div class="q-actions"><span class="small muted">Premi Invio per iniziare</span><button class="btn" id="go" type="button">Inizia la prova</button></div>' +
      '</section>' + quitFoot() + '</div>');
    $('#go').addEventListener('click', beginSection);
    keyHandler = function (e) { if (e.key === 'Enter') { e.preventDefault(); beginSection(); } };
    bindQuit();
  }

  function beginSection() {
    keyHandler = null;
    var sec = S.plan[S.si];
    S.cur = { sec: sec, n: 0, N: sec.kind === 'span' || sec.kind === 'speed' ? 0 : sectionCount(sec) };
    if (sec.kind === 'span') runSpan();
    else if (sec.kind === 'speed') runSpeed();
    else nextQuestion();
  }

  function endSection() {
    clearTimers();
    keyHandler = null;
    S.si++;
    if (S.si >= S.plan.length) finish(false);
    else showIntro();
  }

  /* ------------------------------------------------------------------ */
  /* Domande a scelta multipla, figure e risposta numerica                */
  /* ------------------------------------------------------------------ */

  function nextQuestion() {
    if (S.cur.n >= S.cur.N) return endSection();
    var item = selectItem(S.cur.sec);
    if (!item) return endSection();
    renderQuestion(item);
  }

  function parseNum(s) {
    var m = String(s).replace(/[−–]/g, '-').replace(/\s/g, '').match(/-?\d[\d.,]*/);
    if (!m) return null;
    var t = m[0].replace(/[.,]$/, '');
    if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    t = t.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return parseFloat(t);
  }

  function renderQuestion(item) {
    var sec = S.cur.sec;
    var answer;
    if (item.kind === 'numeric') {
      answer = '<div class="answer-row"><label class="sr-only" for="num">La tua risposta</label>' +
        '<input id="num" class="num-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Risposta"></div>';
    } else answer = item.kind === 'figure' ? figureOptions(item, false) : textOptions(item);
    var hint = item.kind === 'numeric' ? 'Scrivi il numero e premi Invio' : 'Tasti 1–' + item.options.length + ' per scegliere, Invio per confermare';

    show('<div class="wrap stack">' + formbar(sec, 'Item', (S.cur.n + 1) + ' / ' + S.cur.N, fmtTime(sec.limit * 1000)) +
      '<div class="timebar" id="tb" aria-hidden="true"><i></i></div>' +
      '<section class="sheet stack">' +
        '<div class="q-head">' + (item.tag ? '<span class="q-tag">' + esc(item.tag) + '</span>' : '') + item.prompt + '</div>' +
        answer +
        '<div class="q-actions"><button class="btn btn-ghost" id="skip" type="button">Salta</button>' +
          '<button class="btn" id="ok" type="button" disabled>Conferma <span class="kbd">Invio</span></button></div>' +
      '</section>' + quitFoot(hint) + '</div>');

    var ok = $('#ok'), chosen = null, input = $('#num');
    function select(i) {
      chosen = i;
      $$('.opt').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.i === i)); });
      ok.disabled = false;
    }
    function current() { return item.kind === 'numeric' ? input.value : chosen; }
    if (input) {
      input.focus();
      input.addEventListener('input', function () { ok.disabled = !input.value.trim(); });
    } else {
      $$('.opt').forEach(function (b) { b.addEventListener('click', function () { select(+b.dataset.i); }); });
    }
    ok.addEventListener('click', function () { submit(item, current(), 'answer'); });
    $('#skip').addEventListener('click', function () { submit(item, null, 'skip'); });
    keyHandler = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!ok.disabled) ok.click();
        return;
      }
      if (input || e.target.tagName === 'INPUT') return;
      var i = '12345678'.indexOf(e.key);
      if (i < 0 && e.key.length === 1) i = 'abcdefgh'.indexOf(e.key.toLowerCase());
      if (i >= 0 && i < item.options.length) select(i);
    };
    bindQuit();

    S.cur.itemStart = Date.now();
    var total = sec.limit * 1000, start = performance.now();
    var bar = $('#tb i'), tb = $('#tb'), clock = $('#clock');
    var id = setInterval(function () {
      var left = Math.max(0, total - (performance.now() - start));
      bar.style.transform = 'scaleX(' + (left / total).toFixed(4) + ')';
      clock.textContent = fmtTime(left);
      tb.classList.toggle('low', left < 10000);
      if (left <= 0) {
        // A tempo scaduto vale la risposta selezionata, se c'è.
        var v = current();
        submit(item, v, v === null || v === '' ? 'timeout' : 'answer');
      }
    }, 200);
    timers.push(id);
  }

  function submit(item, given, status) {
    clearTimers();
    keyHandler = null;
    var correct = false, givenText = '';
    if (status === 'answer' && given !== null && given !== '') {
      if (item.kind === 'numeric') {
        var v = parseNum(given);
        correct = v !== null && Math.abs(v - item.answer) < 1e-6;
        givenText = esc(String(given).trim());
      } else {
        correct = given === item.answer;
        givenText = item.options[given];
      }
    } else if (status === 'answer') status = 'skip';
    S.responses.push({
      sec: item.sec, a: item.a, b: item.b, c: item.c, correct: correct, status: status,
      ms: Date.now() - S.cur.itemStart, item: item, given: givenText
    });
    S.cur.n++;
    nextQuestion();
  }

  /* ------------------------------------------------------------------ */
  /* Memoria di cifre                                                     */
  /* ------------------------------------------------------------------ */

  function runSpan() {
    S.span = { phase: 0, len: SPAN_PHASES[0].start, trial: 0, fails: 0, count: 0 };
    spanPhaseIntro();
  }

  function spanFrame(inner, itemText) {
    var sec = S.cur.sec;
    return '<div class="wrap stack">' + formbar(sec, 'Cifre', itemText, '—') + '<section class="sheet stack">' + inner + '</section>' +
      quitFoot('Una cifra al secondo') + '</div>';
  }

  function spanPhaseIntro() {
    var ph = SPAN_PHASES[S.span.phase];
    show(spanFrame('<span class="eyebrow">Parte ' + (S.span.phase + 1) + ' di 2</span><h2>' + ph.name + '</h2>' +
      '<p>' + esc(ph.text) + ' ' + esc(ph.example) + '</p>' +
      '<div class="q-actions"><span class="small muted">Si parte da ' + ph.start + ' cifre</span>' +
      '<button class="btn" id="go" type="button">Inizia</button></div>', '—'));
    $('#go').addEventListener('click', spanTrial);
    keyHandler = function (e) { if (e.key === 'Enter') { e.preventDefault(); spanTrial(); } };
    bindQuit();
  }

  function spanTrial() {
    keyHandler = null;
    var st = S.span, ph = SPAN_PHASES[st.phase];
    var digits = gen.digits(st.len);
    show(spanFrame('<p class="q-tag">' + ph.name + ' · ' + st.len + ' cifre · tentativo ' + (st.trial + 1) + ' di 2</p>' +
      '<div class="span-stage" id="stage"><p class="span-msg">Attenzione…</p></div>', String(st.len)));
    bindQuit();
    var stage = $('#stage');
    digits.forEach(function (d, k) {
      later(function () { stage.innerHTML = '<span class="span-digit">' + d + '</span>'; }, 1000 + k * 1000);
      later(function () { stage.innerHTML = ''; }, 1000 + k * 1000 + 750);
    });
    later(function () { spanAsk(digits); }, 1000 + digits.length * 1000);
  }

  function spanAsk(digits) {
    var st = S.span, ph = SPAN_PHASES[st.phase];
    var stage = $('#stage');
    stage.innerHTML = '<div class="stack" style="align-items:center;padding:16px">' +
      '<label class="span-msg" for="num">' + (st.phase === 0 ? 'Scrivi le cifre nello stesso ordine' : 'Scrivi le cifre al contrario') + '</label>' +
      '<input id="num" class="num-input" type="text" inputmode="numeric" autocomplete="off" aria-label="Cifre">' +
      '<button class="btn" id="ok" type="button" disabled>Conferma <span class="kbd">Invio</span></button></div>';
    var input = $('#num'), ok = $('#ok');
    input.focus();
    input.addEventListener('input', function () { ok.disabled = !input.value.trim(); });
    function done() {
      keyHandler = null;
      var expected = (st.phase === 0 ? digits : digits.slice().reverse()).join('');
      var given = input.value.replace(/\D/g, '');
      var correct = given === expected;
      S.responses.push({
        sec: 'memoria', a: ph.a, b: (st.len - ph.mid) / 1.15, c: 0, correct: correct, status: given ? 'answer' : 'skip', ms: 0,
        given: esc(given || '—'),
        item: { kind: 'span', reviewQ: esc(ph.name + ' · ' + st.len + ' cifre: ' + digits.join(' ')), answerText: expected, explain: '', b: (st.len - ph.mid) / 1.15 }
      });
      if (correct) S.spanBest[st.phase] = Math.max(S.spanBest[st.phase], st.len);
      st.trial++;
      if (!correct) st.fails++;
      if (st.trial >= 2) {
        if (st.fails >= 2 || st.len >= ph.max) return spanNextPhase();
        st.len++;
        st.trial = 0;
        st.fails = 0;
      }
      spanTrial();
    }
    ok.addEventListener('click', done);
    keyHandler = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!ok.disabled) done();
      }
    };
  }

  function spanNextPhase() {
    var st = S.span;
    st.phase++;
    if (st.phase >= SPAN_PHASES.length) return endSection();
    st.len = SPAN_PHASES[st.phase].start;
    st.trial = 0;
    st.fails = 0;
    spanPhaseIntro();
  }

  /* ------------------------------------------------------------------ */
  /* Velocità di elaborazione                                             */
  /* ------------------------------------------------------------------ */

  function runSpeed() {
    var sec = S.cur.sec;
    var n = 3;
    function frame() {
      show('<div class="wrap stack">' + formbar(sec, 'Risposte', '0', fmtTime(SPEED.seconds * 1000)) +
        '<section class="sheet stack"><p class="span-msg">Tieni le dita su <span class="kbd">F</span> e <span class="kbd">J</span>, oppure usa i pulsanti.</p>' +
        '<div class="countdown" aria-live="assertive">' + n + '</div></section></div>');
    }
    frame();
    var id = setInterval(function () {
      n--;
      if (n > 0) $('.countdown').textContent = n;
      else {
        clearTimers();
        speedStart();
      }
    }, 1000);
    timers.push(id);
  }

  function speedStart() {
    var sec = S.cur.sec;
    var st = { correct: 0, wrong: 0, pair: gen.speedPair() };
    show('<div class="wrap stack">' + formbar(sec, 'Risposte', '<span id="cnt">0</span>', fmtTime(SPEED.seconds * 1000)) +
      '<div class="timebar" id="tb" aria-hidden="true"><i></i></div>' +
      '<section class="sheet stack">' +
        '<p class="q-text">I due codici sono identici?</p>' +
        '<div class="speed-pair" id="pair"><div id="pl"></div><div id="pr"></div></div>' +
        '<div class="speed-buttons"><button class="btn btn-ghost" id="same" type="button" style="touch-action:manipulation">Uguali <span class="kbd">F</span></button>' +
        '<button class="btn btn-ghost" id="diff" type="button" style="touch-action:manipulation">Diversi <span class="kbd">J</span></button></div>' +
      '</section></div>');
    var pl = $('#pl'), pr = $('#pr'), pairEl = $('#pair'), cnt = $('#cnt');
    function draw() {
      pl.textContent = st.pair.left;
      pr.textContent = st.pair.right;
    }
    function respond(same) {
      if (same === st.pair.same) st.correct++;
      else st.wrong++;
      cnt.textContent = st.correct + st.wrong;
      st.pair = gen.speedPair();
      draw();
      pairEl.classList.remove('flash');
      void pairEl.offsetWidth;
      pairEl.classList.add('flash');
    }
    draw();
    $('#same').addEventListener('click', function () { respond(true); });
    $('#diff').addEventListener('click', function () { respond(false); });
    keyHandler = function (e) {
      if (e.repeat) return;
      var k = e.key.toLowerCase();
      if (k === 'f' || e.key === 'ArrowLeft') { e.preventDefault(); respond(true); }
      else if (k === 'j' || e.key === 'ArrowRight') { e.preventDefault(); respond(false); }
    };
    var total = SPEED.seconds * 1000, start = performance.now();
    var bar = $('#tb i'), tb = $('#tb'), clock = $('#clock');
    var id = setInterval(function () {
      var left = Math.max(0, total - (performance.now() - start));
      bar.style.transform = 'scaleX(' + (left / total).toFixed(4) + ')';
      clock.textContent = fmtTime(left);
      tb.classList.toggle('low', left < 10000);
      if (left <= 0) {
        var score = st.correct - st.wrong;
        var z = Math.max(-3, Math.min(3, (score - SPEED.mean) / SPEED.sd));
        S.normals.push({ z: z, loading: SPEED.loading });
        S.speed = { correct: st.correct, wrong: st.wrong, score: score, z: z };
        endSection();
      }
    }, 100);
    timers.push(id);
  }

  /* ------------------------------------------------------------------ */
  /* Risultati                                                            */
  /* ------------------------------------------------------------------ */

  function sectionResult(sec) {
    if (sec.id === 'velocita') {
      if (!S.speed) return null;
      var rel = SPEED.reliability;
      return {
        sec: sec, index: 100 + 15 * rel * S.speed.z, se: totalSE(15 * Math.sqrt(1 - rel)),
        n: S.speed.correct + S.speed.wrong, correct: S.speed.correct,
        detail: S.speed.correct + ' giuste, ' + S.speed.wrong + ' sbagliate (punteggio ' + S.speed.score + ')'
      };
    }
    var rs = S.responses.filter(function (r) { return r.sec === sec.id; });
    if (!rs.length) return null;
    var e = irt.estimate(rs);
    var correct = rs.filter(function (r) { return r.correct; }).length;
    return {
      sec: sec, index: irt.toIQ(e.theta), se: totalSE(15 * e.se), n: rs.length, correct: correct,
      detail: sec.id === 'memoria'
        ? 'Span diretto ' + (S.spanBest[0] || '—') + ', inverso ' + (S.spanBest[1] || '—')
        : correct + ' corrette su ' + rs.length
    };
  }

  function finish(partial) {
    clearTimers();
    keyHandler = null;
    var g = irt.estimate(S.responses, S.normals);
    var iq = irt.toIQ(g.theta), se = totalSE(15 * g.se);
    var res = {
      date: new Date().toISOString(), mode: S.mode, partial: !!partial,
      iq: iq, se: se, seModel: 15 * g.se, lo: iq - 1.96 * se, hi: iq + 1.96 * se,
      pct: 100 * irt.normCdf(g.theta), rel: 1 - g.se * g.se,
      n: S.responses.length + (S.speed ? 1 : 0),
      correct: S.responses.filter(function (r) { return r.correct; }).length,
      minutes: Math.max(1, Math.round((Date.now() - S.started) / 60000)),
      sections: S.plan.map(sectionResult).filter(Boolean)
    };
    saveHistory(res);
    renderResults(res);
  }

  function pctText(p) {
    if (p >= 99.9) return 'più del 99,9%';
    if (p >= 99) return 'il ' + fmtNum(p, 1) + '%';
    if (p < 1) return 'meno dell\'1%';
    return 'il ' + fmtNum(p, 0) + '%';
  }

  function curveSVG(res) {
    var L = 24, R = 616, T = 34, B = 176;
    function x(v) { return L + (v - 40) / 120 * (R - L); }
    function y(v) { return B - Math.exp(-Math.pow((v - 100) / 15, 2) / 2) * (B - T); }
    var pts = [];
    for (var v = 40; v <= 160; v++) pts.push(x(v).toFixed(1) + ',' + y(v).toFixed(1));
    var area = 'M' + x(40) + ',' + B + ' L' + pts.join(' L') + ' L' + x(160) + ',' + B + ' Z';
    var lo = Math.max(40, res.lo), hi = Math.min(160, res.hi);
    var band = [];
    for (var w = lo; w <= hi; w += 0.5) band.push(x(w).toFixed(1) + ',' + y(w).toFixed(1));
    band.push(x(hi).toFixed(1) + ',' + y(hi).toFixed(1));
    var bandPath = 'M' + x(lo).toFixed(1) + ',' + B + ' L' + band.join(' L') + ' L' + x(hi).toFixed(1) + ',' + B + ' Z';
    var sd = [55, 70, 85, 100, 115, 130, 145].map(function (v) {
      return '<line class="sdl" x1="' + x(v) + '" x2="' + x(v) + '" y1="' + B + '" y2="' + y(v).toFixed(1) + '"/>' +
        '<text x="' + x(v) + '" y="' + (B + 18) + '" text-anchor="middle">' + v + '</text>';
    }).join('');
    var pcts = [[62, '2,3%'], [77.5, '13,6%'], [92.5, '34,1%'], [107.5, '34,1%'], [122.5, '13,6%'], [138, '2,3%']].map(function (p) {
      return '<text class="lbl-pct" x="' + x(p[0]) + '" y="' + (B - 8) + '" text-anchor="middle">' + p[1] + '</text>';
    }).join('');
    var mx = x(Math.max(42, Math.min(158, res.iq)));
    var anchor = mx < 80 ? 'start' : mx > 560 ? 'end' : 'middle';
    return '<svg class="curve" viewBox="0 0 640 206" role="img" aria-label="Curva normale del QI con la tua posizione a ' + Math.round(res.iq) + '">' +
      '<path class="area" d="' + area + '"/>' +
      '<path class="ci-band" d="' + bandPath + '"/>' +
      sd + pcts +
      '<polyline class="line" points="' + pts.join(' ') + '"/>' +
      '<line class="base" x1="' + L + '" x2="' + R + '" y1="' + B + '" y2="' + B + '"/>' +
      '<line class="me" x1="' + mx + '" x2="' + mx + '" y1="' + B + '" y2="22"/>' +
      '<circle class="me-dot" cx="' + mx + '" cy="' + y(Math.max(40, Math.min(160, res.iq))).toFixed(1) + '" r="5"/>' +
      '<text class="lbl-me" x="' + mx + '" y="14" text-anchor="' + anchor + '">Tu: ' + Math.round(res.iq) + '</text>' +
      '</svg>';
  }

  function profileHTML(sections) {
    function pos(v) { return Math.max(0, Math.min(100, (v - 55) / 90 * 100)); }
    var rows = sections.map(function (s) {
      var lo = s.index - 1.96 * s.se, hi = s.index + 1.96 * s.se;
      return '<div class="prow"><div class="prow-name"><b>' + esc(s.sec.name) + '</b><span>' + esc(s.sec.ability) + '</span></div>' +
        '<div class="track" aria-hidden="true"><span class="zone" style="left:' + pos(85) + '%;width:' + (pos(115) - pos(85)) + '%"></span>' +
          '<span class="mid" style="left:50%"></span>' +
          '<span class="ci" style="left:' + pos(lo).toFixed(1) + '%;width:' + (pos(hi) - pos(lo)).toFixed(1) + '%"></span>' +
          '<span class="dot" style="left:' + pos(s.index).toFixed(1) + '%"></span></div>' +
        '<div class="prow-val">' + Math.round(s.index) + '<small>± ' + Math.round(1.96 * s.se) + '</small></div></div>';
    }).join('');
    var ticks = [55, 70, 85, 100, 115, 130, 145].map(function (v, i, a) {
      var tr = i === 0 ? 'translateX(0)' : i === a.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
      return '<span style="left:' + pos(v) + '%;transform:' + tr + '">' + v + '</span>';
    }).join('');
    return '<div class="profile">' + rows + '<div class="scale" aria-hidden="true"><span></span><div class="ticks">' + ticks + '</div><span></span></div></div>';
  }

  function correctText(item) {
    if (item.kind === 'numeric') return esc(fmtAnswer(item.answer));
    if (item.kind === 'span') return esc(item.answerText);
    return item.options[item.answer];
  }

  function reviewHTML(res) {
    return res.sections.filter(function (s) { return s.sec.id !== 'velocita'; }).map(function (s) {
      var rs = S.responses.filter(function (r) { return r.sec === s.sec.id; });
      var items = rs.map(function (r) {
        var it = r.item;
        var mark = r.correct ? '<span class="rv-mark ok" aria-label="Corretta">✓</span>'
          : r.status === 'answer' ? '<span class="rv-mark ko" aria-label="Sbagliata">✗</span>'
          : '<span class="rv-mark skip" aria-label="' + (r.status === 'timeout' ? 'Tempo scaduto' : 'Saltata') + '">–</span>';
        var level = 'Livello dell\'item: QI ≈ ' + itemLevel(it.b) + (r.status === 'timeout' ? ' · tempo scaduto' : r.status === 'skip' ? ' · saltata' : '');
        var body;
        if (it.kind === 'figure') {
          body = '<div class="rv-figs">' + it.reviewQ +
            (r.given ? '<figure><div class="mini">' + r.given + '</div>Tua risposta</figure>' : '') +
            '<figure><div class="mini">' + correctText(it) + '</div>Corretta</figure></div>';
        } else {
          body = '<span class="q">' + it.reviewQ + '</span>' +
            '<span>Tua risposta: <b>' + (r.given || '—') + '</b> · Corretta: <b>' + correctText(it) + '</b></span>';
        }
        return '<li class="rv-item">' + mark + '<div class="rv-body">' + body +
          (it.explain ? '<span class="muted">' + esc(it.explain) + '</span>' : '') +
          '<span class="muted mono small">' + level + '</span></div></li>';
      }).join('');
      return '<details class="review"><summary>' + esc(s.sec.name) + '<span>' + s.correct + ' / ' + s.n + '</span></summary>' +
        '<ol class="rv-list">' + items + '</ol></details>';
    }).join('');
  }

  function renderResults(res) {
    var iq = Math.round(res.iq);
    var secs = res.sections;
    var spread = '';
    if (secs.length >= 3) {
      var sorted = secs.slice().sort(function (a, b) { return b.index - a.index; });
      var top = sorted[0], low = sorted[sorted.length - 1];
      if (top.index - low.index >= 12) {
        spread = '<p>Il tuo punto di forza relativo è <b>' + esc(top.sec.name.toLowerCase()) + '</b> (' + Math.round(top.index) +
          '); l\'area relativamente più debole è <b>' + esc(low.sec.name.toLowerCase()) + '</b> (' + Math.round(low.index) +
          '). Le differenze inferiori a circa 15 punti tra due indici rientrano spesso nell\'errore di misura.</p>';
      } else {
        spread = '<p>I tuoi indici sono abbastanza omogenei: le differenze tra le prove rientrano nell\'errore di misura.</p>';
      }
    }
    var table = '<div class="table-wrap"><table><thead><tr><th>Prova</th><th>Dettaglio</th><th class="num">Indice</th><th class="num">IC 95%</th></tr></thead><tbody>' +
      secs.map(function (s) {
        return '<tr><td>' + esc(s.sec.name) + '</td><td>' + esc(s.detail) + '</td><td class="num">' + Math.round(s.index) + '</td>' +
          '<td class="num">' + Math.round(s.index - 1.96 * s.se) + '–' + Math.round(s.index + 1.96 * s.se) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var hist = loadHistory();

    show('<div class="wrap stack-lg">' +
      '<section class="stack">' +
        '<span class="eyebrow">Profilo dei risultati · ' + esc(MODES[res.mode].name) + ' · ' +
          esc(new Date(res.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })) + '</span>' +
        '<div class="score-card"><div><span class="small muted">QI stimato</span><div class="score-num">' + iq + '</div></div>' +
          '<div class="score-side"><span class="score-class">' + irt.classify(iq) + '</span>' +
            '<p class="score-ci">Intervallo di confidenza al 95%: <b class="mono">' + Math.round(res.lo) + '–' + Math.round(res.hi) + '</b></p>' +
            '<p class="muted">Ottieni un punteggio superiore a quello di ' + pctText(res.pct) + ' della popolazione.</p></div></div>' +
        (res.partial ? '<p class="notice">Hai terminato il test in anticipo: la stima si basa solo sulle risposte date e l\'intervallo è più ampio.</p>' : '') +
        '<div class="stats">' +
          '<div><small>Errore standard</small><b>± ' + fmtNum(res.se, 1) + '</b></div>' +
          '<div><small>Affidabilità</small><b>' + fmtNum(Math.max(0, res.rel), 2) + '</b></div>' +
          '<div><small>Risposte corrette</small><b>' + res.correct + ' / ' + (res.n - (S.speed ? 1 : 0)) + '</b></div>' +
          '<div><small>Durata</small><b>' + res.minutes + ' min</b></div>' +
        '</div>' +
      '</section>' +
      '<section class="stack"><h2>La tua posizione sulla curva</h2>' +
        '<div class="curve-wrap">' + curveSVG(res) + '</div>' +
        '<p class="small muted">Distribuzione del QI nella popolazione (media 100, deviazione standard 15). La fascia colorata è il tuo intervallo di confidenza.</p></section>' +
      (secs.length ? '<section class="stack"><h2>Profilo per abilità</h2>' + profileHTML(secs) +
        '<p class="small muted">Il punto è l\'indice di ogni prova, la barra il suo intervallo al 95%. La fascia grigia indica la media (85–115). Gli indici di prove brevi sono meno precisi del QI totale.</p>' +
        spread + table + '</section>' : '') +
      '<section class="prose"><h3>Come è stato calcolato</h3>' +
        '<p>Ogni domanda ha tre parametri: difficoltà, capacità di distinguere i livelli e probabilità di indovinare a caso. Dopo ogni risposta il programma aggiorna la distribuzione di probabilità del tuo livello (stima bayesiana EAP con distribuzione iniziale normale, media 100 e deviazione standard 15) e sceglie la domanda successiva più informativa per quel livello.</p>' +
        '<p>Il QI è la media di questa distribuzione e l\'intervallo al 95% vale ± 1,96 errori standard. Memoria e velocità pesano meno, perché sono meno legate al fattore generale di intelligenza.</p>' +
        '<p>I parametri delle domande sono stimati e non tarati su un campione rappresentativo. Per questo l\'errore standard include, oltre all\'errore di misura (± ' + fmtNum(res.seModel, 1) + ' punti), un\'incertezza fissa di ' + NORM_SE + ' punti dovuta alla taratura, che nessun numero di domande può eliminare.</p>' +
      '</section>' +
      '<section class="stack"><h2>Rivedi le risposte</h2>' + reviewHTML(res) + '</section>' +
      (hist.length > 1 ? '<section class="stack"><h2>Storico</h2>' + historyHTML(hist) + '</section>' : '') +
      '<div class="row"><button class="btn btn-drop" id="again" type="button">Torna all\'inizio</button></div>' +
    '</div>');
    $('#again').addEventListener('click', renderHome);
  }

  IQ.app = { start: renderHome, parseNum: parseNum, MODES: MODES, SECTIONS: SECTIONS };
  renderHome();
})(window.IQ);
