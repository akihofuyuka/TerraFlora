import { reactive, markRaw } from "vue";
import {
  type PlayerData,
  type ItemData,
  type EditionType,
  SUPPORTED_EDITIONS,
  SUPPORTED_VERSIONS,
  VERSION_GROUPS,
  ALL_VERSIONS,
  findVersionInfo,
  parsePlr,
  serializePlr,
  sanitizePlayerForVersion,
  createDefaultPlayer,
  unpackTempSlots,
  packTempSlots,
} from "./core/plr";
import { AppError, toAppError } from "./core/errors";

export { SUPPORTED_EDITIONS, SUPPORTED_VERSIONS, VERSION_GROUPS, ALL_VERSIONS, findVersionInfo };
import { decryptPlr, encryptPlr } from "./core/crypto";

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

export interface PrefixItem {
  id: number;
  name: string;
  en: string;
  type: string;
  isGod: boolean;
  godCat: string | null;
}

export interface BuffItem {
  id: number;
  key: string;
  name: string;
  en: string;
  tip: string;
  py: string;
  pys: string;
}

export interface SelectedSlotInfo {
  slotType: "inventory" | "armor" | "armorVanity" | "armorDye" | "miscEquips" | "miscDyes" | "bank" | "bank2" | "bank3" | "bank4" | "tempSlot" | "refundSlot";
  index: number;
  item: ItemData;
  loadoutIdx?: number; // 0, 1, 2
}

export interface DragState {
  isDragging: boolean;
  sourceSlotType: SelectedSlotInfo["slotType"] | null;
  sourceIndex: number;
  sourceLoadoutIdx?: number;
  item: ItemData | null;
  x: number;
  y: number;
  isTouch: boolean;
  hoverTarget: {
    slotType: SelectedSlotInfo["slotType"];
    index: number;
    loadoutIdx?: number;
  } | null;
}

export type ActiveTool = "plr" | "pixelart" | "guide" | "about";
export type GuideSubTab = "path" | "converter";

function detectInitialTool(): ActiveTool {
  if (typeof window === "undefined") return "plr";
  try {
    const params = new URLSearchParams(window.location.search);
    const toolParam = params.get("tool");
    const hash = window.location.hash;
    if (toolParam === "pixelart" || hash === "#pixelart") {
      return "pixelart";
    }
    if (
      toolParam === "guide" ||
      toolParam === "map-converter" ||
      hash === "#guide" ||
      hash === "#map-converter"
    ) {
      return "guide";
    }
  } catch {
    // ignore
  }
  return "plr";
}

function detectInitialGuideSubTab(): GuideSubTab {
  if (typeof window === "undefined") return "path";
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("tab") === "converter" ||
      params.get("tool") === "map-converter" ||
      window.location.hash === "#map-converter"
    ) {
      return "converter";
    }
  } catch {
    // ignore
  }
  return "path";
}

export interface StoreState {
  activeTool: ActiveTool;
  guideSubTab: GuideSubTab;
  player: PlayerData | null;
  fileName: string;
  isModified: boolean;
  activeTab: "inventory" | "equipment" | "character" | "research" | "buff" | "about";
  inventorySubTab: "main" | "piggy" | "safe" | "forge" | "void";
  characterSubTab: "base" | "appearance" | "permanent" | "archive";
  loadoutTab: number; // 当前在装备页面查看的配置 (0, 1, 2)
  selectedSlot: SelectedSlotInfo | null;
  isMoveMode: boolean;
  moveSourceSlot: SelectedSlotInfo | null;
  dragState: DragState;
  targetEdition: EditionType;
  targetVersion: number;
  itemPickerOpen: boolean;
  itemsList: MinItem[];
  itemsMap: Map<number, MinItem>;
  prefixesList: PrefixItem[];
  prefixesMap: Map<number, PrefixItem>;
  buffsList: BuffItem[];
  buffsMap: Map<number, BuffItem>;
  itemKeysMap: Map<number, string>;
  keyToIdMap: Map<string, number>;
  toastMessage: string | null;
  isLoading: boolean;
  backupNoticeOpen: boolean;
  errorModal: {
    error: AppError;
    onRetry?: () => void;
    extra?: Record<string, unknown>;
  } | null;
}

