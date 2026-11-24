import fs from 'fs';
import path from 'path';
import { pinyin } from 'pinyin-pro';

interface RawItem {
  id: number;
  name: string;
  en: string;
  cat: string;
  stack: number;
  rarity: number;
}

interface RawPrefix {
  id: number;
  name: string;
  en: string;
  type: string;
  isGod: boolean;
  godCat: string | null;
}

export interface MinItem {
  id: number;
  name: string;
  en: string;
  py: string;
  pys: string;
  cat: string;
  stack: number;
  rarity: number;
}

export interface MinBuff {
  id: number;
  key: string;
  name: string;
  en: string;
  tip: string;
  py: string;
  pys: string;
}

export function buildPinyinData() {
  const scriptsDir = path.resolve(import.meta.dirname || process.cwd());
  const rootDir = path.resolve(scriptsDir, '..');
  const itemsRawPath = path.join(scriptsDir, 'items-raw.json');
  const prefixesRawPath = path.join(scriptsDir, 'prefixes-raw.json');

  const itemsRaw: RawItem[] = JSON.parse(fs.readFileSync(itemsRawPath, 'utf-8'));
  const prefixesRaw: RawPrefix[] = JSON.parse(fs.readFileSync(prefixesRawPath, 'utf-8'));

  console.log(`Processing ${itemsRaw.length} items with pinyin...`);

  const minItems: MinItem[] = itemsRaw.map((it) => {
    // Generate full pinyin (e.g. "tai la ren")
    const py = pinyin(it.name, { toneType: 'none', nonZh: 'consecutive' })
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Generate pinyin initials (e.g. "tlr")
    const pys = pinyin(it.name, { pattern: 'first', toneType: 'none', nonZh: 'consecutive' })
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    return {
      id: it.id,
      name: it.name,
      en: it.en,
      py,
      pys,
      cat: it.cat,
      stack: it.stack,
      rarity: it.rarity
    };
  });

  const outItemsPath = path.join(rootDir, 'public', 'data', 'items.min.json');
  const outPrefixesPath = path.join(rootDir, 'public', 'data', 'prefixes.min.json');

  fs.writeFileSync(outItemsPath, JSON.stringify(minItems), 'utf-8');
  fs.writeFileSync(outPrefixesPath, JSON.stringify(prefixesRaw), 'utf-8');

  // Process buffs if dump/buffs.json exists
  const buffsRawPath = path.join(rootDir, 'dump', 'buffs.json');
  if (fs.existsSync(buffsRawPath)) {
    const rawBuffs = JSON.parse(fs.readFileSync(buffsRawPath, 'utf-8'));
    console.log(`Processing ${rawBuffs.length} buffs with pinyin...`);
    const minBuffs: MinBuff[] = rawBuffs.map((b: any) => {
      const py = pinyin(b.name, { toneType: 'none', nonZh: 'consecutive' })
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const pys = pinyin(b.name, { pattern: 'first', toneType: 'none', nonZh: 'consecutive' })
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      return {
        id: b.id,
        key: b.key,
        name: b.name,
        en: b.en,
        tip: b.tip || '',
        py,
        pys
      };
    });
    const outBuffsPath = path.join(rootDir, 'public', 'data', 'buffs.min.json');
    fs.writeFileSync(outBuffsPath, JSON.stringify(minBuffs), 'utf-8');
    const buffSize = fs.statSync(outBuffsPath).size;
    console.log(`Generated ${outBuffsPath} (${(buffSize / 1024).toFixed(1)} KB)`);
  }

  const itemSize = fs.statSync(outItemsPath).size;
  const pfxSize = fs.statSync(outPrefixesPath).size;

  console.log(`Generated ${outItemsPath} (${(itemSize / 1024).toFixed(1)} KB)`);
  console.log(`Generated ${outPrefixesPath} (${(pfxSize / 1024).toFixed(1)} KB)`);
  console.log('Sample item:', minItems[0]);
}

buildPinyinData();
