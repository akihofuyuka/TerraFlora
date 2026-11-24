/**
 * 从 dump/ 目录构建编辑器所需的图集与数据文件。
 *
 * 输入目录由 tools/gamedump 工具生成，标准契约见 README.md。
 *
 * 用法：
 *   node scripts/extract/build-from-dump.mjs --dump dump
 *   node scripts/extract/build-from-dump.mjs --dump dump --only items
 *   node scripts/extract/build-from-dump.mjs --dump dump --premultiplied
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PNG } = require(process.env.PNGJS_PATH || 'pngjs');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? true) : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

const DUMP = path.resolve(ROOT, String(arg('dump', 'dump')));
const ONLY = String(arg('only', 'items,avatar,hair')).split(',').map((s) => s.trim());
const UNPREMULTIPLY = flag('premultiplied');

const ATLAS = path.join(ROOT, 'public', 'atlas');
const DATA = path.join(ROOT, 'public', 'data');

/* ------------------------------------------------------------------ */
/* 基础工具                                                            */
/* ------------------------------------------------------------------ */

const ITEM_CELL = 40;   // 物品格
const ITEM_COLS = 32;   // 与 src/utils/sprite.ts 保持硬一致
const ITEM_ROWS = 48;
const ITEMS_PER_SHEET = ITEM_COLS * ITEM_ROWS; // 1536

const PW = 40;   // 人物切片
const PH = 56;

const pngCache = new Map();
function readPng(file) {
  if (!pngCache.has(file)) pngCache.set(file, PNG.sync.read(fs.readFileSync(file)));
  return pngCache.get(file);
}
const has = (file) => fs.existsSync(file);

/** 取 40x56 切片；超出边界的部分留透明，支持 X 轴偏移 */
function sliceCell(png, cx, cy, offsetX = 0) {
  const out = Buffer.alloc(PW * PH * 4);
  for (let y = 0; y < PH; y++) {
    const sy = cy * PH + y;
    if (sy >= png.height) break;
    for (let x = 0; x < PW; x++) {
      const sx = cx * PW + x + offsetX;
      if (sx < 0 || sx >= png.width) continue;
      const s = (sy * png.width + sx) * 4;
      const d = (y * PW + x) * 4;
      out[d] = png.data[s];
      out[d + 1] = png.data[s + 1];
      out[d + 2] = png.data[s + 2];
      out[d + 3] = png.data[s + 3];
    }
  }
  return out;
}

/** 内容寻址的贴图打包器：同样像素只存一次 */
function makePacker(cols) {
  const cells = [];
  const byHash = new Map();
  return {
    cells,
    put(buf) {
      const h = crypto.createHash('sha1').update(buf).digest('hex');
      if (byHash.has(h)) return byHash.get(h);
      const c = [cells.length % cols, Math.floor(cells.length / cols)];
      cells.push({ buf, c });
      byHash.set(h, c);
      return c;
    },
  };
}

function writeAtlas(cells, file, cellW, cellH, cols) {
  const rows = Math.max(1, Math.ceil(cells.length / cols));
  const atlas = new PNG({ width: cols * cellW, height: rows * cellH });
  atlas.data.fill(0);
  for (const { buf, c } of cells) {
    const ox = c[0] * cellW;
    const oy = c[1] * cellH;
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const s = (y * cellW + x) * 4;
        const d = ((oy + y) * atlas.width + (ox + x)) * 4;
        atlas.data[d] = buf[s];
        atlas.data[d + 1] = buf[s + 1];
        atlas.data[d + 2] = buf[s + 2];
        atlas.data[d + 3] = buf[s + 3];
      }
    }
  }
  fs.writeFileSync(file, PNG.sync.write(atlas, { colorType: 6 }));
  return `${atlas.width}x${atlas.height}`;
}

