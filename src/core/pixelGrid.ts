/*! @license AGPL-3.0 | Author: akihofuyuka */

export type SampleStyle = 'smooth' | 'pixel_snap';

/** 计算沿 X 或 Y 轴的 RGBA 阶跃梯度投影，用于捕捉色块边界与细分割线 */
export function computeAxisGradientProfile(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  axis: 'x' | 'y'
): Float32Array {
  const len = axis === 'x' ? width : height;
  const crossLen = axis === 'x' ? height : width;
  const profile = new Float32Array(len);
  if (len < 2 || crossLen < 1) return profile;

  const crossStep = crossLen > 512 ? 2 : 1;
  let sampleCount = 0;

  if (axis === 'x') {
    for (let y = 0; y < height; y += crossStep) {
      sampleCount++;
      const rowOff = y * width * 4;
      for (let x = 1; x < width; x++) {
        const i = rowOff + x * 4;
        const p = i - 4;
        const diff =
          Math.abs(rgba[i] - rgba[p]) +
          Math.abs(rgba[i + 1] - rgba[p + 1]) +
          Math.abs(rgba[i + 2] - rgba[p + 2]) +
          Math.abs(rgba[i + 3] - rgba[p + 3]);
        profile[x] += diff;
      }
    }
  } else {
    for (let x = 0; x < width; x += crossStep) {
      sampleCount++;
      for (let y = 1; y < height; y++) {
        const i = (y * width + x) * 4;
        const p = ((y - 1) * width + x) * 4;
        const diff =
          Math.abs(rgba[i] - rgba[p]) +
          Math.abs(rgba[i + 1] - rgba[p + 1]) +
          Math.abs(rgba[i + 2] - rgba[p + 2]) +
          Math.abs(rgba[i + 3] - rgba[p + 3]);
        profile[y] += diff;
      }
    }
  }

  if (sampleCount > 0) {
    const inv = 1 / sampleCount;
    for (let i = 0; i < len; i++) {
      profile[i] *= inv;
    }
  }
  return profile;
}

/** 局部序列吸附网格线：在理论等分点附近向梯度峰微调，缓解边缘偏移 */
export function refineGridBoundaries(
  profile: Float32Array,
  length: number,
  count: number
): Int32Array {
  const bounds = new Int32Array(count + 1);
  bounds[0] = 0;
  bounds[count] = length;
  if (count <= 1 || length <= count) {
    for (let i = 1; i < count; i++) {
      bounds[i] = Math.round((i * length) / count);
    }
    return bounds;
  }

  const step = length / count;
  const searchRadius = Math.max(0, Math.min(6, Math.floor(step * 0.25)));
  const minCellWidth = Math.max(1, Math.floor(step * 0.4));

  for (let i = 1; i < count; i++) {
    const prevPredicted = bounds[i - 1] + step;
    const globalNominal = i * step;
    const nominal = Math.round(prevPredicted * 0.8 + globalNominal * 0.2);

    const minAllowed = bounds[i - 1] + minCellWidth;
    const maxAllowed = length - (count - i);
    if (minAllowed >= maxAllowed) {
      bounds[i] = Math.max(bounds[i - 1] + 1, Math.min(length - 1, nominal));
      continue;
    }

    const lo = Math.max(minAllowed, nominal - searchRadius);
    const hi = Math.min(maxAllowed, nominal + searchRadius);

    let bestPos = Math.max(minAllowed, Math.min(maxAllowed, nominal));
    if (searchRadius >= 1 && lo < hi) {
      let bestScore = -1;
      for (let x = lo; x <= hi; x++) {
        const driftPenalty = 1 + 0.06 * Math.abs(x - nominal);
        const s = profile[x] / driftPenalty;
        if (s > bestScore) {
          bestScore = s;
          bestPos = x;
        }
      }
      if (bestScore <= 2) {
        bestPos = Math.max(minAllowed, Math.min(maxAllowed, nominal));
      }
    }
    bounds[i] = bestPos;
  }

  return bounds;
}

