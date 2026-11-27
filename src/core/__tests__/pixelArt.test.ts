import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MaterialsRepository,
  PixelArtColorIndex,
  PixelArtMatcher,
  batchConvertRgba,
  calcSimilarity,
  centerCropRect,
  clampViewport,
  collectBuiltinPresetKeys,
  defaultGridSize,
  deltaE,
  exportMaterialFilterPreset,
  fitLongSideGridSize,
  fitViewport,
  parseHexColor,
  parseMaterialFilterPreset,
  resolveGridSize,
  rgbDistance,
  rgbToLab,
  sampleCellHexFromRgba,
  samplePixelGridFromRgba,
  toggleKeyInList,
  type MatchOptions,
  type RawMaterialsDatabase,
} from '../pixelArt';

function loadRepo(): MaterialsRepository {
  const filePath = path.resolve(__dirname, '../../../public/data/materials.json');
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RawMaterialsDatabase;
  return MaterialsRepository.fromRaw(raw);
}

describe('pixelArt color math & matcher', () => {
  it('normalizes and validates 6-digit hex colors', () => {
    expect(parseHexColor(' #4a90e2 ')).toBe('4A90E2');
    expect(parseHexColor('ff00aa')).toBe('FF00AA');
    expect(parseHexColor('#FFF')).toBeNull();
    expect(parseHexColor('GGGGGG')).toBeNull();
  });

  it('computes zero distance for identical colors in both RGB and Lab', () => {
    expect(rgbDistance('976B4B', '976B4B')).toBe(0);
    const lab = rgbToLab('976B4B');
    expect(deltaE(lab, lab)).toBe(0);
    expect(calcSimilarity(0, 150)).toBe(1);
  });

  it('loads materials.json with default set and optional tagged tiers', () => {
    const repo = loadRepo();
    expect(repo.defaultCount).toBeGreaterThanOrEqual(500);
    expect(repo.tagCounts.falling).toBeGreaterThan(0);
    expect(repo.tagCounts.solid_top).toBeGreaterThan(0);
    expect(repo.tagCounts.special).toBeGreaterThan(0);
    expect(repo.paintNameOf(0)).toBe('无漆');
    expect(repo.paintNameOf(1)).toBe('红漆');

    const matcher = new PixelArtMatcher(repo);
    const results = matcher.matchCandidates('970000', {
      filter: 'tile',
      includePaint: true,
      algorithm: 'lab',
      topN: 12,
    });
    expect(results.length).toBe(12);
    const dirtMatches = results.filter((c) => c.material.id === 0 && c.hex === '970000');
    expect(dirtMatches.length).toBe(1);
    expect(dirtMatches[0].paintId).toBe(1);
    expect(dirtMatches[0].paintItemId).toBe(1073);
    expect(dirtMatches[0].similarity).toBe(1);
  });

  it('respects recoverable tiers and excludedMaterialKeys', () => {
    const repo = loadRepo();
    const matcher = new PixelArtMatcher(repo);

    const withoutFalling = matcher.matchCandidates('D3C66E', {
      filter: 'tile',
      includePaint: false,
      algorithm: 'lab',
      topN: 50,
    });
    expect(withoutFalling.some((c) => c.material.tags.includes('falling'))).toBe(false);

    const withFalling = matcher.matchCandidates('D3C66E', {
      filter: 'tile',
      includePaint: false,
      algorithm: 'lab',
      topN: 50,
      includeFalling: true,
    });
    expect(withFalling.some((c) => c.material.tags.includes('falling'))).toBe(true);

    const top1 = withoutFalling[0];
    const afterExclude = matcher.matchCandidates('D3C66E', {
      filter: 'tile',
      includePaint: false,
      algorithm: 'lab',
      topN: 10,
      excludedMaterialKeys: [`${top1.material.kind}:${top1.material.id}`],
    });
    expect(afterExclude[0].material.id).not.toBe(top1.material.id);
  });

  it('respects kind filter and includePaint toggle', () => {
    const repo = loadRepo();
    const matcher = new PixelArtMatcher(repo);
    const wallNoPaint = matcher.matchCandidates('4A90E2', {
      filter: 'wall',
      includePaint: false,
      algorithm: 'rgb',
      topN: 10,
    });
    expect(wallNoPaint.length).toBe(10);
    expect(wallNoPaint.every((c) => c.material.kind === 'wall')).toBe(true);
    expect(wallNoPaint.every((c) => c.paintId === 0)).toBe(true);
  });

  it('supports include whitelist filterMode and preset export/import helpers', () => {
    const repo = loadRepo();
    const matcher = new PixelArtMatcher(repo);
    const whitelist = ['tile:0', 'tile:1'];
    const hits = matcher.matchCandidates('976B4B', {
      filter: 'all',
      includePaint: false,
      algorithm: 'lab',
      topN: 12,
      filterMode: 'include',
      includedMaterialKeys: whitelist,
    });
    expect(hits.length).toBe(2);
    expect(hits.every((h) => h.material.kind === 'tile' && (h.material.id === 0 || h.material.id === 1))).toBe(true);

    const emptyHits = matcher.matchCandidates('976B4B', {
      filter: 'all',
      includePaint: true,
      algorithm: 'lab',
      topN: 12,
      filterMode: 'include',
      includedMaterialKeys: [],
    });
    expect(emptyHits).toEqual([]);

    const gemWalls = collectBuiltinPresetKeys(repo, 'gemspark_walls_all');
    expect(gemWalls.length).toBe(14);

    const toggledAdd = toggleKeyInList(['tile:0'], 'tile:1');
    expect(toggledAdd).toEqual({ next: ['tile:0', 'tile:1'], added: true });
    const toggledDel = toggleKeyInList(toggledAdd.next, 'tile:0');
    expect(toggledDel).toEqual({ next: ['tile:1'], added: false });

    const exported = exportMaterialFilterPreset(repo, '晶莹宝石墙包', 'include', gemWalls);
    const imported = parseMaterialFilterPreset(JSON.stringify(exported), repo);
    expect(imported.filterMode).toBe('include');
    expect(imported.keys).toEqual(gemWalls);
    expect(imported.invalidCount).toBe(0);

    const parsedFallback = parseMaterialFilterPreset('tile:0, invalid:999, tile:1', repo);
    expect(parsedFallback.keys).toEqual(['tile:0', 'tile:1']);
    expect(parsedFallback.invalidCount).toBe(1);
  });
});

