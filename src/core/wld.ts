import { BinaryReader } from "./binary";
import { AppError } from "./errors";
import type { EditionType } from "./plr";

export const WLD_HEADER_SLICE_BYTES = 65536;

const SIG_GLOBAL_BYTES = new Uint8Array([0x72, 0x65, 0x6c, 0x6f, 0x67, 0x69, 0x63]); // relogic
const SIG_CHINA_BYTES = new Uint8Array([0x78, 0x69, 0x6e, 0x64, 0x6f, 0x6e, 0x67]); // xindong

export interface WldHeaderInfo {
  fileName: string;
  fileSize: number;
  version: number;
  edition: EditionType | "unknown";
  magicOffset: number;
  rawMagic: string;
  fileType: number;
  revision: number;
  isFavorite: boolean;
  sectionCount: number;
  worldName: string | null;
  seed: string | null;
  worldId: number | null;
  maxTilesX: number | null;
  maxTilesY: number | null;
  sizeLabel: string | null;
  gameMode: number | null;
  gameModeLabel: string | null;
}

function matchSequenceAt(source: Uint8Array, target: Uint8Array, offset: number): boolean {
  if (offset < 0 || offset + target.length > source.length) return false;
  for (let i = 0; i < target.length; i++) {
    if (source[offset + i] !== target[i]) return false;
  }
  return true;
}

function indexOfSequence(source: Uint8Array, target: Uint8Array, maxStart: number): number {
  const limit = Math.min(source.length - target.length, maxStart);
  for (let i = 0; i <= limit; i++) {
    if (matchSequenceAt(source, target, i)) return i;
  }
  return -1;
}

function getWorldSizeLabel(maxTilesX: number | null, maxTilesY: number | null): string | null {
  if (!maxTilesX || !maxTilesY || maxTilesX <= 0 || maxTilesY <= 0) return null;
  if (maxTilesX === 4200 && maxTilesY === 1200) return "小世界";
  if (maxTilesX === 6400 && maxTilesY === 1800) return "中世界";
  if (maxTilesX === 8400 && maxTilesY === 2400) return "大世界";
  return "自定义尺寸";
}

function getGameModeLabel(gameMode: number | null): string | null {
  switch (gameMode) {
    case 0:
      return "经典模式";
    case 1:
      return "专家模式";
    case 2:
      return "大师模式";
    case 3:
      return "旅途模式";
    default:
      return null;
  }
}

/**
 * 解析 .wld 地图文件头部与基础世界元数据（仅需文件前 64KB 切片）
 */
export function parseWldHeader(
  bytes: Uint8Array,
  fileName: string,
  fileSize: number
): WldHeaderInfo {
  if (bytes.length < 16) {
    throw new AppError("FILE_FORMAT", "文件过小，不是有效的 .wld 地图存档", {
      context: { fileName, fileSize, headerBytes: bytes.length },
    });
  }

  let magicOffset = -1;
  let edition: EditionType | "unknown" = "unknown";
  let rawMagic = "";

  if (matchSequenceAt(bytes, SIG_GLOBAL_BYTES, 4)) {
    magicOffset = 4;
    edition = "relogic";
    rawMagic = "relogic";
  } else if (matchSequenceAt(bytes, SIG_CHINA_BYTES, 4)) {
    magicOffset = 4;
    edition = "xindong";
    rawMagic = "xindong";
  } else {
    const glIdx = indexOfSequence(bytes, SIG_GLOBAL_BYTES, 64);
    const chIdx = indexOfSequence(bytes, SIG_CHINA_BYTES, 64);
    if (glIdx >= 0 && (chIdx < 0 || glIdx < chIdx)) {
      magicOffset = glIdx;
      edition = "relogic";
      rawMagic = "relogic";
    } else if (chIdx >= 0) {
      magicOffset = chIdx;
      edition = "xindong";
      rawMagic = "xindong";
    }
  }

  if (magicOffset < 0) {
    throw new AppError("FILE_FORMAT", "未在文件头中检测到 relogic / xindong 签名", {
      suggestion:
        "请确认选择的是泰拉瑞亚 1.3+ 正式地图存档 (.wld)，而非加密角色存档 (.plr) 或旧版压缩文件。",
      context: { fileName, fileSize },
    });
  }

  const reader = new BinaryReader(bytes);
  const version = magicOffset === 4 ? reader.readInt32() : 0;
  const fileType = magicOffset + 7 < bytes.length ? bytes[magicOffset + 7] : 0;

  if (fileType === 3) {
    throw new AppError("FILE_FORMAT", "检测到这可能是角色存档 (.plr)", {
      suggestion: "请切换到顶栏的「角色存档」工具打开 .plr 文件。",
      context: { fileName, fileSize, rawMagic, fileType },
    });
  }

  let revision = 0;
  let isFavorite = false;
  let sectionCount = 0;
  let worldName: string | null = null;
  let seed: string | null = null;
  let worldId: number | null = null;
  let maxTilesX: number | null = null;
  let maxTilesY: number | null = null;
  let gameMode: number | null = null;

  if (magicOffset === 4 && bytes.length >= 26) {
    reader.pos = 12;
    revision = reader.readUInt32();
    const flags = reader.readUInt64();
    isFavorite = (flags & 1n) !== 0n;
    sectionCount = reader.readInt16();

    try {
      if (sectionCount >= 1 && sectionCount <= 64 && 26 + sectionCount * 4 <= bytes.length) {
        reader.pos = 26;
        const headerSectionOffset = reader.readInt32();
        if (headerSectionOffset > 0 && headerSectionOffset < bytes.length) {
          reader.pos = headerSectionOffset;
          worldName = reader.readString();
          if (version >= 179) {
            seed = reader.readString();
            reader.readUInt64(); // generatorVersion
          }
          if (version >= 181) {
            reader.readBytes(16); // UUID
          }
          worldId = reader.readInt32();
          // 左/右/顶/底 世界像素边界 (4 x int32)
          reader.readInt32();
          reader.readInt32();
          reader.readInt32();
          reader.readInt32();
          maxTilesY = reader.readInt32();
          maxTilesX = reader.readInt32();

          if (version >= 209) {
            gameMode = reader.readInt32();
          } else if (version >= 112) {
            gameMode = reader.readBoolean() ? 1 : 0;
          }
        }
      }
    } catch {
      // 非常规或未来版本头字段变化时不阻断签名互转
    }
  }

  return {
    fileName,
    fileSize,
    version,
    edition,
    magicOffset,
    rawMagic,
    fileType,
    revision,
    isFavorite,
    sectionCount,
    worldName,
    seed,
    worldId,
    maxTilesX,
    maxTilesY,
    sizeLabel: getWorldSizeLabel(maxTilesX, maxTilesY),
    gameMode,
    gameModeLabel: getGameModeLabel(gameMode),
  };
}

/**
 * 零拷贝切片重组 .wld 文件，仅替换 7 字节发行版签名
 */
export function buildPatchedWldBlob(
  file: Blob,
  magicOffset: number,
  targetEdition: EditionType
): Blob {
  if (magicOffset < 0) {
    return file;
  }
  const targetBytes = targetEdition === "xindong" ? SIG_CHINA_BYTES : SIG_GLOBAL_BYTES;
  return new Blob(
    [file.slice(0, magicOffset), targetBytes, file.slice(magicOffset + 7)],
    { type: "application/octet-stream" }
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
