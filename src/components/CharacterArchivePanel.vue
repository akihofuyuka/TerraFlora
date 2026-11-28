<script setup lang="ts">
import { ref, computed } from 'vue';
import { store, showToast, handleSlotClick, deselectSlot, togglePlayerFavorite } from '@/store';
import { unpackTempSlots } from '@/core/plr';
import ItemSlot from './ItemSlot.vue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getItemSpriteStyle } from '@/utils/sprite';

const tempOpen = ref(false);
const refundsOpen = ref(false);
const dialoguesOpen = ref(false);

const p = computed(() => store.player);
const v = computed(() => store.targetVersion);

const versionCompatHints = computed(() => {
  const hints: string[] = [];
  if (v.value < 310) hints.push('NPC 对话记录 (需 1.4.5+)');
  if (v.value < 300) hints.push('跨箱合成待退还 (需 1.4.5+)');
  if (v.value < 254) hints.push('PvE/PvP 死亡次数 (需 1.4.4+)');
  if (v.value < 253) hints.push('矿车升级包 (需 1.4.4+)');
  if (v.value < 230) hints.push('建筑辅助第12项·群落火把 (需 1.4.0.5+)');
  if (v.value < 229) hints.push('火把神状态 (需 1.4.0.4+)');
  if (v.value < 214) hints.push('界面临时占用格 (需 1.4.0+)');
  if (v.value < 206) hints.push('高尔夫积分 (需 1.4.0+)');
  if (v.value < 200) hints.push('死亡读秒 (需 1.4.0+)');
  if (v.value < 181) hints.push('酒馆老板任务状态 (需 1.3.4+)');
  if (v.value < 164) hints.push('建筑辅助开关 (需 1.3.2+)');
  if (v.value < 138) hints.push('游玩时长 (需 1.3.0.1+)');
  if (v.value < 128) hints.push('税收官钱币 (需 1.3.0.1+)');
  if (v.value < 115) hints.push('信息饰品开关 (需 1.3.0.1+)');
  if (v.value < 98) hints.push('渔夫任务次数 (需 1.2.4+)');
  return hints;
});

const TICKS_PER_SECOND = 10_000_000n;

const playHours = computed({
  get: () => {
    const secs = Number((p.value?.playTime ?? 0n) / TICKS_PER_SECOND);
    return Math.floor(Math.max(0, secs) / 3600);
  },
  set: (hours: number) => updatePlayTime(Math.max(0, Math.floor(hours || 0)), playMinutes.value),
});

const playMinutes = computed({
  get: () => {
    const secs = Number((p.value?.playTime ?? 0n) / TICKS_PER_SECOND);
    return Math.floor((Math.max(0, secs) % 3600) / 60);
  },
  set: (mins: number) => updatePlayTime(playHours.value, Math.max(0, Math.min(59, Math.floor(mins || 0)))),
});

function updatePlayTime(hours: number, minutes: number) {
  if (!p.value) return;
  const totalSeconds = BigInt(Math.max(0, hours) * 3600 + Math.max(0, minutes) * 60);
  p.value.playTime = totalSeconds * TICKS_PER_SECOND;
  store.isModified = true;
}

const safeTaxCopper = computed(() => Math.max(0, Math.floor(p.value?.taxMoney || 0)));

const taxGold = computed({
  get: () => Math.floor(safeTaxCopper.value / 10_000),
  set: (gold: number) => updateTaxCoins(gold, taxSilver.value, taxCopper.value),
});

const taxSilver = computed({
  get: () => Math.floor((safeTaxCopper.value % 10_000) / 100),
  set: (silver: number) => updateTaxCoins(taxGold.value, silver, taxCopper.value),
});

const taxCopper = computed({
  get: () => safeTaxCopper.value % 100,
  set: (copper: number) => updateTaxCoins(taxGold.value, taxSilver.value, copper),
});

function updateTaxCoins(gold: number, silver: number, copper: number) {
  if (!p.value) return;
  const g = Math.max(0, Math.floor(gold || 0));
  const s = Math.max(0, Math.min(99, Math.floor(silver || 0)));
  const c = Math.max(0, Math.min(99, Math.floor(copper || 0)));
  p.value.taxMoney = g * 10_000 + s * 100 + c;
  store.isModified = true;
}

const safePveDeaths = computed({
  get: () => Math.max(0, Math.floor(p.value?.pveDeaths || 0)),
  set: (val: number) => {
    if (!p.value) return;
    p.value.pveDeaths = Math.max(0, Math.floor(val || 0));
    store.isModified = true;
  },
});

