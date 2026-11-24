import { BinaryReader, BinaryWriter } from "./binary";
import { AppError } from "./errors";

export interface ItemData {
  id: number;
  stack: number;
  prefix: number;
  favorited?: boolean;
}

export interface ColorData {
  r: number;
  g: number;
  b: number;
}

export interface LoadoutData {
  armor: ItemData[]; // 20 格 (0-9 装备与饰品, 10-19 时装)
  dye: ItemData[];   // 10 格 染料
  hide: boolean[];   // 10 个可见性开关
}

export interface SpawnPoint {
  sx: number;
  sy: number;
  wid: number;
  sname: string;
}

export interface CreativePowerData {
  id: number;
  type: "bool" | "float";
  val: boolean | number;
}

export type EditionType = "relogic" | "xindong";

export interface EditionInfo {
  id: EditionType;
  label: string;
  magic: string;
  desc: string;
}

export const SUPPORTED_EDITIONS: EditionInfo[] = [
  { id: "relogic", label: "国际服 (Re-Logic)", magic: "relogic", desc: "Steam / GOG 官方国际版" },
  { id: "xindong", label: "国服 (心动网络 XD)", magic: "xindong", desc: "国内心动官方代理版" }
];

export interface VersionItem {
  version: number;
  gameVersion: string;
  desc?: string;
  highlight?: boolean;
}

export interface VersionGroup {
  group: string; // "1.4.x", "1.3.x", "1.2.x", "1.1.x"
  desc: string;
  versions: VersionItem[];
}

/**
 * 泰拉瑞亚全版本定义库 (共 88 个正式发行版本)
 */
export const VERSION_GROUPS: VersionGroup[] = [
  {
    group: "1.4.x",
    desc: "旅途的终点及后续大更新 (共 40 个版本，包含 Loadouts 配置与微光)",
    versions: [
      { version: 329, gameVersion: "1.4.6", highlight: true },
      { version: 326, gameVersion: "1.4.5.8" },
      { version: 325, gameVersion: "1.4.5.7" },
      { version: 319, gameVersion: "1.4.5.6" },
      { version: 318, gameVersion: "1.4.5.5" },
      { version: 317, gameVersion: "1.4.5.4" },
      { version: 316, gameVersion: "1.4.5.3" },
      { version: 315, gameVersion: "1.4.5.2" },
      { version: 315, gameVersion: "1.4.5.1" },
      { version: 315, gameVersion: "1.4.5.0" },
      { version: 279, gameVersion: "1.4.4.9", desc: "1.4.4 最终官方主流稳定版 (强烈推荐)", highlight: true },
      { version: 278, gameVersion: "1.4.4.8.1" },
      { version: 277, gameVersion: "1.4.4.8" },
      { version: 276, gameVersion: "1.4.4.7" },
      { version: 275, gameVersion: "1.4.4.6" },
      { version: 274, gameVersion: "1.4.4.5" },
      { version: 273, gameVersion: "1.4.4.4" },
      { version: 272, gameVersion: "1.4.4.3" },
      { version: 271, gameVersion: "1.4.4.2" },
      { version: 270, gameVersion: "1.4.4.1" },
      { version: 269, gameVersion: "1.4.4", desc: "1.4.4 劳模更新首发 (引入 3 套独立装备配置)", highlight: true },
      { version: 248, gameVersion: "1.4.3.6", desc: "饥荒联动更新终版 (永恒领域、独眼巨鹿)", highlight: true },
      { version: 247, gameVersion: "1.4.3.5" },
      { version: 246, gameVersion: "1.4.3.4" },
      { version: 245, gameVersion: "1.4.3.3" },
      { version: 244, gameVersion: "1.4.3.2" },
      { version: 243, gameVersion: "1.4.3.1" },
      { version: 242, gameVersion: "1.4.3" },
      { version: 238, gameVersion: "1.4.2.3" },
      { version: 237, gameVersion: "1.4.2.2" },
      { version: 236, gameVersion: "1.4.2.1" },
      { version: 235, gameVersion: "1.4.2" },
      { version: 234, gameVersion: "1.4.1.2" },
      { version: 233, gameVersion: "1.4.1.1" },
      { version: 232, gameVersion: "1.4.1" },
      { version: 230, gameVersion: "1.4.0.5", desc: "1.4.0 旅途的终点首发稳定版", highlight: true },
      { version: 228, gameVersion: "1.4.0.4" },
      { version: 227, gameVersion: "1.4.0.3" },
      { version: 226, gameVersion: "1.4.0.2" },
      { version: 225, gameVersion: "1.4.0.1", desc: "1.4 首发 (引入旅途模式、虚空保险库与高尔夫)", highlight: true }
    ]
  },
  {
    group: "1.3.x",
    desc: "月亮领主大更新时代 (共 25 个版本)",
    versions: [
      { version: 194, gameVersion: "1.3.5.3", desc: "1.3 最终经典主流版 (多语言支持与超宽屏)", highlight: true },
      { version: 193, gameVersion: "1.3.5.2" },
      { version: 192, gameVersion: "1.3.5.1" },
      { version: 191, gameVersion: "1.3.5" },
      { version: 188, gameVersion: "1.3.4.4" },
      { version: 187, gameVersion: "1.3.4.3" },
      { version: 186, gameVersion: "1.3.4.2" },
      { version: 185, gameVersion: "1.3.4.1" },
      { version: 184, gameVersion: "1.3.4", desc: "地牢守护者 2 联动 (引入护卫熔炉)", highlight: true },
      { version: 177, gameVersion: "1.3.3.3" },
      { version: 176, gameVersion: "1.3.3.2" },
      { version: 176, gameVersion: "1.3.3.1" },
      { version: 175, gameVersion: "1.3.3" },
      { version: 173, gameVersion: "1.3.2.1" },
      { version: 172, gameVersion: "1.3.2" },
      { version: 169, gameVersion: "1.3.1.1" },
      { version: 168, gameVersion: "1.3.1" },
      { version: 156, gameVersion: "1.3.0.8" },
      { version: 155, gameVersion: "1.3.0.7" },
      { version: 154, gameVersion: "1.3.0.6" },
      { version: 153, gameVersion: "1.3.0.5" },
      { version: 151, gameVersion: "1.3.0.4" },
      { version: 149, gameVersion: "1.3.0.3" },
      { version: 147, gameVersion: "1.3.0.2" },
      { version: 146, gameVersion: "1.3.0.1", desc: "1.3 首发大更新 (月亮领主、专家模式与溜溜球)", highlight: true }
    ]
  },
  {
    group: "1.2.x",
    desc: "世纪之花与神庙时代 (共 13 个版本)",
    versions: [
      { version: 102, gameVersion: "1.2.4.1", desc: "1.2 最终版 (猪鲨公爵与钓鱼系统)", highlight: true },
      { version: 101, gameVersion: "1.2.4" },
      { version: 94, gameVersion: "1.2.3.1" },
      { version: 93, gameVersion: "1.2.3" },
      { version: 77, gameVersion: "1.2.2" },
      { version: 73, gameVersion: "1.2.1.2" },
      { version: 73, gameVersion: "1.2.1.1" },
      { version: 72, gameVersion: "1.2.1" },
      { version: 71, gameVersion: "1.2.0.3.1" },
      { version: 70, gameVersion: "1.2.0.3" },
      { version: 69, gameVersion: "1.2.0.2" },
      { version: 68, gameVersion: "1.2.0.1" },
      { version: 67, gameVersion: "1.2", desc: "1.2 经典大更新 (肉后革新、世纪之花与蜂后)", highlight: true }
    ]
  },
  {
    group: "1.1.x",
    desc: "血肉墙与肉山后时代 (共 3 个版本)",
    versions: [
      { version: 39, gameVersion: "1.1.2", desc: "1.1 经典肉后终版 (机械三王与神圣之地)", highlight: true },
      { version: 37, gameVersion: "1.1.1" },
      { version: 36, gameVersion: "1.1" }
    ]
  },
  {
    group: "1.0.x",
    desc: "泰拉瑞亚最初创世版本 (共 8 个版本)",
    versions: [
      { version: 22, gameVersion: "1.0.6.1", desc: "1.0 经典终版", highlight: true },
      { version: 20, gameVersion: "1.0.6" },
      { version: 12, gameVersion: "1.0.5" },
      { version: 9, gameVersion: "1.0.4" },
      { version: 4, gameVersion: "1.0.3" },
      { version: 3, gameVersion: "1.0.2" },
      { version: 2, gameVersion: "1.0.1" },
      { version: 38, gameVersion: "1.0" }
    ]
  }
];

