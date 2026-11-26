/*! @license AGPL-3.0 | Author: akihofuyuka */

export const TILE_SIZE = 16;
const MAX_IMAGE_SIDE = 2048;
export const MAX_CANVAS_WIDTH = 8400;
export const MAX_CANVAS_HEIGHT = 2400;
const MIN_VISIBLE_CANVAS = TILE_SIZE;
export const DEFAULT_TOP_N = 12;

export const MAX_RGB_DISTANCE = Math.sqrt(3 * 255 * 255);
export const MAX_DELTA_E = 150.0;

/** PaintID (1..30) -> Terraria ItemID mapping for rendering paint bucket sprites */
export const PAINT_ITEM_IDS: Record<number, number> = {
  1: 1073,
  2: 1074,
  3: 1075,
  4: 1076,
  5: 1077,
  6: 1078,
  7: 1079,
  8: 1080,
  9: 1081,
  10: 1082,
  11: 1083,
  12: 1084,
  13: 1085,
  14: 1086,
  15: 1087,
  16: 1088,
  17: 1089,
  18: 1090,
  19: 1091,
  20: 1092,
  21: 1093,
  22: 1094,
  23: 1095,
  24: 1096,
  25: 1097,
  26: 1098,
  27: 1099,
  28: 1966,
  29: 1967,
  30: 1968,
};

export type MaterialKind = 'tile' | 'wall';
export type MaterialTag = 'falling' | 'solid_top' | 'unsafe_wall' | 'special';
export type MatchAlgorithm = 'lab' | 'rgb';
export type KindFilter = 'all' | 'tile' | 'wall';
export type ScaleMode = 'keep_ratio' | 'fill' | 'manual';

export interface RawMaterialEntry {
  kind: MaterialKind;
  id: number;
  name: string;
  item_id: number;
  color: string;
  tags?: MaterialTag[];
  paint_colors: Record<string, string>;
}

export interface RawMaterialsDatabase {
  version: number;
  generated_at?: string;
  game_version?: string;
  paint_names?: Record<string, string>;
  materials: RawMaterialEntry[];
}

export interface MaterialDef {
  kind: MaterialKind;
  id: number;
  name: string;
  itemId: number;
  baseHex: string;
  tags: MaterialTag[];
  paintHexes: Array<[number, string]>;
}

export interface MatchOptions {
  filter: KindFilter;
  includePaint: boolean;
  algorithm: MatchAlgorithm;
  topN: number;
  includeFalling?: boolean;
  includeSolidTop?: boolean;
  includeUnsafeWalls?: boolean;
  includeSpecial?: boolean;
  excludedMaterialKeys?: Set<string> | string[];
}

export interface MatchCandidate {
  material: MaterialDef;
  paintId: number;
  paintName: string;
  paintItemId: number | null;
  hex: string;
  distance: number;
  similarity: number;
}

export type LabTuple = [number, number, number];
export type RgbTuple = [number, number, number];

export function materialKey(material: Pick<MaterialDef, 'kind' | 'id'>): string {
  return `${material.kind}:${material.id}`;
}