export const store = reactive<StoreState>({
  activeTool: detectInitialTool(),
  guideSubTab: detectInitialGuideSubTab(),
  player: null,
  fileName: "character.plr",
  isModified: false,
  activeTab: "character",
  inventorySubTab: "main",
  characterSubTab: "base",
  loadoutTab: 0,
  selectedSlot: null,
  isMoveMode: false,
  moveSourceSlot: null,
  dragState: {
    isDragging: false,
    sourceSlotType: null,
    sourceIndex: -1,
    sourceLoadoutIdx: 0,
    item: null,
    x: 0,
    y: 0,
    isTouch: false,
    hoverTarget: null,
  },
  targetEdition: "relogic",
  targetVersion: 279,
  itemPickerOpen: false,
  itemsList: [],
  itemsMap: new Map(),
  prefixesList: [],
  prefixesMap: new Map(),
  buffsList: [],
  buffsMap: new Map(),
  itemKeysMap: new Map(),
  keyToIdMap: new Map(),
  toastMessage: null,
  isLoading: false,
  backupNoticeOpen: false,
  errorModal: null,
});

export function reportError(
  err: unknown,
  fallback: { code?: AppError['code']; title?: string; suggestion?: string; context?: Record<string, unknown> } = {},
  onRetry?: () => void
) {
  const appErr = toAppError(err, fallback);
  console.error('[TerraFlora]', appErr, appErr.cause ?? '');
  store.errorModal = {
    error: appErr,
    onRetry,
    extra: {
      targetEdition: store.targetEdition,
      targetVersion: store.targetVersion,
      hasPlayer: Boolean(store.player),
    },
  };
}

export function clearError() {
  store.errorModal = null;
}

let toastTimer: any = null;
export function showToast(msg: string, duration = 2500) {
  store.toastMessage = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    store.toastMessage = null;
  }, duration);
}

let baseItemsList: MinItem[] | null = null;
let baseItemsMap: Map<number, MinItem> | null = null;
let xdItemsCache: MinItem[] | null = null;

export async function applyXdOverlay(): Promise<void> {
  if (!xdItemsCache) {
    const base = import.meta.env.BASE_URL || './';
    const prefix = base.endsWith('/') ? base : `${base}/`;
    const res = await fetch(`${prefix}data/xd-items.json`);
    if (!res.ok) {
      throw new Error(`Failed to load xd-items.json (HTTP ${res.status})`);
    }
    xdItemsCache = await res.json();
  }

  if (!baseItemsList || !baseItemsMap) {
    baseItemsList = store.itemsList;
    baseItemsMap = store.itemsMap;
  }

  const mergedList = [...baseItemsList, ...xdItemsCache!];
  const mergedMap = new Map(baseItemsMap);
  for (const it of xdItemsCache!) {
    mergedMap.set(it.id, it);
  }

  store.itemsList = markRaw(mergedList);
  store.itemsMap = markRaw(mergedMap);
}

export function removeXdOverlay(): void {
  if (baseItemsList && baseItemsMap) {
    store.itemsList = baseItemsList;
    store.itemsMap = baseItemsMap;
  }
}

/**
 * 异步初始化物品与词缀数据库
 */
export async function initData() {
  if (store.itemsList.length > 0) return;
  try {
    store.isLoading = true;
    const base = import.meta.env.BASE_URL || './';
    const prefix = base.endsWith('/') ? base : `${base}/`;
    const [itemsRes, pfxRes, keysRes, buffsRes] = await Promise.all([
      fetch(`${prefix}data/items.min.json`),
      fetch(`${prefix}data/prefixes.min.json`),
      fetch(`${prefix}data/item-keys.json`),
      fetch(`${prefix}data/buffs.min.json`).catch(() => null),
    ]);
    const items: MinItem[] = await itemsRes.json();
    const prefixes: PrefixItem[] = await pfxRes.json();
    const itemKeys: Record<string, string> = await keysRes.json();
    let buffs: BuffItem[] = [];
    if (buffsRes && buffsRes.ok) {
      buffs = await buffsRes.json();
    }

    const imap = new Map<number, MinItem>();
    for (const it of items) {
      imap.set(it.id, it);
    }
    const pmap = new Map<number, PrefixItem>();
    for (const p of prefixes) {
      pmap.set(p.id, p);
    }
    const bmap = new Map<number, BuffItem>();
    for (const b of buffs) {
      bmap.set(b.id, b);
    }
    const kmap = new Map<number, string>();
    const revkmap = new Map<string, number>();
    for (const [idStr, key] of Object.entries(itemKeys)) {
      const id = parseInt(idStr);
      kmap.set(id, key);
      revkmap.set(key, id);
    }

    baseItemsList = markRaw(items);
    baseItemsMap = markRaw(imap);
    store.itemsList = baseItemsList;
    store.itemsMap = baseItemsMap;
    store.prefixesList = markRaw(prefixes);
    store.prefixesMap = markRaw(pmap);
    store.buffsList = markRaw(buffs);
    store.buffsMap = markRaw(bmap);
    store.itemKeysMap = markRaw(kmap);
    store.keyToIdMap = markRaw(revkmap);

    if (store.targetEdition === 'xindong') {
      await applyXdOverlay();
    }

    // 检查首次访问弹窗提醒（仅角色编辑模式下自动弹出）
    if (store.activeTool === 'plr') {
      try {
        const dismissed = localStorage.getItem('terraria_plr_editor_dismiss_backup_warning');
        if (!dismissed) {
          store.backupNoticeOpen = true;
        }
      } catch (e) {
        store.backupNoticeOpen = true;
      }
    }
  } catch (err: any) {
    reportError(
      err,
      {
        code: 'ASSET_LOAD',
        title: '物品数据库加载失败',
        suggestion: '请检查网络连接或刷新页面重试；离线使用需先在联网状态下完整加载一次页面。',
      },
      () => initData()
    );
  } finally {
    store.isLoading = false;
  }
}

