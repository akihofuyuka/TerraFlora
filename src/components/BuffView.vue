<script setup lang="ts">
import { ref, computed } from 'vue';
import { store, showToast, type BuffItem } from '@/store';
import AppModal from '@/components/ui/AppModal.vue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getItemSpriteStyle, getBuffSpriteStyle } from '@/utils/sprite';

const p = computed(() => store.player);

// 当前选中的 Buff 槽位索引 (0 ~ 43) 与编辑前快照
const selectedSlotIndex = ref<number | null>(null);
const slotSnapshot = ref<{ type: number; time: number; wasModified: boolean } | null>(null);
const buffSearchQuery = ref('');
const selectedCategory = ref<'all' | 'combat' | 'utility' | 'debuff'>('all');
const showRawTicks = ref(false);

// 确保角色 buffs 数组至少有 44 个槽位
const buffs = computed(() => {
  if (!p.value) return [];
  if (!p.value.buffs) p.value.buffs = [];
  while (p.value.buffs.length < 44) {
    p.value.buffs.push({ type: 0, time: 0 });
  }
  return p.value.buffs;
});

const activeBuffsCount = computed(() => {
  return buffs.value.filter(b => b.type > 0).length;
});

// 格式化持续时间 (ticks 转 天/时/分/秒，60 ticks = 1秒)
function formatDuration(ticks: number): string {
  if (!ticks || ticks <= 0) return '0秒';
  const totalSeconds = Math.floor(ticks / 60);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${hours}时 ${minutes}分`;
  }
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 常用增益 ID 列表
const COMBAT_BUFF_IDS = [
  5,   // 铁皮 (Iron Skin)
  2,   // 再生 (Regeneration)
  3,   // 敏捷 (Swiftness)
  114, // 耐力 (Endurance)
  115, // 怒气 (Wrath)
  117, // 暴怒 (Rage)
  113, // 生命力 (Lifeforce)
  7,   // 魔能 (Magic Power)
  6,   // 魔力再生 (Mana Regeneration)
  110, // 召唤 (Summoning)
  16,  // 箭术 (Archery)
  29,  // 灵视 (Clairvoyance)
  159, // 锋利 (Sharpened)
  93,  // 弹药箱 (Ammo Box)
  192, // 蛋糕糖果冲刺 (Sugar Rush)
  108, // 泰坦 (Titan)
];

// 官方完整负面 Debuff ID (源自 Terraria.Main.debuff，共 76 个)
const DEBUFF_IDS = new Set([
  20, 21, 22, 23, 24, 25, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 43, 44,
  46, 47, 67, 68, 69, 70, 72, 80, 86, 87, 88, 89, 94, 103, 119, 120, 137, 144,
  145, 146, 147, 148, 149, 153, 156, 157, 158, 160, 163, 164, 169, 183, 186, 189,
  194, 195, 196, 197, 199, 203, 204, 215, 320, 321, 323, 324, 332, 333, 334, 344,
  350, 353, 395, 397, 398, 399, 400
]);

// 快捷操作：全开常用战斗增益
function applyAllCombatBuffs() {
  if (!p.value) return;
  const ONE_HOUR_TICKS = 216000; // 60 * 60 * 60 = 1 小时
  let appliedCount = 0;

  for (const buffId of COMBAT_BUFF_IDS) {
    // 检查是否已经在槽位中
    const existing = buffs.value.find(b => b.type === buffId);
    if (existing) {
      existing.time = ONE_HOUR_TICKS;
      continue;
    }
    // 找第一个空槽位
    const emptySlot = buffs.value.find(b => b.type === 0);
    if (emptySlot) {
      emptySlot.type = buffId;
      emptySlot.time = ONE_HOUR_TICKS;
      appliedCount++;
    }
  }

  store.isModified = true;
  showToast(`已成功配置常用战斗增益 (共 ${appliedCount} 种新填入，持续 1 小时)`);
}

// 快捷操作：一键清除所有负面 Debuff
function clearAllDebuffs() {
  if (!p.value) return;
  let clearedCount = 0;

  for (const b of buffs.value) {
    if (b.type > 0 && DEBUFF_IDS.has(b.type)) {
      b.type = 0;
      b.time = 0;
      clearedCount++;
    }
  }

  store.isModified = true;
  showToast(clearedCount > 0 ? `已清除 ${clearedCount} 个负面 Debuff` : '当前角色无负面 Debuff');
}

// 快捷操作：清空全部 Buff
function clearAllBuffs() {
  if (!p.value) return;
  for (const b of buffs.value) {
    b.type = 0;
    b.time = 0;
  }
  store.isModified = true;
  showToast('已清空全部 44 个状态增益槽位');
}

// 选中槽位操作
function selectSlot(idx: number) {
  const slot = buffs.value[idx];
  slotSnapshot.value = slot
    ? { type: slot.type, time: slot.time, wasModified: store.isModified }
    : null;
  selectedSlotIndex.value = idx;
  buffSearchQuery.value = '';
  showRawTicks.value = false;
}

function cancelSlotEditor() {
  if (selectedSlotIndex.value !== null && slotSnapshot.value) {
    const slot = buffs.value[selectedSlotIndex.value];
    if (slot) {
      slot.type = slotSnapshot.value.type;
      slot.time = slotSnapshot.value.time;
    }
    store.isModified = slotSnapshot.value.wasModified;
  }
  slotSnapshot.value = null;
  selectedSlotIndex.value = null;
}

function confirmSlotEditor() {
  slotSnapshot.value = null;
  selectedSlotIndex.value = null;
}

function setSlotBuff(buff: BuffItem) {
  if (selectedSlotIndex.value === null || !p.value) return;
  const slot = buffs.value[selectedSlotIndex.value];
  slot.type = buff.id;
  // 若当前没有时间或时间为 0，默认给 30 分钟 (108,000 ticks)
  if (slot.time <= 0) {
    slot.time = 108000;
  }
  store.isModified = true;
  showToast(`槽位 #${selectedSlotIndex.value + 1} 已设为: ${buff.name}`);
}