export const ALL_VERSIONS: VersionItem[] = VERSION_GROUPS.flatMap(g => g.versions);

export interface VersionInfo {
  version: number;
  label: string;
  desc: string;
}

export const SUPPORTED_VERSIONS: VersionInfo[] = ALL_VERSIONS.map(v => ({
  version: v.version,
  label: `${v.gameVersion} (v${v.version})`,
  desc: v.desc || ""
}));

export function findVersionInfo(versionNumber: number): { label: string; gameVersion: string; group: string; isExact: boolean } {
  const exact = ALL_VERSIONS.find(v => v.version === versionNumber);
  if (exact) {
    const grp = VERSION_GROUPS.find(g => g.versions.some(v => v.version === versionNumber))?.group || "";
    return { label: `v${versionNumber} (${exact.gameVersion})`, gameVersion: exact.gameVersion, group: grp, isExact: true };
  }
  const sorted = [...ALL_VERSIONS].sort((a, b) => b.version - a.version);
  const match = sorted.find(v => versionNumber >= v.version) || sorted[sorted.length - 1];
  return {
    label: `v${versionNumber} (${match.gameVersion}+)`,
    gameVersion: match.gameVersion + "+",
    group: VERSION_GROUPS.find(g => g.versions.some(v => v.version === match.version))?.group || "",
    isExact: false,
  };
}

export interface PlayerData {
  // 头部元数据
  version: number;
  magic: Uint8Array;
  fileType: number;
  revision: number;
  isFavorite: bigint;

  // 基础身份
  name: string;
  difficulty: number; // 0=经典, 1=中核, 2=硬核, 3=旅途
  playTime: bigint;

  // 外观与体型
  hair: number;
  hairDye: number;
  team: number;
  hideVisual1: number;
  hideVisual2: number;
  hideMisc: number;
  skinVariant: number;

  // 核心数值
  statLife: number;
  statLifeMax: number;
  statMana: number;
  statManaMax: number;

  // 永久状态与增益开关
  extraAccessory: boolean;
  unlockedBiomeTorches: boolean;
  usingBiomeTorches: boolean;
  ateArtisanBread: boolean;
  v324Flag: boolean;
  aegisCrystal: boolean;
  aegisFruit: boolean;
  arcaneCrystal: boolean;
  galaxyPearl: boolean;
  gummyWorm: boolean;
  ambrosia: boolean;
  finishedDD2: boolean;
  taxMoney: number;
  pveDeaths: number;
  pvpDeaths: number;

