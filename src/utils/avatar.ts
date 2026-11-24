import type { PlayerData, ColorData } from '@/core/plr';
import { getLoadoutArmor, getLoadoutDye } from '@/store';

export interface ArmorDataFile {
  items: Record<string, { head?: number; body?: number; leg?: number }>;
  heads: Record<string, [number, number]>;
  legs: Record<string, [number, number]>;
  bodies: Record<
    string,
    {
      male: [number, number];
      female: [number, number];
      maleParts?: { frontShoulder: [number, number]; backShoulder: [number, number] };
      femaleParts?: { frontShoulder: [number, number]; backShoulder: [number, number] };
      frontArm?: [number, number];
      backArm?: [number, number];
    }
  >;
  variants: Record<string, Record<string, [number, number]>>;
  /** arm-framed variants of the same skin/clothes parts (cells (2,0) and (2,2) of the 9x4 grid) */
  variantArms?: Record<
    string,
    Record<string, { front: [number, number]; back: [number, number] }>
  >;
  fullHairHeads: number[];
  hatHairHeads: number[];
  hairCount: number;
  slotWidth: number;
  slotHeight: number;
  accItems?: Record<string, Record<string, number>>;
  accCoords?: Record<string, Record<string, [number, number]>>;
}

/**
 * Global lighting multiplier (clamped to 1.0 maximum).
 * 1.0 represents standard outdoor daylight.
 */
export const DEFAULT_LIGHT = 1;

// Luminance gain factor for dyed equipment rendering.
const DYE_GAIN = 1.6666666;

/**
 * Terraria Front-to-Back headwear mapping (ArmorIDs.Head.Sets.FrontToBackID).
 * Multi-layer headpieces (e.g. Fox Ears, Cat Ears, Bunny Ears) render a back piece
 * behind the head/hair in layer 10 (DrawPlayer_01_3_BackHead), while the front piece
 * is rendered in layer 21 on top of the head/hair.
 */
const FRONT_TO_BACK_HEAD: Record<number, number> = {
  242: 246,
  243: 247, // Fox Ears
  244: 248, // Cat Ears
  245: 249, // Bunny Ears
  133: 252,
  224: 253,
};

export type DyesDataFile = Record<string, [number, number, number]>;

export interface DrawRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface SettledSlots {
  head: number;
  body: number;
  legs: number;
  wings: number;
  shoe: number;
  back: number;
  front: number;
  waist: number;
  neck: number;
  face: number;
  faceFlower: number;
  handon: number;
  handoff: number;
  shield: number;
  balloon: number;
}

export interface SettledDyes {
  cHead: [number, number, number] | null;
  cBody: [number, number, number] | null;
  cLegs: [number, number, number] | null;
  cWings: [number, number, number] | null;
  cShoe: [number, number, number] | null;
  cBack: [number, number, number] | null;
  cFront: [number, number, number] | null;
  cWaist: [number, number, number] | null;
  cNeck: [number, number, number] | null;
  cFace: [number, number, number] | null;
  cFaceFlower: [number, number, number] | null;
  cHandOn: [number, number, number] | null;
  cHandOff: [number, number, number] | null;
  cShield: [number, number, number] | null;
  cBalloon: [number, number, number] | null;
}

export interface PlayerDrawSet {
  skinVar: number;
  isMale: boolean;

  // Colors
  colorSkin: ColorData;
  colorHair: ColorData;
  colorEyes: ColorData;
  colorShirt: ColorData;
  colorUnderShirt: ColorData;
  colorPants: ColorData;
  colorShoes: ColorData;

  // Hair & Headgear
  hair: number;
  fullHair: boolean;
  hatHair: boolean;
  showHair: boolean;

  // Occlusion & Composite flags
  hidesTopSkin: boolean;
  hidesBottomSkin: boolean;
  wearsRobe: boolean;
  missingHand: boolean;
  missingArm: boolean;

  // Composite Frames (standing frame 0)
  compTorsoFrame: DrawRect;
  compFrontArmFrame: DrawRect;
  compBackArmFrame: DrawRect;
  compFrontShoulderFrame: DrawRect;
  compBackShoulderFrame: DrawRect;

  // Settled slots and dyes
  slots: SettledSlots;
  dyes: SettledDyes;
}

export type TextureKey = 'base' | 'hairs' | 'hairsAlt' | 'armor' | 'accessories';

export interface DrawCommand {
  layerName: string;
  textureKey: TextureKey;
  srcRect: DrawRect;
  destOffset?: DrawPoint;
  origin?: DrawPoint;
  tintColor?: ColorData;
  dyeColor?: [number, number, number] | null;
}