function syncToolHash(tool: ActiveTool, guideSubTab: GuideSubTab) {
  if (typeof window === 'undefined') return;
  try {
    let targetHash = '';
    if (tool === 'pixelart') {
      targetHash = '#pixelart';
    } else if (tool === 'guide') {
      targetHash = guideSubTab === 'converter' ? '#map-converter' : '#guide';
    }
    if (window.location.hash !== targetHash) {
      history.replaceState(null, '', targetHash || window.location.pathname + window.location.search);
    }
  } catch {
    // ignore
  }
}

export function setActiveTool(tool: ActiveTool) {
  store.activeTool = tool;
  if (tool === 'plr') {
    try {
      const dismissed = localStorage.getItem('terraria_plr_editor_dismiss_backup_warning');
      if (!dismissed) {
        store.backupNoticeOpen = true;
      }
    } catch {
      // ignore
    }
  }
  syncToolHash(tool, store.guideSubTab);
}

export function setGuideSubTab(tab: GuideSubTab) {
  store.guideSubTab = tab;
  if (store.activeTool === 'guide') {
    syncToolHash('guide', tab);
  }
}

export function openBackupNotice() {
  store.backupNoticeOpen = true;
}

export function closeBackupNotice(dismissForever = false) {
  if (dismissForever) {
    try {
      localStorage.setItem('terraria_plr_editor_dismiss_backup_warning', 'true');
    } catch (e) {
      // ignore
    }
  }
  store.backupNoticeOpen = false;
}

/**
 * 读取并解析用户上传的 .plr 存档 (自动识别 Relogic 及心动版)
 */
export async function loadPlrFile(file: File) {
  try {
    store.isLoading = true;
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (buffer.length >= 12) {
      const rawMagic = new TextDecoder().decode(buffer.subarray(4, 11));
      if ((rawMagic === 'relogic' || rawMagic === 'xindong') && buffer[11] === 2) {
        throw new AppError('FILE_FORMAT', '检测到这可能是地图存档 (.wld)', {
          suggestion: '本编辑器仅支持修改角色存档 (.plr)；如需转换地图签名，请点击主界面向导中的“签名互转”工具。',
          context: { fileName: file.name, fileSize: file.size, rawMagic, fileType: buffer[11] },
        });
      }
    }
    const decrypted = await decryptPlr(buffer);
    const player = parsePlr(decrypted);

    store.player = player;
    store.fileName = file.name;
    store.isModified = false;
    store.selectedSlot = null;
    store.isMoveMode = false;
    store.moveSourceSlot = null;
    store.loadoutTab = player.currentLoadoutIndex || 0;

    // 根据识别到的魔数与版本号自动对齐当前服类型与版本
    const magicStr = new TextDecoder().decode(player.magic);
    store.targetEdition = magicStr === "xindong" ? "xindong" : "relogic";
    store.targetVersion = player.version;
    if (store.targetEdition === 'xindong') {
      await applyXdOverlay();
    } else {
      removeXdOverlay();
    }

    showToast(`成功载入角色: ${player.name} [${store.targetEdition === 'xindong' ? '国服' : '国际服'}]`);
  } catch (err: any) {
    reportError(err, {
      code: 'FILE_FORMAT',
      title: '存档解析失败',
      context: { fileName: file.name, fileSize: file.size },
    });
  } finally {
    store.isLoading = false;
  }
}

/**
 * 从零创建一个全新的空白角色 (默认经典模式、1.4.6 协议、标准初始工具)
 */
export async function createNewPlayer(name = "Player", edition: EditionType = "relogic") {
  try {
    const player = createDefaultPlayer(name, 329);
    store.player = player;
    store.fileName = `${name}.plr`;
    store.isModified = true;
    store.selectedSlot = null;
    store.isMoveMode = false;
    store.moveSourceSlot = null;
    store.loadoutTab = 0;
    store.targetEdition = edition;
    store.targetVersion = 329;
    store.activeTab = "character";
    if (edition === 'xindong') {
      await applyXdOverlay();
    } else {
      removeXdOverlay();
    }
    showToast(`已创建新角色: ${name} [${edition === 'xindong' ? '国服' : '国际服'}]`);
  } catch (err) {
    reportError(err, { code: 'ASSET_LOAD', title: '初始化角色数据失败' });
  }
}

