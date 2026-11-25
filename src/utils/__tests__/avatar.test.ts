import { describe, expect, it } from 'vitest';
import { createDefaultPlayer } from '@/core/plr';
import {
  buildDrawSet,
  collectDrawData,
  type ArmorDataFile,
  type DyesDataFile,
} from '../avatar';
import armorDataJson from '../../../public/data/armor-data.json';
import dyesDataJson from '../../../public/data/dyes.json';

const armorData = armorDataJson as unknown as ArmorDataFile;
const dyesData = dyesDataJson as unknown as DyesDataFile;

describe('avatar robe & full-body outfit rendering', () => {
  it('renders Princess Dress (865) skirt over legs, hides pants/shoes, and inherits body dye', () => {
    const player = createDefaultPlayer('Princess', 329);
    player.skinVariant = 4; // female
    player.armor[11] = { id: 865, stack: 1, prefix: 0 }; // Princess Dress in body vanity
    player.armor[12] = { id: 76, stack: 1, prefix: 0 }; // Copper Greaves in leg vanity (must be overridden)
    player.dye[1] = { id: 1007, stack: 1, prefix: 0 }; // Red Dye in body dye
    player.dye[2] = { id: 1011, stack: 1, prefix: 0 }; // Green Dye in leg dye

    const drawSet = buildDrawSet(player, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(drawSet.slots.body).toBe(41);
    expect(drawSet.slots.legs).toBe(97);
    expect(drawSet.wearsRobe).toBe(true);
    expect(drawSet.hidesBottomSkin).toBe(false);
    expect(drawSet.dyes.cLegs).toEqual(drawSet.dyes.cBody);

    const commands = collectDrawData(drawSet, armorData);
    const layers = commands.map((c) => c.layerName);
    expect(layers).toContain('12_Skin_Legs');
    expect(layers).toContain('13_Leggings');
    expect(layers).not.toContain('13_Pants');
    expect(layers).not.toContain('13_Shoes');

    const leggingsCmd = commands.find((c) => c.layerName === '13_Leggings');
    expect(leggingsCmd?.dyeColor).toEqual(drawSet.dyes.cBody);
  });

  it('draws 14_ShoeAcc underneath 13_Leggings when wearing a dress/robe (865), unlike Kimono (2278)', () => {
    const dressWithBoots = createDefaultPlayer('DressBoots', 329);
    dressWithBoots.armor[11] = { id: 865, stack: 1, prefix: 0 }; // Princess Dress
    dressWithBoots.armor[13] = { id: 54, stack: 1, prefix: 0 }; // Hermes Boots (shoe=6)

    const dressSet = buildDrawSet(dressWithBoots, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    const dressLayers = collectDrawData(dressSet, armorData).map((c) => c.layerName);
    expect(dressLayers.indexOf('14_ShoeAcc')).toBeLessThan(dressLayers.indexOf('13_Leggings'));

    const kimonoWithBoots = createDefaultPlayer('KimonoBoots', 329);
    kimonoWithBoots.armor[11] = { id: 2278, stack: 1, prefix: 0 }; // Kimono (body=166)
    kimonoWithBoots.armor[13] = { id: 54, stack: 1, prefix: 0 };

    const kimonoSet = buildDrawSet(kimonoWithBoots, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    const kimonoLayers = collectDrawData(kimonoSet, armorData).map((c) => c.layerName);
    expect(kimonoLayers.indexOf('13_Leggings')).toBeLessThan(kimonoLayers.indexOf('14_ShoeAcc'));
  });

  it('keeps Kimono (2278) with wearsRobe=false while still replacing legs by gender', () => {
    const male = createDefaultPlayer('KimonoM', 329);
    male.skinVariant = 0;
    male.armor[11] = { id: 2278, stack: 1, prefix: 0 };
    male.dye[1] = { id: 1007, stack: 1, prefix: 0 };

    const female = createDefaultPlayer('KimonoF', 329);
    female.skinVariant = 4;
    female.armor[11] = { id: 2278, stack: 1, prefix: 0 };
    female.dye[1] = { id: 1007, stack: 1, prefix: 0 };

    const maleSet = buildDrawSet(male, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    const femaleSet = buildDrawSet(female, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);

    expect(maleSet.slots.legs).toBe(119);
    expect(maleSet.wearsRobe).toBe(false);
    expect(maleSet.dyes.cLegs).toBeNull();

    expect(femaleSet.slots.legs).toBe(100);
    expect(femaleSet.wearsRobe).toBe(false);
    expect(femaleSet.dyes.cLegs).toBeNull();
  });

  it('hides leg layer on Ghost Shirt (1753) only when no leggings are equipped', () => {
    const ghostBare = createDefaultPlayer('GhostBare', 329);
    ghostBare.armor[11] = { id: 1753, stack: 1, prefix: 0 };

    const bareSet = buildDrawSet(ghostBare, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(bareSet.slots.legs).toBe(169);
    expect(bareSet.wearsRobe).toBe(true);

    const bareLayers = collectDrawData(bareSet, armorData).map((c) => c.layerName);
    expect(bareLayers).toContain('12_Skin_Legs');
    expect(bareLayers).not.toContain('13_Leggings');
    expect(bareLayers).not.toContain('13_Pants');
    expect(bareLayers).not.toContain('13_Shoes');

    const ghostWithPants = createDefaultPlayer('GhostPants', 329);
    ghostWithPants.armor[11] = { id: 1753, stack: 1, prefix: 0 };
    ghostWithPants.armor[12] = { id: 76, stack: 1, prefix: 0 }; // Copper Greaves (leg=1)

    const pantsSet = buildDrawSet(ghostWithPants, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(pantsSet.slots.legs).not.toBe(169);
    const pantsLayers = collectDrawData(pantsSet, armorData).map((c) => c.layerName);
    expect(pantsLayers).toContain('13_Leggings');
  });

  it('hides top and bottom skin on Reaper Robe (1820)', () => {
    const reaper = createDefaultPlayer('Reaper', 329);
    reaper.armor[11] = { id: 1820, stack: 1, prefix: 0 };

    const drawSet = buildDrawSet(reaper, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(drawSet.slots.body).toBe(93);
    expect(drawSet.slots.legs).toBe(165);
    expect(drawSet.hidesTopSkin).toBe(true);
    expect(drawSet.hidesBottomSkin).toBe(true);

    const layers = collectDrawData(drawSet, armorData).map((c) => c.layerName);
    expect(layers).not.toContain('12_Skin_Torso');
    expect(layers).not.toContain('12_Skin_Legs');
    expect(layers).toContain('13_Leggings');
  });

  it('renders Angel Halo (1987) with dye and respects visibility hide', () => {
    const p = createDefaultPlayer('Angel', 329);
    p.armor[3] = { id: 1987, stack: 1, prefix: 0 };
    p.dye[3] = { id: 1007, stack: 1, prefix: 0 };

    const drawSet = buildDrawSet(p, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(drawSet.angelHalo).toBe(true);
    expect(drawSet.dyes.cAngelHalo).not.toBeNull();

    const commands = collectDrawData(drawSet, armorData);
    const haloCmd = commands.find((c) => c.layerName === '22_AngelHalo');
    expect(haloCmd).toBeDefined();
    expect(haloCmd?.dyeColor).toEqual(drawSet.dyes.cAngelHalo);

    p.loadouts[0].hide[3] = true;
    const hiddenSet = buildDrawSet(p, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(hiddenSet.angelHalo).toBe(false);
    expect(collectDrawData(hiddenSet, armorData).some((c) => c.layerName === '22_AngelHalo')).toBe(false);
  });

  it('renders cloak front/back/wing-cape and chest-included capes accurately', () => {
    // 1. Red Cape (2286): draws both 10_BackAcc and 32_FrontAcc
    const redCape = createDefaultPlayer('RedCape', 329);
    redCape.armor[3] = { id: 2286, stack: 1, prefix: 0 };
    const redSet = buildDrawSet(redCape, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(redSet.slots.back).toBe(5);
    expect(redSet.slots.front).toBe(3);
    const redLayers = collectDrawData(redSet, armorData).map((c) => c.layerName);
    expect(redLayers).toContain('10_BackAcc');
    expect(redLayers).toContain('32_FrontAcc');

    // 2. Hunter Cloak (4744): standing frame renders via 32_FrontAcc
    const hunter = createDefaultPlayer('Hunter', 329);
    hunter.armor[3] = { id: 4744, stack: 1, prefix: 0 };
    const hunterSet = buildDrawSet(hunter, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(hunterSet.slots.front).toBe(8);
    expect(collectDrawData(hunterSet, armorData).map((c) => c.layerName)).toContain('32_FrontAcc');

    // 3. Nebula Mantle (3470): wing-slot cloak renders in 09_Wings
    const nebula = createDefaultPlayer('Nebula', 329);
    nebula.armor[3] = { id: 3470, stack: 1, prefix: 0 };
    const nebulaSet = buildDrawSet(nebula, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(nebulaSet.slots.wings).toBe(31);
    expect(collectDrawData(nebulaSet, armorData).map((c) => c.layerName)).toContain('09_Wings');

    // 4. Plaguebringer's Cloak (5046, body 235): IncludeCapeFrontAndBack sets back=30, front=9
    const plague = createDefaultPlayer('Plague', 329);
    plague.armor[11] = { id: 5046, stack: 1, prefix: 0 };
    const plagueSet = buildDrawSet(plague, { showGear: true, loadoutIndex: 0 }, armorData, dyesData);
    expect(plagueSet.slots.back).toBe(30);
    expect(plagueSet.slots.front).toBe(9);
    const plagueLayers = collectDrawData(plagueSet, armorData).map((c) => c.layerName);
    expect(plagueLayers).toContain('10_BackAcc');
    expect(plagueLayers).toContain('32_FrontAcc');
  });
});
