// Scripted events (coroutines). `yield n` waits n frames, `yield fn` waits until fn() is true.

export const EVENTS = {
  // New game: waking up on the shrine altar.
  *intro(g) {
    const pl = g.player;
    g.cutscene = true;
    g.hud.visible = false;
    g.audio.stopMusic(0.5);
    pl.setState('sleep');
    yield 110;
    yield g.dialog([
      { text: '...' },
      { text: 'Freddo. Pietra sotto la schiena. Un odore di cenere.' },
      { text: 'Da quanto tempo stavi dormendo?' },
    ]);
    pl.setState('rise');
    g.audio.play('whoosh');
    yield 46;
    pl.setState('move');
    pl.dir = 'down';
    g.hud.visible = true;
    g.cutscene = false;
    g.audio.playMusic('village', 2);
    g.hints.show('move', 20);
  },

  *hintAttack(g) {
    g.hints.show('attack');
  },

  // The three seals open the sanctuary gate in the village.
  *openSeal(g, gate) {
    g.cutscene = true;
    const pl = g.player;
    pl.setState('locked');
    pl.dir = 'left';
    g.camera.focus = { x: gate.x + 8, y: gate.y - 10 };
    yield 30;
    for (let i = 0; i < 3; i++) {
      g.audio.play('crystal');
      g.particles.burst(gate.x + 8 - 12 + i * 12, gate.y - 12, 10, { speed: 1, life: 30, colors: ['#feae34', '#ffffff'], drag: 0.95, glow: 4 });
      yield 30;
    }
    g.audio.play('rumble');
    for (let i = 0; i < 6; i++) { g.camera.shake(0.3); yield 10; }
    g.flashScreen('#ffffff', 0.8);
    g.audio.play('explosion');
    g.progress.flags['seal.open'] = true;
    gate.open = true;
    gate.solid = false;
    gate.interactable = false;
    yield 40;
    yield g.dialog([{ text: 'I tre sigilli si accendono. Il portale di pietra si apre su una scalinata che sale nel vuoto.' }]);
    g.camera.focus = null;
    pl.setState('move');
    g.cutscene = false;
    g.autosave(0);
  },

  // The last choice at the altar of the Lume.
  *finale(g) {
    g.cutscene = true;
    const pl = g.player;
    pl.setState('locked');
    pl.dir = 'left';
    g.audio.stopMusic(2);
    yield 40;
    yield g.dialog([
      { speaker: 'lume', text: 'La fiamma trema, piccola come una candela. Ti riconosce.' },
      { speaker: 'lume', text: 'Puoi darle la tua luce: brucerà di nuovo, e Velmora si sveglierà. Ma tu non tornerai indietro.' },
      { speaker: 'lume', text: 'Oppure puoi tenerla per te, e scendere a valle. Il regno dormirà per sempre, e tu sarai libero.' },
    ]);
    yield g.ask('lume', 'Che cosa scegli?', ['Offri la tua luce', 'Tieni la tua luce']);
    const choice = g.lastResult === 0 ? 'light' : 'keep';
    g.progress.ended = choice;
    g.progress.flags['ending.' + choice] = true;
    g.autosave(0);
    yield 20;
    g.app.toEnding(g.progress, choice);
  },
};
