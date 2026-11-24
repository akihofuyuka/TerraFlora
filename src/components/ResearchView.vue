<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  store,
  showToast,
  addItemToFirstEmpty,
  type MinItem,
} from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getItemSpriteStyle } from '@/utils/sprite';

const p = computed(() => store.player);
const isJourney = computed(() => p.value?.difficulty === 3);
const powersPanelOpen = ref(true);

function setJourney() {
  if (p.value) {
    p.value.difficulty = 3;
    store.isModified = true;
    showToast('已切换为旅途模式');
  }
}

// ----------------- 旅途物品研究需求量推导算法 -----------------
function getNeededCount(item: MinItem): number {
  // 1. 装备、护甲、武器、工具、饰品：只需 1 件
  if (['weapon', 'armor', 'accessory', 'tool'].includes(item.cat)) {
    return 1;
  }
  // 2. Boss 召唤物与宝藏袋：3 个
  if (
    item.name.includes('宝藏袋') ||
    item.name.includes('召唤') ||
    [43, 560, 556, 557, 544, 1133, 1331, 2767, 3601, 4988].includes(item.id)
  ) {
    return 3;
  }
  // 3. 背景墙：400 块
  if (item.name.endsWith('墙') || item.en.endsWith('Wall')) {
    return 400;
  }
  // 4. 弹药：99 发
  if (
    item.cat === 'consumable' &&
    (item.name.endsWith('箭') ||
      item.name.endsWith('弹') ||
      item.name.endsWith('子弹') ||
      item.name.endsWith('火箭') ||
      item.name.endsWith('飞镖') ||
      item.name.includes('弹药'))
  ) {
    return 99;
  }
  // 5. 药水与食物：20 或 30
  if (
    item.cat === 'consumable' &&
    (item.name.endsWith('药水') ||
      item.name.endsWith('药剂') ||
      item.name.endsWith('瓶') ||
      item.name.includes('药') ||
      item.name.endsWith('派') ||
      item.name.endsWith('汤'))
  ) {
    return 20;
  }
  // 6. 种子、草药、宝石：25
  if (
    item.name.endsWith('种子') ||
    item.name.endsWith('草') ||
    item.name.endsWith('花') ||
    ['红玉', '蓝玉', '翡翠', '黄玉', '紫晶', '钻石', '琥珀'].some(g => item.name.includes(g))
  ) {
    return 25;
  }
  // 7. 金属锭：25
  if (item.name.endsWith('锭') || item.en.endsWith('Bar')) {
    return 25;
  }
  // 8. 方块、矿石与建筑材料：100
  if (
    item.cat === 'block' ||
    item.name.endsWith('矿') ||
    item.name.endsWith('石') ||
    item.name.endsWith('泥') ||
    item.name.endsWith('土') ||
    item.name.endsWith('木') ||
    item.name.endsWith('沙')
  ) {
    return 100;
  }
  // 9. 小动物与鱼饵：5
  if (
    item.name.endsWith('蝶') ||
    item.name.endsWith('虫') ||
    item.name.endsWith('鱼饵') ||
    item.name.endsWith('兔') ||
    item.name.endsWith('松鼠') ||
    item.name.endsWith('鸟')
  ) {
    return 5;
  }
  // 通用兜底
  if (item.stack === 1) return 1;
  if (item.stack <= 5) return 3;
  if (item.stack <= 30) return 20;
  if (item.stack <= 99) return 25;
  if (item.cat === 'consumable') return 30;
  return 100;
}

// ----------------- 旅途研究解锁数据逻辑 -----------------
const unlockedKeyMap = computed(() => {
  const m = new Map<string, number>();
  if (!p.value?.creativeUnlocks) return m;
  for (const u of p.value.creativeUnlocks) {
    m.set(u.k, u.v);
  }
  return m;
});

const totalItemsCount = computed(() => store.itemsList.length);

const researchedCount = computed(() => {
  if (!p.value?.creativeUnlocks) return 0;
  const m = unlockedKeyMap.value;
  let fullCount = 0;
  for (const it of store.itemsList) {
    const k = store.itemKeysMap.get(it.id);
    if (!k) continue;
    const v = m.get(k) || 0;
    if (v >= getNeededCount(it)) fullCount++;
  }
  return fullCount;
});

const progressPercent = computed(() => {
  if (!totalItemsCount.value) return 0;
  return Math.min(100, Math.round((researchedCount.value / totalItemsCount.value) * 100));
});