describe('KD-Tree index & full-image batch conversion', () => {
  it('KD-Tree nearest matches brute-force top-1 hex across sample colors', () => {
    const repo = loadRepo();
    const matcher = new PixelArtMatcher(repo);
    const opts: MatchOptions = {
      filter: 'all',
      includePaint: true,
      algorithm: 'lab',
      topN: 1,
    };
    const index = new PixelArtColorIndex(repo, opts);
    const samples: Array<[number, number, number]> = [
      [0x4a, 0x90, 0xe2],
      [0x97, 0x6b, 0x4b],
      [0xff, 0x20, 0x40],
      [0x12, 0x34, 0x56],
      [0xef, 0xef, 0xef],
    ];
    for (const [r, g, b] of samples) {
      const hex = ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
      const brute = matcher.matchCandidates(hex, opts)[0];
      const kd = index.findClosestRgb(r, g, b);
      expect(kd).not.toBeNull();
      expect(kd!.candidate.hex).toBe(brute.hex);
    }
  });

  it('batch converts RGBA grid with transparent skipping, dithering, and BOM aggregation', () => {
    const repo = loadRepo();
    const rgba = new Uint8ClampedArray([
      0x97, 0x6b, 0x4b, 255,
      0x97, 0x00, 0x00, 255,
      0x00, 0x00, 0x00, 0,
      0xff, 0xff, 0xff, 255,
    ]);
    const res = batchConvertRgba(
      repo,
      rgba,
      2,
      2,
      { filter: 'tile', includePaint: true, algorithm: 'lab', topN: 12 },
      { dithering: false, skipTransparent: true }
    );
    expect(res.totalCells).toBe(4);
    expect(res.filledCells).toBe(3);
    expect(res.skippedCells).toBe(1);
    expect(res.cells[2]).toBeNull();
    expect(res.previewRgba[2 * 4 + 3]).toBe(0);
    const bomTotal = res.bom.reduce((acc, e) => acc + e.count, 0);
    expect(bomTotal).toBe(3);

    const dithered = batchConvertRgba(
      repo,
      rgba,
      2,
      2,
      { filter: 'all', includePaint: true, algorithm: 'lab', topN: 12 },
      { dithering: true, skipTransparent: true }
    );
    expect(dithered.filledCells).toBe(3);
  });
});

