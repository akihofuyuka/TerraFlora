import { AppError } from './errors';

/**
 * Terraria .plr AES-128-CBC 加解密核心实现
 * 密钥与初始向量 IV 均为字符串 "h3y_gUyZ" 的 UTF-16LE 字节数组 (16 字节)
 * 支持官方 Relogic 版及心动版 (XD) 存档（包含尾部零填充对齐自动裁剪）
 * 优先采用浏览器原生 Web Crypto API (硬件加速)
 * 当遇到非标填充/第三方修改器损坏尾部的存档时，自动回退到纯 TypeScript 容错解密器
 */

export const TERRARIA_AES_KEY_BYTES = new Uint8Array([
  0x68, 0x00, 0x33, 0x00, 0x79, 0x00, 0x5f, 0x00,
  0x67, 0x00, 0x55, 0x00, 0x79, 0x00, 0x5a, 0x00
]);

async function getKey(usage: KeyUsage): Promise<CryptoKey> {
  const cryptoObj = globalThis.crypto;
  return await cryptoObj.subtle.importKey(
    "raw",
    TERRARIA_AES_KEY_BYTES,
    { name: "AES-CBC" },
    false,
    [usage]
  );
}

// -------------------------------------------------------------
// 纯 TS 备用 AES-128 解密器 (用于处理非标填充或容错)
// -------------------------------------------------------------
const SBOX = new Uint8Array(256);
const INV_SBOX = new Uint8Array(256);
const RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

(function initAES() {
  let p = 1, q = 1;
  do {
    p = p ^ (p << 1) ^ (p & 0x80 ? 0x11b : 0);
    q ^= q << 1; q ^= q << 2; q ^= q << 4; q ^= q & 0x80 ? 0x09 : 0;
    const xformed = q ^ ((q << 1) | (q >>> 7)) ^ ((q << 2) | (q >>> 6)) ^ ((q << 3) | (q >>> 5)) ^ ((q << 4) | (q >>> 4));
    SBOX[p] = (xformed ^ 0x63) & 0xff;
  } while (p !== 1);
  SBOX[0] = 0x63;
  for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
})();

function gmul(a: number, b: number): number {
  let p = 0;
  for (let c = 0; c < 8; c++) {
    if ((b & 1) !== 0) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi !== 0) a ^= 0x1b;
    b >>>= 1;
  }
  return p;
}

function expandKey(key: Uint8Array): Uint32Array {
  const w = new Uint32Array(44);
  for (let i = 0; i < 4; i++) {
    w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3];
  }
  for (let i = 4; i < 44; i++) {
    let temp = w[i - 1];
    if (i % 4 === 0) {
      temp = (temp << 8) | (temp >>> 24);
      temp = (SBOX[(temp >>> 24) & 0xff] << 24) |
             (SBOX[(temp >>> 16) & 0xff] << 16) |
             (SBOX[(temp >>> 8) & 0xff] << 8) |
             SBOX[temp & 0xff];
      temp ^= RCON[i / 4] << 24;
    }
    w[i] = w[i - 4] ^ temp;
  }
  return w;
}

function invMixColumns(s: Uint8Array) {
  for (let c = 0; c < 4; c++) {
    const o = c * 4;
    const a = s[o], b = s[o + 1], d = s[o + 2], e = s[o + 3];
    s[o] = gmul(a, 0x0e) ^ gmul(b, 0x0b) ^ gmul(d, 0x0d) ^ gmul(e, 0x09);
    s[o + 1] = gmul(a, 0x09) ^ gmul(b, 0x0e) ^ gmul(d, 0x0b) ^ gmul(e, 0x0d);
    s[o + 2] = gmul(a, 0x0d) ^ gmul(b, 0x09) ^ gmul(d, 0x0e) ^ gmul(e, 0x0b);
    s[o + 3] = gmul(a, 0x0b) ^ gmul(b, 0x0d) ^ gmul(d, 0x09) ^ gmul(e, 0x0e);
  }
}

function invSubBytesAndShiftRows(s: Uint8Array) {
  const t0 = INV_SBOX[s[0]],  t1 = INV_SBOX[s[4]],  t2 = INV_SBOX[s[8]],   t3 = INV_SBOX[s[12]];
  const t4 = INV_SBOX[s[1]],  t5 = INV_SBOX[s[5]],  t6 = INV_SBOX[s[9]],   t7 = INV_SBOX[s[13]];
  const t8 = INV_SBOX[s[2]],  t9 = INV_SBOX[s[6]],  t10 = INV_SBOX[s[10]], t11 = INV_SBOX[s[14]];
  const t12 = INV_SBOX[s[3]], t13 = INV_SBOX[s[7]], t14 = INV_SBOX[s[11]], t15 = INV_SBOX[s[15]];

  s[0] = t0;   s[4] = t1;   s[8] = t2;   s[12] = t3;
  s[1] = t13;  s[5] = t4;   s[9] = t5;   s[13] = t6;
  s[2] = t10;  s[6] = t11;  s[10] = t8;  s[14] = t9;
  s[3] = t7;   s[7] = t14;  s[11] = t15; s[15] = t12;
}