export interface RenderOptions {
  showGear?: boolean;
  loadoutIndex?: number;
  /** set false to draw the raw sprites without any dye (useful to check geometry) */
  applyDyes?: boolean;
  /**
   * Flat multiplier for the finished sprite, standing in for the world light the
   * game multiplies every layer by (Lighting.GetColor at the player's tile).
   * It can only DARKEN: the light value is clamped to 255 per channel, so 1.0
   * (a fully lit outdoor tile) is the ceiling. Anything above 1 over-exposes the
   * skin, which is why DEFAULT_LIGHT is 1.
   */
  light?: number;
}

export interface AvatarAssets {
  base: HTMLImageElement;
  hairs: HTMLImageElement;
  hairsAlt: HTMLImageElement;
  armor: HTMLImageElement;
  accessories: HTMLImageElement;
  armorData: ArmorDataFile;
  dyesData: DyesDataFile;
}

let armorDataCache: ArmorDataFile | null = null;
let dyesDataCache: DyesDataFile | null = null;
let baseImgCache: HTMLImageElement | null = null;
let hairsImgCache: HTMLImageElement | null = null;
let hairsAltImgCache: HTMLImageElement | null = null;
let armorImgCache: HTMLImageElement | null = null;
let accImgCache: HTMLImageElement | null = null;
let loadPromise: Promise<void> | null = null;

function getBasePrefix(): string {
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? base : `${base}/`;
}

// Asset cache-busting version for sprite atlases and JSON data
const ASSET_VERSION = '7';
const assetUrl = (p: string) => `${getBasePrefix()}${p}?v=${ASSET_VERSION}`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export async function initAvatarAssets(): Promise<AvatarAssets> {
  if (
    baseImgCache &&
    hairsImgCache &&
    hairsAltImgCache &&
    armorImgCache &&
    accImgCache &&
    armorDataCache &&
    dyesDataCache
  ) {
    return {
      base: baseImgCache,
      hairs: hairsImgCache,
      hairsAlt: hairsAltImgCache,
      armor: armorImgCache,
      accessories: accImgCache,
      armorData: armorDataCache,
      dyesData: dyesDataCache,
    };
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      // 1. Fetch armor data & dyes json
      const [armorRes, dyesRes] = await Promise.all([
        fetch(assetUrl('data/armor-data.json')),
        fetch(assetUrl('data/dyes.json')),
      ]);
      if (!armorRes.ok) throw new Error(`HTTP ${armorRes.status} fetching armor-data.json`);
      armorDataCache = (await armorRes.json()) as ArmorDataFile;

      if (dyesRes.ok) {
        dyesDataCache = (await dyesRes.json()) as DyesDataFile;
      } else {
        dyesDataCache = {};
      }

      // 2. Load all sprite atlases（构建脚本直接产出 PNG，体积与无损 WebP 相当）
      const [bImg, hImg, haImg, aImg, accImg] = await Promise.all([
        loadImage(assetUrl('atlas/player_base.png')),
        loadImage(assetUrl('atlas/player_hairs.png')),
        loadImage(assetUrl('atlas/player_hairs_alt.png')),
        loadImage(assetUrl('atlas/armor.png')),
        loadImage(assetUrl('atlas/accessories.png')),
      ]);

      baseImgCache = bImg;
      hairsImgCache = hImg;
      hairsAltImgCache = haImg;
      armorImgCache = aImg;
      accImgCache = accImg;
    })();
  }

  await loadPromise;
  return {
    base: baseImgCache!,
    hairs: hairsImgCache!,
    hairsAlt: hairsAltImgCache!,
    armor: armorImgCache!,
    accessories: accImgCache!,
    armorData: armorDataCache!,
    dyesData: dyesDataCache!,
  };
}

// Temporary in-memory canvas for offscreen tinting and luminance shader
let tempCanvas: HTMLCanvasElement | null = null;
let tempCtx: CanvasRenderingContext2D | null = null;

function getTempContext(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!tempCanvas) {
    tempCanvas = document.createElement('canvas');
  }
  if (tempCanvas.width !== w || tempCanvas.height !== h) {
    tempCanvas.width = w;
    tempCanvas.height = h;
  }
  if (!tempCtx) {
    tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  }
  return { canvas: tempCanvas, ctx: tempCtx };
}

