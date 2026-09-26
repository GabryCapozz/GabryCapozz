// Applies the effect of obtaining an item to the progress state.
import { ITEMS } from '../data/items.js';

// Items that trigger the "hold it up" presentation when found in the world.
const BIG = new Set(['bombs', 'bow', 'lantern', 'stoneHeart', 'abyssEye', 'brokenOath', 'bossKey', 'heartContainer']);
export const PRESENTED = new Set(['key', 'bossKey', 'heartPiece', 'heartContainer', 'ampolla', 'root', 'bombBag', 'quiver', 'bombs', 'bow', 'lantern', 'stoneHeart', 'abyssEye', 'brokenOath', 'ore', 'crystalShard', 'steel', 'toyHorse', 'locket', 'page']);

export function isBigItem(id) { return BIG.has(id); }

// Returns an extra message (or null).
export function applyItem(game, id, count = 1) {
  const pr = game.progress;
  const dungeon = game.room.def.dungeon || game.room.region;
  let extra = null;
  switch (id) {
    case 'coin': pr.coins = Math.min(999, pr.coins + count); break;
    case 'heart': pr.hp = Math.min(pr.maxHp, pr.hp + 2 * count); break;
    case 'potion': pr.potions = Math.min(pr.potionMax, pr.potions + count); break;
    case 'bombAmmo': pr.bombs = Math.min(pr.bombMax, pr.bombs + count); break;
    case 'arrowAmmo': pr.arrows = Math.min(pr.arrowMax, pr.arrows + count); break;
    case 'key': pr.keys[dungeon] = (pr.keys[dungeon] || 0) + count; break;
    case 'bossKey': pr.bossKeys[dungeon] = true; break;
    case 'heartPiece':
      pr.heartPieces += count;
      pr.stats.heartPieces = (pr.stats.heartPieces || 0) + count;
      if (pr.heartPieces >= 4) {
        pr.heartPieces -= 4;
        pr.maxHp += 2;
        pr.hp = pr.maxHp;
        extra = 'Quattro frammenti si uniscono: un nuovo cuore!';
      } else extra = `Frammenti raccolti: ${pr.heartPieces}/4.`;
      break;
    case 'heartContainer': pr.maxHp += 2; pr.hp = pr.maxHp; break;
    case 'ampolla': pr.potionMax += 1; pr.potions = pr.potionMax; break;
    case 'root': pr.maxStamina += 20; break;
    case 'bombBag': pr.bombMax += 10; pr.bombs = pr.bombMax; break;
    case 'quiver': pr.arrowMax += 15; pr.arrows = pr.arrowMax; break;
    case 'bombs':
      pr.abilities.bombs = true;
      pr.bombs = pr.bombMax;
      if (!pr.equipped) pr.equipped = 'bombs';
      game.hints.show('ability', 200);
      break;
    case 'bow':
      pr.abilities.bow = true;
      pr.arrows = pr.arrowMax;
      pr.equipped = 'bow';
      game.hints.show('ability', 200);
      break;
    case 'lantern': pr.abilities.lantern = true; break;
    case 'stoneHeart':
      pr.items.stoneHeart = 1;
      pr.abilities.charge = true;
      game.hints.show('charge', 360);
      break;
    case 'abyssEye':
      pr.items.abyssEye = 1;
      pr.abilities.shadow = true;
      pr.equipped = 'shadow';
      break;
    case 'brokenOath':
      pr.items.brokenOath = 1;
      pr.abilities.light = true;
      pr.equipped = 'light';
      break;
    case 'page':
      pr.items.page = (pr.items.page || 0) + count;
      extra = `Pagine trovate: ${pr.items.page}/8. Sorella Vela ne sarà felice.`;
      break;
    default:
      if (ITEMS[id]) pr.items[id] = (pr.items[id] || 0) + count;
  }
  return extra;
}