function bareHex(value: string): string {
  return value.trim().replace(/^#/, '').toUpperCase();
}

export function parseHexColor(input: string): string | null {
  const normalized = bareHex(input);
  if (normalized.length !== 6) return null;
  if (!/^[0-9A-F]{6}$/.test(normalized)) return null;
  return normalized;
}

export function hexToRgb(hex: string): RgbTuple {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function rgbDistance(hexA: string, hexB: string): number {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  const dr = ar - br;
  const dg = ag - bg;
  const db = ab - bb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function gammaExpand(channel: number): number {
  const c = channel / 255.0;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16.0 / 116.0;
}

/** 标准 sRGB -> XYZ (D65) -> CIE Lab 色彩空间转换 */
export function rgbToLab(rgbOrHex: RgbTuple | string): LabTuple {
  const [r8, g8, b8] = typeof rgbOrHex === 'string' ? hexToRgb(rgbOrHex) : rgbOrHex;
  const r = gammaExpand(r8);
  const g = gammaExpand(g8);
  const b = gammaExpand(b8);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.0;
  const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)];
}

export function deltaE(labA: LabTuple, labB: LabTuple): number {
  const dl = labA[0] - labB[0];
  const da = labA[1] - labB[1];
  const db = labA[2] - labB[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

export function calcSimilarity(distance: number, maxDistance: number): number {
  return Math.max(0.0, 1.0 - Math.min(distance / maxDistance, 1.0));
}

export interface TagCounts {
  falling: number;
  solid_top: number;
  unsafe_wall: number;
  special: number;
}

export class MaterialsRepository {
  readonly materials: MaterialDef[];
  readonly paintNames: Map<number, string>;
  readonly gameVersion: string;
  readonly generatedAt: string;
  readonly tileCount: number;
  readonly wallCount: number;
  readonly defaultCount: number;
  readonly tagCounts: TagCounts;
  private readonly labCache = new Map<string, LabTuple>();
  private readonly rgbCache = new Map<string, RgbTuple>();

  constructor(
    materials: MaterialDef[],
    paintNames: Map<number, string>,
    gameVersion = '',
    generatedAt = ''
  ) {
    this.materials = materials;
    this.paintNames = paintNames;
    this.gameVersion = gameVersion;
    this.generatedAt = generatedAt;
    let tiles = 0;
    let defCount = 0;
    const tc: TagCounts = { falling: 0, solid_top: 0, unsafe_wall: 0, special: 0 };
    for (const m of materials) {
      if (m.kind === 'tile') tiles++;
      if (m.tags.length === 0) defCount++;
      for (const t of m.tags) {
        if (t in tc) tc[t]++;
      }
    }
    this.tileCount = tiles;
    this.wallCount = materials.length - tiles;
    this.defaultCount = defCount;
    this.tagCounts = tc;
  }

  labOf(hex: string): LabTuple {
    let cached = this.labCache.get(hex);
    if (!cached) {
      cached = rgbToLab(this.rgbOf(hex));
      this.labCache.set(hex, cached);
    }
    return cached;
  }

  rgbOf(hex: string): RgbTuple {
    let cached = this.rgbCache.get(hex);
    if (!cached) {
      cached = hexToRgb(hex);
      this.rgbCache.set(hex, cached);
    }
    return cached;
  }

  paintNameOf(paintId: number): string {
    if (paintId === 0) return '无漆';
    return this.paintNames.get(paintId) ?? `漆 ${paintId}`;
  }

  static fromRaw(raw: RawMaterialsDatabase): MaterialsRepository {
    const paintNames = new Map<number, string>();
    if (raw.paint_names) {
      for (const [k, v] of Object.entries(raw.paint_names)) {
        const id = Number.parseInt(k, 10);
        if (!Number.isNaN(id)) paintNames.set(id, v);
      }
    }

    const materials: MaterialDef[] = raw.materials.map((m) => {
      const paintHexes: Array<[number, string]> = [];
      if (m.paint_colors) {
        for (const [k, v] of Object.entries(m.paint_colors)) {
          const pid = Number.parseInt(k, 10);
          if (!Number.isNaN(pid)) {
            paintHexes.push([pid, bareHex(v)]);
          }
        }
        paintHexes.sort((a, b) => a[0] - b[0]);
      }
      return {
        kind: m.kind,
        id: m.id,
        name: m.name,
        itemId: m.item_id,
        baseHex: bareHex(m.color),
        tags: Array.isArray(m.tags) ? m.tags : [],
        paintHexes,
      };
    });

    return new MaterialsRepository(
      materials,
      paintNames,
      raw.game_version ?? '',
      raw.generated_at ?? ''
    );
  }
}

function toExcludedSet(excluded?: Set<string> | string[]): Set<string> | null {
  if (!excluded) return null;
  if (excluded instanceof Set) return excluded.size > 0 ? excluded : null;
  return excluded.length > 0 ? new Set(excluded) : null;
}

export function isMaterialAllowed(
  material: MaterialDef,
  options: MatchOptions,
  excludedSet?: Set<string> | null
): boolean {
  if (options.filter === 'tile' && material.kind !== 'tile') return false;
  if (options.filter === 'wall' && material.kind !== 'wall') return false;
  if (excludedSet && excludedSet.has(materialKey(material))) return false;

  for (const tag of material.tags) {
    if (tag === 'falling' && !options.includeFalling) return false;
    if (tag === 'solid_top' && !options.includeSolidTop) return false;
    if (tag === 'unsafe_wall' && !options.includeUnsafeWalls) return false;
    if (tag === 'special' && !options.includeSpecial) return false;
  }
  return true;
}

export class PixelArtMatcher {
  readonly repository: MaterialsRepository;

  constructor(repository: MaterialsRepository) {
    this.repository = repository;
  }

  matchCandidates(targetHex: string, options: MatchOptions): MatchCandidate[] {
    const normalized = parseHexColor(targetHex);
    if (!normalized) return [];

    const useLab = options.algorithm === 'lab';
    const targetLab = useLab ? rgbToLab(normalized) : null;
    const maxDistance = useLab ? MAX_DELTA_E : MAX_RGB_DISTANCE;
    const excludedSet = toExcludedSet(options.excludedMaterialKeys);

    // 同一材料的同色漆变体（例如 红漆 1 与 深红漆 13 地图色相同）按键去重，保留漆 ID 最小的一个
    const unique = new Map<string, MatchCandidate>();

    const consider = (material: MaterialDef, paintId: number, hex: string) => {
      const key = `${material.kind}:${material.id}:${hex}`;
      if (unique.has(key)) return;
      const distance = useLab
        ? deltaE(targetLab!, this.repository.labOf(hex))
        : rgbDistance(normalized, hex);
      unique.set(key, {
        material,
        paintId,
        paintName: this.repository.paintNameOf(paintId),
        paintItemId: paintId > 0 ? (PAINT_ITEM_IDS[paintId] ?? null) : null,
        hex,
        distance,
        similarity: calcSimilarity(distance, maxDistance),
      });
    };

    for (const material of this.repository.materials) {
      if (!isMaterialAllowed(material, options, excludedSet)) continue;

      consider(material, 0, material.baseHex);
      if (options.includePaint) {
        for (const [paintId, hex] of material.paintHexes) {
          consider(material, paintId, hex);
        }
      }
    }

    const result = Array.from(unique.values()).sort((a, b) => a.distance - b.distance);
    return options.topN > 0 && result.length > options.topN
      ? result.slice(0, options.topN)
      : result;
  }
}

/* ==================== 3D KD-Tree 批量最近邻索引 ==================== */

interface PaletteEntry {
  candidate: MatchCandidate;
  rgb: RgbTuple;
  point: [number, number, number];
}

interface KdNode {
  entry: PaletteEntry;
  axis: number;
  left: KdNode | null;
  right: KdNode | null;
}

function buildKdTree(entries: PaletteEntry[], depth = 0): KdNode | null {
  if (entries.length === 0) return null;
  const axis = depth % 3;
  entries.sort((a, b) => a.point[axis] - b.point[axis]);
  const mid = entries.length >> 1;
  return {
    entry: entries[mid],
    axis,
    left: buildKdTree(entries.slice(0, mid), depth + 1),
    right: buildKdTree(entries.slice(mid + 1), depth + 1),
  };
}

export class PixelArtColorIndex {
  private readonly root: KdNode | null;
  readonly algorithm: MatchAlgorithm;
  readonly size: number;

  constructor(repository: MaterialsRepository, options: MatchOptions) {
    this.algorithm = options.algorithm;
    const useLab = options.algorithm === 'lab';
    const excludedSet = toExcludedSet(options.excludedMaterialKeys);

    // 按实际颜色 HEX 去重（优先保留无漆 > 漆ID小），大幅缩减树节点并保证一致的确定性选择
    const byHex = new Map<string, MatchCandidate>();
    const register = (material: MaterialDef, paintId: number, hex: string) => {
      const existing = byHex.get(hex);
      if (existing) {
        // 优先无漆 (paintId === 0)，其次 paintId 更小
        if (existing.paintId === 0 || (paintId !== 0 && existing.paintId <= paintId)) {
          return;
        }
      }
      byHex.set(hex, {
        material,
        paintId,
        paintName: repository.paintNameOf(paintId),
        paintItemId: paintId > 0 ? (PAINT_ITEM_IDS[paintId] ?? null) : null,
        hex,
        distance: 0,
        similarity: 1,
      });
    };

    for (const material of repository.materials) {
      if (!isMaterialAllowed(material, options, excludedSet)) continue;
      register(material, 0, material.baseHex);
      if (options.includePaint) {
        for (const [paintId, hex] of material.paintHexes) {
          register(material, paintId, hex);
        }
      }
    }

    const entries: PaletteEntry[] = [];
    for (const candidate of byHex.values()) {
      const rgb = repository.rgbOf(candidate.hex);
      const point: [number, number, number] = useLab ? repository.labOf(candidate.hex) : rgb;
      entries.push({ candidate, rgb, point });
    }
    this.size = entries.length;
    this.root = buildKdTree(entries);
  }

  findClosestRgb(r: number, g: number, b: number): { candidate: MatchCandidate; rgb: RgbTuple } | null {
    if (!this.root) return null;
    const target: [number, number, number] =
      this.algorithm === 'lab' ? rgbToLab([r, g, b]) : [r, g, b];

    let bestEntry: PaletteEntry = this.root.entry;
    let bestDistSq = Infinity;

    const search = (node: KdNode | null) => {
      if (!node) return;
      const p = node.entry.point;
      const d0 = target[0] - p[0];
      const d1 = target[1] - p[1];
      const d2 = target[2] - p[2];
      const distSq = d0 * d0 + d1 * d1 + d2 * d2;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestEntry = node.entry;
      }

      const axis = node.axis;
      const diff = target[axis] - p[axis];
      const near = diff < 0 ? node.left : node.right;
      const far = diff < 0 ? node.right : node.left;

      search(near);
      if (diff * diff < bestDistSq) {
        search(far);
      }
    };

    search(this.root);
    return { candidate: bestEntry.candidate, rgb: bestEntry.rgb };
  }
}

/* ==================== 全图批量转换 + Floyd-Steinberg 抖动 + 材料清单 ==================== */

export interface BatchConvertOptions {
  dithering: boolean;
  skipTransparent: boolean;
  bgRgb?: RgbTuple;
}

export interface BomEntry {
  key: string;
  material: MaterialDef;
  paintId: number;
  paintName: string;
  paintItemId: number | null;
  hex: string;
  count: number;
}

export interface BatchConvertResult {
  columns: number;
  rows: number;
  cells: Array<MatchCandidate | null>;
  previewRgba: Uint8ClampedArray;
  bom: BomEntry[];
  totalCells: number;
  filledCells: number;
  skippedCells: number;
  paintedCells: number;
  durationMs: number;
}

export function batchConvertRgba(
  repository: MaterialsRepository,
  rgba: Uint8ClampedArray,
  columns: number,
  rows: number,
  matchOptions: MatchOptions,
  batchOptions: BatchConvertOptions
): BatchConvertResult {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const index = new PixelArtColorIndex(repository, matchOptions);
  const totalCells = columns * rows;
  const cells = new Array<MatchCandidate | null>(totalCells).fill(null);
  const previewRgba = new Uint8ClampedArray(totalCells * 4);
  const bg = batchOptions.bgRgb ?? [27, 27, 27];

  if (index.size === 0 || totalCells === 0) {
    return {
      columns,
      rows,
      cells,
      previewRgba,
      bom: [],
      totalCells,
      filledCells: 0,
      skippedCells: totalCells,
      paintedCells: 0,
      durationMs: 0,
    };
  }

  const workRgb = new Float32Array(totalCells * 3);
  const isTransparent = new Uint8Array(totalCells);
  for (let i = 0; i < totalCells; i++) {
    const s = i * 4;
    const aByte = rgba[s + 3];
    if (batchOptions.skipTransparent && aByte < 128) {
      isTransparent[i] = 1;
      continue;
    }
    const a = aByte / 255;
    const d = i * 3;
    workRgb[d] = rgba[s] * a + bg[0] * (1 - a);
    workRgb[d + 1] = rgba[s + 1] * a + bg[1] * (1 - a);
    workRgb[d + 2] = rgba[s + 2] * a + bg[2] * (1 - a);
  }

  const lookupCache = new Map<number, { candidate: MatchCandidate; rgb: RgbTuple }>();
  const bomMap = new Map<string, BomEntry>();
  let filledCells = 0;
  let skippedCells = 0;
  let paintedCells = 0;

  const diffuse = (nx: number, ny: number, factor: number, er: number, eg: number, eb: number) => {
    if (nx < 0 || nx >= columns || ny < 0 || ny >= rows) return;
    const ni = ny * columns + nx;
    if (isTransparent[ni]) return;
    const nd = ni * 3;
    workRgb[nd] += er * factor;
    workRgb[nd + 1] += eg * factor;
    workRgb[nd + 2] += eb * factor;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const idx = row * columns + col;
      const p4 = idx * 4;
      if (isTransparent[idx]) {
        skippedCells++;
        previewRgba[p4] = 0;
        previewRgba[p4 + 1] = 0;
        previewRgba[p4 + 2] = 0;
        previewRgba[p4 + 3] = 0;
        continue;
      }

      const d = idx * 3;
      const r = Math.max(0, Math.min(255, Math.round(workRgb[d])));
      const g = Math.max(0, Math.min(255, Math.round(workRgb[d + 1])));
      const b = Math.max(0, Math.min(255, Math.round(workRgb[d + 2])));

      const rgbKey = (r << 16) | (g << 8) | b;
      let hit = lookupCache.get(rgbKey);
      if (!hit) {
        const res = index.findClosestRgb(r, g, b);
        if (!res) continue;
        hit = res;
        lookupCache.set(rgbKey, hit);
      }

      const { candidate, rgb } = hit;
      cells[idx] = candidate;
      filledCells++;
      if (candidate.paintId > 0) paintedCells++;

      previewRgba[p4] = rgb[0];
      previewRgba[p4 + 1] = rgb[1];
      previewRgba[p4 + 2] = rgb[2];
      previewRgba[p4 + 3] = 255;

      const bomKey = `${candidate.material.kind}:${candidate.material.id}:${candidate.paintId}`;
      const existingBom = bomMap.get(bomKey);
      if (existingBom) {
        existingBom.count++;
      } else {
        bomMap.set(bomKey, {
          key: bomKey,
          material: candidate.material,
          paintId: candidate.paintId,
          paintName: candidate.paintName,
          paintItemId: candidate.paintItemId,
          hex: candidate.hex,
          count: 1,
        });
      }

      if (batchOptions.dithering) {
        const er = r - rgb[0];
        const eg = g - rgb[1];
        const eb = b - rgb[2];
        diffuse(col + 1, row, 7 / 16, er, eg, eb);
        diffuse(col - 1, row + 1, 3 / 16, er, eg, eb);
        diffuse(col, row + 1, 5 / 16, er, eg, eb);
        diffuse(col + 1, row + 1, 1 / 16, er, eg, eb);
      }
    }
  }

  const bom = Array.from(bomMap.values()).sort((a, b) => b.count - a.count);
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    columns,
    rows,
    cells,
    previewRgba,
    bom,
    totalCells,
    filledCells,
    skippedCells,
    paintedCells,
    durationMs: Math.max(0, Math.round(end - start)),
  };
}