/**
 * 切换目标服务器类型 (国际服 relogic vs 国服 xindong)
 */
export async function setTargetEdition(edition: EditionType) {
  if (!store.player) return;
  try {
    store.targetEdition = edition;
    store.player.magic = new TextEncoder().encode(edition);
    store.isModified = true;
    if (edition === 'xindong') {
      await applyXdOverlay();
    } else {
      removeXdOverlay();
    }
    const name = edition === "xindong" ? "国服 (心动网络 XD)" : "国际服 (Re-Logic)";
    showToast(`已切换目标服类型为：${name}`);
  } catch (err) {
    reportError(err, { code: 'ASSET_LOAD', title: '切换服务器数据失败' });
  }
}

/**
 * 切换目标游戏版本号 (v329, v279, v248, v230, v194 等)
 */
export function setTargetVersion(version: number) {
  if (!store.player) return;
  const num = Math.max(1, version || 1);
  store.targetVersion = num;
  store.player.version = num;
  store.isModified = true;
  const vInfo = findVersionInfo(num);
  showToast(`已切换目标版本为：${vInfo.label}`);
}

/**
 * 序列化、加密并触发浏览器下载 .plr 存档
 */
export async function exportPlrFile() {
  if (!store.player) {
    showToast("当前未载入任何角色！");
    return;
  }
  try {
    store.isLoading = true;
    const { player: exportPlayer, removedItems } = sanitizePlayerForVersion(
      store.player,
      store.targetVersion,
      store.targetEdition
    );
    const serialized = serializePlr(exportPlayer, store.targetVersion, store.targetEdition);
    try {
      const verified = parsePlr(serialized);
      if (!verified.name && store.player.name) {
        throw new Error('角色名称回读校验异常');
      }
    } catch (verifyErr) {
      throw new AppError('EXPORT_VERIFY', '导出前存档一致性校验未通过', {
        suggestion: '为防止生成损坏的存档，本次导出已拦截。请复制下方诊断报告以便排查。',
        context: { fileName: store.fileName, targetVersion: store.targetVersion, targetEdition: store.targetEdition },
        cause: verifyErr,
      });
    }
    const encrypted = await encryptPlr(serialized);

    const blob = new Blob([encrypted as any], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = store.fileName || `${store.player.name || "character"}.plr`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    store.isModified = false;
    showToast(
      removedItems > 0
        ? `导出成功: ${a.download}（已自动清理 ${removedItems} 个不兼容目标版本的物品）`
        : `导出成功: ${a.download}`,
      removedItems > 0 ? 4000 : 2500
    );
  } catch (err: any) {
    reportError(err, {
      code: 'EXPORT_VERIFY',
      title: '导出 .plr 存档失败',
      context: { fileName: store.fileName },
    });
  } finally {
    store.isLoading = false;
  }
}

/**
 * 获取指定装备配置 (0, 1, 2) 的防具/饰品数组 (20 格)
 */
export function getLoadoutArmor(loadoutIdx: number): ItemData[] {
  if (!store.player) return [];
  if (loadoutIdx === store.player.currentLoadoutIndex) {
    return store.player.armor;
  }
  const ld = store.player.loadouts[loadoutIdx];
  return ld ? ld.armor : [];
}

/**
 * 获取指定装备配置 (0, 1, 2) 的染料数组 (10 格)
 */
export function getLoadoutDye(loadoutIdx: number): ItemData[] {
  if (!store.player) return [];
  if (loadoutIdx === store.player.currentLoadoutIndex) {
    return store.player.dye;
  }
  const ld = store.player.loadouts[loadoutIdx];
  return ld ? ld.dye : [];
}

/**
 * 将指定配置设为当前游戏内生效配置 (与游戏内 Swap 完全对齐)
 */
export function setActiveLoadout(targetIdx: number) {
  if (!store.player || targetIdx === store.player.currentLoadoutIndex || targetIdx < 0 || targetIdx > 2) return;
  const currentIdx = store.player.currentLoadoutIndex;

  // 1. 将当前生效的 armor/dye 存入当前 loadouts[currentIdx]
  const curLoadout = store.player.loadouts[currentIdx];
  if (curLoadout) {
    for (let i = 0; i < 20; i++) {
      const temp = curLoadout.armor[i];
      curLoadout.armor[i] = store.player.armor[i];
      store.player.armor[i] = temp;
    }
    for (let i = 0; i < 10; i++) {
      const temp = curLoadout.dye[i];
      curLoadout.dye[i] = store.player.dye[i];
      store.player.dye[i] = temp;
    }
  }

  // 2. 将目标 loadouts[targetIdx] 换入 store.player.armor / dye
  const tgtLoadout = store.player.loadouts[targetIdx];
  if (tgtLoadout) {
    for (let i = 0; i < 20; i++) {
      const temp = tgtLoadout.armor[i];
      tgtLoadout.armor[i] = store.player.armor[i];
      store.player.armor[i] = temp;
    }
    for (let i = 0; i < 10; i++) {
      const temp = tgtLoadout.dye[i];
      tgtLoadout.dye[i] = store.player.dye[i];
      store.player.dye[i] = temp;
    }
  }

  store.player.currentLoadoutIndex = targetIdx;
  store.loadoutTab = targetIdx;

  // 同步 hideVisual1 位掩码
  if (tgtLoadout?.hide) {
    let mask = 0;
    for (let i = 3; i < 10; i++) {
      if (tgtLoadout.hide[i]) mask |= (1 << (i - 3));
    }
    store.player.hideVisual1 = mask;
  }

  store.isModified = true;
  store.selectedSlot = null;
  showToast(`已切换当前生效配置为：配置 ${targetIdx + 1}`);
}

/**
 * 检查指定配装下的槽位外观是否隐藏
 */
export function isSlotHidden(loadoutIdx: number, slotIdx: number): boolean {
  if (!store.player) return false;
  const ld = store.player.loadouts?.[loadoutIdx];
  if (ld?.hide && ld.hide[slotIdx] !== undefined) {
    return Boolean(ld.hide[slotIdx]);
  }
  if (slotIdx >= 3 && slotIdx <= 9) {
    const accIdx = slotIdx - 3;
    if (store.player.hideVisual1 !== undefined) {
      return ((store.player.hideVisual1 >> accIdx) & 1) === 1;
    }
  }
  return false;
}

/**
 * 切换指定配装下的槽位外观隐藏状态 (同步 loadouts 与 hideVisual1)
 */
export function toggleSlotVisibility(loadoutIdx: number, slotIdx: number) {
  if (!store.player) return;

  if (!store.player.loadouts) store.player.loadouts = [];
  while (store.player.loadouts.length <= loadoutIdx) {
    store.player.loadouts.push({
      armor: Array.from({ length: 20 }, () => ({ id: 0, stack: 0, prefix: 0 })),
      dye: Array.from({ length: 10 }, () => ({ id: 0, stack: 0, prefix: 0 })),
      hide: Array(10).fill(false),
    });
  }

  const ld = store.player.loadouts[loadoutIdx];
  if (!ld.hide) ld.hide = Array(10).fill(false);
  const nextVal = !ld.hide[slotIdx];
  ld.hide[slotIdx] = nextVal;

  if (loadoutIdx === (store.player.currentLoadoutIndex ?? 0) && slotIdx >= 3 && slotIdx <= 9) {
    const accIdx = slotIdx - 3;
    if (store.player.hideVisual1 === undefined) store.player.hideVisual1 = 0;
    if (nextVal) {
      store.player.hideVisual1 |= (1 << accIdx);
    } else {
      store.player.hideVisual1 &= ~(1 << accIdx);
    }
  }

  store.isModified = true;
}

/**
 * 检查特殊装备 (宠物/坐骑/矿车等) 是否隐藏
 */
export function isMiscHidden(miscIdx: number): boolean {
  if (!store.player || store.player.hideMisc === undefined) return false;
  return ((store.player.hideMisc >> miscIdx) & 1) === 1;
}

/**
 * 切换特殊装备隐藏状态
 */
export function toggleMiscVisibility(miscIdx: number) {
  if (!store.player) return;
  if (store.player.hideMisc === undefined) store.player.hideMisc = 0;
  store.player.hideMisc ^= (1 << miscIdx);
  store.isModified = true;
}

/**
 * 获取对应类型的物品槽数组引用
 */
export function getSlotArray(slotType: SelectedSlotInfo["slotType"], loadoutIdx = store.loadoutTab): ItemData[] {
  if (!store.player) return [];
  switch (slotType) {
    case "inventory": return store.player.inventory;
    case "armor": return getLoadoutArmor(loadoutIdx).slice(0, 10);
    case "armorVanity": return getLoadoutArmor(loadoutIdx).slice(10, 20);
    case "armorDye": return getLoadoutDye(loadoutIdx);
    case "miscEquips": return store.player.miscEquips;
    case "miscDyes": return store.player.miscDyes;
    case "bank": return store.player.bank;
    case "bank2": return store.player.bank2;
    case "bank3": return store.player.bank3;
    case "bank4": return store.player.bank4;
    case "tempSlot": return unpackTempSlots(store.player.tempBitmask, store.player.tempItems);
    case "refundSlot": return store.player.refunds;
    default: return [];
  }
}

/**
 * 获取对应槽位的真实底层数组引用及其真实下标 (支持 armorVanity 偏移及稀疏 tempSlot 同步)
 */
export function getTargetItemRef(slotType: SelectedSlotInfo["slotType"], index: number, loadoutIdx = store.loadoutTab): { arr: ItemData[]; realIdx: number; commit?: () => void } | null {
  if (!store.player) return null;
  if (slotType === "armor") {
    const arr = getLoadoutArmor(loadoutIdx);
    return { arr, realIdx: index };
  }
  if (slotType === "armorVanity") {
    const arr = getLoadoutArmor(loadoutIdx);
    return { arr, realIdx: index + 10 };
  }
  if (slotType === "armorDye") {
    const arr = getLoadoutDye(loadoutIdx);
    return { arr, realIdx: index };
  }
  if (slotType === "tempSlot") {
    const player = store.player;
    const slots = unpackTempSlots(player.tempBitmask, player.tempItems);
    return {
      arr: slots,
      realIdx: index,
      commit: () => {
        const packed = packTempSlots(slots);
        player.tempBitmask = packed.tempBitmask;
        player.tempItems = packed.tempItems;
      },
    };
  }
  const arr = getSlotArray(slotType, loadoutIdx);
  return { arr, realIdx: index };
}

/**
 * 执行两个槽位间的数据互换/移动
 */
export function swapSlots(
  srcType: SelectedSlotInfo["slotType"],
  srcIndex: number,
  srcLoadoutIdx: number,
  tgtType: SelectedSlotInfo["slotType"],
  tgtIndex: number,
  tgtLoadoutIdx: number
) {
  const srcRef = getTargetItemRef(srcType, srcIndex, srcLoadoutIdx);
  const tgtRef =
    srcType === "tempSlot" && tgtType === "tempSlot" && srcRef
      ? { arr: srcRef.arr, realIdx: tgtIndex, commit: srcRef.commit }
      : getTargetItemRef(tgtType, tgtIndex, tgtLoadoutIdx);

  if (!srcRef || !tgtRef || !srcRef.arr[srcRef.realIdx] || !tgtRef.arr[tgtRef.realIdx]) return false;

  const temp = { ...srcRef.arr[srcRef.realIdx] };
  srcRef.arr[srcRef.realIdx] = { ...tgtRef.arr[tgtRef.realIdx] };
  tgtRef.arr[tgtRef.realIdx] = temp;

  srcRef.commit?.();
  if (tgtRef !== srcRef && tgtRef.commit !== srcRef.commit) {
    tgtRef.commit?.();
  }

  store.isModified = true;
  return true;
}

// ----------------- 拖拽（Drag & Drop）逻辑 -----------------
export function startDrag(
  slotType: SelectedSlotInfo["slotType"],
  index: number,
  item: ItemData,
  loadoutIdx = store.loadoutTab,
  x: number,
  y: number,
  isTouch = false
) {
  // 拖拽启动时收起可能打开的抽屉，保证屏幕视野无遮挡
  store.selectedSlot = null;
  store.dragState.isDragging = true;
  store.dragState.sourceSlotType = slotType;
  store.dragState.sourceIndex = index;
  store.dragState.sourceLoadoutIdx = loadoutIdx;
  store.dragState.item = { ...item };
  store.dragState.x = x;
  store.dragState.y = y;
  store.dragState.isTouch = isTouch;
  store.dragState.hoverTarget = null;
}

export function updateDragPosition(x: number, y: number) {
  if (!store.dragState.isDragging) return;
  store.dragState.x = x;
  store.dragState.y = y;

  const targetElement = document.elementFromPoint(x, y);
  const slotEl = targetElement?.closest('[data-slot-type]');
  if (slotEl) {
    const targetType = slotEl.getAttribute('data-slot-type') as SelectedSlotInfo['slotType'];
    const targetIdx = parseInt(slotEl.getAttribute('data-slot-index') || '0', 10);
    const targetLoadoutStr = slotEl.getAttribute('data-loadout-idx');
    const targetLoadoutIdx = targetLoadoutStr !== null && targetLoadoutStr !== undefined ? parseInt(targetLoadoutStr, 10) : store.loadoutTab;
    store.dragState.hoverTarget = {
      slotType: targetType,
      index: targetIdx,
      loadoutIdx: targetLoadoutIdx
    };
  } else {
    store.dragState.hoverTarget = null;
  }
}

export function cancelDrag() {
  store.dragState.isDragging = false;
  store.dragState.sourceSlotType = null;
  store.dragState.sourceIndex = -1;
  store.dragState.item = null;
  store.dragState.hoverTarget = null;
}

export function endDrag(x: number, y: number) {
  if (!store.dragState.isDragging || !store.dragState.sourceSlotType) {
    cancelDrag();
    return;
  }

  const targetElement = document.elementFromPoint(x, y);
  const slotEl = targetElement?.closest('[data-slot-type]');

  if (slotEl) {
    const targetType = slotEl.getAttribute('data-slot-type') as SelectedSlotInfo['slotType'];
    const targetIdx = parseInt(slotEl.getAttribute('data-slot-index') || '0', 10);
    const targetLoadoutStr = slotEl.getAttribute('data-loadout-idx');
    const targetLoadoutIdx = targetLoadoutStr !== null && targetLoadoutStr !== undefined ? parseInt(targetLoadoutStr, 10) : store.loadoutTab;

    const srcType = store.dragState.sourceSlotType;
    const srcIdx = store.dragState.sourceIndex;
    const srcLoadoutIdx = store.dragState.sourceLoadoutIdx ?? store.loadoutTab;

    if (srcType !== targetType || srcIdx !== targetIdx || srcLoadoutIdx !== targetLoadoutIdx) {
      const ok = swapSlots(srcType, srcIdx, srcLoadoutIdx, targetType, targetIdx, targetLoadoutIdx);
      if (ok) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }
        showToast("已放置并互换物品");
      }
    }
  }

  cancelDrag();
}