function unlockAll() {
  if (!p.value) return;
  const unlocks: { k: string; v: number }[] = [];
  for (const it of store.itemsList) {
    const key = store.itemKeysMap.get(it.id);
    if (it.id > 0 && key && key !== 'None') {
      const needed = getNeededCount(it);
      unlocks.push({ k: key, v: Math.max(needed, 999) });
    }
  }
  p.value.creativeUnlocks = unlocks;
  store.isModified = true;
  showToast(`已一键全解锁全部 ${unlocks.length} 种物品！`);
}

function clearAll() {
  if (!p.value) return;
  p.value.creativeUnlocks = [];
  store.isModified = true;
  showToast('已清空全部研究图鉴');
}

// 指定物品已献祭研究数量
function setItemSacrificeCount(item: MinItem, count: number) {
  if (!p.value) return;
  const key = store.itemKeysMap.get(item.id);
  if (!key) return;

  if (!p.value.creativeUnlocks) p.value.creativeUnlocks = [];
  const validCount = Math.max(0, count || 0);
  const idx = p.value.creativeUnlocks.findIndex(u => u.k === key);

  if (validCount <= 0) {
    if (idx !== -1) p.value.creativeUnlocks.splice(idx, 1);
  } else {
    if (idx !== -1) {
      p.value.creativeUnlocks[idx].v = validCount;
    } else {
      p.value.creativeUnlocks.push({ k: key, v: validCount });
    }
  }
  store.isModified = true;
}

// 一键直接解锁单件物品
function unlockItemDirectly(item: MinItem) {
  const needed = getNeededCount(item);
  setItemSacrificeCount(item, Math.max(needed, 999));
  showToast(`已解锁 ${item.name} (${needed}/${needed})`);
}

// 重置单件物品
function resetItemResearch(item: MinItem) {
  setItemSacrificeCount(item, 0);
  showToast(`已重置 ${item.name} 的研究进度`);
}

function handleTakeToInventory(item: MinItem) {
  addItemToFirstEmpty(item.id);
}

// ----------------- 旅途专属特权 (Creative Powers) -----------------
const godMode = computed({
  get: () => {
    const cp = p.value?.creativePowers?.find(x => x.id === 5);
    return cp ? !!cp.val : false;
  },
  set: (val: boolean) => {
    if (!p.value) return;
    if (!p.value.creativePowers) p.value.creativePowers = [];
    let cp = p.value.creativePowers.find(x => x.id === 5);
    if (!cp) {
      p.value.creativePowers.push({ id: 5, type: 'bool', val });
    } else {
      cp.val = val;
    }
    store.isModified = true;
    showToast(val ? '已开启无敌模式' : '已关闭无敌模式');
  }
});

const placementRange = computed({
  get: () => {
    const cp = p.value?.creativePowers?.find(x => x.id === 11);
    return cp ? !!cp.val : false;
  },
  set: (val: boolean) => {
    if (!p.value) return;
    if (!p.value.creativePowers) p.value.creativePowers = [];
    let cp = p.value.creativePowers.find(x => x.id === 11);
    if (!cp) {
      p.value.creativePowers.push({ id: 11, type: 'bool', val });
    } else {
      cp.val = val;
    }
    store.isModified = true;
    showToast(val ? '已开启扩大放置与交互范围' : '已关闭放置范围增益');
  }
});

const spawnRate = computed({
  get: () => {
    const cp = p.value?.creativePowers?.find(x => x.id === 14);
    return cp ? Number(cp.val) : 1.0;
  },
  set: (val: number) => {
    if (!p.value) return;
    if (!p.value.creativePowers) p.value.creativePowers = [];
    let cp = p.value.creativePowers.find(x => x.id === 14);
    if (!cp) {
      p.value.creativePowers.push({ id: 14, type: 'float', val });
    } else {
      cp.val = val;
    }
    store.isModified = true;
  }
});

// ----------------- 虚拟列表与物品筛选 -----------------
const searchQuery = ref('');
const selectedCat = ref('all');
const filterStatus = ref<'all' | 'unlocked' | 'progress' | 'locked'>('all');
const scrollTop = ref(0);
const containerHeight = ref(480);
const ROW_HEIGHT = 58;
const BUFFER = 6;

const categories = [
  { id: 'all', label: '全部' },
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '护甲' },
  { id: 'accessory', label: '饰品' },
  { id: 'tool', label: '工具' },
  { id: 'consumable', label: '消耗品' },
  { id: 'block', label: '方块' },
  { id: 'misc', label: '杂项' },
];