/**
 * 检测纵向动画条带的帧高：找到最小的周期 p（高度整除 p、至少 2 帧），
 * 使每个「非透明内容块」都完整落在某个帧区间内。
 * 例：占卜球 24x232（9 帧、帧距 26）、清酒 18x96（3 帧、帧距 32）。
 * 检测不到（真正的高个单帧贴图，如长矛）返回 null。
 */
function detectStripFrameHeight(png) {
  const { width: w, height: h } = png;
  if (h < 8 || h < w) return null;

  const rowEmpty = new Array(h).fill(true);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (png.data[(y * w + x) * 4 + 3] > 8) { rowEmpty[y] = false; break; }
    }
  }

  // 内容块 [start,end]
  const blocks = [];
  let start = -1;
  for (let y = 0; y < h; y++) {
    if (!rowEmpty[y] && start < 0) start = y;
    if ((rowEmpty[y] || y === h - 1) && start >= 0) {
      const end = rowEmpty[y] ? y - 1 : y;
      if (end >= start) blocks.push([start, end]);
      start = -1;
    }
  }
  if (blocks.length === 0) return null;

  const fits = (p) => {
    if (h % p !== 0 || Math.floor(h / p) < 2) return false;
    return blocks.every(([a, b]) => Math.floor(a / p) === Math.floor(b / p));
  };

  const minBlock = Math.min(...blocks.map(([a, b]) => b - a + 1));
  for (let p = Math.max(4, minBlock); p <= h / 2; p++) {
    if (fits(p)) return p;
  }
  return null;
}

/** 取动画条带的第一帧（原地裁剪出新的 RGBA） */
function firstFrame(png, frameHeight) {
  const { width: w } = png;
  const out = new PNG({ width: w, height: frameHeight });
  png.data.copy(out.data, 0, 0, w * frameHeight * 4);
  return out;
}

/** 只要 alpha>0 的像素就算「有内容」 */
function isBlank(buf) {
  for (let i = 3; i < buf.length; i += 4) if (buf[i] > 8) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* 物品格：40x40，原图更小则居中，更大则按面积平均缩到框内            */
/* ------------------------------------------------------------------ */

function fitItemCell(png) {
  // 动画条带（火把/药水/水晶等）只取第一帧，否则整条塞进 40x40 会变成细长条
  const frameHeight = detectStripFrameHeight(png);
  if (frameHeight && frameHeight < png.height) {
    png = firstFrame(png, frameHeight);
  }

  const cell = Buffer.alloc(ITEM_CELL * ITEM_CELL * 4);
  const { width: sw, height: sh } = png;

  // 直接放，避免任何重采样污染像素艺术
  if (sw <= ITEM_CELL && sh <= ITEM_CELL) {
    const ox = Math.floor((ITEM_CELL - sw) / 2);
    const oy = Math.floor((ITEM_CELL - sh) / 2);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const s = (y * sw + x) * 4;
        const d = ((oy + y) * ITEM_CELL + (ox + x)) * 4;
        cell[d] = png.data[s];
        cell[d + 1] = png.data[s + 1];
        cell[d + 2] = png.data[s + 2];
        cell[d + 3] = png.data[s + 3];
      }
    }
    return cell;
  }

  // 缩图：alpha 加权的面积平均，防止半透明边缘发黑
  const scale = Math.min(ITEM_CELL / sw, ITEM_CELL / sh);
  const dw = Math.max(1, Math.min(ITEM_CELL, Math.round(sw * scale)));
  const dh = Math.max(1, Math.min(ITEM_CELL, Math.round(sh * scale)));
  const ox = Math.floor((ITEM_CELL - dw) / 2);
  const oy = Math.floor((ITEM_CELL - dh) / 2);
  for (let dy = 0; dy < dh; dy++) {
    const y0 = Math.floor((dy * sh) / dh);
    const y1 = Math.max(y0 + 1, Math.floor(((dy + 1) * sh) / dh));
    for (let dx = 0; dx < dw; dx++) {
      const x0 = Math.floor((dx * sw) / dw);
      const x1 = Math.max(x0 + 1, Math.floor(((dx + 1) * sw) / dw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const s = (y * sw + x) * 4;
          const sa = png.data[s + 3];
          r += png.data[s] * sa;
          g += png.data[s + 1] * sa;
          b += png.data[s + 2] * sa;
          a += sa;
          n++;
        }
      }
      const d = ((oy + dy) * ITEM_CELL + (ox + dx)) * 4;
      if (a > 0) {
        cell[d] = Math.round(r / a);
        cell[d + 1] = Math.round(g / a);
        cell[d + 2] = Math.round(b / a);
        cell[d + 3] = Math.round(a / n);
      }
    }
  }
  return cell;
}