  // 7 处部位调色
  hairColor: ColorData;
  skinColor: ColorData;
  eyeColor: ColorData;
  shirtColor: ColorData;
  underShirtColor: ColorData;
  pantsColor: ColorData;
  shoeColor: ColorData;

  // 装备与背包体系
  armor: ItemData[];       // 20 格 (0-9 当前配置生效装备与饰品, 10-19 时装)
  dye: ItemData[];         // 10 格 当前配置生效染料
  inventory: ItemData[];   // 58 格 (0-49 常用背包, 50-53 钱币, 54-57 弹药)
  miscEquips: ItemData[];  // 5 格 (坐骑, 矿车, 宠物, 照明宠物, 钩爪)
  miscDyes: ItemData[];    // 5 格 对应特殊装备染料

  // 四大个人仓库 (各 40 格)
  bank: ItemData[];        // 猪猪存钱罐
  bank2: ItemData[];       // 保险箱
  bank3: ItemData[];       // 护卫熔炉
  bank4: ItemData[];       // 虚空保险库
  voidVaultByte: number;

  // 状态增益与出生点
  buffs: { type: number; time: number }[];
  spawns: SpawnPoint[];

  // 辅助与状态标记
  hbLocked: boolean;
  hideInfo: boolean[];
  anglerQuestsFinished: number;
  dpad: number[];
  builderAcc: number[];
  bartender: number;
  dead: boolean;
  respawnTimer: number;
  lastSaved: bigint;
  golferScore: number;

  // 旅途模式与暂存栏
  crFlag: boolean;
  creativeUnlocks: { k: string; v: number }[];
  tempBitmask: number;
  tempItems: ItemData[];
  creativePowers: CreativePowerData[];
  superCart: number;

  // 三套独立装备配置 (Loadouts 1 / 2 / 3)
  currentLoadoutIndex: number;
  loadouts: LoadoutData[];

  // 语音与冷门字段
  voiceVariant: number;
  voicePitch: number;
  refunds: ItemData[];
  dialogues: string[];
}

/**
 * 将解密后的二进制 Uint8Array 解析为类型化的 PlayerData
 */