function getCategoryLabel(cat: string): string {
  switch (cat) {
    case 'weapon': return '武器';
    case 'armor': return '护甲';
    case 'accessory': return '饰品';
    case 'tool': return '工具';
    case 'consumable': return '消耗品';
    case 'block': return '方块';
    case 'misc': return '杂项';
    case 'vanity': return '时装';
    case 'item': return '道具';
    default: return cat;
  }
}

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const qNoSpace = q.replace(/[\s_\-\.]+/g, '');
  const qZhAlias = q.replace(/分型/g, '分形');
  const isPureNum = /^\d+$/.test(q);
  const qNum = isPureNum ? parseInt(q, 10) : null;
  const cat = selectedCat.value;
  const status = filterStatus.value;
  const unlockedMap = unlockedKeyMap.value;
  const keysMap = store.itemKeysMap;

  const list = store.itemsList.filter((it) => {
    if (cat !== 'all' && it.cat !== cat) return false;
    const key = keysMap.get(it.id);
    const count = key ? (unlockedMap.get(key) || 0) : 0;
    const needed = getNeededCount(it);
    const isUnlocked = count >= needed;
    const isProgress = count > 0 && count < needed;

    if (status === 'unlocked' && !isUnlocked) return false;
    if (status === 'progress' && !isProgress) return false;
    if (status === 'locked' && (isUnlocked || isProgress)) return false;

    if (!q) return true;
    const enLower = it.en.toLowerCase();
    const enNoSpace = enLower.replace(/[\s_\-\.]+/g, '');

    return (
      it.name.toLowerCase().includes(q) ||
      it.name.includes(qZhAlias) ||
      it.py.includes(qNoSpace) ||
      it.pys.includes(qNoSpace) ||
      enLower.includes(q) ||
      enNoSpace.includes(qNoSpace) ||
      (isPureNum && it.id.toString().includes(q))
    );
  });

  if (!q) return list;

  if (isPureNum && qNum !== null) {
    return list.slice().sort((a, b) => {
      const aExact = a.id === qNum;
      const bExact = b.id === qNum;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aStarts = a.id.toString().startsWith(q);
      const bStarts = b.id.toString().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.id - b.id;
    });
  }

  return list;
});

const totalHeight = computed(() => filteredItems.value.length * ROW_HEIGHT);

const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER);
});

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / ROW_HEIGHT);
  return Math.min(filteredItems.value.length, startIndex.value + visibleCount + BUFFER * 2);
});

const visibleItems = computed(() => {
  const unlockedMap = unlockedKeyMap.value;
  const keysMap = store.itemKeysMap;

  return filteredItems.value.slice(startIndex.value, endIndex.value).map((item, idx) => {
    const key = keysMap.get(item.id);
    const count = key ? (unlockedMap.get(key) || 0) : 0;
    const needed = getNeededCount(item);
    const isUnlocked = count >= needed;
    const percent = Math.min(100, Math.round((count / needed) * 100));

    return {
      item,
      key,
      count,
      needed,
      isUnlocked,
      percent,
      offsetY: (startIndex.value + idx) * ROW_HEIGHT,
    };
  });
});

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

function getRarityColor(r: number) {
  const colors = [
    '#4A3F3D', // 0 普通常见
    '#3b82f6', // 1 蓝
    '#22c55e', // 2 绿
    '#eab308', // 3 橙
    '#ef4444', // 4 浅红
    '#ec4899', // 5 浅粉
    '#a855f7', // 6 浅紫
    '#84cc16', // 7 青柠
    '#f97316', // 8 黄
    '#06b6d4', // 9 青
    '#dc2626', // 10 红色
    '#7c3aed', // 11 紫色
  ];
  return colors[r] || '#4A3F3D';
}
</script>