/**
 * 格子点击交互：
 * 默认点击：永远是【选中/查看属性】。
 * 若处于 isMoveMode，点击目标格子才执行移动/交换。
 */
export function handleSlotClick(slotType: SelectedSlotInfo["slotType"], index: number, loadoutIdx = store.loadoutTab) {
  const targetRef = getTargetItemRef(slotType, index, loadoutIdx);
  if (!targetRef || !targetRef.arr[targetRef.realIdx]) return;

  // 1. 若当前处于「待移动/交换」状态
  if (store.isMoveMode && store.moveSourceSlot) {
    const srcSlot = store.moveSourceSlot;
    const ok = swapSlots(
      srcSlot.slotType,
      srcSlot.index,
      srcSlot.loadoutIdx ?? store.loadoutTab,
      slotType,
      index,
      loadoutIdx
    );

    if (ok) {
      store.isMoveMode = false;
      store.moveSourceSlot = null;
      store.selectedSlot = {
        slotType,
        index,
        item: targetRef.arr[targetRef.realIdx],
        loadoutIdx
      };
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      showToast("已完成物品移动 / 互换");
      return;
    }
  }

  // 2. 默认行为：单纯查看与选中该格
  store.isMoveMode = false;
  store.moveSourceSlot = null;
  store.selectedSlot = {
    slotType,
    index,
    item: targetRef.arr[targetRef.realIdx],
    loadoutIdx
  };
}

