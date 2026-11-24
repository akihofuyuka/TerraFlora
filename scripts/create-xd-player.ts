import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createDefaultPlayer, serializePlr, parsePlr } from '../src/core/plr';
import { decryptPlr } from '../src/core/crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..');

// 1. 读取心动专属物品列表
const xdItemsPath = path.join(ROOT, 'public', 'data', 'xd-items.json');
const xdItems: Array<{ id: number; name: string; stack: number }> = JSON.parse(fs.readFileSync(xdItemsPath, 'utf8'));

// 2. 以现有的合法心动存档 1..plr 为母版解密，确保所有原生心动字段与标志位 100% 真实对齐
const templatePath = path.join(WORKSPACE, '1..plr');
const templateRaw = fs.readFileSync(templatePath);

const KEY = Buffer.from([
  0x68, 0x00, 0x33, 0x00, 0x79, 0x00, 0x5f, 0x00,
  0x67, 0x00, 0x55, 0x00, 0x79, 0x00, 0x5a, 0x00
]);

const decipher = crypto.createDecipheriv('aes-128-cbc', KEY, KEY);
decipher.setAutoPadding(false);
const decryptedBuf = Buffer.concat([decipher.update(templateRaw), decipher.final()]);

// 解析母版
const p = parsePlr(new Uint8Array(decryptedBuf));

// 3. 配置角色基础信息
p.name = '心动全物品';
p.statLife = 500;
p.statLifeMax = 500;
p.statMana = 200;
p.statManaMax = 200;
p.extraAccessory = true;
p.unlockedBiomeTorches = true;
p.ateArtisanBread = true;
p.finishedDD2 = true;

// 清空各个仓库
p.inventory = [];
for (let i = 0; i < 58; i++) p.inventory.push({ id: 0, stack: 0, prefix: 0 });
p.bank = [];  // 存钱罐 / 钱币槽 (40 格)
for (let i = 0; i < 40; i++) p.bank.push({ id: 0, stack: 0, prefix: 0 });
p.bank2 = []; // 保险箱 (40 格)
for (let i = 0; i < 40; i++) p.bank2.push({ id: 0, stack: 0, prefix: 0 });
p.bank3 = []; // 护卫熔炉 (40 格)
for (let i = 0; i < 40; i++) p.bank3.push({ id: 0, stack: 0, prefix: 0 });
p.bank4 = []; // 虚空保险库 / 虚空袋 (40 格)
for (let i = 0; i < 40; i++) p.bank4.push({ id: 0, stack: 0, prefix: 0 });

// 4. 填充心动物品 (共 119 件: ID 6196 ~ 6314)
// 主背包 0 ~ 47: 放入前 48 件心动物品 (6196 ~ 6243)
for (let i = 0; i < 48; i++) {
  const it = xdItems[i];
  p.inventory[i] = { id: it.id, stack: it.stack || 9999, prefix: 0 };
}

// 主背包 48: 钱币槽 (Money Trough, ID 3213)
p.inventory[48] = { id: 3213, stack: 1, prefix: 0 };

// 主背包 49: 虚空袋 (Void Bag, ID 4131)
p.inventory[49] = { id: 4131, stack: 1, prefix: 0 };

// 存钱罐 (bank) 0 ~ 39: 放入接下来的 40 件心动物品 (6244 ~ 6283)
for (let i = 0; i < 40; i++) {
  const it = xdItems[48 + i];
  p.bank[i] = { id: it.id, stack: it.stack || 9999, prefix: 0 };
}

// 虚空仓库 (bank4) 0 ~ 30: 放入剩余的 31 件心动物品 (6284 ~ 6314)
for (let i = 0; i < 31; i++) {
  const it = xdItems[48 + 40 + i];
  p.bank4[i] = { id: it.id, stack: it.stack || 9999, prefix: 0 };
}

// 5. 序列化为国服 xindong 二进制
const serialized = serializePlr(p, 326, 'xindong');

// 6. 进行标准 CBC 加密
const cipher = crypto.createCipheriv('aes-128-cbc', KEY, KEY);
cipher.setAutoPadding(true);
const encryptedBuf = Buffer.concat([cipher.update(Buffer.from(serialized)), cipher.final()]);

// 7. 输出到工作区根目录
const outPlrPath = path.join(WORKSPACE, '心动全物品.plr');
fs.writeFileSync(outPlrPath, encryptedBuf);

console.log('成功生成心动全物品角色:');
console.log('文件路径:', outPlrPath);
console.log('文件大小:', encryptedBuf.length, 'bytes');
console.log('角色名称:', p.name);
console.log('服类型:   心动版 (xindong)');
console.log('协议版本: 326 (1.4.4.9 XD)');
console.log('主背包 0~47:  物品 #6196 ~ #6243 (48 件)');
console.log('主背包 48:    钱币槽 (#3213)');
console.log('主背包 49:    虚空袋 (#4131)');
console.log('存钱罐 0~39:  物品 #6244 ~ #6283 (40 件)');
console.log('虚空库 0~30:  物品 #6284 ~ #6314 (31 件)');
console.log('总计物品数:   119 件 (全部收录)');