/** 提取单元格中心区主色簇均值，跳过外圈细分割线与抗锯齿过渡带 */
export function sampleCellCoreDominant(
  rgba: Uint8ClampedArray,
  imgWidth: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number
): [number, number, number, number] {
  const cw = Math.max(1, x1 - x0);
  const ch = Math.max(1, y1 - y0);

  const marginX = cw >= 4 ? Math.max(1, Math.floor(cw * 0.24)) : 0;
  const marginY = ch >= 4 ? Math.max(1, Math.floor(ch * 0.24)) : 0;

  const sx0 = Math.min(x1 - 1, x0 + marginX);
  const sx1 = Math.max(sx0 + 1, x1 - marginX);
  const sy0 = Math.min(y1 - 1, y0 + marginY);
  const sy1 = Math.max(sy0 + 1, y1 - marginY);

  const coreW = sx1 - sx0;
  const coreH = sy1 - sy0;
  const stepX = coreW > 10 ? Math.ceil(coreW / 8) : 1;
  const stepY = coreH > 10 ? Math.ceil(coreH / 8) : 1;

  const samples: Array<[number, number, number, number]> = [];
  let opaqueCount = 0;

  for (let y = sy0; y < sy1; y += stepY) {
    for (let x = sx0; x < sx1; x += stepX) {
      const idx = (y * imgWidth + x) * 4;
      const a = rgba[idx + 3];
      samples.push([rgba[idx], rgba[idx + 1], rgba[idx + 2], a]);
      if (a >= 128) opaqueCount++;
    }
  }

  if (samples.length === 0 || opaqueCount * 2 < samples.length) {
    return [0, 0, 0, 0];
  }

  const opaque = samples.filter((s) => s[3] >= 128);
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();

  for (const [r, g, b] of opaque) {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const entry = buckets.get(key);
    if (entry) {
      entry.count++;
      entry.r += r;
      entry.g += g;
      entry.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  let bestBucket = { count: 0, r: 0, g: 0, b: 0 };
  for (const entry of buckets.values()) {
    if (entry.count > bestBucket.count) {
      bestBucket = entry;
    }
  }

  const seedR = bestBucket.r / bestBucket.count;
  const seedG = bestBucket.g / bestBucket.count;
  const seedB = bestBucket.b / bestBucket.count;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let clusterCount = 0;
  for (const [r, g, b] of opaque) {
    if (Math.abs(r - seedR) + Math.abs(g - seedG) + Math.abs(b - seedB) <= 54) {
      sumR += r;
      sumG += g;
      sumB += b;
      clusterCount++;
    }
  }

  if (clusterCount === 0) {
    return [Math.round(seedR), Math.round(seedG), Math.round(seedB), 255];
  }
  return [
    Math.round(sumR / clusterCount),
    Math.round(sumG / clusterCount),
    Math.round(sumB / clusterCount),
    255,
  ];
}

/** 按指定图格数执行边界吸附与格心主色采样 */
export function samplePixelGridFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  columns: number,
  rows: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(columns * rows * 4);
  if (width <= 0 || height <= 0 || columns <= 0 || rows <= 0) return out;

  const gx = computeAxisGradientProfile(rgba, width, height, 'x');
  const gy = computeAxisGradientProfile(rgba, width, height, 'y');

  const xBounds = refineGridBoundaries(gx, width, columns);
  const yBounds = refineGridBoundaries(gy, height, rows);

  for (let row = 0; row < rows; row++) {
    const y0 = yBounds[row];
    const y1 = yBounds[row + 1];
    for (let col = 0; col < columns; col++) {
      const x0 = xBounds[col];
      const x1 = xBounds[col + 1];
      const [r, g, b, a] = sampleCellCoreDominant(rgba, width, x0, x1, y0, y1);
      const o = (row * columns + col) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }
  }

  return out;
}