/**
 * 进入「移动 / 交换」待命状态 (自动关闭移动端抽屉以释放全屏操作空间)
 */
export function startMoveMode() {
  if (!store.selectedSlot) return;
  store.isMoveMode = true;
  store.moveSourceSlot = { ...store.selectedSlot };
  // 关键：取消选中以自动收起移动端遮挡的底部抽屉，让出全屏视野
  store.selectedSlot = null;
  showToast("已进入移动状态：请点击目标格子完成互换");
}

/**
 * 取消「移动 / 交换」待命状态
 */
export function cancelMoveMode() {
  store.isMoveMode = false;
  store.moveSourceSlot = null;
}

export function togglePlayerFavorite() {
  if (!store.player) return;
  store.player.isFavorite = store.player.isFavorite !== 0n ? 0n : 1n;
  store.isModified = true;
}

/**
 * 取消当前选中的格子
 */
export function deselectSlot() {
  store.selectedSlot = null;
  store.isMoveMode = false;
  store.moveSourceSlot = null;
}

/**
 * 修改当前选中的格子属性
 */
export function updateSelectedSlot(patch: Partial<ItemData>) {
  if (!store.selectedSlot) return;
  const targetRef = getTargetItemRef(store.selectedSlot.slotType, store.selectedSlot.index, store.selectedSlot.loadoutIdx ?? store.loadoutTab);
  if (!targetRef || !targetRef.arr[targetRef.realIdx]) return;

  const current = targetRef.arr[targetRef.realIdx];
  Object.assign(current, patch);
  targetRef.commit?.();
  store.selectedSlot.item = { ...current };
  store.isModified = true;
}

