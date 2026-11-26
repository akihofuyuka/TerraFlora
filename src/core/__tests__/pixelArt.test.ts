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
  defaultScaleSize,
  deltaE,
  dominantHexFromRgba,
  fitViewport,
  maxFitSize,
  parseHexColor,
  pixelPerTileSize,
  planBitmapSize,
  resolveTargetSize,
  rgbDistance,
  rgbToLab,
  sourceRectOf,
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
    // 泥土块红漆(1)与深红漆(13)同为 #970000，应去重只保留 paintId=1
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

    // 默认排除 falling (沙块 tile:53)，启用 includeFalling 后应可匹配到
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

    // 屏蔽第一名后第一名应被替换
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
    // 2x2: [dirt color, red-paint dirt, transparent, white]
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

describe('pixelArt image scaling & viewport math', () => {
  it('computes maxFitSize, defaultScaleSize, and resolveTargetSize within 8400x2400', () => {
    expect(maxFitSize(1600, 800)).toEqual([4800, 2400]);
    expect(pixelPerTileSize(30, 30)).toEqual([480, 480]);
    expect(defaultScaleSize(30, 30)).toEqual([480, 480]);
    expect(defaultScaleSize(1600, 800)).toEqual([4800, 2400]);
    expect(resolveTargetSize(1600, 800, 'keep_ratio', 8400, 2400)).toEqual([4800, 2400]);
    expect(resolveTargetSize(100, 100, 'manual', 10000, 5000)).toEqual([8400, 2400]);
    expect(planBitmapSize(8400, 2400)).toEqual([525, 150]);
  });

  it('computes centerCropRect and sourceRectOf accurately including non-multiple-of-16 widths', () => {
    expect(centerCropRect(1000, 500, 400, 400)).toEqual({
      left: 250,
      top: 0,
      right: 750,
      bottom: 500,
    });
    expect(sourceRectOf(525, 150, 8400, 2400, 10, 5)).toEqual({
      left: 10,
      top: 5,
      right: 11,
      bottom: 6,
    });
    // 非 16 倍数画布宽度（1000x600 -> 63x38 图格）也应严格一一对应
    expect(sourceRectOf(63, 38, 1000, 600, 62, 37)).toEqual({
      left: 62,
      top: 37,
      right: 63,
      bottom: 38,
    });
  });

  it('picks dominant hex and flags fully transparent cells', () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 0, 0, 0,
    ]);
    expect(dominantHexFromRgba(rgba, 2, { left: 0, top: 0, right: 1, bottom: 1 })).toEqual({
      hex: 'FF0000',
      transparent: false,
    });
    expect(dominantHexFromRgba(rgba, 2, { left: 1, top: 0, right: 2, bottom: 1 })).toEqual({
      hex: '1B1B1B',
      transparent: true,
    });
  });

  it('fits and clamps viewport inside canvas bounds', () => {
    const vp = fitViewport(8400, 2400, 840, 480);
    expect(vp.visibleW).toBe(8400);
    expect(vp.visibleH).toBe(4800);
    expect(vp.originY).toBe(-1200);
    const clamped = clampViewport({ originX: 500, originY: -3000, visibleW: 8400, visibleH: 4800 }, 8400, 2400);
    expect(clamped.originX).toBe(0);
    expect(clamped.originY).toBe(-2400);
  });
});