function clearCurrentSlot() {
  if (selectedSlotIndex.value === null || !p.value) return;
  const slot = buffs.value[selectedSlotIndex.value];
  slot.type = 0;
  slot.time = 0;
  store.isModified = true;
  showToast(`已清空槽位 #${selectedSlotIndex.value + 1}`);
}

// Terraria 底层 buffTime 为 32 位有符号整型 (Int32)，最大值 2,147,483,647 ticks (约 414 天 6 小时 3 分 14 秒)
const MAX_BUFF_TICKS = 2147483647;

const currentDays = computed({
  get: () => {
    if (selectedSlotIndex.value === null || !buffs.value[selectedSlotIndex.value]) return 0;
    const totalSec = Math.floor(buffs.value[selectedSlotIndex.value].time / 60);
    return Math.floor(totalSec / 86400);
  },
  set: (val: number) => updateDurationFromDHMS(val, currentHours.value, currentMinutes.value, currentSeconds.value),
});

const currentHours = computed({
  get: () => {
    if (selectedSlotIndex.value === null || !buffs.value[selectedSlotIndex.value]) return 0;
    const totalSec = Math.floor(buffs.value[selectedSlotIndex.value].time / 60);
    return Math.floor((totalSec % 86400) / 3600);
  },
  set: (val: number) => updateDurationFromDHMS(currentDays.value, val, currentMinutes.value, currentSeconds.value),
});

const currentMinutes = computed({
  get: () => {
    if (selectedSlotIndex.value === null || !buffs.value[selectedSlotIndex.value]) return 0;
    const totalSec = Math.floor(buffs.value[selectedSlotIndex.value].time / 60);
    return Math.floor((totalSec % 3600) / 60);
  },
  set: (val: number) => updateDurationFromDHMS(currentDays.value, currentHours.value, val, currentSeconds.value),
});

const currentSeconds = computed({
  get: () => {
    if (selectedSlotIndex.value === null || !buffs.value[selectedSlotIndex.value]) return 0;
    const totalSec = Math.floor(buffs.value[selectedSlotIndex.value].time / 60);
    return totalSec % 60;
  },
  set: (val: number) => updateDurationFromDHMS(currentDays.value, currentHours.value, currentMinutes.value, val),
});