export function parsePlr(buffer: Uint8Array): PlayerData {
  const r = new BinaryReader(buffer);

  const version = r.readInt32();
  const magic = r.readBytes(7);
  const magicStr = new TextDecoder().decode(magic);
  if (magicStr !== "relogic" && magicStr !== "xindong") {
    throw new AppError(
      'FILE_FORMAT',
      '不是有效的泰拉瑞亚角色存档',
      {
        suggestion: '请确认上传的是游戏 Players 目录下的 .plr 文件，而非 .plr.bak2、图片或其他无关文件。',
        context: { version, magicHex: Array.from(magic).map((b) => b.toString(16).padStart(2, '0')).join(' ') },
      },
      `文件标识为 "${magicStr}"，预期为 "relogic" 或 "xindong"`
    );
  }
  const fileType = r.readUInt8();
  if (fileType !== 3) {
    const isWorld = fileType === 2;
    throw new AppError(
      'FILE_FORMAT',
      isWorld ? '检测到这可能是地图存档 (.wld)' : '存档文件类型不匹配',
      {
        suggestion: isWorld
          ? '本编辑器仅支持修改角色存档 (.plr)；如需转换地图签名，请点击主界面向导中的“签名互转”工具。'
          : '请确认上传的是角色存档 (.plr) 文件。',
        context: { version, magicStr, fileType },
      },
      `类型码为 ${fileType}，预期为 3`
    );
  }
  const revision = r.readUInt32();
  const isFavorite = r.readUInt64();

  const name = r.readString();
  const difficulty = r.readUInt8();
  const playTime = r.readInt64();

  const hair = r.readInt32();
  const hairDye = r.readUInt8();
  let team = 0;
  if (version >= 283) {
    team = r.readUInt8();
  }
  const hideVisual1 = r.readUInt8();
  const hideVisual2 = r.readUInt8();
  const hideMisc = r.readUInt8();
  const skinVariant = r.readUInt8();

  const statLife = r.readInt32();
  const statLifeMax = r.readInt32();
  const statMana = r.readInt32();
  const statManaMax = r.readInt32();

  const extraAccessory = r.readBoolean();
  const unlockedBiomeTorches = r.readBoolean();
  const usingBiomeTorches = r.readBoolean();
  const ateArtisanBread = r.readBoolean();
  let v324Flag = false;
  if (version >= 324) {
    v324Flag = r.readBoolean();
  }
  const aegisCrystal = r.readBoolean();
  const aegisFruit = r.readBoolean();
  const arcaneCrystal = r.readBoolean();
  const galaxyPearl = r.readBoolean();
  const gummyWorm = r.readBoolean();
  const ambrosia = r.readBoolean();
  const finishedDD2 = r.readBoolean();
  const taxMoney = r.readInt32();
  const pveDeaths = r.readInt32();
  const pvpDeaths = r.readInt32();

  const hairColor = r.readRGB();
  const skinColor = r.readRGB();
  const eyeColor = r.readRGB();
  const shirtColor = r.readRGB();
  const underShirtColor = r.readRGB();
  const pantsColor = r.readRGB();
  const shoeColor = r.readRGB();

  const readEquip = (hasFav: boolean): ItemData => {
    const id = r.readInt32();
    const prefix = r.readUInt8();
    let favorited = false;
    if (hasFav) favorited = r.readBoolean();
    return { id, stack: 1, prefix, favorited };
  };

  const readItemWithStack = (hasFav: boolean): ItemData => {
    const id = r.readInt32();
    const stack = r.readInt32();
    const prefix = r.readUInt8();
    let favorited = false;
    if (hasFav) favorited = r.readBoolean();
    return { id, stack, prefix, favorited };
  };

  // 顶层装备 (20 防具/饰品 + 10 染料)
  const armor: ItemData[] = [];
  for (let i = 0; i < 20; i++) armor.push(readEquip(version >= 322));

  const dye: ItemData[] = [];
  for (let i = 0; i < 10; i++) dye.push(readEquip(version >= 322));

  // 主背包 (58 格)
  const inventory: ItemData[] = [];
  for (let i = 0; i < 58; i++) inventory.push(readItemWithStack(true));

  // 特殊装备与染料 (5 对交错存储)
  const miscEquips: ItemData[] = [];
  const miscDyes: ItemData[] = [];
  for (let i = 0; i < 5; i++) {
    miscEquips.push(readEquip(false));
    miscDyes.push(readEquip(false));
  }

  // 四大个人仓库 (各 40 格)
  const bank: ItemData[] = [];
  for (let i = 0; i < 40; i++) bank.push(readItemWithStack(false));
  const bank2: ItemData[] = [];
  for (let i = 0; i < 40; i++) bank2.push(readItemWithStack(false));

  const bank3: ItemData[] = [];
  if (version >= 182) {
    for (let i = 0; i < 40; i++) bank3.push(readItemWithStack(false));
  } else {
    for (let i = 0; i < 40; i++) bank3.push({ id: 0, stack: 0, prefix: 0 });
  }

  const bank4: ItemData[] = [];
  if (version >= 198) {
    for (let i = 0; i < 40; i++) bank4.push(readItemWithStack(version >= 255));
  } else {
    for (let i = 0; i < 40; i++) bank4.push({ id: 0, stack: 0, prefix: 0 });
  }
  const voidVaultByte = version >= 253 ? r.readUInt8() : 0;

  // 增益 Buff
  const buffCount = version >= 252 ? 44 : (version < 74 ? 10 : 22);
  const buffs: { type: number; time: number }[] = [];
  for (let i = 0; i < buffCount; i++) {
    buffs.push({ type: r.readInt32(), time: r.readInt32() });
  }
  // 补齐 44 个供内存编辑
  while (buffs.length < 44) {
    buffs.push({ type: 0, time: 0 });
  }

  // 出生点 (最多 200 个，以 sx = -1 结尾)
  const spawns: SpawnPoint[] = [];
  for (let i = 0; i < 200; i++) {
    const sx = r.readInt32();
    if (sx === -1) break;
    spawns.push({ sx, sy: r.readInt32(), wid: r.readInt32(), sname: r.readString() });
  }

  const hbLocked = r.readBoolean();
  const hideInfo: boolean[] = [];
  for (let i = 0; i < 13; i++) hideInfo.push(r.readBoolean());
  const anglerQuestsFinished = r.readInt32();
  const dpad: number[] = [];
  for (let i = 0; i < 4; i++) dpad.push(r.readInt32());
  const builderAcc: number[] = [];
  for (let i = 0; i < 12; i++) builderAcc.push(r.readInt32());
  const bartender = r.readInt32();
  const dead = r.readBoolean();
  let respawnTimer = 0;
  if (dead) respawnTimer = r.readInt32();
  const lastSaved = r.readInt64();
  const golferScore = r.readInt32();

  let crFlag = false;
  const creativeUnlocks: { k: string; v: number }[] = [];
  if (version >= 218) {
    if (version >= 282) {
      crFlag = r.readBoolean();
    }
    const count = r.readInt32();
    for (let i = 0; i < count; i++) {
      creativeUnlocks.push({ k: r.readString(), v: r.readInt32() });
    }
  }

  const tempBitmask = r.readUInt8();
  const tempItems: ItemData[] = [];
  for (let i = 0; i < 4; i++) {
    if ((tempBitmask & (1 << i)) !== 0) tempItems.push(readItemWithStack(false));
  }

  const creativePowers: CreativePowerData[] = [];
  if (version >= 220) {
    while (r.readBoolean()) {
      const powId = r.readUInt16();
      if (powId === 5 || powId === 11) {
        creativePowers.push({ id: powId, type: "bool", val: r.readBoolean() });
      } else if (powId === 14) {
        creativePowers.push({ id: powId, type: "float", val: r.readFloat() });
      }
    }
  }

  const superCart = version >= 253 ? r.readUInt8() : 0;
  let currentLoadoutIndex = 0;
  const loadouts: LoadoutData[] = [];
  if (version >= 262) {
    currentLoadoutIndex = r.readInt32();
    for (let l = 0; l < 3; l++) {
      const lArmor: ItemData[] = [];
      for (let i = 0; i < 20; i++) lArmor.push(readItemWithStack(version >= 322));
      const lDye: ItemData[] = [];
      for (let i = 0; i < 10; i++) lDye.push(readItemWithStack(version >= 322));
      const lHide: boolean[] = [];
      for (let i = 0; i < 10; i++) lHide.push(r.readBoolean());
      loadouts.push({ armor: lArmor, dye: lDye, hide: lHide });
    }
  } else {
    // 低于 262 版本创建 3 套空配置占位
    for (let l = 0; l < 3; l++) {
      loadouts.push({
        armor: Array.from({ length: 20 }, () => ({ id: 0, stack: 0, prefix: 0 })),
        dye: Array.from({ length: 10 }, () => ({ id: 0, stack: 0, prefix: 0 })),
        hide: Array(10).fill(false)
      });
    }
  }

  const voiceVariant = version >= 280 ? r.readUInt8() : 0;
  const voicePitch = version >= 281 ? r.readFloat() : 0;
  const refunds: ItemData[] = [];
  if (version >= 300) {
    const count = r.readInt32();
    for (let i = 0; i < count; i++) refunds.push(readItemWithStack(false));
  }
  const dialogues: string[] = [];
  if (version >= 310) {
    const count = r.readInt32();
    for (let i = 0; i < count; i++) dialogues.push(r.readString());
  }

  return {
    version,
    magic,
    fileType,
    revision,
    isFavorite,
    name,
    difficulty,
    playTime,
    hair,
    hairDye,
    team,
    hideVisual1,
    hideVisual2,
    hideMisc,
    skinVariant,
    statLife,
    statLifeMax,
    statMana,
    statManaMax,
    extraAccessory,
    unlockedBiomeTorches,
    usingBiomeTorches,
    ateArtisanBread,
    v324Flag,
    aegisCrystal,
    aegisFruit,
    arcaneCrystal,
    galaxyPearl,
    gummyWorm,
    ambrosia,
    finishedDD2,
    taxMoney,
    pveDeaths,
    pvpDeaths,
    hairColor,
    skinColor,
    eyeColor,
    shirtColor,
    underShirtColor,
    pantsColor,
    shoeColor,
    armor,
    dye,
    inventory,
    miscEquips,
    miscDyes,
    bank,
    bank2,
    bank3,
    bank4,
    voidVaultByte,
    buffs,
    spawns,
    hbLocked,
    hideInfo,
    anglerQuestsFinished,
    dpad,
    builderAcc,
    bartender,
    dead,
    respawnTimer,
    lastSaved,
    golferScore,
    crFlag,
    creativeUnlocks,
    tempBitmask,
    tempItems,
    creativePowers,
    superCart,
    currentLoadoutIndex,
    loadouts,
    voiceVariant,
    voicePitch,
    refunds,
    dialogues
  };
}

