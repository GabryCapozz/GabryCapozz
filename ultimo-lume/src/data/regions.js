// Region metadata: display names, map colours, music and atmosphere.
import { P } from '../gfx/palette.js';

export const REGIONS = {
  village: {
    name: 'Villaggio Abbandonato', sub: 'Dove il fuoco si è spento',
    color: '#7a5a3c', light: P.tan, music: 'village',
    dark: 0.18, tint: '#1a1430', ambient: 'ash',
  },
  forest: {
    name: 'Foresta Antica', sub: 'Gli alberi ricordano',
    color: P.greenD, light: P.greenL, music: 'forest',
    dark: 0.32, tint: '#0d1a1c', ambient: 'leaves',
  },
  ruins: {
    name: 'Rovine del Guardiano', sub: 'Pietra che sogna',
    color: P.slate, light: P.gray, music: 'ruins',
    dark: 0.55, tint: '#0c0a16', ambient: 'dust',
  },
  mines: {
    name: 'Miniere Dimenticate', sub: 'Il ferro sotto la montagna',
    color: P.brownD, light: P.clay, music: 'mines',
    dark: 0.9, tint: '#0a0508', ambient: 'embers',
  },
  caves: {
    name: 'Caverne Sotterranee', sub: 'Dove i cristalli bevono la luce',
    color: P.blueD, light: P.cyan, music: 'caves',
    dark: 0.72, tint: '#050818', ambient: 'spores',
  },
  castle: {
    name: 'Castello in Rovina', sub: 'Un giuramento senza fine',
    color: P.purple, light: P.pink, music: 'castle',
    dark: 0.5, tint: '#0e0a1c', ambient: 'rain',
  },
  sanctuary: {
    name: 'Santuario del Lume', sub: 'L\'ultima soglia',
    color: P.steel, light: P.white, music: 'sanctuary',
    dark: 0.3, tint: '#140c24', ambient: 'motes',
  },
};