const safePvpDeaths = computed({
  get: () => Math.max(0, Math.floor(p.value?.pvpDeaths || 0)),
  set: (val: number) => {
    if (!p.value) return;
    p.value.pvpDeaths = Math.max(0, Math.floor(val || 0));
    store.isModified = true;
  },
});

const bartenderStatus = computed({
  get: () => Math.max(0, Math.min(255, Math.floor(p.value?.bartender ?? 0))),
  set: (val: number) => {
    if (!p.value) return;
    p.value.bartender = Math.max(0, Math.min(255, Math.floor(val || 0)));
    store.isModified = true;
  },
});

const superCartUnlocked = computed(() => ((p.value?.superCart ?? 0) & 1) !== 0);

const superCartEnabled = computed({
  get: () => ((p.value?.superCart ?? 0) & 2) !== 0,
  set: (val: boolean) => {
    if (!p.value) return;
    p.value.superCart = val ? (p.value.superCart | 2) : (p.value.superCart & ~2);
    store.isModified = true;
  },
});

const respawnSeconds = computed({
  get: () => Math.max(0, Math.min(1000, Math.round((p.value?.respawnTimer ?? 0) / 60))),
  set: (sec: number) => {
    if (!p.value) return;
    const clamped = Math.max(0, Math.min(1000, Math.round(Number(sec) || 0)));
    p.value.respawnTimer = clamped * 60;
    store.isModified = true;
  },
});

function toggleDeadState(val: boolean) {
  if (!p.value) return;
  p.value.dead = val;
  p.value.respawnTimer = val ? (p.value.respawnTimer > 0 ? p.value.respawnTimer : 600) : 0;
  store.isModified = true;
}

function revivePlayer() {
  if (!p.value) return;
  p.value.dead = false;
  p.value.respawnTimer = 0;
  store.isModified = true;
  showToast('已解除死亡倒计时状态');
}

function markModified() {
  store.isModified = true;
}

function addSpawn() {
  if (!p.value) return;
  p.value.spawns.push({ sx: 0, sy: 0, wid: 0, sname: 'NewWorld' });
  store.isModified = true;
}

function removeSpawn(idx: number) {
  if (!p.value) return;
  p.value.spawns.splice(idx, 1);
  store.isModified = true;
  showToast('已移除该世界出生点');
}

function clearSpawns() {
  if (!p.value) return;
  p.value.spawns = [];
  store.isModified = true;
  showToast('已清空所有世界出生点记录');
}

const tempSlotLabels = ['鼠标抓取', '旅途研究', '向导查询', '哥布林重铸'];

const unpackedTempSlots = computed(() =>
  p.value ? unpackTempSlots(p.value.tempBitmask, p.value.tempItems) : []
);

function addRefundSlot() {
  if (!p.value) return;
  p.value.refunds.push({ id: 0, stack: 0, prefix: 0 });
  const newIdx = p.value.refunds.length - 1;
  store.isModified = true;
  handleSlotClick('refundSlot', newIdx);
}

function removeRefundItem(idx: number) {
  if (!p.value) return;
  if (store.selectedSlot?.slotType === 'refundSlot') {
    deselectSlot();
  }
  p.value.refunds.splice(idx, 1);
  store.isModified = true;
}

function addDialogue() {
  if (!p.value) return;
  p.value.dialogues.push('');
  store.isModified = true;
}

function removeDialogue(idx: number) {
  if (!p.value) return;
  p.value.dialogues.splice(idx, 1);
  store.isModified = true;
}

function clearTempItems() {
  if (!p.value) return;
  if (store.selectedSlot?.slotType === 'tempSlot') {
    deselectSlot();
  }
  p.value.tempBitmask = 0;
  p.value.tempItems = [];
  store.isModified = true;
  showToast('已清空界面临时占用物');
}

function clearRefunds() {
  if (!p.value) return;
  if (store.selectedSlot?.slotType === 'refundSlot') {
    deselectSlot();
  }
  p.value.refunds = [];
  store.isModified = true;
  showToast('已清空跨箱合成待退还记录');
}

function clearDialogues() {
  if (!p.value) return;
  p.value.dialogues = [];
  store.isModified = true;
  showToast('已清空 NPC 对话记录');
}

interface PdaAccessoryItem {
  index: number;
  label: string;
  itemId: number;
}