/**
 * 将 PlayerData 重新序列化为可加密的 Uint8Array 二进制流 (支持自由切换版本号与服签名)
 */
export function serializePlr(p: PlayerData, overrideVersion?: number, overrideMagic?: string): Uint8Array {
  const w = new BinaryWriter();
  const version = overrideVersion !== undefined ? overrideVersion : p.version;
  const magic = overrideMagic ? new TextEncoder().encode(overrideMagic) : p.magic;

  w.writeInt32(version);
  w.writeBytes(magic);
  w.writeUInt8(p.fileType);
  w.writeUInt32(p.revision);
  w.writeUInt64(p.isFavorite);

  w.writeString(p.name);
  w.writeUInt8(p.difficulty);
  w.writeInt64(p.playTime);

  w.writeInt32(p.hair);
  w.writeUInt8(p.hairDye);
  if (version >= 283) {
    w.writeUInt8(p.team);
  }
  w.writeUInt8(p.hideVisual1);
  w.writeUInt8(p.hideVisual2);
  w.writeUInt8(p.hideMisc);
  w.writeUInt8(p.skinVariant);

  w.writeInt32(p.statLife);
  w.writeInt32(p.statLifeMax);
  w.writeInt32(p.statMana);
  w.writeInt32(p.statManaMax);

  w.writeBoolean(p.extraAccessory);
  w.writeBoolean(p.unlockedBiomeTorches);
  w.writeBoolean(p.usingBiomeTorches);
  w.writeBoolean(p.ateArtisanBread);
  if (version >= 324) {
    w.writeBoolean(p.v324Flag);
  }
  w.writeBoolean(p.aegisCrystal);
  w.writeBoolean(p.aegisFruit);
  w.writeBoolean(p.arcaneCrystal);
  w.writeBoolean(p.galaxyPearl);
  w.writeBoolean(p.gummyWorm);
  w.writeBoolean(p.ambrosia);
  w.writeBoolean(p.finishedDD2);
  w.writeInt32(p.taxMoney);
  w.writeInt32(p.pveDeaths);
  w.writeInt32(p.pvpDeaths);

  w.writeRGB(p.hairColor);
  w.writeRGB(p.skinColor);
  w.writeRGB(p.eyeColor);
  w.writeRGB(p.shirtColor);
  w.writeRGB(p.underShirtColor);
  w.writeRGB(p.pantsColor);
  w.writeRGB(p.shoeColor);

  const writeEquip = (it: ItemData, hasFav: boolean) => {
    w.writeInt32(it.id);
    w.writeUInt8(it.prefix);
    if (hasFav) w.writeBoolean(!!it.favorited);
  };

  const writeItemWithStack = (it: ItemData, hasFav: boolean) => {
    w.writeInt32(it.id);
    w.writeInt32(it.stack);
    w.writeUInt8(it.prefix);
    if (hasFav) w.writeBoolean(!!it.favorited);
  };

  for (let i = 0; i < 20; i++) writeEquip(p.armor[i] || { id: 0, stack: 1, prefix: 0 }, version >= 322);
  for (let i = 0; i < 10; i++) writeEquip(p.dye[i] || { id: 0, stack: 1, prefix: 0 }, version >= 322);
  for (let i = 0; i < 58; i++) writeItemWithStack(p.inventory[i] || { id: 0, stack: 0, prefix: 0 }, true);

  for (let i = 0; i < 5; i++) {
    writeEquip(p.miscEquips[i] || { id: 0, stack: 1, prefix: 0 }, false);
    writeEquip(p.miscDyes[i] || { id: 0, stack: 1, prefix: 0 }, false);
  }

  for (let i = 0; i < 40; i++) writeItemWithStack(p.bank[i] || { id: 0, stack: 0, prefix: 0 }, false);
  for (let i = 0; i < 40; i++) writeItemWithStack(p.bank2[i] || { id: 0, stack: 0, prefix: 0 }, false);
  if (version >= 182) {
    for (let i = 0; i < 40; i++) writeItemWithStack(p.bank3[i] || { id: 0, stack: 0, prefix: 0 }, false);
  }
  if (version >= 198) {
    for (let i = 0; i < 40; i++) writeItemWithStack(p.bank4[i] || { id: 0, stack: 0, prefix: 0 }, version >= 255);
  }
  if (version >= 253) w.writeUInt8(p.voidVaultByte);

  const buffCount = version >= 252 ? 44 : (version < 74 ? 10 : 22);
  for (let i = 0; i < buffCount; i++) {
    const b = p.buffs[i] || { type: 0, time: 0 };
    w.writeInt32(b.type);
    w.writeInt32(b.time);
  }

  for (let i = 0; i < p.spawns.length; i++) {
    w.writeInt32(p.spawns[i].sx);
    w.writeInt32(p.spawns[i].sy);
    w.writeInt32(p.spawns[i].wid);
    w.writeString(p.spawns[i].sname);
  }
  w.writeInt32(-1);

  w.writeBoolean(p.hbLocked);
  for (let i = 0; i < 13; i++) w.writeBoolean(p.hideInfo[i] ?? false);
  w.writeInt32(p.anglerQuestsFinished);
  for (let i = 0; i < 4; i++) w.writeInt32(p.dpad[i] ?? 0);
  for (let i = 0; i < 12; i++) w.writeInt32(p.builderAcc[i] ?? 0);
  w.writeInt32(p.bartender);
  w.writeBoolean(p.dead);
  if (p.dead) w.writeInt32(p.respawnTimer);
  w.writeInt64(p.lastSaved);
  w.writeInt32(p.golferScore);

  if (version >= 218) {
    if (version >= 282) w.writeBoolean(!!p.crFlag);
    const unlocks = p.creativeUnlocks || [];
    w.writeInt32(unlocks.length);
    for (let i = 0; i < unlocks.length; i++) {
      w.writeString(unlocks[i].k);
      w.writeInt32(unlocks[i].v);
    }
  }

  w.writeUInt8(p.tempBitmask);
  let tempWritten = 0;
  for (let i = 0; i < 4; i++) {
    if ((p.tempBitmask & (1 << i)) !== 0 && tempWritten < p.tempItems.length) {
      writeItemWithStack(p.tempItems[tempWritten++], false);
    }
  }

  if (version >= 220) {
    for (const cp of p.creativePowers) {
      w.writeBoolean(true);
      w.writeUInt16(cp.id);
      if (cp.type === "bool") w.writeBoolean(!!cp.val);
      else if (cp.type === "float") w.writeFloat(Number(cp.val));
    }
    w.writeBoolean(false);
  }

  if (version >= 253) w.writeUInt8(p.superCart);

  if (version >= 262) {
    w.writeInt32(p.currentLoadoutIndex);
    for (let l = 0; l < 3; l++) {
      const ld = p.loadouts[l] || {
        armor: Array.from({ length: 20 }, () => ({ id: 0, stack: 0, prefix: 0 })),
        dye: Array.from({ length: 10 }, () => ({ id: 0, stack: 0, prefix: 0 })),
        hide: Array(10).fill(false)
      };
      for (let i = 0; i < 20; i++) writeItemWithStack(ld.armor[i] || { id: 0, stack: 0, prefix: 0 }, version >= 322);
      for (let i = 0; i < 10; i++) writeItemWithStack(ld.dye[i] || { id: 0, stack: 0, prefix: 0 }, version >= 322);
      for (let i = 0; i < 10; i++) w.writeBoolean(ld.hide[i] ?? false);
    }
  }

  if (version >= 280) w.writeUInt8(p.voiceVariant);
  if (version >= 281) w.writeFloat(p.voicePitch);
  if (version >= 300) {
    w.writeInt32(p.refunds.length);
    for (let i = 0; i < p.refunds.length; i++) writeItemWithStack(p.refunds[i], false);
  }
  if (version >= 310) {
    w.writeInt32(p.dialogues.length);
    for (let i = 0; i < p.dialogues.length; i++) w.writeString(p.dialogues[i]);
  }

  return w.toUint8Array();
}

