import { describe, expect, it } from "vitest";
import { BinaryWriter } from "../binary";
import { AppError } from "../errors";
import type { EditionType } from "../plr";
import { buildPatchedWldBlob, formatFileSize, parseWldHeader } from "../wld";

function buildMockWldBytes(opts: {
  version: number;
  edition: EditionType;
  fileType?: number;
  revision?: number;
  isFavorite?: boolean;
  worldName: string;
  seed?: string;
  worldId?: number;
  maxTilesX: number;
  maxTilesY: number;
  gameMode: number;
}): Uint8Array {
  const headerWriter = new BinaryWriter();
  headerWriter.writeString(opts.worldName);
  if (opts.version >= 179) {
    headerWriter.writeString(opts.seed ?? "");
    headerWriter.writeUInt64(0x0001000400040009n);
  }
  if (opts.version >= 181) {
    headerWriter.writeBytes(new Uint8Array(16).fill(0xab));
  }
  headerWriter.writeInt32(opts.worldId ?? 123456789);
  headerWriter.writeInt32(0);
  headerWriter.writeInt32(opts.maxTilesX * 16);
  headerWriter.writeInt32(0);
  headerWriter.writeInt32(opts.maxTilesY * 16);
  headerWriter.writeInt32(opts.maxTilesY);
  headerWriter.writeInt32(opts.maxTilesX);
  if (opts.version >= 209) {
    headerWriter.writeInt32(opts.gameMode);
  } else if (opts.version >= 112) {
    headerWriter.writeBoolean(opts.gameMode === 1);
  }
  const section1 = headerWriter.toUint8Array();

  const sectionCount = 11;
  const section1Offset = 26 + sectionCount * 4;

  const w = new BinaryWriter();
  w.writeInt32(opts.version);
  w.writeBytes(new TextEncoder().encode(opts.edition));
  w.writeUInt8(opts.fileType ?? 2);
  w.writeUInt32(opts.revision ?? 5);
  w.writeUInt64(opts.isFavorite ? 1n : 0n);
  w.writeInt16(sectionCount);
  w.writeInt32(section1Offset);
  for (let i = 1; i < sectionCount; i++) {
    w.writeInt32(section1Offset + section1.length + i * 4);
  }
  w.writeBytes(section1);
  // 模拟尾部区块字节
  w.writeBytes(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  return w.toUint8Array();
}

describe("wld header parser & signature patcher", () => {
  it("parses v279 relogic medium master world header correctly", () => {
    const bytes = buildMockWldBytes({
      version: 279,
      edition: "relogic",
      revision: 12,
      isFavorite: true,
      worldName: "Sakura Haven",
      seed: "for the worthy",
      worldId: 987654,
      maxTilesX: 6400,
      maxTilesY: 1800,
      gameMode: 2,
    });

    const info = parseWldHeader(bytes, "Sakura_Haven.wld", bytes.length);
    expect(info.version).toBe(279);
    expect(info.edition).toBe("relogic");
    expect(info.magicOffset).toBe(4);
    expect(info.fileType).toBe(2);
    expect(info.revision).toBe(12);
    expect(info.isFavorite).toBe(true);
    expect(info.worldName).toBe("Sakura Haven");
    expect(info.seed).toBe("for the worthy");
    expect(info.worldId).toBe(987654);
    expect(info.maxTilesX).toBe(6400);
    expect(info.maxTilesY).toBe(1800);
    expect(info.sizeLabel).toBe("中世界");
    expect(info.gameMode).toBe(2);
    expect(info.gameModeLabel).toBe("大师模式");
  });

  it("parses v329 xindong large journey world and v194 small expert world", () => {
    const v329 = buildMockWldBytes({
      version: 329,
      edition: "xindong",
      worldName: "心动大世界",
      seed: "celebrationmk10",
      maxTilesX: 8400,
      maxTilesY: 2400,
      gameMode: 3,
    });
    const info329 = parseWldHeader(v329, "xd.wld", v329.length);
    expect(info329.version).toBe(329);
    expect(info329.edition).toBe("xindong");
    expect(info329.worldName).toBe("心动大世界");
    expect(info329.sizeLabel).toBe("大世界");
    expect(info329.gameModeLabel).toBe("旅途模式");

    const v194 = buildMockWldBytes({
      version: 194,
      edition: "relogic",
      worldName: "Classic135",
      seed: "12345",
      maxTilesX: 4200,
      maxTilesY: 1200,
      gameMode: 1,
    });
    const info194 = parseWldHeader(v194, "c135.wld", v194.length);
    expect(info194.version).toBe(194);
    expect(info194.sizeLabel).toBe("小世界");
    expect(info194.gameMode).toBe(1);
    expect(info194.gameModeLabel).toBe("专家模式");
  });

  it("rejects .plr files and invalid buffers", () => {
    const plrLike = buildMockWldBytes({
      version: 279,
      edition: "relogic",
      fileType: 3,
      worldName: "NotAWorld",
      maxTilesX: 4200,
      maxTilesY: 1200,
      gameMode: 0,
    });
    expect(() => parseWldHeader(plrLike, "char.plr", plrLike.length)).toThrowError(AppError);

    const garbage = new Uint8Array(64).fill(0xaa);
    expect(() => parseWldHeader(garbage, "bad.wld", garbage.length)).toThrowError(AppError);
  });

  it("patches only the 7-byte magic signature while keeping exact byte length and payload", async () => {
    const orig = buildMockWldBytes({
      version: 279,
      edition: "relogic",
      worldName: "Bridge World",
      seed: "5162020",
      maxTilesX: 4200,
      maxTilesY: 1200,
      gameMode: 0,
    });
    const origBlob = new Blob([orig.slice().buffer], { type: "application/octet-stream" });

    const toChina = buildPatchedWldBlob(origBlob, 4, "xindong");
    const chinaBytes = new Uint8Array(await toChina.arrayBuffer());
    expect(chinaBytes.length).toBe(orig.length);
    expect(new TextDecoder().decode(chinaBytes.subarray(4, 11))).toBe("xindong");
    expect(chinaBytes.subarray(0, 4)).toEqual(orig.subarray(0, 4));
    expect(chinaBytes.subarray(11)).toEqual(orig.subarray(11));

    const chinaParsed = parseWldHeader(chinaBytes, "Bridge.wld", chinaBytes.length);
    expect(chinaParsed.edition).toBe("xindong");
    expect(chinaParsed.worldName).toBe("Bridge World");

    const backToGlobal = buildPatchedWldBlob(toChina, 4, "relogic");
    const globalBytes = new Uint8Array(await backToGlobal.arrayBuffer());
    expect(globalBytes).toEqual(orig);
  });

  it("formats file sizes cleanly", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(15 * 1024 * 1024)).toBe("15.00 MB");
  });
});
