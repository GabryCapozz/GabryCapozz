// NPC definitions. Each `talk` is a generator run as a script: `yield g.say(...)`.
// Dialogue depends on story progress and flags, so characters react to the world.
import { TOTAL_PAGES } from './items.js';

export const SPEAKERS = {
  maren: { name: 'Maren', pitch: 520, look: 'maren' },
  brann: { name: 'Brann', pitch: 260, look: 'brann' },
  oda: { name: 'Oda', pitch: 360, look: 'oda' },
  tobi: { name: 'Tobi', pitch: 820, look: 'tobi' },
  gert: { name: 'Gert', pitch: 210, look: 'gert' },
  vela: { name: 'Sorella Vela', pitch: 640, look: 'vela' },
  aldric: { name: 'Ser Aldric', pitch: 150, look: 'aldric' },
  ghost: { name: 'Ombra', pitch: 300, look: 'ghost' },
  echo: { name: '???', pitch: 330, look: null },
  lume: { name: 'Il Lume', pitch: 900, look: null },
};

const st = (pr) => pr.story;

export const NPCS = {
  maren: {
    look: 'maren',
    hasNews: (pr) => !pr.flags['maren.met'] || pr.flags['maren.seen' + pr.story] !== true,
    *talk(g) {
      const pr = g.progress;
      if (!pr.flags['maren.met']) {
        pr.flags['maren.met'] = true;
        pr.flags['maren.seen0'] = true;
        yield g.say('maren', [
          'Oh... sei sveglio. Non credevo che qualcuno si sarebbe svegliato ancora.',
          'Il {Lume} si è spento, e il paese si è addormentato con lui. Restiamo io e qualche ombra.',
          'Hai una spada, vedo. Bene. A est, oltre il ponte, la foresta nasconde {rovine} più antiche delle nostre ossa.',
          'Se il Lume può ancora essere riacceso, la strada comincia lì.',
        ]);
        return;
      }
      pr.flags['maren.seen' + st(pr)] = true;
      switch (st(pr)) {
        case 0:
          yield g.say('maren', [
            'Le rovine sono a {nord-est}, oltre la foresta.',
            'Riposa ai {bracieri}: il fuoco ricorda chi lo accende.',
          ]);
          break;
        case 1:
          yield g.say('maren', [
            'Il {Cuore di Pietra}... batte ancora. Allora il Guardiano ti ha riconosciuto.',
            'Gert, il minatore, è accampato a est della foresta. Parlava di gallerie sotto la montagna.',
          ]);
          break;
        case 2:
          yield g.say('maren', [
            "Quell'occhio... non guardarlo troppo a lungo.",
            'Il {castello} è a nord, oltre il baratro. Un tempo c\'era un ponte. Un tempo c\'erano molte cose.',
          ]);
          break;
        case 3:
          yield g.say('maren', [
            'Tre sigilli. Il {cancello a ovest} del paese ti aspetta da molto tempo.',
            '...Anche io ti aspettavo, credo.',
          ]);
          break;
        default:
          yield g.say('maren', ['Qualunque cosa tu abbia scelto, grazie di essere tornato.']);
      }
    },
  },

  brann: {
    look: 'brann',
    *talk(g) {
      const pr = g.progress;
      if (!pr.flags['brann.met']) {
        pr.flags['brann.met'] = true;
        yield g.say('brann', [
          'Un cliente! E sveglio, per giunta! Il Sonno Grigio è terribile per gli affari.',
          'Brann, mercante di cose utili e di alcune inutili. Dai un\'occhiata.',
        ]);
      } else {
        const lines = [
          'Le bombe? Ottime per i muri crepati. E per i problemi di vicinato.',
          'Le ombre non comprano niente. Tu invece hai l\'aria di chi paga.',
          'Ho visto cose strane al castello. Cose che non si possono vendere. Terribile.',
          'Monete dai vasi rotti, monete dai mostri. Io non chiedo da dove vengono.',
        ];
        yield g.say('brann', [lines[(g.time >> 6) % lines.length]]);
      }
      yield g.openShop('brann');
    },
  },

  oda: {
    look: 'oda',
    *talk(g) {
      const pr = g.progress;
      if (!pr.flags['oda.met']) {
        pr.flags['oda.met'] = true;
        yield g.say('oda', [
          'Spada vecchia, braccio giovane. Si vede da qui.',
          'Sono Oda. Portami {minerale} delle miniere e ti renderò la lama più cattiva.',
        ]);
      }
      yield g.openForge();
    },
  },

  tobi: {
    look: 'tobi',
    ghost: true,
    present: (pr) => !pr.flags['tobi.done'],
    hasNews: (pr) => !pr.flags['tobi.met'] || (pr.items.toyHorse > 0),
    *talk(g, npc) {
      const pr = g.progress;
      if (pr.items.toyHorse > 0) {
        yield g.say('tobi', [
          'Il mio cavallino! L\'hai trovato!',
          '...Adesso mi ricordo. La mamma mi ha chiamato per cena, tanto tempo fa.',
          'Tieni, è un regalo. L\'avevo trovato sotto il letto. Io non ne ho più bisogno.',
        ]);
        pr.items.toyHorse = 0;
        yield g.giveItem('heartPiece', 1, { present: true });
        yield g.say('tobi', ['Ciao. Grazie.']);
        pr.flags['tobi.done'] = true;
        npc.vanishing = true;
        npc.interactable = false;
        return;
      }
      if (!pr.flags['tobi.met']) {
        pr.flags['tobi.met'] = true;
        yield g.say('tobi', [
          'Hai visto il mio {cavallino di legno}? L\'ho perso nella foresta.',
          'Era vicino a un albero grande grande, dove c\'è l\'erba alta.',
          'La mamma dice che non devo andare da solo. Però tu sei grande.',
        ]);
      } else {
        yield g.say('tobi', ['Nella foresta, vicino all\'albero grande... per favore.']);
      }
    },
  },

  gert: {
    look: 'gert',
    // camps by the mine until the caves are cleared, then moves back to the village
    present: (pr, room) => (room === 'f_camp' ? pr.story < 2 : pr.story >= 2 && room === 'v_west'),
    hasNews: (pr) => !pr.abilities.lantern,
    *talk(g) {
      const pr = g.progress;
      if (!pr.abilities.lantern) {
        yield g.say('gert', [
          'Eh? Un viso sveglio! Da quanto non ne vedevo uno.',
          'Gert. Scavavo in queste montagne, prima del Sonno. L\'ingresso della {miniera} è franato.',
          'Senza esplosivo, niente da fare. Ma se trovi il modo... laggiù è buio come la pancia di un lupo.',
          'Prendi la mia lanterna. Io tanto non ci torno.',
        ]);
        yield g.giveItem('lantern', 1, { present: true });
        return;
      }
      if (!pr.visited.m_entry) {
        yield g.say('gert', ['La frana è lì, a nord. Una bomba ben piazzata e il passaggio si riapre.']);
        return;
      }
      if (pr.story < 2) {
        yield g.say('gert', [
          'Hai aperto la frana? Ah! Allora vai.',
          'Il ferro là sotto è ancora buono. Oda, in paese, ne farebbe una lama degna.',
          'Le gallerie più profonde scendono fino alle {caverne di cristallo}. Io non ci torno, nemmeno per tutto l\'oro.',
        ]);
        return;
      }
      yield g.say('gert', ['Sono tornato in paese. Qui almeno il fuoco è acceso.', 'Hai visto le caverne? Brilla tutto, laggiù. Ma non di buono.']);
    },
  },

  vela: {
    look: 'vela',
    hasNews: (pr) => (pr.items.page || 0) > (pr.flags['vela.pagesRead'] || 0),
    *talk(g) {
      const pr = g.progress;
      if (!pr.flags['vela.met']) {
        pr.flags['vela.met'] = true;
        yield g.say('vela', [
          'Un visitatore, in questa biblioteca? Che il Lume ti protegga... per quel che resta.',
          'Sono Sorella Vela. Cerco le {pagine perdute} del diario del Custode.',
          'Se ne trovi, portamele. In cambio ti dirò ciò che raccontano.',
        ]);
      }
      const have = pr.items.page || 0;
      const read = pr.flags['vela.pagesRead'] || 0;
      if (have > read) {
        for (let i = read; i < have; i++) {
          yield g.say('vela', ['Vediamo questa pagina...', '"' + PAGES[i] + '"']);
        }
        pr.flags['vela.pagesRead'] = have;
        if (have >= 4 && !pr.flags['vela.reward1']) {
          pr.flags['vela.reward1'] = true;
          yield g.say('vela', ['Metà del diario. Prendi questa radice: il Custode la usava per le lunghe veglie.']);
          yield g.giveItem('root', 1, { present: true });
        }
        if (have >= TOTAL_PAGES && !pr.flags['vela.reward2']) {
          pr.flags['vela.reward2'] = true;
          yield g.say('vela', ['Il diario è completo. Ora so chi sei, Portatore.', 'Non ti chiederò perché sei fuggito. Prendi questo, e vai.']);
          yield g.giveItem('heartPiece', 1, { present: true });
        }
      } else {
        yield g.say('vela', [have >= TOTAL_PAGES ? 'Rileggo il diario ogni notte. Ogni volta finisce allo stesso modo.' : `Ho letto ${read} pagine su ${TOTAL_PAGES}. Le altre sono sparse per Velmora.`]);
      }
    },
  },

  ghostBaker: {
    look: 'ghost',
    ghost: true,
    *talk(g) { yield g.say('ghost', ['...il pane... devo sfornare il pane prima che si svegli il paese...']); },
  },
  ghostGuard: {
    look: 'ghost',
    ghost: true,
    *talk(g) {
      yield g.say('ghost', g.progress.story >= 3 ? ['Il cancello... sento che si aprirà. Sei tu, vero? Il Portatore.'] : ['Chi va là? Il cancello è chiuso. Nessuno passa senza i tre sigilli.']);
    },
  },
  ghostDreamer: {
    look: 'ghost',
    ghost: true,
    *talk(g) { yield g.say('ghost', ['Non svegliarmi. Sto sognando il sole.']); },
  },
  ghostMiner: {
    look: 'ghost',
    ghost: true,
    *talk(g) { yield g.say('ghost', ['Scava... scava... sotto c\'è la luce, dicevano. Sotto c\'era solo il buio.']); },
  },
  ghostKnight: {
    look: 'aldric',
    ghost: true,
    *talk(g) { yield g.say('ghost', ['Il capitano ci ha ordinato di tenere le mura. Nessuno ci ha detto fino a quando.']); },
  },
};