export function getMaxItemIdForVersion(version: number, edition: EditionType = "relogic"): number {
  if (version >= 325) return edition === "xindong" ? 6314 : 6195; // 1.4.5.7+ / 1.4.6
  if (version >= 319) return 6146; // 1.4.5.6
  if (version >= 315) return 6144; // 1.4.5.0 ~ 1.4.5.5
  if (version >= 274) return 5455; // 1.4.4.5 ~ 1.4.4.9
  if (version >= 269) return 5452; // 1.4.4 ~ 1.4.4.4
  if (version >= 242) return 5124; // 1.4.3 ~ 1.4.3.6
  if (version >= 232) return 5087; // 1.4.1 ~ 1.4.2.3
  if (version >= 230) return 5044; // 1.4.0.5
  if (version >= 225) return 5042; // 1.4.0.1 ~ 1.4.0.4
  if (version >= 191) return 3929; // 1.3.5 ~ 1.3.5.3
  if (version >= 184) return 3883; // 1.3.4 ~ 1.3.4.4
  if (version >= 175) return 3796; // 1.3.3 ~ 1.3.3.3
  if (version >= 172) return 3769; // 1.3.2 ~ 1.3.2.1
  if (version >= 168) return 3729; // 1.3.1 ~ 1.3.1.1
  if (version >= 153) return 3601; // 1.3.0.5 ~ 1.3.0.8
  if (version >= 146) return 3600; // 1.3.0.1 ~ 1.3.0.4
  if (version >= 102) return 2748; // 1.2.4.1
  if (version >= 101) return 2742; // 1.2.4
  if (version >= 93) return 2288;  // 1.2.3 ~ 1.2.3.1
  if (version >= 77) return 1965;  // 1.2.2
  if (version >= 73) return 1866;  // 1.2.1.1 ~ 1.2.1.2
  if (version >= 72) return 1857;  // 1.2.1
  if (version >= 70) return 1724;  // 1.2.0.3 ~ 1.2.0.3.1
  if (version >= 69) return 1614;  // 1.2.0.2
  if (version >= 67) return 1613;  // 1.2 ~ 1.2.0.1
  if (version >= 39) return 603;   // 1.1.2
  if (version >= 37) return 602;   // 1.1.1
  if (version >= 36) return 585;   // 1.1
  if (version >= 22) return 363;   // 1.0.6.1
  if (version >= 20) return 362;   // 1.0.6
  if (version >= 12) return 326;   // 1.0.5
  if (version >= 9) return 264;    // 1.0.4
  if (version >= 4) return 238;    // 1.0.3
  if (version >= 3) return 235;    // 1.0.2
  return 234;                      // 1.0 ~ 1.0.1
}

