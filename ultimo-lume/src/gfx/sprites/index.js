// Central sprite registry, generated once at boot.
import { buildHumanoid, LOOKS, lyingFrame } from './humanoid.js';
import { buildSlime, buildBat, buildWisp, buildBeetle, buildArmor, buildTurret } from './creatures.js';
import { buildProps } from './props.js';
import { buildItems } from './items.js';
import { buildFx } from './fx.js';
import { buildStoneGuardian, buildDeepHorror, buildKnight, buildLumeFlame } from './bosses.js';

export const SPR = {};

const NPC_ANIMS = ['idle', 'walk', 'hurt', 'hold'];

export function buildSprites(extraBuilders = {}) {
  const player = buildHumanoid(LOOKS.player);
  player.lying = lyingFrame(player.down.idle[0]);
  Object.assign(SPR, {
    player,
    echo: buildHumanoid(LOOKS.echo),
    npc: {
      maren: buildHumanoid(LOOKS.maren, NPC_ANIMS),
      brann: buildHumanoid(LOOKS.brann, NPC_ANIMS),
      oda: buildHumanoid(LOOKS.oda, NPC_ANIMS),
      tobi: buildHumanoid(LOOKS.tobi, NPC_ANIMS),
      gert: buildHumanoid(LOOKS.gert, NPC_ANIMS),
      vela: buildHumanoid(LOOKS.vela, NPC_ANIMS),
      aldric: buildHumanoid(LOOKS.aldricGhost, ['idle', 'kneel']),
      ghost: buildHumanoid(LOOKS.villagerGhost, NPC_ANIMS),
    },
    skeleton: buildHumanoid(LOOKS.skeleton, ['idle', 'walk', 'attack', 'hurt', 'guard']),
    skeletonKnight: buildHumanoid(LOOKS.skeletonKnight, ['idle', 'walk', 'attack', 'hurt', 'guard']),
    archer: buildHumanoid(LOOKS.skeletonArcher, ['idle', 'walk', 'cast', 'hurt']),
    mage: buildHumanoid(LOOKS.mage, ['idle', 'cast', 'hurt']),
    voidMage: buildHumanoid(LOOKS.voidMage, ['idle', 'cast', 'hurt']),
    slime: {
      green: buildSlime('green'), blue: buildSlime('blue'), red: buildSlime('red'), shadow: buildSlime('shadow'),
      blueSmall: buildSlime('blue', true),
    },
    bat: { cave: buildBat('cave'), crystal: buildBat('crystal'), ember: buildBat('ember') },
    wisp: buildWisp(),
    beetle: { mine: buildBeetle('mine'), crystal: buildBeetle('crystal') },
    armor: { iron: buildArmor('iron'), corrupt: buildArmor('corrupt') },
    turret: buildTurret(),
    props: buildProps(),
    items: buildItems(),
    fx: buildFx(),
    bosses: { stone: buildStoneGuardian(), deep: buildDeepHorror(), knight: buildKnight(), lume: buildLumeFlame() },
  });
  for (const [k, fn] of Object.entries(extraBuilders)) SPR.bosses[k] = fn();
  return SPR;
}