// Regular colour tinting: offscreen pixel RGB multiplication preserving alpha.
function drawTintedPart(
  targetCtx: CanvasRenderingContext2D,
  srcImg: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  color: ColorData | undefined,
  dx = 0,
  dy = 0
) {
  const { canvas, ctx } = getTempContext(sw, sh);
  ctx.clearRect(0, 0, sw, sh);
  ctx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);

  if (color) {
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        d[i] = (d[i] * color.r) / 255;
        d[i + 1] = (d[i + 1] * color.g) / 255;
        d[i + 2] = (d[i + 2] * color.b) / 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  targetCtx.drawImage(canvas, dx, dy);
}

// Equipment dye pixel shader simulation:
// Evaluates per-pixel luminance (arithmetic mean of rgb) scaled by DYE_GAIN,
// then modulates by the normalized dye RGB values while preserving source alpha.
function drawDyedPart(
  targetCtx: CanvasRenderingContext2D,
  srcImg: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dyeColor: [number, number, number] | null | undefined,
  dx = 0,
  dy = 0
) {
  if (!dyeColor) {
    targetCtx.drawImage(srcImg, sx, sy, sw, sh, dx, dy, sw, sh);
    return;
  }

  const { canvas, ctx } = getTempContext(sw, sh);
  ctx.clearRect(0, 0, sw, sh);
  ctx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);

  const imgData = ctx.getImageData(0, 0, sw, sh);
  const d = imgData.data;
  const cr = dyeColor[0] / 255;
  const cg = dyeColor[1] / 255;
  const cb = dyeColor[2] / 255;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = Math.min(1, ((d[i] + d[i + 1] + d[i + 2]) / 3 / 255) * DYE_GAIN);
    d[i] = Math.min(255, lum * cr * 255);
    d[i + 1] = Math.min(255, lum * cg * 255);
    d[i + 2] = Math.min(255, lum * cb * 255);
  }

  ctx.putImageData(imgData, 0, 0);
  targetCtx.drawImage(canvas, dx, dy);
}

/**
 * Stage 1: buildDrawSet(playerData)
 * Pure data calculation settling equipment/vanity slots, occlusion flags, and composite frames.
 */