export function getMaxBuffIdForVersion(version: number): number {
  if (version >= 325) return 400; // 1.4.5.7+ / 1.4.6
  if (version >= 315) return 388; // 1.4.5.0 ~ 1.4.5.6
  if (version >= 269) return 354; // 1.4.4 ~ 1.4.4.9
  if (version >= 242) return 337; // 1.4.3 ~ 1.4.3.6
  if (version >= 232) return 326; // 1.4.1 ~ 1.4.2.3
  if (version >= 225) return 322; // 1.4.0.1 ~ 1.4.0.5
  if (version >= 184) return 205; // 1.3.4 ~ 1.3.5.3
  if (version >= 175) return 194; // 1.3.3 ~ 1.3.3.3
  if (version >= 172) return 192; // 1.3.2 ~ 1.3.2.1
  if (version >= 168) return 191; // 1.3.1 ~ 1.3.1.1
  if (version >= 146) return 190; // 1.3.0.1 ~ 1.3.0.8
  if (version >= 101) return 139; // 1.2.4 ~ 1.2.4.1
  if (version >= 93) return 103;  // 1.2.3 ~ 1.2.3.1
  if (version >= 77) return 92;   // 1.2.2
  if (version >= 73) return 89;   // 1.2.1.2
  if (version >= 72) return 85;   // 1.2.1
  if (version >= 67) return 80;   // 1.2 ~ 1.2.0.3.1
  if (version >= 39) return 40;   // 1.1.2
  if (version >= 36) return 39;   // 1.1 ~ 1.1.1
  if (version >= 20) return 26;   // 1.0.6 ~ 1.0.6.1
  if (version >= 12) return 18;   // 1.0.5
  return 0;                       // 1.0 ~ 1.0.4
}

export function getMaxHairCountForVersion(version: number): number {
  if (version >= 315) return 228; // 1.4.5+ / 1.4.6
  if (version >= 225) return 165; // 1.4.0 ~ 1.4.4.9
  if (version >= 146) return 134; // 1.3.0.1 ~ 1.3.5.3
  if (version >= 67) return 51;   // 1.2.x
  return 36;                      // 1.0 ~ 1.1
}

function remapLegacyItemId(id: number, targetVersion: number): number | null {
  // 1.3.2 之前晶光刃 (3764..3769) 使用负 ID -24..-19 (1.1+ 引入)
  if (targetVersion >= 36 && targetVersion < 172 && id >= 3764 && id <= 3769) {
    return id - 3788;
  }
  // 1.3.0.1 之前铜/银/金基础工具 (3504..3521) 使用负 ID -18..-1
  if (targetVersion < 146 && id >= 3504 && id <= 3521) {
    return id - 3522;
  }
  // 1.2 ~ 1.2.4.1 铂金/钨/铅/锡基础工具 (3480..3503) 使用负 ID -48..-25
  if (targetVersion >= 67 && targetVersion < 146 && id >= 3480 && id <= 3503) {
    return id - 3528;
  }
  return null;
}

/**
 * 降级导出前清理目标版本不支持的高版本物品/外观/Buff，避免旧版游戏客户端因数组越界报“未知的错误”
 */