/* ==================== 画布缩放 / 裁剪 / 视口几何计算 ==================== */

export interface SrcRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  originX: number;
  originY: number;
  visibleW: number;
  visibleH: number;
}

export interface BoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CellPick {
  col: number;
  row: number;
  hex: string;
  transparent?: boolean;
}

export interface ImagePlan {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  mode: ScaleMode;
  targetWidth: number;
  targetHeight: number;
  columns: number;
  rows: number;
}

export function clampCanvasSize(value: number, limit: number): number {
  return Math.max(TILE_SIZE, Math.min(limit, value));
}

export function maxFitSize(sourceWidth: number, sourceHeight: number): [number, number] {
  if (sourceWidth <= 0 || sourceHeight <= 0) return [TILE_SIZE, TILE_SIZE];
  const scale = Math.min(MAX_CANVAS_WIDTH / sourceWidth, MAX_CANVAS_HEIGHT / sourceHeight);
  return [
    clampCanvasSize(Math.round(sourceWidth * scale), MAX_CANVAS_WIDTH),
    clampCanvasSize(Math.round(sourceHeight * scale), MAX_CANVAS_HEIGHT),
  ];
}

/** 1 原图像素 = 1 泰拉图格（16×16 画布像素），适合直接导入像素画素材 */
export function pixelPerTileSize(sourceWidth: number, sourceHeight: number): [number, number] {
  if (sourceWidth <= 0 || sourceHeight <= 0) return [TILE_SIZE, TILE_SIZE];
  const w = sourceWidth * TILE_SIZE;
  const h = sourceHeight * TILE_SIZE;
  if (w <= MAX_CANVAS_WIDTH && h <= MAX_CANVAS_HEIGHT) {
    return [w, h];
  }
  const scale = Math.min(MAX_CANVAS_WIDTH / w, MAX_CANVAS_HEIGHT / h);
  return [
    Math.max(TILE_SIZE, Math.floor((w * scale) / TILE_SIZE) * TILE_SIZE),
    Math.max(TILE_SIZE, Math.floor((h * scale) / TILE_SIZE) * TILE_SIZE),
  ];
}