<template>
  <div v-if="p" class="flex flex-col gap-4">
    <!-- 非旅途模式提示 (引导一键切换) -->
    <div
      v-if="!isJourney"
      class="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[#4A3F3D] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
    >
      <div class="flex items-center gap-2">
        <span :style="{ ...getItemSpriteStyle(5011, 14), imageRendering: 'pixelated' }"></span>
        <span class="font-medium">当前角色非旅途模式 ({{ p.difficulty === 0 ? '经典' : p.difficulty === 1 ? '中核' : '硬核' }})</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="h-7 text-xs font-semibold bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60 shrink-0 self-start sm:self-auto"
        @click="setJourney"
      >
        切换为旅途模式
      </Button>
    </div>

    <!-- 研究图鉴总览与一键控制卡片 (紧凑压缩结构) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-2.5 sm:p-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <span :style="{ ...getItemSpriteStyle(149, 14), imageRendering: 'pixelated' }"></span>
            <span>旅途物品复制图鉴</span>
          </CardTitle>
          <span class="text-[10px] font-mono font-bold text-[#739CBF] px-1.5 py-0.5 rounded bg-[#FFF7F2] border border-[#EADFD9]">
            {{ researchedCount }} / {{ totalItemsCount }} ({{ progressPercent }}%)
          </span>
        </div>

        <!-- 标题栏右侧操作按钮 -->
        <div class="flex items-center gap-1.5 shrink-0">
          <Button
            variant="default"
            size="xs"
            class="h-6.5 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-2xs px-2.5"
            @click="unlockAll"
          >
            一键全解锁
          </Button>
          <Button
            variant="outline"
            size="xs"
            class="h-6.5 text-xs font-semibold border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D] hover:bg-rose-50 hover:border-rose-200 px-2.5"
            @click="clearAll"
          >
            清空所有研究
          </Button>
        </div>
      </CardHeader>
      <CardContent class="p-2.5 sm:p-3 pt-0">
        <!-- 进度条 -->
        <div class="w-full bg-[#EFE7E2] h-2 rounded-full overflow-hidden">
          <div
            class="bg-[#739CBF] h-full transition-all duration-300 rounded-full"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </CardContent>
    </Card>

    <!-- 旅途专属特权与世界调控 (支持折叠) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(5337, 14), imageRendering: 'pixelated' }"></span>
          <span>旅途专属特权与世界调控</span>
        </CardTitle>
        <button
          class="text-xs text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
          @click="powersPanelOpen = !powersPanelOpen"
        >
          {{ powersPanelOpen ? '收起' : '展开' }}
        </button>
      </CardHeader>
      <CardContent v-if="powersPanelOpen" class="p-3 pt-0 flex flex-col gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <!-- 无敌模式 -->
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
            <div class="flex items-center gap-2">
              <span :style="{ ...getItemSpriteStyle(5337, 18), imageRendering: 'pixelated' }"></span>
              <span class="text-xs font-bold text-[#4A3F3D]">无敌模式</span>
            </div>
            <Switch :checked="godMode" @update:checked="godMode = $event" />
          </div>

          <!-- 扩大交互与放置范围 -->
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
            <div class="flex items-center gap-2">
              <span :style="{ ...getItemSpriteStyle(5010, 18), imageRendering: 'pixelated' }"></span>
              <span class="text-xs font-bold text-[#4A3F3D]">扩大放置范围</span>
            </div>
            <Switch :checked="placementRange" @update:checked="placementRange = $event" />
          </div>
        </div>

        <!-- 刷怪倍率调节 -->
        <div class="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(5043, 14), imageRendering: 'pixelated' }"></span>
              <span class="text-xs font-bold text-[#4A3F3D]">敌人生成倍率</span>
            </div>
            <span class="text-xs font-mono font-bold text-[#739CBF]">{{ spawnRate.toFixed(1) }}x</span>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              :value="spawnRate"
              class="flex-1 h-1.5 bg-[#EFE7E2] rounded-lg appearance-none cursor-pointer accent-[#739CBF]"
              @input="spawnRate = parseFloat(($event.target as HTMLInputElement).value) || 0"
            />
          </div>
          <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
            <button
              v-for="preset in [
                { val: 0.0, label: '0x (完全不刷怪)' },
                { val: 0.5, label: '0.5x' },
                { val: 1.0, label: '1.0x (默认)' },
                { val: 2.0, label: '2.0x' },
                { val: 5.0, label: '5.0x' },
                { val: 10.0, label: '10.0x (极速刷怪)' }
              ]"
              :key="preset.val"
              :class="[
                'text-[10px] px-2 py-0.5 rounded font-semibold border transition-all cursor-pointer',
                Math.abs(spawnRate - preset.val) < 0.05
                  ? 'bg-[#739CBF] text-white border-[#739CBF]'
                  : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="spawnRate = preset.val"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 物品搜索与研究状态检索库 (虚拟滚动) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span :style="{ ...getItemSpriteStyle(5011, 14), imageRendering: 'pixelated' }"></span>
            <span>物品研究列表</span>
          </div>
          <span class="text-xs font-normal text-[#8E807C]">共 {{ filteredItems.length }} 件</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col gap-2.5">
        <!-- 搜索输入框 -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索物品名称 / 英文 / 拼音 / ID..."
            class="w-full h-8 text-xs rounded-lg border border-[#EADFD9] bg-[#FFF7F2] text-[#4A3F3D] px-2.5 outline-none focus:border-[#739CBF] transition-colors"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2 top-2 text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- 分类选择与解锁状态筛选 -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <!-- 物品分类按钮 -->
          <div class="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              v-for="cat in categories"
              :key="cat.id"
              :class="[
                'text-[10px] px-2 py-0.5 rounded font-semibold border transition-all cursor-pointer whitespace-nowrap',
                selectedCat === cat.id
                  ? 'bg-[#739CBF] text-white border-[#739CBF]'
                  : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="selectedCat = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>

          <!-- 解锁状态筛选 -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              v-for="s in [
                { id: 'all' as const, label: '全部状态' },
                { id: 'unlocked' as const, label: '已解锁' },
                { id: 'progress' as const, label: '研究中' },
                { id: 'locked' as const, label: '未解锁' }
              ]"
              :key="s.id"
              :class="[
                'text-[10px] px-2 py-0.5 rounded font-semibold border transition-all cursor-pointer whitespace-nowrap',
                filterStatus === s.id
                  ? 'bg-[#F9D6DB] text-[#4A3F3D] border-[#E598A3]'
                  : 'bg-[#FFF7F2] text-[#8E807C] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="filterStatus = s.id"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- 虚拟滚动列表 -->
        <div
          class="relative w-full overflow-y-auto border border-[#EADFD9] rounded-lg bg-[#FFF7F2]"
          :style="{ height: `${containerHeight}px` }"
          @scroll="onScroll"
          data-slot="radix-petal-frame"
        >
          <div :style="{ height: `${totalHeight}px`, position: 'relative', width: '100%' }">
            <div
              v-for="{ item, count, needed, isUnlocked, percent, offsetY } in visibleItems"
              :key="item.id"
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${ROW_HEIGHT}px`,
                transform: `translateY(${offsetY}px)`
              }"
              class="flex items-center justify-between px-2.5 py-1.5 border-b border-[#EADFD9]/60 hover:bg-[#EFE7E2]/50 transition-colors"
            >
              <!-- 物品信息 (图标 + 名称 + 分类 + ID) -->
              <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <div class="w-8 h-8 rounded bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center shrink-0">
                  <div :style="{ ...getItemSpriteStyle(item.id, 28), imageRendering: 'pixelated' }"></div>
                </div>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="text-xs font-bold truncate leading-snug"
                      :style="{ color: getRarityColor(item.rarity) }"
                    >
                      {{ item.name }}
                    </span>
                    <!-- 进度徽章 -->
                    <span
                      v-if="isUnlocked"
                      class="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold"
                    >
                      已解锁
                    </span>
                    <span
                      v-else-if="count > 0"
                      class="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold"
                    >
                      {{ percent }}%
                    </span>
                  </div>
                  <span class="text-[11px] text-[#8E807C] truncate">
                    #{{ item.id }} · {{ getCategoryLabel(item.cat) }}
                  </span>
                </div>
              </div>

              <!-- 中间/右侧：进度显示与数值编辑 -->
              <div class="flex items-center gap-2 shrink-0">
                <!-- 进度指示器与微型进度条 -->
                <div class="hidden sm:flex flex-col items-end gap-0.5 w-20">
                  <span class="text-[10px] font-mono font-bold text-[#4A3F3D]">
                    {{ count }} / {{ needed }}
                  </span>
                  <div class="w-full bg-[#EADFD9] h-1.5 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="isUnlocked ? 'bg-emerald-500' : 'bg-[#739CBF]'"
                      :style="{ width: `${percent}%` }"
                    ></div>
                  </div>
                </div>

                <!-- 手动输入已献祭数量 -->
                <div class="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    :value="count"
                    class="w-14 h-6 text-center font-mono font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none shadow-2xs focus:border-[#739CBF]"
                    @change="setItemSacrificeCount(item, parseInt(($event.target as HTMLInputElement).value) || 0)"
                  />
                  <span class="text-[10px] text-[#8E807C] font-mono sm:hidden">/{{ needed }}</span>
                </div>

                <!-- 放入随身背包 -->
                <button
                  class="h-6 px-1.5 text-[10px] font-semibold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/50 transition-colors cursor-pointer hidden md:inline-flex items-center"
                  @click="handleTakeToInventory(item)"
                >
                  取出一组
                </button>

                <!-- 直接解锁 / 重置按钮 -->
                <button
                  v-if="!isUnlocked"
                  class="h-6 px-2 text-[10px] font-semibold rounded border bg-[#739CBF] text-white hover:bg-[#5f87a8] transition-colors cursor-pointer"
                  @click="unlockItemDirectly(item)"
                >
                  直接解锁
                </button>
                <button
                  v-else
                  class="h-6 px-2 text-[10px] font-semibold rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  @click="resetItemResearch(item)"
                >
                  已解锁 (重置)
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="filteredItems.length === 0"
            class="flex items-center justify-center h-full text-xs text-[#8E807C]"
          >
            未找到匹配的物品
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