export function sanitizePlayerForVersion(
  p: PlayerData,
  targetVersion: number,
  targetEdition: EditionType = "relogic"
): { player: PlayerData; removedItems: number } {
  const maxItemId = getMaxItemIdForVersion(targetVersion, targetEdition);
  const maxBuffId = getMaxBuffIdForVersion(targetVersion);
  const maxHairCount = getMaxHairCountForVersion(targetVersion);
  let removedItems = 0;

  const cleanItem = (it: ItemData): ItemData => {
    if (it.id > 0) {
      const legacyId = remapLegacyItemId(it.id, targetVersion);
      if (legacyId !== null) {
        return { ...it, id: legacyId };
      }
    }
    if (it.id > maxItemId) {
      removedItems++;
      return { id: 0, stack: 0, prefix: 0, favorited: false };
    }
    return { ...it };
  };

  const cleanList = (list: ItemData[]) => list.map(cleanItem);

  const sanitized: PlayerData = {
    ...p,
    armor: cleanList(p.armor),
    dye: cleanList(p.dye),
    inventory: cleanList(p.inventory),
    miscEquips: cleanList(p.miscEquips),
    miscDyes: cleanList(p.miscDyes),
    bank: cleanList(p.bank),
    bank2: cleanList(p.bank2),
    bank3: cleanList(p.bank3),
    bank4: cleanList(p.bank4),
    tempItems: cleanList(p.tempItems),
    refunds: cleanList(p.refunds),
    loadouts: p.loadouts.map((ld) => ({
      armor: cleanList(ld.armor),
      dye: cleanList(ld.dye),
      hide: [...ld.hide],
    })),
    hair: p.hair >= maxHairCount || p.hair < 0 ? 0 : p.hair,
    hairDye: targetVersion < 225 && p.hairDye > 11 ? 0 : p.hairDye,
    skinVariant: targetVersion < 225 && p.skinVariant > 9 ? 0 : p.skinVariant,
    buffs: p.buffs.map((b) => (b.type > maxBuffId ? { type: 0, time: 0 } : { ...b })),
  };

  return { player: sanitized, removedItems };
}

/**
 * 构造一个全新合法的默认角色数据 (初始生命100、魔力20、铜短剑/镐/斧)
 */
export function createDefaultPlayer(name = "Player", version = 329): PlayerData {
  return {
    version,
    magic: new TextEncoder().encode("relogic"),
    fileType: 3,
    revision: 1,
    isFavorite: 0n,

    name,
    difficulty: 0,
    playTime: 0n,

    hair: 0,
    hairDye: 0,
    team: 0,
    hideVisual1: 0,
    hideVisual2: 0,
    hideMisc: 0,
    skinVariant: 0,

    statLife: 100,
    statLifeMax: 100,
    statMana: 20,
    statManaMax: 20,

    extraAccessory: false,
    unlockedBiomeTorches: false,
    usingBiomeTorches: false,
    ateArtisanBread: false,
    v324Flag: false,
    aegisCrystal: false,
    aegisFruit: false,
    arcaneCrystal: false,
    galaxyPearl: false,
    gummyWorm: false,
    ambrosia: false,
    finishedDD2: false,
    taxMoney: 0,
    pveDeaths: 0,
    pvpDeaths: 0,

    hairColor: { r: 215, g: 90, b: 55 },
    skinColor: { r: 255, g: 125, b: 90 },
    eyeColor: { r: 105, g: 90, b: 75 },
    shirtColor: { r: 175, g: 165, b: 140 },
    underShirtColor: { r: 160, g: 180, b: 215 },
    pantsColor: { r: 255, g: 230, b: 175 },
    shoeColor: { r: 160, g: 105, b: 60 },

    armor: Array.from({ length: 20 }, () => ({ id: 0, stack: 0, prefix: 0 })),
    dye: Array.from({ length: 10 }, () => ({ id: 0, stack: 0, prefix: 0 })),

    inventory: [
      { id: 3507, stack: 1, prefix: 0 }, // 铜短剑
      { id: 3509, stack: 1, prefix: 0 }, // 铜镐
      { id: 3506, stack: 1, prefix: 0 }, // 铜斧
      ...Array.from({ length: 55 }, () => ({ id: 0, stack: 0, prefix: 0 }))
    ],

    miscEquips: Array.from({ length: 5 }, () => ({ id: 0, stack: 0, prefix: 0 })),
    miscDyes: Array.from({ length: 5 }, () => ({ id: 0, stack: 0, prefix: 0 })),

    bank: Array.from({ length: 40 }, () => ({ id: 0, stack: 0, prefix: 0 })),
    bank2: Array.from({ length: 40 }, () => ({ id: 0, stack: 0, prefix: 0 })),
    bank3: Array.from({ length: 40 }, () => ({ id: 0, stack: 0, prefix: 0 })),
    bank4: Array.from({ length: 40 }, () => ({ id: 0, stack: 0, prefix: 0 })),
    voidVaultByte: 0,

    buffs: Array.from({ length: 44 }, () => ({ type: 0, time: 0 })),
    spawns: [],

    hbLocked: false,
    hideInfo: Array(13).fill(false),
    anglerQuestsFinished: 0,
    dpad: [-1, -1, -1, -1],
    builderAcc: Array(12).fill(0),
    bartender: 0,
    dead: false,
    respawnTimer: 0,
    lastSaved: BigInt(Date.now()),
    golferScore: 0,

    crFlag: false,
    creativeUnlocks: [],
    tempBitmask: 0,
    tempItems: [],
    creativePowers: [
      { id: 11, type: "bool", val: false },
      { id: 14, type: "float", val: 1.0 }
    ],
    superCart: 0,

    currentLoadoutIndex: 0,
    loadouts: Array.from({ length: 3 }, () => ({
      armor: Array.from({ length: 20 }, () => ({ id: 0, stack: 0, prefix: 0 })),
      dye: Array.from({ length: 10 }, () => ({ id: 0, stack: 0, prefix: 0 })),
      hide: Array(10).fill(false)
    })),

    voiceVariant: 0,
    voicePitch: 0,
    refunds: [],
    dialogues: []
  };
}