export function buildDrawSet(
  player: PlayerData,
  options: RenderOptions,
  armorData: ArmorDataFile,
  dyesData: DyesDataFile
): PlayerDrawSet {
  const showGear = options.showGear ?? true;
  const loadoutIdx = options.loadoutIndex ?? player.currentLoadoutIndex ?? 0;
  const armorSlots = getLoadoutArmor(loadoutIdx) || player.armor || [];
  const dyeSlots = getLoadoutDye(loadoutIdx) || player.dye || [];

  const slots: SettledSlots = {
    head: 0,
    body: 0,
    legs: 0,
    wings: 0,
    shoe: 0,
    back: 0,
    front: 0,
    waist: 0,
    neck: 0,
    face: 0,
    faceFlower: 0,
    handon: 0,
    handoff: 0,
    shield: 0,
    balloon: 0,
  };

  const dyes: SettledDyes = {
    cHead: null,
    cBody: null,
    cLegs: null,
    cWings: null,
    cShoe: null,
    cBack: null,
    cFront: null,
    cWaist: null,
    cNeck: null,
    cFace: null,
    cFaceFlower: null,
    cHandOn: null,
    cHandOff: null,
    cShield: null,
    cBalloon: null,
  };

  const resolveDye = (id: number | undefined): [number, number, number] | null => {
    if (!id || id <= 0) return null;
    return dyesData[String(id)] ?? null;
  };

  if (showGear) {
    // 1. Armor Slots Settlement (Vanity 10..12 overrides Normal 0..2)
    const headItem = armorSlots[10]?.id > 0 ? armorSlots[10] : armorSlots[0]?.id > 0 ? armorSlots[0] : null;
    const bodyItem = armorSlots[11]?.id > 0 ? armorSlots[11] : armorSlots[1]?.id > 0 ? armorSlots[1] : null;
    const legItem = armorSlots[12]?.id > 0 ? armorSlots[12] : armorSlots[2]?.id > 0 ? armorSlots[2] : null;

    slots.head = headItem ? (armorData.items[String(headItem.id)]?.head ?? 0) : 0;
    slots.body = bodyItem ? (armorData.items[String(bodyItem.id)]?.body ?? 0) : 0;
    slots.legs = legItem ? (armorData.items[String(legItem.id)]?.leg ?? 0) : 0;

    dyes.cHead = resolveDye(dyeSlots[0]?.id);
    dyes.cBody = resolveDye(dyeSlots[1]?.id);
    dyes.cLegs = resolveDye(dyeSlots[2]?.id);

    // 2. Visible Accessories Settlement (UpdateVisibleAccessories)
    if (armorData.accItems) {
      // Pass 1: Normal accessory slots 3..9
      for (let i = 3; i < 10; i++) {
        const accIdx = i - 3;
        const isHidden =
          player.loadouts?.[loadoutIdx]?.hide?.[i] === true ||
          (loadoutIdx === (player.currentLoadoutIndex ?? 0) &&
            player.hideVisual1 !== undefined &&
            ((player.hideVisual1 >> accIdx) & 1) === 1);

        if (isHidden) continue;

        const item = armorSlots[i];
        if (!item || item.id <= 0) continue;

        const dyeItem = dyeSlots[i];
        const dyeCol = resolveDye(dyeItem?.id);
        const meta = armorData.accItems[String(item.id)];

        if (meta) {
          if (meta.wings) { slots.wings = meta.wings; dyes.cWings = dyeCol; }
          const shoeId = meta.shoes ?? meta.shoe;
          if (shoeId) { slots.shoe = shoeId; dyes.cShoe = dyeCol; }
          if (meta.back) { slots.back = meta.back; dyes.cBack = dyeCol; }
          if (meta.front) { slots.front = meta.front; dyes.cFront = dyeCol; }
          if (meta.waist) { slots.waist = meta.waist; dyes.cWaist = dyeCol; }
          if (meta.neck) { slots.neck = meta.neck; dyes.cNeck = dyeCol; }
          if (meta.face) {
            // Obsidian rose (6) and flower hairpins draw in FaceFlower layer
            if ([1, 6, 8, 9].includes(meta.face)) {
              slots.faceFlower = meta.face;
              dyes.cFaceFlower = dyeCol;
            } else {
              slots.face = meta.face;
              dyes.cFace = dyeCol;
            }
          }
          if (meta.handOn) { slots.handon = meta.handOn; dyes.cHandOn = dyeCol; }
          if (meta.handOff) { slots.handoff = meta.handOff; dyes.cHandOff = dyeCol; }
          if (meta.shield) { slots.shield = meta.shield; dyes.cShield = dyeCol; }
          if (meta.balloon) { slots.balloon = meta.balloon; dyes.cBalloon = dyeCol; }
        }
      }

      // Pass 2: Vanity accessory slots 13..19 (override normal slots, always visible in Terraria)
      for (let j = 13; j < 20; j++) {
        const item = armorSlots[j];
        if (!item || item.id <= 0) continue;

        const dyeItem = dyeSlots[j - 10];
        const dyeCol = resolveDye(dyeItem?.id);
        const meta = armorData.accItems[String(item.id)];

        if (meta) {
          if (meta.wings) { slots.wings = meta.wings; dyes.cWings = dyeCol; }
          const shoeId = meta.shoes ?? meta.shoe;
          if (shoeId) { slots.shoe = shoeId; dyes.cShoe = dyeCol; }
          if (meta.back) { slots.back = meta.back; dyes.cBack = dyeCol; }
          if (meta.front) { slots.front = meta.front; dyes.cFront = dyeCol; }
          if (meta.waist) { slots.waist = meta.waist; dyes.cWaist = dyeCol; }
          if (meta.neck) { slots.neck = meta.neck; dyes.cNeck = dyeCol; }
          if (meta.face) {
            if ([1, 6, 8, 9].includes(meta.face)) {
              slots.faceFlower = meta.face;
              dyes.cFaceFlower = dyeCol;
            } else {
              slots.face = meta.face;
              dyes.cFace = dyeCol;
            }
          }
          if (meta.handOn) { slots.handon = meta.handOn; dyes.cHandOn = dyeCol; }
          if (meta.handOff) { slots.handoff = meta.handOff; dyes.cHandOff = dyeCol; }
          if (meta.shield) { slots.shield = meta.shield; dyes.cShield = dyeCol; }
          if (meta.balloon) { slots.balloon = meta.balloon; dyes.cBalloon = dyeCol; }
        }
      }
    }
  }

  const skinVar = Math.max(0, Math.min(11, player.skinVariant ?? 0));
  const isMale = [0, 1, 2, 3, 8, 10].includes(skinVar);

  const fullHair = armorData.fullHairHeads?.includes(slots.head) ?? false;
  const hatHair = armorData.hatHairHeads?.includes(slots.head) ?? false;
  const showHair = slots.head === 0 || fullHair || hatHair;

  // Composite Frames for standing frame 0
  const compTorsoFrame: DrawRect = { x: 0, y: isMale ? 0 : 112, w: 40, h: 56 };
  const compFrontShoulderFrame: DrawRect = { x: 0, y: isMale ? 56 : 168, w: 40, h: 56 };
  const compBackShoulderFrame: DrawRect = { x: 40, y: isMale ? 56 : 168, w: 40, h: 56 };
  const compFrontArmFrame: DrawRect = { x: 80, y: 0, w: 40, h: 56 };
  const compBackArmFrame: DrawRect = { x: 80, y: 112, w: 40, h: 56 };

  return {
    skinVar,
    isMale,
    colorSkin: player.skinColor,
    colorHair: player.hairColor,
    colorEyes: player.eyeColor,
    colorShirt: player.shirtColor,
    colorUnderShirt: player.underShirtColor,
    colorPants: player.pantsColor,
    colorShoes: player.shoeColor,
    hair: player.hair ?? 0,
    fullHair,
    hatHair,
    showHair,
    hidesTopSkin: false,
    hidesBottomSkin: false,
    wearsRobe: false,
    missingHand: false,
    missingArm: false,
    compTorsoFrame,
    compFrontArmFrame,
    compBackArmFrame,
    compFrontShoulderFrame,
    compBackShoulderFrame,
    slots,
    dyes,
  };
}