/**
 * 清空当前选中格子
 */
export function clearSelectedSlot() {
  updateSelectedSlot({ id: 0, stack: 0, prefix: 0, favorited: false });
  showToast("已清空格子");
}

/**
 * 一键满堆叠当前选中格子
 */
export function maxStackSelectedSlot() {
  if (!store.selectedSlot || store.selectedSlot.item.id <= 0) return;
  const it = store.itemsMap.get(store.selectedSlot.item.id);
  const max = it ? it.stack : 9999;
  updateSelectedSlot({ stack: max });
  showToast(`已设为满堆叠 (${max})`);
}

/**
 * 智能一键最强词缀
 */
export function applySmartGodPrefix() {
  if (!store.selectedSlot || store.selectedSlot.item.id <= 0) return;
  const it = store.itemsMap.get(store.selectedSlot.item.id);
  const cat = it ? it.cat : "";

  let prefixId = 81; // 默认传奇
  let prefixName = "传奇";

  if (cat === "accessory") {
    prefixId = 72; // 险恶
    prefixName = "险恶";
  } else if (cat === "weapon") {
    const name = it ? (it.name + " " + it.en).toLowerCase() : "";
    if (name.includes("bow") || name.includes("gun") || name.includes("rifle") || name.includes("弓") || name.includes("枪") || name.includes("炮")) {
      prefixId = 82; // 虚幻
      prefixName = "虚幻";
    } else if (name.includes("staff") || name.includes("wand") || name.includes("tome") || name.includes("法杖") || name.includes("魔杖") || name.includes("书")) {
      prefixId = 83; // 神话
      prefixName = "神话";
    } else if (name.includes("summon") || name.includes("whip") || name.includes("召唤") || name.includes("鞭")) {
      prefixId = 57; // 无情
      prefixName = "无情";
    } else {
      prefixId = 81; // 传奇
      prefixName = "传奇";
    }
  }

  updateSelectedSlot({ prefix: prefixId });
  showToast(`已赋予最强词缀: ${prefixName}`);
}

