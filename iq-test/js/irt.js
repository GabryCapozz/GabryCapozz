/*
 * Motore psicometrico: modello IRT a tre parametri (3PL) e stima EAP dell'abilità.
 *
 * Ogni item ha discriminazione a, difficoltà b (in unità di deviazione standard della
 * popolazione) e probabilità di indovinare c. L'abilità theta ha prior N(0, 1), quindi
 * QI = 100 + 15 * theta.
 */
(function (IQ) {
  'use strict';

  var D = 1.7;
  var GRID = [];
  for (var i = 0; i <= 360; i++) GRID.push(-4.5 + i * 0.025);

  function prob(item, theta) {
    var p = item.c + (1 - item.c) / (1 + Math.exp(-D * item.a * (theta - item.b)));
    return Math.min(1 - 1e-9, Math.max(1e-9, p));
  }

  // Informazione di Fisher dell'item in theta.
  function info(item, theta) {
    var p = prob(item, theta);
    var k = (p - item.c) / (1 - item.c);
    return D * D * item.a * item.a * k * k * (1 - p) / p;
  }

  // Difficoltà che rende un item 3PL massimamente informativo per un dato theta.
  function optimalB(theta, a, c) {
    return theta + Math.log((1 + Math.sqrt(1 + 8 * c)) / 2) / (D * a);
  }

  /*
   * Stima a posteriori (EAP) su griglia.
   * responses: [{a, b, c, correct}]
   * normals:   [{z, loading}] punteggi continui (es. velocità) modellati come
   *            z ~ N(loading * theta, 1 - loading^2).
   */
  function estimate(responses, normals) {
    var logp = GRID.map(function (t) { return -t * t / 2; });
    (responses || []).forEach(function (r) {
      for (var g = 0; g < GRID.length; g++) {
        var p = prob(r, GRID[g]);
        logp[g] += Math.log(r.correct ? p : 1 - p);
      }
    });
    (normals || []).forEach(function (n) {
      var v = 1 - n.loading * n.loading;
      for (var g = 0; g < GRID.length; g++) {
        var d = n.z - n.loading * GRID[g];
        logp[g] -= d * d / (2 * v);
      }
    });
    var max = -Infinity;
    logp.forEach(function (l) { if (l > max) max = l; });
    var sw = 0, sm = 0;
    var w = logp.map(function (l, g) {
      var x = Math.exp(l - max);
      sw += x;
      sm += x * GRID[g];
      return x;
    });
    var mean = sm / sw;
    var v2 = 0;
    w.forEach(function (x, g) { v2 += x * (GRID[g] - mean) * (GRID[g] - mean); });
    return { theta: mean, se: Math.sqrt(v2 / sw), n: (responses || []).length };
  }

  // Funzione di ripartizione normale standard (Abramowitz-Stegun 7.1.26).
  function normCdf(z) {
    var t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t *
      Math.exp(-z * z / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }

  function toIQ(theta) { return 100 + 15 * theta; }

  // Fasce descrittive sulla scala Wechsler.
  function classify(iq) {
    if (iq >= 130) return 'Molto superiore';
    if (iq >= 120) return 'Superiore';
    if (iq >= 110) return 'Medio-alto';
    if (iq >= 90) return 'Nella media';
    if (iq >= 80) return 'Medio-basso';
    if (iq >= 70) return 'Limite';
    return 'Molto basso';
  }

  IQ.irt = {
    D: D,
    prob: prob,
    info: info,
    optimalB: optimalB,
    estimate: estimate,
    normCdf: normCdf,
    toIQ: toIQ,
    classify: classify
  };
})(typeof window !== 'undefined' ? (window.IQ = window.IQ || {}) : (globalThis.IQ = globalThis.IQ || {}));