/**
 * Stage 2: collectDrawData(drawSet) -> DrawCommand[]
 * Order from bottom to top layers.
 */
export function collectDrawData(
  drawSet: PlayerDrawSet,
  armorData: ArmorDataFile
): DrawCommand[] {
  const commands: DrawCommand[] = [];

  const vLayers = armorData.variants[String(drawSet.skinVar)] || armorData.variants['0'];
  const vArms = (armorData.variantArms?.[String(drawSet.skinVar)] ||
    armorData.variantArms?.['0'] ||
    {}) as Record<string, { front: [number, number]; back: [number, number] }>;
  const toRect = (coords: [number, number]): DrawRect => ({
    x: coords[0] * 40,
    y: coords[1] * 56,
    w: 40,
    h: 56,
  });

  // Layer 09: Wings are omitted in the 40x56 static standing avatar.
  // Wing textures exceed 40x56 frame bounds (e.g. 86x62 per frame) and require a larger canvas,
  // while several animated variants only display during flight (velocity.Y != 0).

  if (drawSet.slots.back > 0 && armorData.accCoords?.back?.[String(drawSet.slots.back)]) {
    commands.push({
      layerName: '10_BackAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.back[String(drawSet.slots.back)]),
      dyeColor: drawSet.dyes.cBack,
    });
  }

  // 10_BackHead: Multi-layer headwear back pieces (ArmorIDs.Head.Sets.FrontToBackID)
  // Rendered behind head/torso skin & hair in layer 01_3
  const backHeadId = FRONT_TO_BACK_HEAD[drawSet.slots.head];
  if (backHeadId && armorData.heads[String(backHeadId)]) {
    const bCoords = armorData.heads[String(backHeadId)];
    commands.push({
      layerName: '10_BackHead',
      textureKey: 'armor',
      srcRect: { x: bCoords[0] * 40, y: bCoords[1] * 56, w: 40, h: 52 },
      dyeColor: drawSet.dyes.cHead,
    });
  }

  if (drawSet.slots.balloon > 0 && armorData.accCoords?.balloon?.[String(drawSet.slots.balloon)]) {
    commands.push({
      layerName: '11_Balloons',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.balloon[String(drawSet.slots.balloon)]),
      dyeColor: drawSet.dyes.cBalloon,
    });
  }

  // ---------- 12_Skin ----------
  // Vanilla draws torsoSkin AND legSkin here, both with bodyVect. The leg skin is
  // an underlay: it stays even when leg armour is worn.
  if (!drawSet.hidesTopSkin && vLayers.torsoSkin) {
    commands.push({
      layerName: '12_Skin_Torso',
      textureKey: 'base',
      srcRect: toRect(vLayers.torsoSkin),
      tintColor: drawSet.colorSkin,
    });
  }
  if (!drawSet.hidesBottomSkin && vLayers.legSkin) {
    commands.push({
      layerName: '12_Skin_Legs',
      textureKey: 'base',
      srcRect: toRect(vLayers.legSkin),
      tintColor: drawSet.colorSkin,
    });
  }

  // ---------- 12_SkinComposite_BackArmShirt ----------
  // The back arm is one frame behind the torso. It is built from skin + clothes
  // (cell 2,2 of the 9x4 grid) or, with body armour, from the armour's own
  // back shoulder (1,1) + back arm (2,2) cells.
  const pushArm = (partKey: string, frame: 'front' | 'back', layer: string, tint?: ColorData, dye?: [number, number, number] | null) => {
    const c = vArms[partKey]?.[frame];
    if (!c) return;
    commands.push({
      layerName: layer,
      textureKey: 'base',
      srcRect: toRect(c),
      ...(dye ? { dyeColor: dye } : tint ? { tintColor: tint } : {}),
    });
  };

  if (drawSet.slots.body === 0) {
    pushArm('armSkin', 'back', '12_BackArm_Skin', drawSet.colorSkin);
    pushArm('hands', 'back', '12_BackArm_Hands', drawSet.colorSkin);
    pushArm('armUndershirt', 'back', '12_BackArm_UnderShirt', drawSet.colorUnderShirt);
    pushArm('armShirt', 'back', '12_BackArm_Shirt', drawSet.colorShirt);
  } else {
    const b = armorData.bodies[String(drawSet.slots.body)];
    const parts = drawSet.isMale ? b?.maleParts : b?.femaleParts;
    pushArm('armSkin', 'back', '12_BackArm_Skin', drawSet.colorSkin);
    pushArm('hands', 'back', '12_BackArm_Hands', drawSet.colorSkin);
    if (parts?.backShoulder) {
      commands.push({
        layerName: '12_BackShoulder',
        textureKey: 'armor',
        srcRect: toRect(parts.backShoulder),
        dyeColor: drawSet.dyes.cBody,
      });
    }
    if (b?.backArm) {
      commands.push({
        layerName: '12_BackArm_Armor',
        textureKey: 'armor',
        srcRect: toRect(b.backArm),
        dyeColor: drawSet.dyes.cBody,
      });
    }
  }

  // Layer 13: Leggings / Pants / LegSkin
  if (drawSet.slots.legs > 0 && armorData.legs[String(drawSet.slots.legs)]) {
    commands.push({
      layerName: '13_Leggings',
      textureKey: 'armor',
      srcRect: toRect(armorData.legs[String(drawSet.slots.legs)]),
      dyeColor: drawSet.dyes.cLegs,
    });
  } else {
    if (vLayers.pants) {
      commands.push({
        layerName: '13_Pants',
        textureKey: 'base',
        srcRect: toRect(vLayers.pants),
        tintColor: drawSet.colorPants,
      });
    }
    if (vLayers.shoes) {
      commands.push({
        layerName: '13_Shoes',
        textureKey: 'base',
        srcRect: toRect(vLayers.shoes),
        tintColor: drawSet.colorShoes,
      });
    }
  }

  // Layer 14: Shoe accessories
  if (drawSet.slots.shoe > 0 && armorData.accCoords?.shoes?.[String(drawSet.slots.shoe)]) {
    commands.push({
      layerName: '14_ShoeAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.shoes[String(drawSet.slots.shoe)]),
      dyeColor: drawSet.dyes.cShoe,
    });
  }

  // Layer 17: Torso
  if (drawSet.slots.body > 0 && armorData.bodies[String(drawSet.slots.body)]) {
    const bEntry = armorData.bodies[String(drawSet.slots.body)];
    const coords = drawSet.isMale ? bEntry.male : bEntry.female;
    commands.push({
      layerName: '17_TorsoArmor',
      textureKey: 'armor',
      srcRect: toRect(coords),
      dyeColor: drawSet.dyes.cBody,
    });
  } else if (!drawSet.hidesTopSkin) {
    // 17_Torso, clothes branch: undershirt -> shirt -> hands, all on the torso frame
    if (vLayers.undershirt) {
      commands.push({
        layerName: '17_UnderShirt',
        textureKey: 'base',
        srcRect: toRect(vLayers.undershirt),
        tintColor: drawSet.colorUnderShirt,
      });
    }
    if (vLayers.shirt) {
      commands.push({
        layerName: '17_Shirt',
        textureKey: 'base',
        srcRect: toRect(vLayers.shirt),
        tintColor: drawSet.colorShirt,
      });
    }
    if (vLayers.hands) {
      commands.push({
        layerName: '17_Hands',
        textureKey: 'base',
        srcRect: toRect(vLayers.hands),
        tintColor: drawSet.colorSkin,
      });
    }
  }

  // Layer 18: Offhand accessory
  if (drawSet.slots.handoff > 0 && armorData.accCoords?.handOff?.[String(drawSet.slots.handoff)]) {
    commands.push({
      layerName: '18_OffhandAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.handOff[String(drawSet.slots.handoff)]),
      dyeColor: drawSet.dyes.cHandOff,
    });
  }

  // Layer 19: Waist accessory
  if (drawSet.slots.waist > 0 && armorData.accCoords?.waist?.[String(drawSet.slots.waist)]) {
    commands.push({
      layerName: '19_WaistAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.waist[String(drawSet.slots.waist)]),
      dyeColor: drawSet.dyes.cWaist,
    });
  }

  // Layer 20: Neck accessory
  if (drawSet.slots.neck > 0 && armorData.accCoords?.neck?.[String(drawSet.slots.neck)]) {
    commands.push({
      layerName: '20_NeckAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.neck[String(drawSet.slots.neck)]),
      dyeColor: drawSet.dyes.cNeck,
    });
  }

  // Layer 21: Head (Face skin + Eyes + Hair + Helmet)
  if (vLayers.head) {
    commands.push({
      layerName: '21_FaceSkin',
      textureKey: 'base',
      srcRect: toRect(vLayers.head),
      tintColor: drawSet.colorSkin,
    });
  }
  if (vLayers.eyeWhites) {
    commands.push({
      layerName: '21_EyeWhites',
      textureKey: 'base',
      srcRect: toRect(vLayers.eyeWhites),
    });
  }
  if (vLayers.eyes) {
    commands.push({
      layerName: '21_EyesIris',
      textureKey: 'base',
      srcRect: toRect(vLayers.eyes),
      tintColor: drawSet.colorEyes,
    });
  }

  // Hair & Helmet resolution
  const safeHair = Math.max(0, Math.min((armorData.hairCount || 228) - 1, drawSet.hair));
  const hairCol = safeHair % 16;
  const hairRow = Math.floor(safeHair / 16);
  const hairRect: DrawRect = { x: hairCol * 40, y: hairRow * 56, w: 40, h: 56 };

  // Head armor source rect trimming: 48 for tall hats (e.g. wizard hat), 52 for standard helmets
  const TRIM8_HEADS = [14, 56, 114, 158, 69, 180];
  const headId = drawSet.slots.head;
  const headCoords = headId > 0 ? armorData.heads[String(headId)] : undefined;
  const helmetRect: DrawRect | null = headCoords
    ? { x: headCoords[0] * 40, y: headCoords[1] * 56, w: 40, h: TRIM8_HEADS.includes(headId) ? 48 : 52 }
    : null;

  if (drawSet.hatHair) {
    // Hat hair (hairsAlt) drawn underneath hat
    commands.push({
      layerName: '21_HatHair',
      textureKey: 'hairsAlt',
      srcRect: hairRect,
      tintColor: drawSet.colorHair,
    });
    if (helmetRect !== null) {
      commands.push({
        layerName: '21_Helmet',
        textureKey: 'armor',
        srcRect: helmetRect!,
        dyeColor: drawSet.dyes.cHead,
      });
    }
  } else if (drawSet.fullHair) {
    // Crown/headband/fox ears: full hair underneath, headpiece ON TOP!
    commands.push({
      layerName: '21_FullHair',
      textureKey: 'hairs',
      srcRect: hairRect,
      tintColor: drawSet.colorHair,
    });
    if (helmetRect !== null) {
      commands.push({
        layerName: '21_Helmet',
        textureKey: 'armor',
        srcRect: helmetRect!,
        dyeColor: drawSet.dyes.cHead,
      });
    }
  } else if (helmetRect !== null) {
    // Full helmet hiding hair
    commands.push({
      layerName: '21_Helmet',
      textureKey: 'armor',
      srcRect: helmetRect!,
      dyeColor: drawSet.dyes.cHead,
    });
  } else {
    // No helmet, normal full hair
    commands.push({
      layerName: '21_Hair',
      textureKey: 'hairs',
      srcRect: hairRect,
      tintColor: drawSet.colorHair,
    });
  }

  // Layer 22: Face accessory (e.g. faceFlower Obsidian Rose on top of hat brim)
  if (drawSet.slots.faceFlower > 0 && armorData.accCoords?.face?.[String(drawSet.slots.faceFlower)]) {
    commands.push({
      layerName: '22_FaceFlowerAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.face[String(drawSet.slots.faceFlower)]),
      dyeColor: drawSet.dyes.cFaceFlower,
    });
  }
  if (drawSet.slots.face > 0 && armorData.accCoords?.face?.[String(drawSet.slots.face)]) {
    commands.push({
      layerName: '22_FaceAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.face[String(drawSet.slots.face)]),
      dyeColor: drawSet.dyes.cFace,
    });
  }

  // Layer 25: Shield
  if (drawSet.slots.shield > 0 && armorData.accCoords?.shield?.[String(drawSet.slots.shield)]) {
    commands.push({
      layerName: '25_Shield',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.shield[String(drawSet.slots.shield)]),
      dyeColor: drawSet.dyes.cShield,
    });
  }

  // ---------- 28_ArmOverItem: front shoulder + front arm ----------
  // Same 40x56 anchor as everything else; only the source cell differs.
  if (drawSet.slots.body > 0) {
    const b = armorData.bodies[String(drawSet.slots.body)];
    const parts = drawSet.isMale ? b?.maleParts : b?.femaleParts;
    pushArm('armSkin', 'front', '28_Arm_Skin', drawSet.colorSkin);
    pushArm('armHand', 'front', '28_Arm_Hand', drawSet.colorSkin);
    if (parts?.frontShoulder) {
      commands.push({
        layerName: '28_FrontShoulder',
        textureKey: 'armor',
        srcRect: toRect(parts.frontShoulder),
        dyeColor: drawSet.dyes.cBody,
      });
    }
    if (b?.frontArm) {
      commands.push({
        layerName: '28_FrontArm_Armor',
        textureKey: 'armor',
        srcRect: toRect(b.frontArm),
        dyeColor: drawSet.dyes.cBody,
      });
    }
  } else {
    pushArm('armSkin', 'front', '28_Arm_Skin', drawSet.colorSkin);
    pushArm('armUndershirt', 'front', '28_Arm_UnderShirt', drawSet.colorUnderShirt);
    pushArm('armShirt', 'front', '28_Arm_Shirt', drawSet.colorShirt);
  }

  // Layer 29: On-hand accessory
  if (drawSet.slots.handon > 0 && armorData.accCoords?.handOn?.[String(drawSet.slots.handon)]) {
    commands.push({
      layerName: '29_OnhandAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.handOn[String(drawSet.slots.handon)]),
      dyeColor: drawSet.dyes.cHandOn,
    });
  }

  // Layer 32: Front accessory
  if (drawSet.slots.front > 0 && armorData.accCoords?.front?.[String(drawSet.slots.front)]) {
    commands.push({
      layerName: '32_FrontAcc',
      textureKey: 'accessories',
      srcRect: toRect(armorData.accCoords.front[String(drawSet.slots.front)]),
      dyeColor: drawSet.dyes.cFront,
    });
  }

  return commands;
}