export function defaultScaleSize(sourceWidth: number, sourceHeight: number): [number, number] {
  const maxCols = Math.floor(MAX_CANVAS_WIDTH / TILE_SIZE);
  const maxRows = Math.floor(MAX_CANVAS_HEIGHT / TILE_SIZE);
  // 小尺寸像素画默认按 1 像素 = 1 图格处理
  if (sourceWidth > 0 && sourceHeight > 0 && sourceWidth <= maxCols && sourceHeight <= maxRows) {
    return [sourceWidth * TILE_SIZE, sourceHeight * TILE_SIZE];
  }
  return maxFitSize(sourceWidth, sourceHeight);
}

/** height 传 0 表示按宽算高，反之亦然 */
export function keepRatioDim(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number
): number {
  if (sourceWidth <= 0 || sourceHeight <= 0) return TILE_SIZE;
  if (height === 0) {
    return Math.round((width * sourceHeight) / sourceWidth);
  }
  return Math.round((height * sourceWidth) / sourceHeight);
}

export function resolveTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  mode: ScaleMode,
  width: number,
  height: number
): [number, number] {
  if (mode === 'keep_ratio') {
    let w = clampCanvasSize(width, MAX_CANVAS_WIDTH);
    let h = keepRatioDim(sourceWidth, sourceHeight, w, 0);
    if (h > MAX_CANVAS_HEIGHT) {
      h = MAX_CANVAS_HEIGHT;
      w = clampCanvasSize(keepRatioDim(sourceWidth, sourceHeight, 0, h), MAX_CANVAS_WIDTH);
    }
    return [w, Math.max(h, TILE_SIZE)];
  }
  return [
    clampCanvasSize(width, MAX_CANVAS_WIDTH),
    clampCanvasSize(height, MAX_CANVAS_HEIGHT),
  ];
}