/**
 * 赋予特定词缀
 */
export function applyGodPrefixToSelected(prefixId: number) {
  const pfx = store.prefixesMap.get(prefixId);
  updateSelectedSlot({ prefix: prefixId });
  showToast(`已赋予词缀: ${pfx ? pfx.name : prefixId}`);
}

/**
 * 全背包一键满堆叠 (主背包 50 格)
 */
export function maxStackAllInventory() {
  if (!store.player) return;
  let count = 0;
  for (let i = 0; i < 50; i++) {
    const item = store.player.inventory[i];
    if (item && item.id > 0) {
      const it = store.itemsMap.get(item.id);
      item.stack = it ? it.stack : 9999;
      count++;
    }
  }
  store.isModified = true;
  showToast(`主背包 ${count} 格物品已一键满堆叠`);
}

/**
 * 当前仓库一键满堆叠
 */
export function maxStackCurrentBank() {
  if (!store.player) return;
  const arr = getSlotArray(store.inventorySubTab === "piggy" ? "bank" :
                           store.inventorySubTab === "safe" ? "bank2" :
                           store.inventorySubTab === "forge" ? "bank3" : "bank4");
  let count = 0;
  for (const item of arr) {
    if (item && item.id > 0) {
      const it = store.itemsMap.get(item.id);
      item.stack = it ? it.stack : 9999;
      count++;
    }
  }
  store.isModified = true;
  showToast(`当前仓库 ${count} 格物品已一键满堆叠`);
}

/**
 * 替换选中格子的物品
 */
export function replaceSelectedWithItem(itemId: number) {
  if (!store.selectedSlot) return;
  const it = store.itemsMap.get(itemId);
  const defaultStack = it ? (it.cat === "armor" || it.cat === "accessory" ? 1 : Math.min(it.stack, 9999)) : 1;
  updateSelectedSlot({
    id: itemId,
    stack: defaultStack,
    prefix: 0
  });
  store.itemPickerOpen = false;
  showToast(`已替换为: ${it ? it.name : itemId}`);
}

/**
 * 将物品添加到主背包的第一个空格子
 */
export function addItemToFirstEmpty(itemId: number) {
  if (!store.player) return false;
  const inv = store.player.inventory;
  const emptyIdx = inv.findIndex(x => x.id === 0);
  if (emptyIdx === -1) {
    showToast("背包已满！");
    return false;
  }
  const it = store.itemsMap.get(itemId);
  const defaultStack = it ? (it.cat === "armor" || it.cat === "accessory" ? 1 : Math.min(it.stack, 9999)) : 1;
  inv[emptyIdx] = {
    id: itemId,
    stack: defaultStack,
    prefix: 0,
    favorited: false
  };
  store.isModified = true;
  showToast(`已填入背包第 ${emptyIdx + 1} 格: ${it ? it.name : itemId}`);
  return true;
}
