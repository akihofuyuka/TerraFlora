/**
 * 泰拉瑞亚物品分片图集计算工具
 * 5 张分片图集 (items-0.png ~ items-4.png)
 * 每张图集 32 列，每格 40x40 像素，总宽 1280px
 * 每张图集 48 行 (末张按实际物品数截断)
 * 单张图集容纳 32 * 48 = 1536 个物品
 */

/** 图集缓存号：自动跟随 package.json 版本号，随打包同步刷新缓存 */
export const ATLAS_VERSION = __APP_VERSION__;

export interface SpriteCoords {
  sheetIndex: number;
  sheetUrl: string;
  x: number; // 原始 40x40 下的 x
  y: number; // 原始 40x40 下的 y
}

export function getItemSpriteCoords(itemId: number): SpriteCoords {
  if (itemId <= 0) {
    return {
      sheetIndex: 0,
      sheetUrl: '',
      x: 0,
      y: 0
    };
  }

  const sheetIndex = Math.floor(itemId / 1536);
  const localIndex = itemId % 1536;
  const col = localIndex % 32;
  const row = Math.floor(localIndex / 32);

  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;

  return {
    sheetIndex,
    sheetUrl: `${prefix}atlas/items-${sheetIndex}.png?v=${ATLAS_VERSION}`,
    x: col * 40,
    y: row * 40
  };
}

/**
 * 生成在特定显示尺寸 (如 36px) 下的 CSS 样式对象
 */
export function getItemSpriteStyle(itemId: number, displaySize = 36): Record<string, string> {
  if (itemId <= 0) {
    return { display: 'none' };
  }

  if (itemId >= 6196) {
    // 心动专属物品：无官方独立图集，展示统一的国服专属占位图标
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${displaySize}" height="${displaySize}"><rect x="2" y="2" width="28" height="28" rx="4" fill="#2F658D" fill-opacity="0.12" stroke="#739CBF" stroke-width="2"/><text x="16" y="21" font-size="12" font-weight="bold" font-family="sans-serif" fill="#2F658D" text-anchor="middle">XD</text></svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    return {
      backgroundImage: `url("${dataUrl}")`,
      backgroundPosition: 'center',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      width: `${displaySize}px`,
      height: `${displaySize}px`,
      imageRendering: 'auto'
    };
  }

  const { sheetUrl, x, y } = getItemSpriteCoords(itemId);
  const scale = displaySize / 40;
  const bgWidth = 1280 * scale;
  const posX = -x * scale;
  const posY = -y * scale;

  return {
    backgroundImage: `url(${sheetUrl})`,
    backgroundPosition: `${posX}px ${posY}px`,
    backgroundSize: `${bgWidth}px auto`,
    backgroundRepeat: 'no-repeat',
    width: `${displaySize}px`,
    height: `${displaySize}px`,
    imageRendering: 'pixelated'
  };
}

/**
 * 发型总数。与 public/data/armor-data.json 的 hairCount、图集 player_hairs.png 的行列数保持一致，
 * 由 scripts/extract 管线从游戏内自动生成（1.4.6 为 228 款）。
 */
export const HAIR_COUNT = 228;
export const HAIR_COLS = 16;
export const HAIR_ROWS = Math.ceil(HAIR_COUNT / HAIR_COLS);

/**
 * 泰拉瑞亚发型预览图集计算工具 (16 列，每格 40x40 像素，图集尺寸随 HAIR_ROWS 变化)
 */
export function getHairSpriteStyle(hairIndex: number, displaySize = 36): Record<string, string> {
  const safeIdx = Math.max(0, Math.min(HAIR_COUNT - 1, hairIndex || 0));
  const col = safeIdx % HAIR_COLS;
  const row = Math.floor(safeIdx / HAIR_COLS);
  const scale = displaySize / 40;
  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;

  return {
    backgroundImage: `url(${prefix}atlas/hairs.png?v=${ATLAS_VERSION})`,
    backgroundPosition: `${-col * 40 * scale}px ${-row * 40 * scale}px`,
    backgroundSize: `${640 * scale}px ${HAIR_ROWS * 40 * scale}px`,
    backgroundRepeat: 'no-repeat',
    width: `${displaySize}px`,
    height: `${displaySize}px`,
    imageRendering: 'pixelated'
  };
}

/**
 * 泰拉瑞亚 Buff 状态增益图集计算工具 (20 列，每格 32x32 像素，总宽 640px)
 */
export function getBuffSpriteStyle(buffId: number, displaySize = 32): Record<string, string> {
  if (buffId <= 0) {
    return { display: 'none' };
  }
  const safeIdx = buffId - 1;
  const col = safeIdx % 20;
  const row = Math.floor(safeIdx / 20);
  const scale = displaySize / 32;
  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;

  return {
    backgroundImage: `url(${prefix}atlas/buffs.png?v=${ATLAS_VERSION})`,
    backgroundPosition: `${-col * 32 * scale}px ${-row * 32 * scale}px`,
    backgroundSize: `${640 * scale}px ${640 * scale}px`,
    backgroundRepeat: 'no-repeat',
    width: `${displaySize}px`,
    height: `${displaySize}px`,
    imageRendering: 'pixelated'
  };
}
