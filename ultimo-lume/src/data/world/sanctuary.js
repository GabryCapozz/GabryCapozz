// Santuario del Lume — beyond the village seal. Light sigils, echoes, and the last flame.
const R = (ch, n) => ch.repeat(n);
const inner = (s) => '#' + s + '#';
const wall = R('#', 30);
const COMMON = { theme: 'sanctuary', region: 'sanctuary' };
const STATUE = { type: 'decor', sprite: 'statue', solid: true, w: 14, h: 10, oy: 8, tall: true, light: { r: 30, color: '#fee761', i: 0.6, oy: -28 } };

export const SANCTUARY = [
  {
    id: 's_steps', name: 'Gradini del Vuoto', gx: 3, gy: 6, ...COMMON,
    place: [
      { at: [4, 12], type: 'pickup', item: 'page', flag: 'item.page.steps' },
    ],
    map: [
      R('_', 30),
      R('_', 30),
      '____' + R('.', 22) + '____',
      '___' + '..S' + R('.', 18) + 'S..' + '___',
      '__' + '.............*............' + '__',
      '__' + '.....1..........1.........' + '__',
      '_' + R('.', 28) + '_',
      '.' + R(',', 28) + ',',
      R(',', 30),
      '.' + R(',', 28) + ',',
      '_' + R('.', 28) + '_',
      '__' + '....0................0....' + '__',
      '__' + R('.', 26) + '__',
      '___' + '..S' + R('.', 18) + 'S..' + '___',
      '____' + R('.', 22) + '____',
      R('_', 30),
      R('_', 30),
    ],
    legend: {
      S: STATUE,
      1: { type: 'slime', variant: 'shadow' },
    },
  },
  {
    id: 's_hall', name: 'Sala delle Eco', gx: 2, gy: 6, ...COMMON,
    map: [
      wall,
      wall,
      inner('..i..Y.......Y.......Y..i...'),
      inner(R('.', 28)),
      inner('...P....................P...'),
      inner('.......1.............1......'),
      inner(R('.', 28)),
      'G' + R('.', 28) + '.',
      'G' + R(',', 28) + ',',
      'G' + R('.', 28) + '.',
      inner('.........0........0.........'),
      inner(R('.', 28)),
      inner('...P....................P...'),
      inner('............S...............'),
      inner('..i......................i..'),
      wall,
      wall,
    ],
    legend: {
      Y: { type: 'sigil', group: 'sigils', target: 's_hall.gate' },
      G: { type: 'gate', id: 's_hall.gate' },
      P: { type: 'decor', sprite: 'pillar', solid: true, w: 12, h: 8, oy: 7, tall: true },
      1: { type: 'slime', variant: 'shadow' },
      S: { type: 'sign', text: ['Tre sigilli spenti sopra le colonne.', '"Solo la luce di chi porta il Lume li può risvegliare."'] },
    },
  },
  {
    id: 's_final', name: 'Altare del Lume', gx: 0, gy: 6, w: 2, ...COMMON, boss: 'echo', music: 'finalBoss', afterMusic: 'sanctuary',
    map: [
      R('#', 60),
      R('#', 60),
      '#' + 'i' + R('.', 56) + 'i' + '#',
      '#' + R('.', 58) + '#',
      '#' + R('.', 58) + '#',
      '#' + R('.', 8) + 'S' + R('.', 40) + 'S' + R('.', 8) + '#',
      '#' + R('.', 58) + '#',
      '#' + '..' + 'A' + R('.', 55) + 'G',
      '#' + R('.', 28) + 'Z' + R('.', 29) + 'G',
      '#' + R('.', 58) + 'G',
      '#' + R('.', 58) + '#',
      '#' + R('.', 8) + 'S' + R('.', 40) + 'S' + R('.', 8) + '#',
      '#' + R('.', 58) + '#',
      '#' + R('.', 58) + '#',
      '#' + 'i' + R('.', 56) + 'i' + '#',
      R('#', 60),
      R('#', 60),
    ],
    legend: {
      S: STATUE,
      A: { type: 'lumeAltar' },
      Z: { type: 'echo' },
      G: { type: 'gate', id: 's_final.gate', open: true },
    },
  },
];
