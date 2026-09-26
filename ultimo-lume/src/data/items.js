// Item definitions: name, description, icon and category.
export const ITEMS = {
  coin: { name: 'Moneta', icon: 'coinIcon', kind: 'currency' },
  heart: { name: 'Cuore', icon: 'heartContainer', kind: 'instant' },
  potion: { name: 'Pozione', icon: 'potion', kind: 'consumable', desc: 'Ripristina tre cuori. Le pozioni si ricaricano riposando a un braciere.' },
  bombAmmo: { name: 'Bombe', icon: 'bomb', kind: 'ammo' },
  arrowAmmo: { name: 'Frecce', icon: 'arrows', kind: 'ammo' },
  key: { name: 'Chiave', icon: 'key', kind: 'key', desc: 'Apre una porta chiusa di questo luogo.' },
  bossKey: { name: 'Chiave Antica', icon: 'bossKey', kind: 'key', desc: 'Pesante e fredda. Apre il sigillo del guardiano di questo luogo.' },
  heartPiece: { name: 'Frammento di Cuore', icon: 'heartPiece', kind: 'upgrade', desc: 'Quattro frammenti formano un nuovo cuore.' },
  heartContainer: { name: 'Cuore Intero', icon: 'heartContainer', kind: 'upgrade', desc: 'La tua salute massima aumenta di un cuore.' },
  ampolla: { name: 'Ampolla Vuota', icon: 'ampolla', kind: 'upgrade', desc: 'Puoi portare una pozione in più.' },
  root: { name: 'Radice Vigorosa', icon: 'root', kind: 'upgrade', desc: 'Una radice amara e viva. Il tuo vigore massimo aumenta.' },
  bombBag: { name: 'Sacca Grande', icon: 'bomb', kind: 'upgrade', desc: 'Puoi portare più bombe.' },
  quiver: { name: 'Faretra Capiente', icon: 'arrows', kind: 'upgrade', desc: 'Puoi portare più frecce.' },
  // abilities as items
  bombs: { name: 'Bombe', icon: 'bomb', kind: 'ability', desc: 'Premi Abilità per lanciarle. I muri crepati non resisteranno.' },
  bow: { name: 'Arco del Cacciatore', icon: 'bow', kind: 'ability', desc: 'Scocca frecce. Gli occhi di pietra reagiscono ai colpi da lontano.' },
  lantern: { name: 'Lanterna', icon: 'lantern', kind: 'ability', desc: 'Una luce calda per i luoghi bui. Interagisci con le torce spente per accenderle.' },
  // artifacts
  stoneHeart: { name: 'Cuore di Pietra', icon: 'stoneHeart', kind: 'artifact', desc: 'Batte ancora, piano. Ti insegna il Fendente Rotante: tieni premuto Attacco e rilascia.' },
  abyssEye: { name: 'Occhio Abissale', icon: 'abyssEye', kind: 'artifact', desc: "Guarda sempre verso il basso. Ti concede il Passo d'Ombra." },
  brokenOath: { name: 'Giuramento Spezzato', icon: 'brokenOath', kind: 'artifact', desc: 'L\'elsa di una promessa mancata. Ti concede la Lama di Luce.' },
  // materials
  ore: { name: 'Minerale Grezzo', icon: 'ore', kind: 'material', desc: 'Ferro delle miniere. Oda sa cosa farne.' },
  crystalShard: { name: 'Scheggia di Cristallo', icon: 'crystalShard', kind: 'material', desc: 'Vibra se la avvicini all\'orecchio.' },
  steel: { name: 'Acciaio Antico', icon: 'steel', kind: 'material', desc: 'Forgiato prima del Sonno Grigio. Non arrugginisce.' },
  // quest
  toyHorse: { name: 'Cavallino di Legno', icon: 'toyHorse', kind: 'quest', desc: 'Consumato dalle mani di un bambino.' },
  locket: { name: 'Medaglione', icon: 'locket', kind: 'quest', desc: 'Dentro, il ritratto sbiadito di una donna.' },
  page: { name: 'Pagina Perduta', icon: 'page', kind: 'collectible', desc: 'Frammenti di un diario. Sorella Vela le colleziona.' },
};

export const ARTIFACTS = ['stoneHeart', 'abyssEye', 'brokenOath'];
export const MATERIALS = ['ore', 'crystalShard', 'steel'];
export const QUEST_ITEMS = ['toyHorse', 'locket'];
export const TOTAL_PAGES = 8;
export const TOTAL_HEART_PIECES = 8;