interface PdaGroup {
  id: string;
  title: string;
  itemId: number;
  items: PdaAccessoryItem[];
}

const pdaGroups: PdaGroup[] = [
  {
    id: 'gps',
    title: 'GPS',
    itemId: 395,
    items: [
      { index: 0, label: '怀表', itemId: 17 },
      { index: 4, label: '深度计', itemId: 18 },
      { index: 3, label: '罗盘', itemId: 393 },
    ],
  },
  {
    id: 'fish',
    title: '渔民袖珍宝典',
    itemId: 3036,
    items: [
      { index: 1, label: '天气收音机', itemId: 3037 },
      { index: 7, label: '六分仪', itemId: 3096 },
      { index: 2, label: '渔民指南', itemId: 3120 },
    ],
  },
  {
    id: 'goblin',
    title: '哥布林数据仪',
    itemId: 3121,
    items: [
      { index: 9, label: '秒表', itemId: 3099 },
      { index: 12, label: '每秒伤害计数器', itemId: 3119 },
      { index: 10, label: '金属探测器', itemId: 3102 },
    ],
  },
  {
    id: 'rek',
    title: 'R.E.K. 3000',
    itemId: 3122,
    items: [
      { index: 5, label: '雷达', itemId: 3084 },
      { index: 11, label: '生命体分析机', itemId: 3118 },
      { index: 6, label: '杀怪计数器', itemId: 3095 },
    ],
  },
];

function toggleInfoDisplay(index: number) {
  if (!p.value) return;
  p.value.hideInfo[index] = !p.value.hideInfo[index];
  store.isModified = true;
}

function showAllInfoDisplays() {
  if (!p.value) return;
  p.value.hideInfo = p.value.hideInfo.map(() => false);
  store.isModified = true;
  showToast('已设为全部显示信息饰品');
}

function hideAllInfoDisplays() {
  if (!p.value) return;
  p.value.hideInfo = p.value.hideInfo.map(() => true);
  store.isModified = true;
  showToast('已设为全部隐藏信息饰品');
}

const builderAccToggleDefs: { index: number; label: string; itemId: number; tip: string }[] = [
  { index: 0, label: '标尺线', itemId: 486, tip: '显示光标测量虚线' },
  { index: 1, label: '网格标尺', itemId: 2799, tip: '显示屏幕对齐网格' },
  { index: 2, label: '自动致动器', itemId: 3624, tip: '放置物块时自动安置致动器' },
  { index: 3, label: '自动涂漆器', itemId: 2216, tip: '放置物块/墙时自动上漆' },
  { index: 8, label: '强制显线', itemId: 3611, tip: '未手持电工工具时依然显示电路' },
  { index: 10, label: '方块替换', itemId: 2214, tip: '直接用新方块替换已有物块' },
  { index: 11, label: '群落火把', itemId: 5043, tip: '放置普通火把时自动按当前群落替换' },
];

const builderAccTierDefs: { index: number; label: string; itemId: number }[] = [
  { index: 4, label: '红电线', itemId: 509 },
  { index: 5, label: '绿电线', itemId: 851 },
  { index: 6, label: '蓝电线', itemId: 850 },
  { index: 7, label: '黄电线', itemId: 3612 },
  { index: 9, label: '致动器', itemId: 849 },
];

const wireTierOptions = [
  { value: 0, label: '明亮' },
  { value: 1, label: '正常' },
  { value: 2, label: '淡化' },
  { value: 3, label: '隐藏' },
];

function setBuilderAccValue(index: number, val: number) {
  if (!p.value) return;
  while (p.value.builderAcc.length < 12) {
    p.value.builderAcc.push(0);
  }
  p.value.builderAcc[index] = val;
  if (index === 11) {
    p.value.usingBiomeTorches = val === 0;
  }
  store.isModified = true;
}

function toggleBuilderAcc(index: number) {
  if (!p.value) return;
  const isOn = (p.value.builderAcc[index] ?? 0) === 0;
  setBuilderAccValue(index, isOn ? 1 : 0);
}

function cycleBuilderAccTier(index: number) {
  if (!p.value) return;
  const current = p.value.builderAcc[index] ?? 1;
  const next = (current + 1) % 4;
  setBuilderAccValue(index, next);
}