export function planBitmapSize(canvasWidth: number, canvasHeight: number): [number, number] {
  return [
    Math.max(1, Math.ceil(canvasWidth / TILE_SIZE)),
    Math.max(1, Math.ceil(canvasHeight / TILE_SIZE)),
  ];
}

export function centerCropRect(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): SrcRect {
  const targetAspect = dstWidth / dstHeight;
  if (srcWidth / srcHeight > targetAspect) {
    const width = Math.max(1, Math.min(srcWidth, Math.round(srcHeight * targetAspect)));
    const left = Math.floor((srcWidth - width) / 2);
    return { left, top: 0, right: left + width, bottom: srcHeight };
  } else {
    const height = Math.max(1, Math.min(srcHeight, Math.round(srcWidth / targetAspect)));
    const top = Math.floor((srcHeight - height) / 2);
    return { left: 0, top, right: srcWidth, bottom: top + height };
  }
}

export function sourceRectOf(
  bitmapW: number,
  bitmapH: number,
  _targetW: number,
  _targetH: number,
  col: number,
  row: number
): SrcRect {
  const left = Math.max(0, Math.min(bitmapW - 1, col));
  const top = Math.max(0, Math.min(bitmapH - 1, row));
  return { left, top, right: left + 1, bottom: top + 1 };
}