/* ------------------------------------------------------------------ */
/* 载入 dump                                                           */
/* ------------------------------------------------------------------ */

function loadJson(file, fallback) {
  if (!has(file)) {
    console.warn(`! 缺少 ${path.relative(ROOT, file)}`);
    return fallback;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const items = loadJson(path.join(DUMP, 'items.json'), []);
const sets = loadJson(path.join(DUMP, 'sets.json'), {});
const meta = loadJson(path.join(DUMP, 'meta.json'), {});
// 覆盖表：对于未在官方本地化字典中收录的废案/开发中物品（如第一分形），补充中文名与官方内部变量名英文（如 ItemName.FirstFractal）
const overrides = loadJson(path.join(HERE, 'name-overrides.json'), {});
const copyLoad = loadJson(path.join(HERE, 'texture-copy-load.json'), {});
const itemStats = Object.fromEntries(
  loadJson(path.join(DUMP, 'item-stats.json'), []).map((x) => [x.id, x])
);

for (const it of items) {
  const o = overrides[String(it.id)];
  const st = itemStats[it.id];
  if (o) {
    if (o.name) it.name = o.name;
    if (o.en) it.en = o.en;
    if (o.cat) it.cat = o.cat;
  } else if (!it.name || it.name === it.key) {
    it.en = `ItemName.${it.key}`;
  }
  it.cat ??= st?.cat ?? 'misc';
  it.stack ??= st?.stack ?? ((it.cat === 'armor' || it.cat === 'accessory' || it.cat === 'tool' || it.cat === 'weapon') ? 1 : 9999);
  it.rare ??= st?.rare ?? 0;
}

if (items.length) {
  console.log(`dump: ${items.length} items, ${items.filter((i) => i.deprecated).length} deprecated, gameVersion=${meta.gameVersion ?? '?'}`);
}

/* ------------------------------------------------------------------ */
/* 1) 物品图集 + items-raw.json + item-keys.json                       */
/* ------------------------------------------------------------------ */

if (ONLY.includes('items')) {
  if (!items.length) throw new Error('dump/items.json 不存在，无法构建物品图集');

  const maxId = Math.max(...items.map((i) => i.id));
  const sheetCount = Math.floor(maxId / ITEMS_PER_SHEET) + 1;
  const sheets = Array.from({ length: sheetCount }, () => {
    const p = new PNG({ width: ITEM_COLS * ITEM_CELL, height: ITEM_ROWS * ITEM_CELL });
    p.data.fill(0);
    return p;
  });

  let placed = 0;
  const missing = [];
  for (const it of items) {
    let sprite = path.join(DUMP, 'items', `Item_${it.id}.png`);
    if (!has(sprite)) {
      const copyId = copyLoad[it.id];
      if (copyId && has(path.join(DUMP, 'items', `Item_${copyId}.png`))) {
        sprite = path.join(DUMP, 'items', `Item_${copyId}.png`);
      } else {
        missing.push(it.id);
        continue;
      }
    }
    const cellBuf = fitItemCell(readPng(sprite));
    const sheet = sheets[Math.floor(it.id / ITEMS_PER_SHEET)];
    const local = it.id % ITEMS_PER_SHEET;
    const ox = (local % ITEM_COLS) * ITEM_CELL;
    const oy = Math.floor(local / ITEM_COLS) * ITEM_CELL;
    for (let y = 0; y < ITEM_CELL; y++) {
      for (let x = 0; x < ITEM_CELL; x++) {
        const s = (y * ITEM_CELL + x) * 4;
        const d = ((oy + y) * sheet.width + (ox + x)) * 4;
        sheet.data[d] = cellBuf[s];
        sheet.data[d + 1] = cellBuf[s + 1];
        sheet.data[d + 2] = cellBuf[s + 2];
        sheet.data[d + 3] = cellBuf[s + 3];
      }
    }
    placed++;
  }

  // 最后一张只保留实际用到的行，别留大片空白
  const lastLocal = maxId % ITEMS_PER_SHEET;
  const lastRows = Math.min(ITEM_ROWS, Math.floor(lastLocal / ITEM_COLS) + 1);
  for (let i = 0; i < sheets.length; i++) {
    const rows = i === sheets.length - 1 ? lastRows : ITEM_ROWS;
    const src = sheets[i];
    let out = src;
    if (rows < ITEM_ROWS) {
      out = new PNG({ width: src.width, height: rows * ITEM_CELL });
      src.data.copy(out.data, 0, 0, rows * ITEM_CELL * src.width * 4);
    }
    fs.writeFileSync(path.join(ATLAS, `items-${i}.png`), PNG.sync.write(out, { colorType: 6 }));
  }
  console.log(`items: ${placed} sprites -> ${sheets.length} sheets (1280xpng)${missing.length ? `, ${missing.length} 无贴图` : ''}`);

  const raw = items
    .filter((i) => i.id > 0)
    .sort((a, b) => a.id - b.id)
    .map((i) => ({
      id: i.id,
      name: i.name,
      en: i.en,
      cat: i.cat,
      stack: i.stack,
      rarity: i.rare,
    }));
  fs.writeFileSync(path.join(HERE, '..', 'items-raw.json'), JSON.stringify(raw, null, 0));
  console.log(`items-raw.json: ${raw.length} 条`);

  const keys = {};
  for (const i of items) if (i.key) keys[i.id] = i.key;
  fs.writeFileSync(path.join(DATA, 'item-keys.json'), JSON.stringify(keys));
  console.log(`item-keys.json: ${Object.keys(keys).length} 条`);
}

/* ------------------------------------------------------------------ */
/* 2) 人物图集：player_base + armor + accessories                      */
/* ------------------------------------------------------------------ */

const PART_KEYS = {
  0: 'head', 1: 'eyeWhites', 2: 'eyes', 3: 'torsoSkin', 4: 'undershirt',
  5: 'hands', 6: 'shirt', 7: 'armSkin', 8: 'armUndershirt', 9: 'armHand',
  10: 'legSkin', 11: 'pants', 12: 'shoes', 13: 'armShirt', 15: 'eyeBlink',
};
const ARM_PARTS = [4, 5, 6, 7, 8, 13];
// 女性体型把站立帧放在第 2 行（游戏里 CreateCompositeData 对 !Male 做 pt.Y += 2）
const FEMALE_VARIANTS = new Set([4, 5, 6, 7, 9, 11]);
const BODY_ROW_PARTS = new Set([3, 4, 5, 6, 7, 8, 9, 13]);

function findPlayerPart(dir, v, pid) {
  // 兼容两种切片命名：Player_{v}_{p}.png 或 P{v}_{pid}.png
  for (const f of [`Player_${v}_${pid}.png`, `P${v}_${pid}.png`]) {
    const p = path.join(dir, f);
    if (has(p)) return p;
  }
  return null;
}

if (ONLY.includes('avatar')) {
  const dir = path.join(DUMP, 'avatar');
  if (!fs.existsSync(dir)) {
    console.warn('! 缺少 dump/avatar，跳过人物图集');
  } else {
    /* ---- player_base ---- */
    const basePacker = makePacker(ITEM_COLS);
    const variants = {};
    const variantArms = {};
    for (let v = 0; v < 12; v++) {
      const torsoCoords = {};
      const armCoords = {};
      const rowOff = FEMALE_VARIANTS.has(v) ? 2 : 0;
      for (const [pidStr, key] of Object.entries(PART_KEYS)) {
        const pid = +pidStr;
        // 游戏里 variant v 会先复制 variant 0 再覆盖，这里复刻同样的回退
        const file = findPlayerPart(dir, v, pid) || findPlayerPart(dir, 0, pid);
        if (!file) continue;
        const png = readPng(file);
        const cy = BODY_ROW_PARTS.has(pid) ? rowOff : 0;
        torsoCoords[key] = basePacker.put(sliceCell(png, 0, cy));
        if (ARM_PARTS.includes(pid) && png.width >= PW * 3) {
          armCoords[key] = {
            front: basePacker.put(sliceCell(png, 2, 0)),
            back: basePacker.put(sliceCell(png, 2, 2)),
          };
        }
      }
      variants[v] = torsoCoords;
      variantArms[v] = armCoords;
    }
    const baseSize = writeAtlas(basePacker.cells, path.join(ATLAS, 'player_base.png'), PW, PH, ITEM_COLS);
    console.log(`player_base: ${baseSize} cells=${basePacker.cells.length}`);

    /* ---- armor ---- */
    const armorPacker = makePacker(ITEM_COLS);
    const heads = {};
    const legs = {};
    const bodies = {};
    const files = fs.readdirSync(dir);

    for (const f of files) {
      const m = f.match(/^(?:Armor_Head|AH)_(\d+)\.png$/);
      if (m) heads[m[1]] = armorPacker.put(sliceCell(readPng(path.join(dir, f)), 0, 0));
    }
    for (const f of files) {
      const m = f.match(/^(?:Armor_Legs|AL)_(\d+)\.png$/);
      if (m) legs[m[1]] = armorPacker.put(sliceCell(readPng(path.join(dir, f)), 0, 0));
    }

    const MAP = {
      torsoM: [0, 0], fsM: [0, 1], bsM: [1, 1],
      torsoF: [0, 2], fsF: [0, 3], bsF: [1, 3],
      frontArm: [2, 0], backArm: [2, 2],
    };
    for (const f of files) {
      const m = f.match(/^(?:Armor|AB)_(\d+)\.png$/);
      if (!m) continue;
      const png = readPng(path.join(dir, f));
      const e = {};
      for (const [k, [cx, cy]] of Object.entries(MAP)) e[k] = armorPacker.put(sliceCell(png, cx, cy));
      bodies[m[1]] = {
        male: e.torsoM,
        female: e.torsoF,
        maleParts: { frontShoulder: e.fsM, backShoulder: e.bsM },
        femaleParts: { frontShoulder: e.fsF, backShoulder: e.bsF },
        frontArm: e.frontArm,
        backArm: e.backArm,
      };
    }
    const armorSize = writeAtlas(armorPacker.cells, path.join(ATLAS, 'armor.png'), PW, PH, ITEM_COLS);
    console.log(`armor: ${armorSize} cells=${armorPacker.cells.length} heads=${Object.keys(heads).length} legs=${Object.keys(legs).length} bodies=${Object.keys(bodies).length}`);

    /* ---- accessories ---- */
    const GROUPS = {
      back: 'Acc_Back',
      face: 'Acc_Face',
      neck: 'Acc_Neck',
      waist: 'Acc_Waist',
      shield: 'Acc_Shield',
      shoes: 'Acc_Shoes',
      balloon: 'Acc_Balloon',
      handOn: 'Acc_HandsOn',
      handOff: 'Acc_HandsOff',
      front: 'Acc_Front',
    };
    const accPacker = makePacker(16);
    const accCoords = {};
    let empty = 0;
    for (const [key, prefix] of Object.entries(GROUPS)) {
      accCoords[key] = {};
      const list = files
        .map((f) => {
          const m = f.match(new RegExp(`^${prefix}_(\\d+)\\.png$`));
          return m ? [m[1], f] : null;
        })
        .filter(Boolean)
        .sort((a, b) => +a[0] - +b[0]);
      for (const [id, f] of list) {
        const png = readPng(path.join(dir, f));
        // 气球饰品（Acc_Balloon）等宽于 40px 的贴图，左侧存在 12~16px 留白偏移
        // 向左偏移 (png.width - PW) 即可将气球主体完整移入 40x56 切片，防止右侧被截断
        const offsetX = (key === 'balloon' && png.width > PW) ? (png.width - PW) : 0;
        const buf = sliceCell(png, 0, 0, offsetX);
        if (isBlank(buf)) { empty++; continue; } // 空贴图不占格子
        accCoords[key][id] = accPacker.put(buf);
      }
    }
    const accSize = writeAtlas(accPacker.cells, path.join(ATLAS, 'accessories.png'), PW, PH, 16);
    console.log(`accessories: ${accSize} cells=${accPacker.cells.length} skippedEmpty=${empty}`);

    /* ---- armor-data.json ---- */
    const jsonPath = path.join(DATA, 'armor-data.json');
    const prev = loadJson(jsonPath, {});
    const next = {
      ...prev,
      variants,
      variantArms,
      heads,
      legs,
      bodies,
      accCoords,
      slotWidth: PW,
      slotHeight: PH,
      cols: ITEM_COLS,
    };

    if (items.length) {
      const prevItems = prev.items || {};
      const prevAcc = prev.accItems || {};
      const itemMap = {};
      const accMap = {};
      let keptOldSlots = 0;
      for (const it of items) {
        // 若 dump 未提供独立槽位则沿用当前配置；有真实槽位则直接写入
        const slots = {};
        if (it.head > 0) slots.head = it.head;
        if (it.body > 0) slots.body = it.body;
        if (it.leg > 0) slots.leg = it.leg;
        if (!Object.keys(slots).length && prevItems[it.id]) {
          Object.assign(slots, prevItems[it.id]);
          keptOldSlots++;
        }
        if (Object.keys(slots).length) itemMap[it.id] = slots;

        const acc = {};
        const a = it.acc || {};
        for (const k of ['wings', 'shoe', 'back', 'front', 'waist', 'neck', 'face', 'handOn', 'handOff', 'shield', 'balloon']) {
          if (a[k] > 0) acc[k] = a[k];
        }
        if (!Object.keys(acc).length && prevAcc[it.id]) Object.assign(acc, prevAcc[it.id]);
        if (Object.keys(acc).length) accMap[it.id] = acc;
      }
      next.items = itemMap;
      next.accItems = accMap;
      console.log(`armor-data: items=${Object.keys(itemMap).length} accItems=${Object.keys(accMap).length}`);
    } else {
      console.warn('! 没有 items.json，items/accItems 保持当前配置');
    }

    if (sets.fullHairHeads) next.fullHairHeads = sets.fullHairHeads;
    if (sets.hatHairHeads) next.hatHairHeads = sets.hatHairHeads;
    if (sets.hairCount) next.hairCount = sets.hairCount;

    fs.writeFileSync(jsonPath, JSON.stringify(next));
    console.log(`armor-data.json: ${(fs.statSync(jsonPath).size / 1024).toFixed(0)} KB`);
  }
}

/* ------------------------------------------------------------------ */
/* 3) 发型图集                                                         */
/* ------------------------------------------------------------------ */

if (ONLY.includes('hair')) {
  const hairDir = path.join(DUMP, 'hair');
  if (!fs.existsSync(hairDir)) {
    console.warn('! 缺少 dump/hair，跳过发型图集');
  } else {
    const collect = (prefix) => {
      const list = fs
        .readdirSync(hairDir)
        .map((f) => {
          const m = f.match(new RegExp(`^${prefix}_(\\d+)\\.png$`));
          return m ? [+m[1], f] : null;
        })
        .filter(Boolean)
        .sort((a, b) => a[0] - b[0]);
      return list;
    };

    for (const [prefix, outName] of [['Player_Hair', 'player_hairs'], ['Player_HairAlt', 'player_hairs_alt']]) {
      const list = collect(prefix);
      const cols = 16;
      const rows = Math.max(1, Math.ceil(list.length / cols));
      const full = new PNG({ width: cols * PW, height: rows * PH });
      const mini = new PNG({ width: cols * ITEM_CELL, height: rows * ITEM_CELL });
      full.data.fill(0);
      mini.data.fill(0);
      list.forEach(([, f], idx) => {
        const png = readPng(path.join(hairDir, f));
        const cell = sliceCell(png, 0, 0); // 第 0 帧
        const cx = idx % cols;
        const cy = Math.floor(idx / cols);
        for (let y = 0; y < PH; y++) {
          for (let x = 0; x < PW; x++) {
            const s = (y * PW + x) * 4;
            const d = ((cy * PH + y) * full.width + (cx * PW + x)) * 4;
            full.data[d] = cell[s];
            full.data[d + 1] = cell[s + 1];
            full.data[d + 2] = cell[s + 2];
            full.data[d + 3] = cell[s + 3];
            if (x < ITEM_CELL && y < ITEM_CELL) {
              const md = ((cy * ITEM_CELL + y) * mini.width + (cx * ITEM_CELL + x)) * 4;
              mini.data[md] = cell[s];
              mini.data[md + 1] = cell[s + 1];
              mini.data[md + 2] = cell[s + 2];
              mini.data[md + 3] = cell[s + 3];
            }
          }
        }
      });
      fs.writeFileSync(path.join(ATLAS, `${outName}.png`), PNG.sync.write(full, { colorType: 6 }));
      console.log(`${outName}: ${full.width}x${full.height} (${list.length} 款)`);
      if (prefix === 'Player_Hair') {
        fs.writeFileSync(path.join(ATLAS, 'hairs.png'), PNG.sync.write(mini, { colorType: 6 }));
        console.log(`hairs: ${mini.width}x${mini.height} (选择器用 40x40 版)`);
        // 发型数量写回 armor-data.json，渲染与选择器都以它为准
        const jsonPath = path.join(DATA, 'armor-data.json');
        const prev = loadJson(jsonPath, {});
        fs.writeFileSync(jsonPath, JSON.stringify({ ...prev, hairCount: list.length }));
        console.log(`armor-data.json hairCount = ${list.length}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 4) 反预乘（可选）                                                   */
/* ------------------------------------------------------------------ */

if (UNPREMULTIPLY) {
  console.log('! 反预乘模式：游戏贴图是预乘 alpha，这里还原成直通 alpha');
  for (const f of fs.readdirSync(ATLAS).filter((f) => f.endsWith('.png'))) {
    const p = path.join(ATLAS, f);
    const png = PNG.sync.read(fs.readFileSync(p));
    for (let i = 0; i < png.data.length; i += 4) {
      const a = png.data[i + 3];
      if (a === 0 || a === 255) continue;
      png.data[i] = Math.min(255, Math.round((png.data[i] * 255) / a));
      png.data[i + 1] = Math.min(255, Math.round((png.data[i + 1] * 255) / a));
      png.data[i + 2] = Math.min(255, Math.round((png.data[i + 2] * 255) / a));
    }
    fs.writeFileSync(p, PNG.sync.write(png, { colorType: 6 }));
  }
  console.log('反预乘完成');
}

console.log('\n下一步：');
console.log('  npx tsx scripts/process-pinyin.ts        # 生成 items.min.json / prefixes.min.json');
console.log('  python scripts/extract/to-webp.py        # PNG -> 无损 WebP（需要 Pillow）');
console.log('  然后递增 src/utils/avatar.ts 的 ASSET_VERSION');