describe('pixelArt grid scaling & viewport math', () => {
  it('computes defaultGridSize, fitLongSideGridSize, and resolveGridSize within 8400x2400', () => {
    expect(defaultGridSize(30, 30)).toEqual([30, 30]);
    expect(defaultGridSize(1920, 1080)).toEqual([256, 144]);
    expect(fitLongSideGridSize(1600, 800, 8400)).toEqual([4800, 2400]);
    expect(resolveGridSize(1600, 800, 'keep_ratio', 8400, 2400)).toEqual([4800, 2400]);
    expect(resolveGridSize(100, 100, 'manual', 10000, 5000)).toEqual([8400, 2400]);
  });

  it('computes centerCropRect and samples RGBA cells directly', () => {
    expect(centerCropRect(1000, 500, 400, 400)).toEqual({
      left: 250,
      top: 0,
      right: 750,
      bottom: 500,
    });

    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 0, 0, 0,
    ]);
    expect(sampleCellHexFromRgba(rgba, 2, 0, 0)).toEqual({
      hex: 'FF0000',
      transparent: false,
    });
    expect(sampleCellHexFromRgba(rgba, 2, 1, 0)).toEqual({
      hex: '1B1B1B',
      transparent: true,
    });
  });

  it('fits and clamps viewport inside grid bounds', () => {
    const vp = fitViewport(8400, 2400, 840, 480);
    expect(vp.visibleW).toBe(8400);
    expect(vp.visibleH).toBe(4800);
    expect(vp.originY).toBe(-1200);
    const clamped = clampViewport({ originX: 500, originY: -3000, visibleW: 8400, visibleH: 4800 }, 8400, 2400);
    expect(clamped.originX).toBe(0);
    expect(clamped.originY).toBe(-2400);
  });
});

describe('pixelGrid core sampling', () => {
  const palette: Array<[number, number, number]> = [
    [220, 48, 48],
    [40, 140, 230],
    [48, 185, 92],
    [240, 195, 40],
    [155, 70, 210],
    [35, 42, 60],
  ];

  it('skips 1px white divider lines and recovers pure cell colors', () => {
    const cols = 16;
    const rows = 12;
    const cell = 15;
    const w = cols * cell;
    const h = rows * cell;
    const rgba = new Uint8ClampedArray(w * h * 4);
    const cellRgb = (c: number, r: number) => palette[(c * 5 + r * 3) % palette.length];

    for (let y = 0; y < h; y++) {
      const r = Math.floor(y / cell);
      const inY = y % cell;
      for (let x = 0; x < w; x++) {
        const c = Math.floor(x / cell);
        const inX = x % cell;
        const idx = (y * w + x) * 4;
        if (inX === 0 || inY === 0) {
          rgba[idx] = 255;
          rgba[idx + 1] = 255;
          rgba[idx + 2] = 255;
          rgba[idx + 3] = 255;
        } else {
          const [cr, cg, cb] = cellRgb(c, r);
          rgba[idx] = cr;
          rgba[idx + 1] = cg;
          rgba[idx + 2] = cb;
          rgba[idx + 3] = 255;
        }
      }
    }

    const sampled = samplePixelGridFromRgba(rgba, w, h, cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [er, eg, eb] = cellRgb(c, r);
        const o = (r * cols + c) * 4;
        expect(sampled[o]).toBe(er);
        expect(sampled[o + 1]).toBe(eg);
        expect(sampled[o + 2]).toBe(eb);
      }
    }
  });

  it('ignores anti-aliased boundary blending across adjacent pixel blocks', () => {
    const cols = 16;
    const rows = 12;
    const cell = 16;
    const w = cols * cell;
    const h = rows * cell;
    const rgba = new Uint8ClampedArray(w * h * 4);
    const cellRgb = (c: number, r: number) => palette[(c * 7 + r * 2) % palette.length];

    for (let y = 0; y < h; y++) {
      const r = Math.floor(y / cell);
      const inY = y % cell;
      for (let x = 0; x < w; x++) {
        const c = Math.floor(x / cell);
        const inX = x % cell;
        const [cr, cg, cb] = cellRgb(c, r);
        let rr = cr;
        let gg = cg;
        let bb = cb;
        if (inX === 0 && c > 0) {
          const [pr, pg, pb] = cellRgb(c - 1, r);
          rr = Math.round((cr + pr) / 2);
          gg = Math.round((cg + pg) / 2);
          bb = Math.round((cb + pb) / 2);
        } else if (inY === 0 && r > 0) {
          const [pr, pg, pb] = cellRgb(c, r - 1);
          rr = Math.round((cr + pr) / 2);
          gg = Math.round((cg + pg) / 2);
          bb = Math.round((cb + pb) / 2);
        }
        const idx = (y * w + x) * 4;
        rgba[idx] = rr;
        rgba[idx + 1] = gg;
        rgba[idx + 2] = bb;
        rgba[idx + 3] = 255;
      }
    }

    const sampled = samplePixelGridFromRgba(rgba, w, h, cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [er, eg, eb] = cellRgb(c, r);
        const o = (r * cols + c) * 4;
        expect(sampled[o]).toBe(er);
        expect(sampled[o + 1]).toBe(eg);
        expect(sampled[o + 2]).toBe(eb);
      }
    }
  });
});