/** 从 RGBA 像素数组取一个图格的颜色；全透明格返回 transparent: true */
export function dominantHexFromRgba(
  data: Uint8ClampedArray,
  imgWidth: number,
  rect: SrcRect,
  bgRgb: RgbTuple = [27, 27, 27]
): { hex: string; transparent: boolean } {
  const counts = new Map<number, number>();
  let sumRed = 0;
  let sumGreen = 0;
  let sumBlue = 0;
  let samples = 0;
  let opaqueSamples = 0;

  for (let y = rect.top; y < rect.bottom; y++) {
    for (let x = rect.left; x < rect.right; x++) {
      const idx = (y * imgWidth + x) * 4;
      const a = data[idx + 3] / 255;
      if (data[idx + 3] > 0) opaqueSamples++;
      const r = Math.round(data[idx] * a + bgRgb[0] * (1 - a));
      const g = Math.round(data[idx + 1] * a + bgRgb[1] * (1 - a));
      const b = Math.round(data[idx + 2] * a + bgRgb[2] * (1 - a));
      const rgb = (r << 16) | (g << 8) | b;
      counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
      sumRed += r;
      sumGreen += g;
      sumBlue += b;
      samples++;
    }
  }

  if (samples === 0) {
    return { hex: '000000', transparent: true };
  }

  let bestColor = -1;
  let bestCount = 0;
  for (const [color, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestColor = color;
    }
  }

  const finalColor =
    bestColor >= 0 && bestCount > 1
      ? bestColor
      : (Math.floor(sumRed / samples) << 16) |
        (Math.floor(sumGreen / samples) << 8) |
        Math.floor(sumBlue / samples);

  return {
    hex: (finalColor & 0xffffff).toString(16).padStart(6, '0').toUpperCase(),
    transparent: opaqueSamples === 0,
  };
}

