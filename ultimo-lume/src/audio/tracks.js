// Original chiptune score. Notes are "NOTE:len" with len in 16th steps.
// Accompaniment (bass / arps / pads) is generated from the chord progression.
// `layer` > current intensity mutes a channel (boss fights raise intensity per phase).

export const TRACKS = {
  title: {
    bpm: 84,
    echo: { time: 0.36, fb: 0.32, mix: 0.25 },
    chords: 'Am F C G Am F Dm E F G Em Am Dm G Esus4 E',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.065, vib: 5,
        notes: `E5:6 D5:2 C5:4 B4:4 | A4:8 C5:4 A4:4 | G4:6 A4:2 C5:4 E5:4 | D5:12 r:4 |
                E5:6 D5:2 C5:4 E5:4 | A5:8 G5:4 F5:4 | E5:4 D5:4 F5:4 A5:4 | G#5:8 E5:4 B4:4 |
                A4:4 C5:4 F5:8 | G5:6 F5:2 E5:4 D5:4 | E5:4 G5:4 B5:4 G5:4 | A5:12 r:4 |
                F5:6 E5:2 D5:4 A4:4 | B4:6 C5:2 D5:4 G5:4 | A5:8 G#5:8 | B4:4 E5:12`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.17, bass: 'rootFifth' },
      { name: 'arp', wave: 'pulse12', vol: 0.022, arp: 'broken', octave: 1 },
    ],
  },

  village: {
    bpm: 96, bar: 12,
    chords: 'Dm Bb F C Dm Gm A A7 Bb F Gm C Dm Bb A Dm',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.06, vib: 5,
        notes: `A5:6 F5:3 D5:3 | F5:6 D5:3 Bb4:3 | C5:6 D5:3 F5:3 | E5:9 r:3 |
                A5:6 G5:3 F5:3 | G5:6 Bb5:3 A5:3 | E5:6 C#5:3 E5:3 | A5:9 r:3 |
                D6:6 C6:3 Bb5:3 | A5:6 F5:3 C5:3 | Bb5:6 A5:3 G5:3 | E5:6 G5:3 E5:3 |
                F5:6 E5:3 D5:3 | D5:6 F5:3 Bb5:3 | A5:6 G5:3 E5:3 | D5:9 r:3`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.15, bass: 'waltz' },
      { name: 'pad', wave: 'pulse12', vol: 0.011, arp: 'pad', octave: 1 },
    ],
  },

  forest: {
    bpm: 100,
    chords: 'Em C D Bm Em Am B B C D Bm Em Am D B7 Em',
    channels: [
      {
        name: 'lead', wave: 'pulse12', vol: 0.07, vib: 7,
        notes: `B4:4 E5:4 G5:6 F#5:2 | E5:8 D5:4 C5:4 | D5:4 F#5:4 A5:6 G5:2 | F#5:12 r:4 |
                B4:4 E5:4 G5:4 B5:4 | A5:6 G5:2 E5:4 C5:4 | D#5:6 F#5:2 B5:8 | A5:4 F#5:4 D#5:8 |
                E5:6 G5:2 C6:8 | A5:6 F#5:2 D5:8 | F#5:4 D5:4 B4:4 D5:4 | E5:12 r:4 |
                C6:6 B5:2 A5:4 E5:4 | F#5:6 G5:2 A5:8 | B5:4 A5:4 F#5:4 D#5:4 | E5:12 r:4`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.15, bass: 'walk' },
      { name: 'arp', wave: 'pulse12', vol: 0.016, arp: 'up16', octave: 1 },
      { name: 'drums', vol: 0.45, drums: 'k...h...k...h.h.' },
    ],
  },

  ruins: {
    bpm: 92,
    echo: { time: 0.33, fb: 0.38, mix: 0.3 },
    chords: 'Cm Ab Fm G Cm Bb Ab G',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.055, vib: 4,
        notes: `C5:4 Eb5:4 G5:8 | Ab5:8 G5:4 Eb5:4 | F5:12 r:4 | D5:4 F5:4 G5:4 B4:4 |
                C5:4 G5:4 Eb6:8 | D6:6 C6:2 Bb5:8 | C6:4 Ab5:4 F5:8 | G5:8 B4:8`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.15, bass: 'octave8' },
      { name: 'arp', wave: 'pulse12', vol: 0.016, arp: 'broken', octave: 1 },
      { name: 'drums', vol: 0.6, drums: 'k.......t.......' },
    ],
  },

  boss: {
    bpm: 148,
    chords: 'Em C D B Em C Am B',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.06, vib: 4,
        notes: `E5:2 E5:2 G5:2 E5:2 B5:4 A5:2 G5:2 | G5:4 E5:4 C5:4 E5:4 |
                F#5:2 F#5:2 A5:2 F#5:2 D6:4 C6:2 A5:2 | B5:8 D#5:4 F#5:4 |
                E6:4 D6:2 B5:2 G5:4 E5:4 | C6:4 B5:2 G5:2 E5:8 | A5:4 C6:4 E6:4 C6:4 | B5:4 A5:2 F#5:2 D#5:8`,
      },
      {
        name: 'counter', wave: 'pulse12', vol: 0.045, layer: 2,
        notes: 'B4:8 G4:8 | G4:8 E4:8 | A4:8 F#4:8 | F#4:16 | B4:8 G4:8 | E4:16 | E4:8 A4:8 | D#4:16',
      },
      { name: 'bass', wave: 'triangle', vol: 0.2, bass: 'drive' },
      { name: 'arp', wave: 'pulse12', vol: 0.018, arp: 'up16', octave: 2, layer: 1 },
      { name: 'drums', vol: 0.8, drums: 'k...s...k.k.s...', fill: 'k.s.k.s.s.s.ssss' },
      { name: 'hats', vol: 0.9, layer: 1, drums: 'h.h.h.h.h.h.h.hh' },
    ],
  },

  mines: {
    bpm: 108,
    chords: 'Dm Dm C C Bb Bb A A',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.055, vib: 3,
        notes: `D5:2 r:2 F5:2 r:2 A5:4 G5:4 | F5:4 E5:4 D5:8 | C5:2 r:2 E5:2 r:2 G5:4 F5:4 | E5:4 D5:4 C5:8 |
                Bb4:2 r:2 D5:2 r:2 F5:4 E5:4 | D5:4 C5:4 Bb4:8 | A4:4 C#5:4 E5:4 G5:4 | A5:12 r:4`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.18, bass: 'pulse' },
      { name: 'drums', vol: 0.7, drums: 'k..mk.m.s..mk.m.' },
    ],
  },

  caves: {
    bpm: 76,
    echo: { time: 0.42, fb: 0.45, mix: 0.35 },
    chords: 'C#m A E B C#m A F#m G#',
    channels: [
      {
        name: 'lead', wave: 'pulse12', vol: 0.06, vib: 6,
        notes: `G#5:8 E5:4 C#6:4 | B5:8 A5:8 | G#5:6 F#5:2 E5:8 | D#5:16 |
                E5:4 G#5:4 C#6:4 E6:4 | C#6:8 B5:8 | A5:6 G#5:2 F#5:8 | G#5:12 r:4`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.15, bass: 'long' },
      { name: 'arp', wave: 'pulse12', vol: 0.02, arp: 'updown8', octave: 2 },
    ],
  },

  castle: {
    bpm: 96,
    chords: 'Gm Eb Cm D Gm F Eb D',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.06, vib: 5,
        notes: `G5:6 A5:2 Bb5:4 G5:4 | Bb5:6 C6:2 G5:8 | C6:4 Bb5:4 G5:4 Eb5:4 | F#5:12 r:4 |
                D6:6 C6:2 Bb5:4 A5:4 | A5:6 G5:2 F5:4 C6:4 | Bb5:4 G5:4 Eb5:4 G5:4 | A5:8 F#5:4 D5:4`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.18, bass: 'root4' },
      { name: 'stab', wave: 'pulse50', vol: 0.018, arp: 'stab', octave: 1 },
      { name: 'drums', vol: 0.55, drums: 'k...s.s.k...s..s' },
    ],
  },

  sanctuary: {
    bpm: 66,
    echo: { time: 0.45, fb: 0.4, mix: 0.35 },
    chords: 'Fmaj7 C Dm7 Bb Fmaj7 C Bb C',
    channels: [
      {
        name: 'lead', wave: 'triangle', vol: 0.12,
        notes: `A5:8 C6:4 E6:4 | G5:12 r:4 | F5:6 A5:2 C6:8 | D6:12 r:4 |
                E6:8 C6:4 A5:4 | G5:8 E5:8 | F5:4 A5:4 D6:8 | C6:12 r:4`,
      },
      { name: 'pad', wave: 'pulse12', vol: 0.014, arp: 'pad', octave: 1 },
      { name: 'bells', wave: 'triangle', vol: 0.04, arp: 'bells', octave: 2 },
      { name: 'bass', wave: 'triangle', vol: 0.12, bass: 'long' },
    ],
  },

  finalBoss: {
    bpm: 160,
    chords: 'Dm Bb C A Dm Bb Gm A',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.06, vib: 4,
        notes: `D5:2 F5:2 A5:2 D6:2 C6:4 A5:4 | Bb5:4 A5:2 F5:2 D5:8 | E5:2 G5:2 C6:2 E6:2 D6:4 C6:4 | C#6:8 A5:4 E5:4 |
                F6:4 E6:2 D6:2 A5:4 F5:4 | D6:4 C6:2 Bb5:2 F5:8 | G5:4 Bb5:4 D6:4 G6:4 | E6:4 C#6:4 A5:8`,
      },
      {
        name: 'counter', wave: 'pulse12', vol: 0.045, layer: 2,
        notes: 'F4:8 A4:8 | D4:8 F4:8 | G4:8 E4:8 | E4:16 | A4:8 F4:8 | F4:8 D4:8 | Bb4:8 D5:8 | C#5:16',
      },
      { name: 'bass', wave: 'triangle', vol: 0.2, bass: 'drive' },
      { name: 'arp', wave: 'pulse12', vol: 0.018, arp: 'up16', octave: 2, layer: 1 },
      { name: 'drums', vol: 0.8, drums: 'k...s...k.k.s..s', fill: 'k.s.s.s.ssssssss' },
      { name: 'hats', vol: 0.9, layer: 1, drums: 'hhhhhhhhhhhhhhhh' },
    ],
  },

  ending: {
    bpm: 80,
    echo: { time: 0.38, fb: 0.3, mix: 0.25 },
    chords: 'A F#m D E A F#m D E',
    channels: [
      {
        name: 'lead', wave: 'pulse25', vol: 0.065, vib: 5,
        notes: `E5:6 D5:2 C#5:4 B4:4 | A4:8 C#5:4 A4:4 | F#5:6 E5:2 D5:4 F#5:4 | E5:12 r:4 |
                E5:6 D5:2 C#5:4 E5:4 | A5:8 G#5:4 F#5:4 | F#5:4 A5:4 D6:4 B5:4 | B5:4 G#5:4 E5:8`,
      },
      { name: 'bass', wave: 'triangle', vol: 0.16, bass: 'rootFifth' },
      { name: 'arp', wave: 'pulse12', vol: 0.02, arp: 'broken', octave: 1 },
    ],
  },
};