export const PAGES = [
  'Primo giorno dopo la partenza. Il Portatore non è tornato. La fiamma trema.',
  'Ser Aldric ha giurato di cercarlo. Ha preso con sé solo la spada e il silenzio.',
  'Le genti dormono più a lungo, ogni notte. Stamattina il piccolo Tobi non si è svegliato.',
  'Ho affidato i tre sigilli ai guardiani: pietra, abisso, acciaio. Che nessuno li raggiunga senza meritarlo.',
  'Il Guardiano di Pietra ha smesso di parlare. Credo che stia sognando anche lui.',
  'Nelle caverne qualcosa ha bevuto l\'acqua dei cristalli. Non è più una bestia.',
  'Aldric è tornato. Non era più Aldric.',
  'Se leggi queste righe, Portatore: non ti giudico. Anche io avrei avuto paura.',
];

// Shop stock: `need` gates visibility, `once` items disappear after purchase.
export const SHOPS = {
  brann: [
    { id: 'bombs5', name: 'Bombe x5', item: 'bombAmmo', count: 5, price: 20, need: (pr) => pr.abilities.bombs, full: (pr) => pr.bombs >= pr.bombMax },
    { id: 'arrows10', name: 'Frecce x10', item: 'arrowAmmo', count: 10, price: 15, need: (pr) => pr.abilities.bow, full: (pr) => pr.arrows >= pr.arrowMax },
    { id: 'ampolla', name: 'Ampolla Vuota', item: 'ampolla', count: 1, price: 150, once: true },
    { id: 'bombBag', name: 'Sacca Grande', item: 'bombBag', count: 1, price: 100, once: true, need: (pr) => pr.abilities.bombs },
    { id: 'quiver', name: 'Faretra Capiente', item: 'quiver', count: 1, price: 100, once: true, need: (pr) => pr.abilities.bow },
    { id: 'heartPiece', name: 'Frammento di Cuore', item: 'heartPiece', count: 1, price: 250, once: true },
  ],
};

// Sword upgrades at Oda's forge.
export const FORGE = [
  { lv: 2, mat: 'ore', n: 2, coins: 60, text: 'Lama Temprata' },
  { lv: 3, mat: 'crystalShard', n: 2, coins: 120, text: 'Lama Cristallina' },
  { lv: 4, mat: 'steel', n: 1, coins: 200, text: 'Lama del Custode' },
];