export function letterbox(
  boxWidth: number,
  boxHeight: number,
  canvasWidth: number,
  canvasHeight: number
): BoxRect {
  if (boxWidth <= 0 || boxHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.min(boxWidth / canvasWidth, boxHeight / canvasHeight);
  const width = canvasWidth * scale;
  const height = canvasHeight * scale;
  return {
    left: (boxWidth - width) / 2,
    top: (boxHeight - height) / 2,
    width,
    height,
  };
}

export function fitViewport(
  targetWidth: number,
  targetHeight: number,
  boxWidth: number,
  boxHeight: number
): Viewport {
  if (boxWidth <= 0 || boxHeight <= 0) {
    return { originX: 0, originY: 0, visibleW: targetWidth, visibleH: targetHeight };
  }
  const displayAspect = boxWidth / boxHeight;
  const canvasAspect = targetWidth / targetHeight;
  if (canvasAspect >= displayAspect) {
    const visibleH = targetWidth / displayAspect;
    return {
      originX: 0,
      originY: (targetHeight - visibleH) / 2,
      visibleW: targetWidth,
      visibleH,
    };
  }
  const visibleW = targetHeight * displayAspect;
  return {
    originX: (targetWidth - visibleW) / 2,
    originY: 0,
    visibleW,
    visibleH: targetHeight,
  };
}

export function clampViewport(
  viewport: Viewport,
  targetWidth: number,
  targetHeight: number
): Viewport {
  const loX = Math.min(0, targetWidth - viewport.visibleW);
  const hiX = Math.max(0, targetWidth - viewport.visibleW);
  const loY = Math.min(0, targetHeight - viewport.visibleH);
  const hiY = Math.max(0, targetHeight - viewport.visibleH);
  return {
    ...viewport,
    originX: Math.max(loX, Math.min(hiX, viewport.originX)),
    originY: Math.max(loY, Math.min(hiY, viewport.originY)),
  };
}

export function transformViewport(
  viewport: Viewport,
  targetWidth: number,
  targetHeight: number,
  centroidX: number,
  centroidY: number,
  panX: number,
  panY: number,
  zoom: number,
  boxWidth: number,
  boxHeight: number
): Viewport {
  if (boxWidth <= 0 || boxHeight <= 0) return viewport;
  const fullVisibleW = fitViewport(targetWidth, targetHeight, boxWidth, boxHeight).visibleW;
  const newVisibleW = Math.max(
    MIN_VISIBLE_CANVAS,
    Math.min(fullVisibleW, viewport.visibleW / zoom)
  );
  const newVisibleH = (newVisibleW * boxHeight) / boxWidth;
  const anchorX = viewport.originX + (centroidX * viewport.visibleW) / boxWidth;
  const anchorY = viewport.originY + (centroidY * viewport.visibleH) / boxHeight;
  const next: Viewport = {
    originX: anchorX - (centroidX * newVisibleW) / boxWidth - (panX * newVisibleW) / boxWidth,
    originY: anchorY - (centroidY * newVisibleH) / boxHeight - (panY * newVisibleH) / boxHeight,
    visibleW: newVisibleW,
    visibleH: newVisibleH,
  };
  return clampViewport(next, targetWidth, targetHeight);
}

/* ==================== 浏览器 Canvas 解码与降采样 ==================== */

export async function loadSampledImageCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('无法解码图片文件'));
      el.src = url;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (srcW <= 0 || srcH <= 0) {
      throw new Error('图片尺寸无效');
    }

    let sample = 1;
    while (Math.max(srcW, srcH) / sample > MAX_IMAGE_SIDE) {
      sample *= 2;
    }

    const dstW = Math.max(1, Math.round(srcW / sample));
    const dstH = Math.max(1, Math.round(srcH / sample));
    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器不支持 2D Canvas');
    ctx.imageSmoothingEnabled = sample > 1;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, dstW, dstH);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resampleCanvas(
  source: HTMLCanvasElement,
  dstWidth: number,
  dstHeight: number
): HTMLCanvasElement {
  let current = source;
  let width = source.width;
  let height = source.height;

  while (Math.floor(width / 2) >= dstWidth && Math.floor(height / 2) >= dstHeight) {
    const nextW = Math.max(dstWidth, Math.floor(width / 2));
    const nextH = Math.max(dstHeight, Math.floor(height / 2));
    const next = document.createElement('canvas');
    next.width = nextW;
    next.height = nextH;
    const ctx = next.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, nextW, nextH);
    current = next;
    width = nextW;
    height = nextH;
  }

  if (width !== dstWidth || height !== dstHeight) {
    const next = document.createElement('canvas');
    next.width = dstWidth;
    next.height = dstHeight;
    const ctx = next.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, dstWidth, dstHeight);
    current = next;
  }

  return current;
}

