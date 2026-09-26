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
};