function updateDurationFromDHMS(d: number, h: number, m: number, s: number) {
  if (selectedSlotIndex.value === null || !p.value) return;
  const safeD = Math.max(0, Number(d) || 0);
  const safeH = Math.max(0, Number(h) || 0);
  const safeM = Math.max(0, Number(m) || 0);
  const safeS = Math.max(0, Number(s) || 0);
  const totalSec = safeD * 86400 + safeH * 3600 + safeM * 60 + safeS;
  const ticks = Math.min(MAX_BUFF_TICKS, Math.max(0, Math.round(totalSec * 60)));
  buffs.value[selectedSlotIndex.value].time = ticks;
  store.isModified = true;
}

function setSlotTicks(ticks: number) {
  if (selectedSlotIndex.value === null || !p.value) return;
  const safeTicks = Math.min(MAX_BUFF_TICKS, Math.max(0, Math.round(Number(ticks) || 0)));
  buffs.value[selectedSlotIndex.value].time = safeTicks;
  store.isModified = true;
}

// 过滤候选项
const filteredBuffs = computed(() => {
  const q = buffSearchQuery.value.trim().toLowerCase();
  const list = store.buffsList;

  return list.filter(b => {
    // 类别筛选
    if (selectedCategory.value === 'combat' && !COMBAT_BUFF_IDS.includes(b.id)) return false;
    if (selectedCategory.value === 'debuff' && !DEBUFF_IDS.has(b.id)) return false;

    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.en.toLowerCase().includes(q) ||
      b.py.includes(q) ||
      b.pys.includes(q) ||
      b.id.toString() === q
    );
  });
});
</script>