function getWireTierClass(tier: number): string {
  switch (tier) {
    case 0:
      return 'bg-[#739CBF]/18 border-[#739CBF]/70 text-[#4A3F3D]';
    case 1:
      return 'bg-[#FFF7F2] border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]/70';
    case 2:
      return 'bg-[#EFE7E2]/75 border-[#EADFD9] text-[#8E807C] hover:bg-[#EFE7E2]';
    default:
      return 'bg-[#EFE7E2]/50 border-[#EADFD9] text-[#8E807C] hover:bg-[#EFE7E2]/80';
  }
}

function getWireTierIconClass(tier: number): string {
  if (tier === 2) return 'opacity-65';
  if (tier >= 3) return 'opacity-35 grayscale';
  return '';
}

function getWireTierLabel(tier: number): string {
  return wireTierOptions.find(opt => opt.value === tier)?.label ?? '正常';
}

function resetBuilderAcc() {
  if (!p.value) return;
  p.value.builderAcc = [1, ...Array(11).fill(0)];
  p.value.usingBiomeTorches = true;
  store.isModified = true;
  showToast('已恢复建筑辅助开关默认值');
}
</script>

<template>
  <div v-if="p" class="flex flex-col gap-3">
    <!-- 低版本导出兼容提示 -->
    <div
      v-if="versionCompatHints.length > 0"
      class="px-3 py-2 rounded-xl bg-[#F9D6DB]/35 border border-[#E598A3]/60 text-[11px] text-[#4A3F3D] leading-relaxed"
    >
      <strong>当前目标协议 v{{ v }} 兼容说明：</strong>以下字段在旧版存档格式中不存在，导出时会自动跳过写入：{{ versionCompatHints.join('、') }}。
    </div>

    <!-- 1. 游玩统计 -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(3036, 14), imageRendering: 'pixelated' }"></span>
          <span>游玩统计</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3 pt-0 text-xs">
        <!-- 游玩统计 -->
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <!-- 游玩时长 -->
          <div class="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-[#4A3F3D] flex items-center gap-1.5 whitespace-nowrap">
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(17, 14), imageRendering: 'pixelated' }"></span>
                <span>累计游玩时长</span>
              </span>
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2] shrink-0"
                @click="updatePlayTime(0, 0)"
              >
                清零
              </Button>
            </div>
            <div class="flex items-center gap-1.5 whitespace-nowrap">
              <input
                v-model.number="playHours"
                type="number"
                min="0"
                class="w-14 h-7 text-center font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              />
              <span class="text-[#8E807C] shrink-0">小时</span>
              <input
                v-model.number="playMinutes"
                type="number"
                min="0"
                max="59"
                class="w-12 h-7 text-center font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              />
              <span class="text-[#8E807C] shrink-0">分钟</span>
            </div>
          </div>

          <!-- 渔夫任务次数 -->
          <div class="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <span class="font-bold text-[#4A3F3D] flex items-center gap-1.5 whitespace-nowrap">
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(3120, 14), imageRendering: 'pixelated' }"></span>
                <span>渔夫任务次数</span>
              </span>
              <div class="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="xs"
                  class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                  @click="p.anglerQuestsFinished = 30; store.isModified = true"
                >
                  30 (金钓竿)
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                  @click="p.anglerQuestsFinished = 200; store.isModified = true"
                >
                  200 (全成就)
                </Button>
              </div>
            </div>
            <input
              v-model.number="p.anglerQuestsFinished"
              type="number"
              min="0"
              class="w-full h-7 px-2 font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              @input="store.isModified = true"
            />
          </div>

          <!-- 税收官待领钱币 (金/银/铜三格) -->
          <div class="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-1.5">
              <span class="font-bold text-[#4A3F3D] flex items-center gap-1.5 whitespace-nowrap">
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(73, 14), imageRendering: 'pixelated' }"></span>
                <span>税收官待领钱币</span>
              </span>
              <div class="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="xs"
                  class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                  @click="p.taxMoney = 250000; store.isModified = true"
                >
                  25金上限
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                  @click="p.taxMoney = 0; store.isModified = true"
                >
                  清零
                </Button>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <div class="flex items-center gap-1">
                <input
                  v-model.number="taxGold"
                  type="number"
                  min="0"
                  class="w-12 h-7 px-1 text-center font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                />
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(73, 13), imageRendering: 'pixelated' }" title="金"></span>
              </div>
              <div class="flex items-center gap-1">
                <input
                  v-model.number="taxSilver"
                  type="number"
                  min="0"
                  max="99"
                  class="w-10 h-7 px-1 text-center font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                />
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(72, 13), imageRendering: 'pixelated' }" title="银"></span>
              </div>
              <div class="flex items-center gap-1">
                <input
                  v-model.number="taxCopper"
                  type="number"
                  min="0"
                  max="99"
                  class="w-10 h-7 px-1 text-center font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                />
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(71, 13), imageRendering: 'pixelated' }" title="铜"></span>
              </div>
            </div>
          </div>

          <!-- 高尔夫积分 -->
          <div class="col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-[#4A3F3D] flex items-center gap-1.5 whitespace-nowrap">
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(4039, 14), imageRendering: 'pixelated' }"></span>
                <span>高尔夫积分</span>
              </span>
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2] shrink-0"
                @click="p.golferScore = 2000; store.isModified = true"
              >
                2000 满档
              </Button>
            </div>
            <input
              v-model.number="p.golferScore"
              type="number"
              min="0"
              class="w-full h-7 px-2 font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              @input="store.isModified = true"
            />
          </div>

          <!-- 酒馆老板引导 -->
          <div class="col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <span class="text-[11px] font-semibold text-[#4A3F3D] flex items-center gap-1 whitespace-nowrap">
                <span class="shrink-0" :style="{ ...getItemSpriteStyle(3817, 13), imageRendering: 'pixelated' }"></span>
                <span>酒馆老板引导</span>
              </span>
              <Button
                variant="outline"
                size="xs"
                :disabled="bartenderStatus === 0"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2] disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
                @click="bartenderStatus = 0"
              >
                重置(0)
              </Button>
            </div>
            <div class="flex items-center gap-1.5 min-w-0">
              <input
                v-model.number="bartenderStatus"
                type="number"
                min="0"
                max="255"
                class="w-12 h-7 px-1 text-center font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none shrink-0"
              />
              <span class="text-[10px] text-[#8E807C] truncate">
                {{ bartenderStatus === 0 ? '未领10奖章' : `阶段 ${bartenderStatus}` }}
              </span>
            </div>
          </div>

          <!-- PvE 死亡次数 -->
          <div class="col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[11px] font-semibold text-[#8E807C] whitespace-nowrap">PvE 死亡次数</span>
              <Button
                variant="outline"
                size="xs"
                :disabled="safePveDeaths === 0"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2] disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
                @click="safePveDeaths = 0"
              >
                清零
              </Button>
            </div>
            <input
              v-model.number="safePveDeaths"
              type="number"
              min="0"
              class="w-full h-7 px-2 font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
            />
          </div>

          <!-- PvP 死亡次数 -->
          <div class="col-span-1 p-2.5 rounded-lg bg-[#FFF7F2]/80 flex flex-col justify-between gap-1.5 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[11px] font-semibold text-[#8E807C] whitespace-nowrap">PvP 死亡次数</span>
              <Button
                variant="outline"
                size="xs"
                :disabled="safePvpDeaths === 0"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2] disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
                @click="safePvpDeaths = 0"
              >
                清零
              </Button>
            </div>
            <input
              v-model.number="safePvpDeaths"
              type="number"
              min="0"
              class="w-full h-7 px-2 font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 2. 杂项状态 -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(5289, 14), imageRendering: 'pixelated' }"></span>
          <span>杂项状态</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col divide-y divide-[#EADFD9]/60 text-xs">
        <div class="flex items-center justify-between gap-2 py-2 first:pt-0.5">
          <div class="flex flex-col min-w-0">
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(75, 14), imageRendering: 'pixelated' }"></span>
              <span>选人界面标星收藏</span>
            </span>
            <span class="text-[10px] text-[#8E807C] truncate">开启后角色会在选人列表置顶收藏</span>
          </div>
          <Switch class="shrink-0" :checked="(p.isFavorite ?? 0n) !== 0n" @update:checked="togglePlayerFavorite" />
        </div>

        <div class="flex items-center justify-between gap-2 py-2">
          <div class="flex flex-col min-w-0">
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(5289, 14), imageRendering: 'pixelated' }"></span>
              <span>矿车升级包</span>
            </span>
            <span class="text-[10px] text-[#8E807C] truncate">
              <template v-if="superCartUnlocked">已永久解锁，与装备栏开关同步</template>
              <template v-else>
                尚未永久解锁（前往<button
                  type="button"
                  class="text-[#739CBF] hover:underline font-medium mx-0.5 cursor-pointer"
                  @click="store.characterSubTab = 'permanent'"
                >「永久能力」</button>开启）
              </template>
            </span>
          </div>
          <Switch class="shrink-0" :checked="superCartEnabled" @update:checked="superCartEnabled = $event" />
        </div>

        <div
          :class="[
            'flex items-center justify-between gap-2 py-2 last:pb-0.5 rounded-lg transition-colors',
            p.dead ? 'bg-rose-50/80 px-2 -mx-2' : ''
          ]"
        >
          <div class="flex flex-col min-w-0">
            <span class="font-medium text-[#4A3F3D]">重生倒计时</span>
            <span class="text-[10px] text-[#8E807C]">
              {{ p.dead ? `剩余 ${respawnSeconds} 秒 (${p.respawnTimer} tick)` : '当前存活' }}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <template v-if="p.dead">
              <input
                v-model.number="respawnSeconds"
                type="number"
                min="0"
                max="1000"
                class="w-14 h-6 text-center font-mono font-bold text-xs rounded border border-rose-200 bg-white text-[#4A3F3D] outline-none"
                title="剩余复活秒数 (0~1000)"
              />
              <span class="text-[11px] text-[#8E807C]">秒</span>
              <Button
                variant="destructive"
                size="xs"
                class="h-6 text-[10px] px-2"
                @click="revivePlayer"
              >
                复活
              </Button>
            </template>
            <Switch class="shrink-0" :checked="p.dead" @update:checked="toggleDeadState" />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 3. 信息饰品 -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(3123, 14), imageRendering: 'pixelated' }"></span>
          <span>信息饰品</span>
        </CardTitle>
        <div class="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="xs" class="h-5 text-[10px] px-2 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]" @click="showAllInfoDisplays">
            全部显示
          </Button>
          <Button variant="outline" size="xs" class="h-5 text-[10px] px-2 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]" @click="hideAllInfoDisplays">
            全部隐藏
          </Button>
        </div>
      </CardHeader>
      <CardContent class="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
        <div
          v-for="grp in pdaGroups"
          :key="grp.id"
          class="flex flex-col gap-1.5 p-2 rounded-lg bg-[#FFF7F2]/65"
        >
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-[#4A3F3D]">
            <span :style="{ ...getItemSpriteStyle(grp.itemId, 14), imageRendering: 'pixelated' }"></span>
            <span>{{ grp.title }}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="item in grp.items"
              :key="item.index"
              type="button"
              :class="[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer select-none border',
                !p.hideInfo[item.index]
                  ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5]'
                  : 'bg-[#EFE7E2]/70 text-[#8E807C] border-[#EADFD9] opacity-80 hover:opacity-100'
              ]"
              :title="`${item.label}：${!p.hideInfo[item.index] ? '显示中（点击隐藏）' : '已隐藏（点击显示）'}`"
              @click="toggleInfoDisplay(item.index)"
            >
              <span
                :class="!p.hideInfo[item.index] ? '' : 'opacity-45 grayscale'"
                :style="{ ...getItemSpriteStyle(item.itemId, 14), imageRendering: 'pixelated' }"
              ></span>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 4. 建筑与电线 -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(3611, 14), imageRendering: 'pixelated' }"></span>
          <span>建筑与电线</span>
        </CardTitle>
        <Button variant="outline" size="xs" class="h-5 text-[10px] px-2 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]" @click="resetBuilderAcc">
          恢复默认
        </Button>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col gap-2.5 text-xs">
        <div class="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#FFF7F2]/75">
          <button
            v-for="b in builderAccToggleDefs"
            :key="b.index"
            type="button"
            :title="`${b.label} (${b.tip}) - 当前${(p.builderAcc[b.index] ?? 0) === 0 ? '已开启' : '已关闭'}`"
            :class="[
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer select-none',
              (p.builderAcc[b.index] ?? 0) === 0
                ? 'bg-[#739CBF]/15 border-[#739CBF]/60 text-[#4A3F3D]'
                : 'bg-[#EFE7E2]/65 border-[#EADFD9] text-[#8E807C] hover:bg-[#EFE7E2]'
            ]"
            @click="toggleBuilderAcc(b.index)"
          >
            <span
              :class="(p.builderAcc[b.index] ?? 0) === 0 ? '' : 'opacity-40 grayscale'"
              :style="{ ...getItemSpriteStyle(b.itemId, 16), imageRendering: 'pixelated' }"
            ></span>
            <span>{{ b.label }}</span>
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#FFF7F2]/75">
          <button
            v-for="b in builderAccTierDefs"
            :key="b.index"
            type="button"
            :title="`${b.label}：${getWireTierLabel(p.builderAcc[b.index] ?? 1)}（点击切换：明亮 → 正常 → 淡化 → 隐藏）`"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer select-none whitespace-nowrap',
              getWireTierClass(p.builderAcc[b.index] ?? 1)
            ]"
            @click="cycleBuilderAccTier(b.index)"
          >
            <span
              class="shrink-0"
              :class="getWireTierIconClass(p.builderAcc[b.index] ?? 1)"
              :style="{ ...getItemSpriteStyle(b.itemId, 15), imageRendering: 'pixelated' }"
            ></span>
            <span>{{ b.label }}</span>
            <span
              :class="(p.builderAcc[b.index] ?? 1) === 0 ? 'text-[10px] font-bold' : 'text-[10px] opacity-75'"
            >
              · {{ getWireTierLabel(p.builderAcc[b.index] ?? 1) }}
            </span>
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- 5. 出生点 (支持编辑与增删) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(224, 14), imageRendering: 'pixelated' }"></span>
          <span>出生点 ({{ p.spawns.length }})</span>
        </CardTitle>
        <div class="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="xs"
            class="h-5 text-[10px] px-2 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
            @click="addSpawn"
          >
            + 新增
          </Button>
          <Button
            variant="outline"
            size="xs"
            :disabled="p.spawns.length === 0"
            class="h-5 text-[10px] px-2 btn-danger-soft disabled:opacity-45 disabled:cursor-not-allowed"
            @click="clearSpawns"
          >
            清空全部
          </Button>
        </div>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col gap-2 text-xs">
        <div v-if="p.spawns.length === 0" class="text-[11px] text-[#8E807C] py-1.5 px-2.5 rounded-lg bg-[#FFF7F2]/60">
          暂无出生点记录。
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          <div
            v-for="(sp, idx) in p.spawns"
            :key="idx"
            class="flex flex-col gap-1.5 p-2 rounded-lg bg-[#FFF7F2]/80 min-w-0"
          >
            <div class="flex items-center gap-1.5">
              <input
                v-model="sp.sname"
                type="text"
                placeholder="世界名称"
                class="flex-1 min-w-0 h-6 px-2 text-xs font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                @input="markModified"
              />
              <button
                type="button"
                class="p-1 rounded text-[#8E807C] hover:text-rose-700 hover:bg-rose-50 cursor-pointer shrink-0 transition-colors"
                title="删除该出生点"
                @click="removeSpawn(idx)"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-3 gap-1.5 text-[10px]">
              <label class="flex items-center gap-1 text-[#8E807C] min-w-0">
                <span class="shrink-0">ID</span>
                <input
                  v-model.number="sp.wid"
                  type="number"
                  class="w-full min-w-0 h-6 px-1 text-center font-mono rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                  @input="markModified"
                />
              </label>
              <label class="flex items-center gap-1 text-[#8E807C] min-w-0">
                <span class="shrink-0">X</span>
                <input
                  v-model.number="sp.sx"
                  type="number"
                  class="w-full min-w-0 h-6 px-1 text-center font-mono rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                  @input="markModified"
                />
              </label>
              <label class="flex items-center gap-1 text-[#8E807C] min-w-0">
                <span class="shrink-0">Y</span>
                <input
                  v-model.number="sp.sy"
                  type="number"
                  class="w-full min-w-0 h-6 px-1 text-center font-mono rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                  @input="markModified"
                />
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 6. 底层暂存与记录编辑 (三项默认折叠，展开可改) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(3099, 14), imageRendering: 'pixelated' }"></span>
          <span>底层暂存与记录编辑</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col divide-y divide-[#EADFD9]/60 text-xs">
        <!-- 6.1 界面临时占用 (4 固定槽位) -->
        <div class="py-2 first:pt-0.5 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] text-[#4A3F3D] whitespace-nowrap">
              界面临时占用: <strong>{{ p.tempItems.length }}</strong>/4
              <span class="text-[10px] text-[#8E807C] ml-1 hidden sm:inline">(鼠标 / 研究 / 向导 / 重铸)</span>
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                @click="tempOpen = !tempOpen"
              >
                {{ tempOpen ? '收起' : '编辑' }}
              </Button>
              <Button
                variant="outline"
                size="xs"
                :disabled="p.tempItems.length === 0"
                class="h-5 text-[10px] px-1.5 btn-danger-soft disabled:opacity-45 disabled:cursor-not-allowed"
                @click="clearTempItems"
              >
                清空
              </Button>
            </div>
          </div>
          <div v-if="tempOpen" class="flex flex-col gap-2 pt-1">
            <span class="text-[10px] text-[#8E807C]">点击格子后可从右侧物品库编辑或拖拽互换</span>
            <div class="grid grid-cols-4 gap-2 max-w-xs" data-slot="radix-petal-frame">
              <div
                v-for="(slot, idx) in unpackedTempSlots"
                :key="idx"
                class="flex flex-col items-center gap-1"
              >
                <ItemSlot
                  :item="slot"
                  slot-type="tempSlot"
                  :index="idx"
                  :label="`${idx + 1}`"
                />
                <span class="text-[10px] text-[#8E807C] whitespace-nowrap">{{ tempSlotLabels[idx] }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 6.2 跨箱合成待退还 -->
        <div class="py-2 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] text-[#4A3F3D] whitespace-nowrap">
              跨箱合成待退还: <strong>{{ p.refunds.length }}</strong>
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                @click="refundsOpen = !refundsOpen"
              >
                {{ refundsOpen ? '收起' : '编辑' }}
              </Button>
              <Button
                variant="outline"
                size="xs"
                :disabled="p.refunds.length === 0"
                class="h-5 text-[10px] px-1.5 btn-danger-soft disabled:opacity-45 disabled:cursor-not-allowed"
                @click="clearRefunds"
              >
                清空
              </Button>
            </div>
          </div>
          <div v-if="refundsOpen" class="flex flex-col gap-2 pt-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-[#8E807C]">点击格子后从右侧物品库选物 (1.4.5+)</span>
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-2 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2] shrink-0"
                @click="addRefundSlot"
              >
                + 添加槽位
              </Button>
            </div>
            <div v-if="p.refunds.length === 0" class="text-[10px] text-[#8E807C] px-2 py-1 rounded bg-[#FFF7F2]/60">
              暂无待退还物品。
            </div>
            <div v-else class="flex flex-wrap gap-2" data-slot="radix-petal-frame">
              <div
                v-for="(rf, idx) in p.refunds"
                :key="idx"
                class="relative group"
              >
                <ItemSlot
                  :item="rf"
                  slot-type="refundSlot"
                  :index="idx"
                  :label="`${idx + 1}`"
                />
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-[#EADFD9] text-[#8E807C] hover:text-rose-600 hover:border-rose-300 flex items-center justify-center shadow-2xs cursor-pointer z-20"
                  title="移除该槽位"
                  @click.stop="removeRefundItem(idx)"
                >
                  <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 6.3 NPC 首次对话记录 -->
        <div class="py-2 last:pb-0.5 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] text-[#4A3F3D] whitespace-nowrap">
              NPC 首次对话记录: <strong>{{ p.dialogues.length }}</strong>
            </span>
            <div class="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                @click="dialoguesOpen = !dialoguesOpen"
              >
                {{ dialoguesOpen ? '收起' : '编辑' }}
              </Button>
              <Button
                variant="outline"
                size="xs"
                :disabled="p.dialogues.length === 0"
                class="h-5 text-[10px] px-1.5 btn-danger-soft disabled:opacity-45 disabled:cursor-not-allowed"
                @click="clearDialogues"
              >
                重置
              </Button>
            </div>
          </div>
          <div v-if="dialoguesOpen" class="flex flex-col gap-1.5 pt-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-[#8E807C]">支持 1.4.5+ (v310+) 协议导出</span>
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-2 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]"
                @click="addDialogue"
              >
                + 添加键名
              </Button>
            </div>
            <div v-if="p.dialogues.length === 0" class="text-[10px] text-[#8E807C] px-2 py-1 rounded bg-[#FFF7F2]/60">
              暂无对话记录。
            </div>
            <div
              v-for="(_, idx) in p.dialogues"
              :key="idx"
              class="flex items-center gap-1.5"
            >
              <input
                v-model="p.dialogues[idx]"
                type="text"
                placeholder="如 GuideSpecialText.xxx"
                class="flex-1 min-w-0 h-6.5 px-2 text-[11px] font-mono rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                @input="markModified"
              />
              <button
                type="button"
                class="p-1 rounded text-[#8E807C] hover:text-rose-700 hover:bg-rose-50 cursor-pointer shrink-0"
                title="删除该记录"
                @click="removeDialogue(idx)"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