/**
 * Stage 3: executeDrawCommands(commands, targetCtx, assets)
 * Iterating through flat DrawCommand queue with offscreen tinting and luminance shader.
 */
export function executeDrawCommands(
  commands: DrawCommand[],
  targetCtx: CanvasRenderingContext2D,
  assets: AvatarAssets
): void {
  for (const cmd of commands) {
    const img = assets[cmd.textureKey];
    if (!img) continue;

    const sx = cmd.srcRect.x;
    const sy = cmd.srcRect.y;
    const sw = cmd.srcRect.w;
    const sh = cmd.srcRect.h;
    const dx = cmd.destOffset?.x ?? 0;
    const dy = cmd.destOffset?.y ?? 0;

    if (cmd.dyeColor) {
      drawDyedPart(targetCtx, img, sx, sy, sw, sh, cmd.dyeColor, dx, dy);
    } else if (cmd.tintColor) {
      drawTintedPart(targetCtx, img, sx, sy, sw, sh, cmd.tintColor, dx, dy);
    } else {
      targetCtx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
    }
  }
}

/**
 * Public high-level renderer entry point
 */
export async function drawCharacterAvatar(
  targetCanvas: HTMLCanvasElement,
  player: PlayerData | null | undefined,
  options: RenderOptions = {}
): Promise<void> {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  if (!player) return;

  const assets = await initAvatarAssets();
  const drawSet = buildDrawSet(player, options, assets.armorData, assets.dyesData);
  if (options.applyDyes === false) {
    for (const k of Object.keys(drawSet.dyes) as (keyof typeof drawSet.dyes)[]) drawSet.dyes[k] = null;
  }
  const commands = collectDrawData(drawSet, assets.armorData);
  executeDrawCommands(commands, ctx, assets);

  // Apply world light multiplier to the composited sprite
  const lightLevel = options.light ?? DEFAULT_LIGHT;
  if (lightLevel !== 1) {
    const img = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      d[i] = Math.min(255, d[i] * lightLevel);
      d[i + 1] = Math.min(255, d[i + 1] * lightLevel);
      d[i + 2] = Math.min(255, d[i + 2] * lightLevel);
    }
    ctx.putImageData(img, 0, 0);
  }
}