<template>
  <div v-if="p" class="flex flex-col gap-4">
    <!-- 状态增益卡片 (整合快捷操作与 44 个槽位网格) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EADFD9]/60">
        <div class="flex items-center gap-2">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <span :style="{ ...getItemSpriteStyle(292, 14), imageRendering: 'pixelated' }"></span>
            <span>状态增益</span>
          </CardTitle>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FFF7F2] border border-[#EADFD9] text-[#739CBF]">
            {{ activeBuffsCount }} / 44
          </span>
        </div>

        <!-- 快捷操作按钮 -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="default"
            size="xs"
            class="h-6.5 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-2xs px-2.5 flex items-center gap-1"
            @click="applyAllCombatBuffs"
          >
            <span :style="{ ...getItemSpriteStyle(292, 12), imageRendering: 'pixelated' }"></span>
            <span>常用战斗增益</span>
          </Button>

          <Button
            variant="outline"
            size="xs"
            class="h-6.5 text-xs font-semibold btn-danger-soft px-2"
            @click="clearAllDebuffs"
          >
            清除减益
          </Button>

          <Button
            variant="outline"
            size="xs"
            class="h-6.5 text-xs font-semibold btn-danger-soft px-2"
            @click="clearAllBuffs"
          >
            清空
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-2.5 sm:p-3">
        <!-- 44 个 Buff 槽位 (暖灰实心圆角凹槽，手机端 4 列紧凑排布，桌面端 11 列) -->
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-11 gap-1.5 sm:gap-2">
          <div
            v-for="(slot, idx) in buffs"
            :key="idx"
            :class="[
              'p-1.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-between text-center relative group min-h-[68px] sm:min-h-[76px]',
              selectedSlotIndex === idx
                ? 'bg-[#EEF4F9] border-[#739CBF] ring-2 ring-[#739CBF]/60 shadow-xs'
                : slot.type > 0
                  ? 'bg-[#FFF7F2] border-[#EADFD9] hover:bg-[#EFE7E2] hover:border-[#C4D6E5]'
                  : 'bg-[#EFE7E2] border-[#EADFD9] hover:bg-[#E8DFD9]'
            ]"
            @click="selectSlot(idx)"
          >
            <!-- 槽位序号徽章 -->
            <span class="absolute top-0.5 left-1 text-[9px] font-mono text-[#8E807C]/70">#{{ idx + 1 }}</span>

            <!-- 图标展示 -->
            <div class="w-7 h-7 flex items-center justify-center mt-2 shrink-0">
              <div
                v-if="slot.type > 0"
                :style="getBuffSpriteStyle(slot.type, 28)"
                :title="store.buffsMap.get(slot.type)?.tip || ''"
              ></div>
            </div>

            <!-- 名称展示与时长 -->
            <div v-if="slot.type > 0" class="flex flex-col items-center w-full px-0.5 mt-0.5">
              <span class="text-[10px] sm:text-[11px] font-bold truncate max-w-full leading-tight text-[#4A3F3D]">
                {{ store.buffsMap.get(slot.type)?.name || `Buff #${slot.type}` }}
              </span>
              <span class="text-[9px] font-mono font-semibold text-[#2F658D] leading-tight">
                {{ formatDuration(slot.time) }}
              </span>
            </div>
            <div v-else class="h-3.5"></div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 槽位修改与 Buff 搜索弹窗 -->
    <AppModal
      :open="selectedSlotIndex !== null"
      :title="selectedSlotIndex !== null ? `配置槽位 #${selectedSlotIndex + 1}` : ''"
      max-width-class="max-w-xl"
      panel-class="max-h-[86dvh]"
      body-class="p-3 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-2.5"
      z-index-class="z-[60]"
      @close="cancelSlotEditor"
    >
      <template #icon>
        <span :style="{ ...getItemSpriteStyle(292, 16), imageRendering: 'pixelated' }"></span>
      </template>

      <template v-if="selectedSlotIndex !== null">
        <!-- 当前槽位状态概览 -->
        <div class="p-2 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center shrink-0">
              <div
                v-if="buffs[selectedSlotIndex].type > 0"
                :style="getBuffSpriteStyle(buffs[selectedSlotIndex].type, 26)"
              ></div>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-[#4A3F3D] truncate">
                {{ buffs[selectedSlotIndex].type > 0 ? store.buffsMap.get(buffs[selectedSlotIndex].type)?.name : '未设置状态' }}
              </span>
              <span v-if="buffs[selectedSlotIndex].type > 0 && store.buffsMap.get(buffs[selectedSlotIndex].type)?.tip" class="text-[11px] text-[#8E807C] truncate">
                {{ store.buffsMap.get(buffs[selectedSlotIndex].type)?.tip }}
              </span>
            </div>
          </div>

          <!-- 清除当前槽位 -->
          <Button
            v-if="buffs[selectedSlotIndex].type > 0"
            variant="outline"
            size="xs"
            class="h-7 btn-danger-soft px-2.5 shrink-0"
            @click="clearCurrentSlot"
          >
            清空该槽位
          </Button>
        </div>

        <!-- 持续时间调节 -->
        <div v-if="buffs[selectedSlotIndex].type > 0" class="flex flex-col gap-2 p-2.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-xs font-bold text-[#4A3F3D]">持续时间 (天/时/分/秒)</span>
            <!-- 快捷预设按钮: 5 分钟 / 1 小时 / 超长 / Ticks 切换 -->
            <div class="flex items-center gap-1 flex-wrap">
              <button
                class="px-2 py-0.5 text-[11px] font-semibold rounded-lg border border-[#EADFD9] bg-white hover:bg-[#EFE7E2] cursor-pointer text-[#4A3F3D] shadow-2xs"
                @click="setSlotTicks(18000)"
              >
                5 分钟
              </button>
              <button
                class="px-2 py-0.5 text-[11px] font-semibold rounded-lg border border-[#EADFD9] bg-white hover:bg-[#EFE7E2] cursor-pointer text-[#4A3F3D] shadow-2xs"
                @click="setSlotTicks(216000)"
              >
                1 小时
              </button>
              <button
                class="px-2 py-0.5 text-[11px] font-semibold rounded-lg border border-[#C4D6E5] bg-[#EEF4F9] hover:bg-[#739CBF]/20 cursor-pointer text-[#2F658D] shadow-2xs"
                @click="setSlotTicks(MAX_BUFF_TICKS)"
                title="2,147,483,647 ticks (约 414 天/上限)"
              >
                超长
              </button>
              <button
                type="button"
                class="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md border cursor-pointer transition-colors"
                :class="showRawTicks ? 'border-[#C4D6E5] bg-[#EEF4F9] text-[#2F658D]' : 'border-transparent text-[#8E807C] hover:text-[#4A3F3D]'"
                title="切换原始 Ticks 数值输入"
                @click="showRawTicks = !showRawTicks"
              >
                Ticks
              </button>
            </div>
          </div>

          <!-- 天 / 时 / 分 / 秒 输入 -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <div class="flex items-center gap-1">
              <input
                v-model.number="currentDays"
                type="number"
                min="0"
                max="414"
                class="w-12 h-7 text-center font-mono font-bold text-xs rounded-lg border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              />
              <span class="text-xs text-[#8E807C]">天</span>
            </div>
            <div class="flex items-center gap-1">
              <input
                v-model.number="currentHours"
                type="number"
                min="0"
                max="23"
                class="w-11 h-7 text-center font-mono font-bold text-xs rounded-lg border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              />
              <span class="text-xs text-[#8E807C]">时</span>
            </div>
            <div class="flex items-center gap-1">
              <input
                v-model.number="currentMinutes"
                type="number"
                min="0"
                max="59"
                class="w-11 h-7 text-center font-mono font-bold text-xs rounded-lg border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              />
              <span class="text-xs text-[#8E807C]">分</span>
            </div>
            <div class="flex items-center gap-1">
              <input
                v-model.number="currentSeconds"
                type="number"
                min="0"
                max="59"
                class="w-11 h-7 text-center font-mono font-bold text-xs rounded-lg border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              />
              <span class="text-xs text-[#8E807C]">秒</span>
            </div>
          </div>

          <!-- 原始 Ticks 输入（按需展开） -->
          <div v-if="showRawTicks" class="flex items-center gap-1.5 pt-1 border-t border-[#EADFD9]/60">
            <span class="text-[11px] font-mono text-[#8E807C]">Ticks:</span>
            <input
              :value="buffs[selectedSlotIndex].time"
              type="number"
              min="0"
              :max="MAX_BUFF_TICKS"
              class="w-28 h-7 text-center font-mono font-bold text-xs rounded-lg border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
              @input="setSlotTicks(parseInt(($event.target as HTMLInputElement).value) || 0)"
            />
            <span class="text-[10px] text-[#8E807C]">(60 ticks = 1 秒)</span>
          </div>
        </div>

        <!-- 搜索与筛选全部 Buff -->
        <div class="flex flex-col gap-1.5 pt-1 border-t border-[#EADFD9] flex-1 min-h-0">
          <div class="flex flex-wrap items-center justify-between gap-1.5">
            <label class="text-xs font-semibold text-[#4A3F3D]">选择或替换状态效果</label>
            <div class="flex items-center gap-1">
              <button
                v-for="cat in [
                  { id: 'all' as const, label: '全部' },
                  { id: 'combat' as const, label: '常用战斗' },
                  { id: 'debuff' as const, label: '减益' }
                ]"
                :key="cat.id"
                :class="[
                  'text-[11px] px-2 py-0.5 rounded-lg font-semibold border transition-all cursor-pointer',
                  selectedCategory === cat.id
                    ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] shadow-2xs'
                    : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
                ]"
                @click="selectedCategory = cat.id"
              >
                {{ cat.label }}
              </button>
              <span class="text-[11px] text-[#8E807C] ml-1">共 {{ filteredBuffs.length }} 种</span>
            </div>
          </div>

          <div class="flex gap-2">
            <Input
              v-model="buffSearchQuery"
              type="text"
              placeholder="搜索 Buff 名称 / 拼音 / 英文 / ID (如 铁皮, tiepi, 5)..."
              class="h-8 text-xs bg-[#FFF7F2] border-[#EADFD9]"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-[46dvh] sm:max-h-80 overflow-y-auto overscroll-contain p-1.5 border border-[#EADFD9] rounded-xl bg-white shadow-2xs">
            <button
              v-for="b in filteredBuffs"
              :key="b.id"
              :class="[
                'p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer',
                buffs[selectedSlotIndex].type === b.id
                  ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] shadow-2xs'
                  : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="setSlotBuff(b)"
            >
              <div class="w-8 h-8 shrink-0 flex items-center justify-center bg-[#EFE7E2] rounded-lg">
                <div :style="getBuffSpriteStyle(b.id, 28)"></div>
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold truncate">{{ b.name }}</span>
                  <span class="text-[10px] font-mono opacity-70">#{{ b.id }}</span>
                </div>
                <span class="text-[10px] opacity-75 truncate" :title="b.tip">
                  {{ b.tip || b.en }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-3"
            @click="cancelSlotEditor"
          >
            取消
          </Button>
          <Button
            variant="default"
            size="sm"
            class="h-8 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-4"
            @click="confirmSlotEditor"
          >
            确认保存
          </Button>
        </div>
      </template>
    </AppModal>
  </div>
</template>
