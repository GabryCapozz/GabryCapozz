# Ultimo Lume

Action-adventure 2D in pixel art, ispirato ai giochi dell'era 16-bit ma con un gameplay moderno e reattivo.

Ti risvegli sull'altare di un santuario in rovina. Il **Lume** — la fiamma che teneva sveglio il regno di Velmora — si è spento, e con lui il paese è caduto nel Sonno Grigio. Esplora il mondo, sconfiggi i guardiani, recupera i tre sigilli e decidi cosa fare dell'ultima fiamma.

Tutto è generato in codice: sprite, tile, font bitmap, musica chiptune ed effetti sonori. Nessun asset esterno, nessuna dipendenza a runtime.

## Come giocare

Il gioco usa moduli ES, quindi serve un piccolo server locale (nessuna dipendenza):

```bash
cd ultimo-lume
npm start            # http://localhost:8080
```

Oppure crea una versione in un unico file HTML, apribile con un doppio clic:

```bash
npm install
npm run build        # genera dist/ultimo-lume.html
```

## Comandi

| Azione | Tastiera | Gamepad |
| --- | --- | --- |
| Movimento (8 direzioni) | WASD / Frecce | Stick / Croce |
| Attacco (combo da 3 colpi) | J / Z | A |
| Schivata | K / X / Spazio | B |
| Abilità equipaggiata | L / C | X |
| Interagisci / parla / apri | E / V | Y |
| Cambia abilità | Q / Tab | RB |
| Pozione | R / F | LT |
| Corsa (tieni premuto) | Shift | RT |
| Mappa | M | Select |
| Menu / pausa | Esc / P | Start |

Tieni premuto **Attacco** dopo un colpo e rilascialo per il Fendente Rotante (dopo averlo ottenuto). I tasti principali sono rimappabili da *Opzioni → Comandi*.

## Struttura del progetto

```
src/
  core/       loop, input (tastiera + gamepad), costanti, matematica
  gfx/        palette, font bitmap, generatori di sprite e tile
  audio/      motore WebAudio, sequencer chiptune, tracce, effetti sonori
  world/      tipi di tile, stanze (mappe ASCII), rendering autotile, mondo a celle
  entities/   player, nemici (state machine), boss, props, NPC, proiettili, pickup
  systems/    combattimento, collisioni, camera, particelle, luci, abilità, inventario, salvataggi
  ui/         HUD, dialoghi, menu di pausa, mappa con segnalini, negozio, suggerimenti
  scenes/     titolo, gioco, finale
  data/       mondo, dialoghi, oggetti, regioni, eventi
tools/        server di sviluppo, build, validatore delle mappe, scenari di test
```

## Sviluppo

```bash
npm run check        # valida tutte le mappe (dimensioni, uscite allineate, warp)
npm test             # validatore + smoke test in Chromium headless
```

Aggiungi `?debug=1` all'URL per esporre `window.__app` nella console.
