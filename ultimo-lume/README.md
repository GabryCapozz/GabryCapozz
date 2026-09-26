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

Tieni premuto **Attacco** e rilascialo per il Fendente Rotante (si sblocca con il Cuore di Pietra). I tasti principali sono rimappabili da *Opzioni → Comandi*.

## Il mondo

Sei regioni collegate tra loro, con scorciatoie che si aprono man mano, segreti e aree
bloccate che richiedono abilità trovate più avanti:

| Regione | Cosa ci trovi | Guardiano | Ricompensa |
| --- | --- | --- | --- |
| Villaggio Abbandonato | Maren, la forgia di Brann, il negozio di Oda, il cimitero, il cancello sigillato | — | — |
| Foresta Antica | l'accampamento di Gert (lanterna), la radura del Grande Albero, il baratro | — | — |
| Rovine del Guardiano | Bombe, blocchi da spingere, piastre, cristalli, statue-gufo | Antico Guardiano di Pietra | Cuore di Pietra (Fendente Rotante) |
| Miniere Dimenticate | Arco, binari, lava, la vecchia forgia, il pozzo verso il villaggio | — | — |
| Caverne Sotterranee | labirinto buio, cristalli, circolo dei maghi, lago sotterraneo | Creatura delle Profondità | Occhio dell'Abisso (Passo d'Ombra) |
| Castello in Rovina | armeria delle rune, biblioteca di Sorella Vela, torre dell'argano | Ser Aldric, il Cavaliere Corrotto | Giuramento Spezzato (Lama di Luce) |
| Santuario del Lume | sigilli di luce, gradini nel vuoto, l'altare | L'Eco del Viandante | il finale |

Ogni boss ha tre fasi che cambiano l'arena (crolli, tentacoli e acido, fiamme oscure e buio,
anello di fuoco). I nemici comuni — slime, pipistrelli, scheletri con parata, arcieri,
guardiani corazzati, maghi, scarabei, fuochi fatui, torrette — sono macchine a stati
(IDLE / PATROL / CHASE / ATTACK / HURT / DEAD più stati propri) con pathfinding e linea di vista.

**Progressione:** frammenti di cuore (4 = un cuore in più), contenitori dai boss, ampolle
per le pozioni, radici per la stamina, tre livelli di spada alla forgia (minerale, frammenti
di cristallo, acciaio), sacca e faretra più capienti. Le otto pagine del diario del Custode
raccontano cosa è successo prima del Sonno; Sorella Vela le raccoglie.

**Salvataggi:** tre slot, salvataggio automatico ai cambi di stanza, alla raccolta di oggetti
e ai bracieri (che fanno anche da checkpoint e ricaricano le pozioni). La mappa mostra solo le
stanze visitate e permette di piazzare segnalini personalizzati.

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
npm install
npm run check        # valida le mappe: dimensioni, uscite allineate, warp, oggetti piazzati
npm test             # validatore + smoke test in Chromium headless (sorgenti e build in un file)
npm run build        # dist/ultimo-lume.html
```

Aggiungi `?debug=1` all'URL per esporre `window.__app` nella console.
Con il server avviato, `node tools/run.mjs tools/scenarios/<nome>.mjs <cartella>` esegue uno
scenario scriptato (per esempio `knight.mjs`, `echo.mjs`, `tour.mjs`) e salva gli screenshot;
`tools/gallery*.html` mostrano tutti gli sprite e i tile generati.

Il gioco gira a 60 FPS con un passo fisso: la scena viene disegnata su un canvas 480×270 e
scalata a multipli interi, le stanze sono pre-renderizzate e solo acqua, lava, entità e luci
vengono ridisegnate a ogni frame.