function addRoundKey(s: Uint8Array, w: Uint32Array, round: number) {
  for (let c = 0; c < 4; c++) {
    const val = w[round * 4 + c];
    s[c * 4] ^= (val >>> 24) & 0xff;
    s[c * 4 + 1] ^= (val >>> 16) & 0xff;
    s[c * 4 + 2] ^= (val >>> 8) & 0xff;
    s[c * 4 + 3] ^= val & 0xff;
  }
}

function decryptBlock(block: Uint8Array, w: Uint32Array): Uint8Array {
  const state = new Uint8Array(block);
  addRoundKey(state, w, 10);
  for (let r = 9; r > 0; r--) {
    invSubBytesAndShiftRows(state);
    addRoundKey(state, w, r);
    invMixColumns(state);
  }
  invSubBytesAndShiftRows(state);
  addRoundKey(state, w, 0);
  return state;
}

function fallbackDecryptPlr(encryptedData: Uint8Array): Uint8Array {
  const w = expandKey(TERRARIA_AES_KEY_BYTES);
  const out = new Uint8Array(encryptedData.length);
  let prev = TERRARIA_AES_KEY_BYTES;

  for (let offset = 0; offset < encryptedData.length; offset += 16) {
    const block = encryptedData.subarray(offset, offset + 16);
    if (block.length < 16) break;
    const dec = decryptBlock(block, w);
    out.set(dec, offset);
    for (let i = 0; i < 16; i++) {
      out[offset + i] ^= prev[i];
    }
    prev = encryptedData.subarray(offset, offset + 16) as any;
  }

  // 移除尾部填充 (支持标准 PKCS#7 或非标多余尾部零)
  let end = out.length;
  while (end > 0 && out[end - 1] === 0) end--;
  if (end > 0) {
    const pad = out[end - 1];
    if (pad > 0 && pad <= 16 && end >= pad) {
      let isPad = true;
      for (let i = end - pad; i < end; i++) {
        if (out[i] !== pad) { isPad = false; break; }
      }
      if (isPad) end -= pad;
    }
  }

  return out.subarray(0, end);
}

/**
 * 裁剪尾部心动版等额外填充的 0 字节，恢复出 16 字节对齐的标准 AES 密文
 */
function cleanEncryptedData(encryptedData: Uint8Array): Uint8Array {
  let end = encryptedData.length;
  while (end > 0 && encryptedData[end - 1] === 0) {
    end--;
  }
  if (end % 16 !== 0) {
    end = Math.min(encryptedData.length, Math.ceil(end / 16) * 16);
  }
  return end > 0 && end < encryptedData.length ? encryptedData.subarray(0, end) : encryptedData;
}

/**
 * 解密 .plr 二进制数据 (优先 Web Crypto，异常时自动回退纯 TS 容错解密)
 */
export async function decryptPlr(rawEncryptedData: Uint8Array): Promise<Uint8Array> {
  if (rawEncryptedData.length < 16) {
    throw new AppError('FILE_EMPTY', '文件为空或体积过小，不是有效的 .plr 存档', {
      suggestion: '请确认选择了正确的 .plr 角色文件（通常大于 1 KB）。',
      context: { byteLength: rawEncryptedData.length },
    });
  }
  const encryptedData = cleanEncryptedData(rawEncryptedData);
  if (encryptedData.length === 0 || encryptedData.length % 16 !== 0) {
    throw new AppError('CRYPTO_FAILED', '存档密文长度不合法，无法解密', {
      suggestion: '文件可能不是加密的 .plr 存档，或已被截断损坏。',
      context: { rawLength: rawEncryptedData.length, cleanedLength: encryptedData.length },
    });
  }
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.subtle) {
    try {
      const key = await getKey("decrypt");
      const decrypted = await cryptoObj.subtle.decrypt(
        { name: "AES-CBC", iv: TERRARIA_AES_KEY_BYTES },
        key,
        encryptedData as any
      );
      return new Uint8Array(decrypted);
    } catch {
      return fallbackDecryptPlr(encryptedData);
    }
  }
  return fallbackDecryptPlr(encryptedData);
}

/**
 * 加密 .plr 二进制数据
 */
export async function encryptPlr(plainData: Uint8Array): Promise<Uint8Array> {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new AppError('CRYPTO_FAILED', '当前浏览环境未开放 Web Crypto 加密接口', {
      suggestion: '现代浏览器要求在 HTTPS 或 localhost 环境下才允许执行本地加密导出。',
    });
  }
  const key = await getKey("encrypt");
  const encrypted = await cryptoObj.subtle.encrypt(
    { name: "AES-CBC", iv: TERRARIA_AES_KEY_BYTES },
    key,
    plainData as any
  );
  return new Uint8Array(encrypted);
}