export function buildImagePlan(
  source: HTMLCanvasElement,
  mode: ScaleMode,
  width: number,
  height: number
): ImagePlan {
  let base = source;
  if (mode === 'fill') {
    const crop = centerCropRect(source.width, source.height, width, height);
    if (crop.right - crop.left !== source.width || crop.bottom - crop.top !== source.height) {
      const cropped = document.createElement('canvas');
      cropped.width = crop.right - crop.left;
      cropped.height = crop.bottom - crop.top;
      const cctx = cropped.getContext('2d')!;
      cctx.drawImage(
        source,
        crop.left,
        crop.top,
        cropped.width,
        cropped.height,
        0,
        0,
        cropped.width,
        cropped.height
      );
      base = cropped;
    }
  }

  const [planW, planH] = planBitmapSize(width, height);
  const canvas =
    base.width === planW && base.height === planH
      ? base
      : resampleCanvas(base, planW, planH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    canvas,
    imageData,
    mode,
    targetWidth: width,
    targetHeight: height,
    columns: Math.ceil(width / TILE_SIZE),
    rows: Math.ceil(height / TILE_SIZE),
  };
}

/** 将批量转换结果的 RGBA 数组写入离屏 Canvas，便于直接绘制在预览查看器中 */
export function buildBatchPreviewCanvas(result: BatchConvertResult): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = result.columns;
  canvas.height = result.rows;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(result.columns, result.rows);
  imgData.data.set(result.previewRgba);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/** 生成带 10×10 加粗网格与坐标标尺的施工图纸 PNG Blob */
export async function exportBlueprintPng(
  previewCanvas: HTMLCanvasElement,
  cellPx = 12
): Promise<Blob> {
  const cols = previewCanvas.width;
  const rows = previewCanvas.height;
  const marginLeft = 40;
  const marginTop = 28;
  const width = marginLeft + cols * cellPx + 12;
  const height = marginTop + rows * cellPx + 12;

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;

  ctx.fillStyle = '#FFF7F2';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(marginLeft, marginTop, cols * cellPx, rows * cellPx);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(previewCanvas, marginLeft, marginTop, cols * cellPx, rows * cellPx);

  // 普通网格线
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    const x = marginLeft + c * cellPx + 0.5;
    ctx.moveTo(x, marginTop);
    ctx.lineTo(x, marginTop + rows * cellPx);
  }
  for (let r = 0; r <= rows; r++) {
    const y = marginTop + r * cellPx + 0.5;
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + cols * cellPx, y);
  }
  ctx.stroke();

  // 每 10 格加粗标线与标尺数字
  ctx.strokeStyle = 'rgba(115,156,191,0.85)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#4A3F3D';
  ctx.font = 'bold 10px monospace';
  ctx.textBaseline = 'middle';

  ctx.beginPath();
  ctx.textAlign = 'center';
  for (let c = 0; c <= cols; c += 10) {
    const x = marginLeft + c * cellPx;
    ctx.moveTo(x, marginTop);
    ctx.lineTo(x, marginTop + rows * cellPx);
    if (c < cols) ctx.fillText(String(c), x + cellPx / 2, marginTop - 12);
  }
  ctx.textAlign = 'right';
  for (let r = 0; r <= rows; r += 10) {
    const y = marginTop + r * cellPx;
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + cols * cellPx, y);
    if (r < rows) ctx.fillText(String(r), marginLeft - 6, y + cellPx / 2);
  }
  ctx.stroke();

  return await new Promise<Blob>((resolve, reject) => {
    out.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('生成图纸失败'));
    }, 'image/png');
  });
}
