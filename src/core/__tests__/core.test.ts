import { describe, it, expect } from 'vitest';
import { BinaryReader, BinaryWriter } from '../binary';
import { decryptPlr, encryptPlr } from '../crypto';
import { createDefaultPlayer, getMaxBuffIdForVersion, getMaxItemIdForVersion, parsePlr, sanitizePlayerForVersion, serializePlr } from '../plr';
import { AppError, formatDiagnosticReport, toAppError } from '../errors';

describe('BinaryReader & BinaryWriter', () => {
  it('round-trips primitives, 7-bit ints, and UTF-8 strings', () => {
    const w = new BinaryWriter();
    w.writeInt32(329);
    w.writeUInt8(3);
    w.writeBoolean(true);
    w.writeInt64(1234567890123n);
    w.writeString('秋穗冬華');
    w.writeRGB({ r: 249, g: 214, b: 219 });

    const r = new BinaryReader(w.toUint8Array());
    expect(r.readInt32()).toBe(329);
    expect(r.readUInt8()).toBe(3);
    expect(r.readBoolean()).toBe(true);
    expect(r.readInt64()).toBe(1234567890123n);
    expect(r.readString()).toBe('秋穗冬華');
    expect(r.readRGB()).toEqual({ r: 249, g: 214, b: 219 });
    expect(r.isEOF()).toBe(true);
  });

  it('throws AppError(TRUNCATED) instead of raw RangeError on short buffers', () => {
    const r = new BinaryReader(new Uint8Array([1, 2]));
    expect(() => r.readInt32()).toThrowError(AppError);
    try {
      new BinaryReader(new Uint8Array([1, 2])).readInt32();
    } catch (e) {
      expect((e as AppError).code).toBe('TRUNCATED');
    }
  });
});

describe('AES-128-CBC Crypto', () => {
  it('encrypts and decrypts standard and zero-padded XD buffers', async () => {
    const player = createDefaultPlayer('TestHero', 329);
    const plain = serializePlr(player, 329, 'xindong');
    const encrypted = await encryptPlr(plain);

    const padded = new Uint8Array(encrypted.length + 16);
    padded.set(encrypted, 0);

    const decrypted = await decryptPlr(padded);
    const parsed = parsePlr(decrypted);
    expect(parsed.name).toBe('TestHero');
    expect(new TextDecoder().decode(parsed.magic)).toBe('xindong');
  });

  it('rejects empty or undersized files with FILE_EMPTY', async () => {
    await expect(decryptPlr(new Uint8Array(8))).rejects.toMatchObject({ code: 'FILE_EMPTY' });
  });
});

describe('PLR Parser & Serializer', () => {
  it('preserves inventory, loadouts, buffs, and research across serialize -> parse', () => {
    const player = createDefaultPlayer('TerraTester', 329);
    player.inventory[0] = { id: 6196, stack: 99, prefix: 81, favorited: true };
    player.buffs[0] = { type: 26, time: 216000 };
    player.loadouts[1].armor[0] = { id: 4982, stack: 1, prefix: 0 };
    player.creativeUnlocks.push({ k: 'Zenith', v: 1 });

    const bytes = serializePlr(player, 329, 'xindong');
    const parsed = parsePlr(bytes);

    expect(parsed.version).toBe(329);
    expect(parsed.inventory[0]).toMatchObject({ id: 6196, stack: 99, prefix: 81, favorited: true });
    expect(parsed.buffs[0]).toEqual({ type: 26, time: 216000 });
    expect(parsed.loadouts[1].armor[0].id).toBe(4982);
    expect(parsed.creativeUnlocks).toContainEqual({ k: 'Zenith', v: 1 });
  });

  it('sanitizes out-of-range high-version items when downgrading to 1.4.4.9 (v279)', () => {
    const player = createDefaultPlayer('DowngradeHero', 326);
    player.inventory[0] = { id: 6192, stack: 99, prefix: 0 };
    player.inventory[1] = { id: 4956, stack: 1, prefix: 81 }; // Zenith (valid in 1.4.4.9)
    player.armor[0] = { id: 6185, stack: 1, prefix: 0 };
    player.loadouts[1].armor[0] = { id: 6166, stack: 1, prefix: 0 };

    const { player: cleaned, removedItems } = sanitizePlayerForVersion(player, 279, 'relogic');
    expect(removedItems).toBe(3);
    expect(cleaned.inventory[0].id).toBe(0);
    expect(cleaned.inventory[1].id).toBe(4956);
    expect(cleaned.armor[0].id).toBe(0);
    expect(cleaned.loadouts[1].armor[0].id).toBe(0);
    expect(player.inventory[0].id).toBe(6192);

    expect(getMaxItemIdForVersion(329, 'xindong')).toBe(6314);
    expect(getMaxItemIdForVersion(315)).toBe(6144);
    expect(getMaxItemIdForVersion(279)).toBe(5455);
    expect(getMaxItemIdForVersion(269)).toBe(5452);
    expect(getMaxItemIdForVersion(230)).toBe(5044);
    expect(getMaxItemIdForVersion(194)).toBe(3929);
    expect(getMaxItemIdForVersion(172)).toBe(3769);
    expect(getMaxItemIdForVersion(102)).toBe(2748);
    expect(getMaxItemIdForVersion(39)).toBe(603);
    expect(getMaxItemIdForVersion(22)).toBe(363);
    expect(getMaxItemIdForVersion(2)).toBe(234);

    // 1.3.0.1 / 1.3.2 之前负 ID 映射 (铜短剑 3507 -> -15, 蓝晶光刃 3769 -> -19)
    const legacyTest = createDefaultPlayer('LegacyHero', 329);
    legacyTest.inventory[0] = { id: 3507, stack: 1, prefix: 0 };
    legacyTest.inventory[1] = { id: 3769, stack: 1, prefix: 0 };
    const { player: legacyOut, removedItems: legacyRemoved } = sanitizePlayerForVersion(legacyTest, 102);
    expect(legacyRemoved).toBe(0);
    expect(legacyOut.inventory[0].id).toBe(-15);
    expect(legacyOut.inventory[1].id).toBe(-19);

    expect(getMaxBuffIdForVersion(329)).toBe(400);
    expect(getMaxBuffIdForVersion(279)).toBe(354);
    expect(getMaxBuffIdForVersion(194)).toBe(205);
    expect(getMaxBuffIdForVersion(102)).toBe(139);
  });

  it('detects .wld world files and invalid magic headers', () => {
    const w = new BinaryWriter();
    w.writeInt32(329);
    w.writeBytes(new TextEncoder().encode('relogic'));
    w.writeUInt8(2); // World fileType = 2

    expect(() => parsePlr(w.toUint8Array())).toThrowError(AppError);
    try {
      parsePlr(w.toUint8Array());
    } catch (e) {
      expect((e as AppError).code).toBe('FILE_FORMAT');
      expect((e as AppError).title).toContain('.wld');
    }
  });
});

describe('Error & Diagnostic Formatting', () => {
  it('wraps unknown errors and formats diagnostic report', () => {
    const appErr = toAppError(new Error('boom'), { code: 'UNEXPECTED', title: '意外错误', context: { fileName: 'a.plr' } });
    const report = formatDiagnosticReport(appErr, { targetVersion: 329 });
    expect(report).toContain('UNEXPECTED');
    expect(report).toContain('boom');
    expect(report).toContain('a.plr');
    expect(report).toContain('329');
  });
});
