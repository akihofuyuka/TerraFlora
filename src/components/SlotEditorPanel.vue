<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  store,
  updateSelectedSlot,
  clearSelectedSlot,
  maxStackSelectedSlot,
  applySmartGodPrefix,
  applyGodPrefixToSelected,
  deselectSlot,
  replaceSelectedWithItem,
  addItemToFirstEmpty,
} from '@/store';
import { Star, X } from 'lucide-vue-next';
import { getPrefixOptionLabel, PREFIX_STATS } from '@/data/prefixes';
import { getItemSpriteStyle } from '@/utils/sprite';
import AppModal from '@/components/ui/AppModal.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const props = defineProps<{
  isDrawer?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const slot = computed(() => store.selectedSlot);
const item = computed(() => slot.value?.item);

const itemMeta = computed(() => {
  if (!item.value || item.value.id <= 0) return null;
  return store.itemsMap.get(item.value.id) || null;
});

const prefixMeta = computed(() => {
  if (!item.value || item.value.prefix <= 0) return null;
  return store.prefixesMap.get(item.value.prefix) || null;
});

function toggleFav() {
  if (!item.value) return;
  updateSelectedSlot({ favorited: !item.value.favorited });
}

function changeStack(delta: number) {
  if (!item.value) return;
  const next = Math.max(1, Math.min(9999, (item.value.stack || 1) + delta));
  updateSelectedSlot({ stack: next });
}

const godPrefixes = [
  { id: 81, label: '传奇 (近战)' },
  { id: 84, label: '传奇 (鞭类)' },
  { id: 82, label: '虚幻 (远程)' },
  { id: 83, label: '神话 (魔法)' },
  { id: 57, label: '无情 (召唤)' },
  { id: 65, label: '护佑 (+4防)' },
  { id: 72, label: '险恶 (+4%伤)' },
  { id: 68, label: '幸运 (+4%暴)' },
  { id: 76, label: '迅捷 (+4%速)' },
  { id: 66, label: '奥秘 (+20魔)' },
];

// ----------------- 词缀弹窗选择逻辑 -----------------
const prefixModalOpen = ref(false);
const prefixSearch = ref('');
const prefixCat = ref<'all' | 'god' | 'weapon' | 'accessory' | 'negative'>('all');

const filteredPrefixes = computed(() => {
  const q = prefixSearch.value.trim().toLowerCase();
  return store.prefixesList.filter(p => {
    if (prefixCat.value === 'god' && !p.isGod) return false;
    if (prefixCat.value === 'accessory' && p.type !== 'accessory') return false;
    if (prefixCat.value === 'weapon' && p.type !== 'weapon' && p.type !== 'universal' && p.type !== 'melee' && p.type !== 'ranged' && p.type !== 'magic') return false;
    if (prefixCat.value === 'negative') {
      const stat = PREFIX_STATS[p.id] || '';
      if (!stat.includes('-')) return false;
    }
    if (!q) return true;
    const stat = (PREFIX_STATS[p.id] || '').toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.en.toLowerCase().includes(q) ||
      p.id.toString() === q ||
      stat.includes(q)
    );
  });
});

function selectPrefix(id: number) {
  updateSelectedSlot({ prefix: id });
  prefixModalOpen.value = false;
}

// ----------------- 物品搜索与虚拟滚动逻辑 -----------------
const searchQuery = ref('');
const selectedCat = ref('all');
const scrollAreaRef = ref<HTMLDivElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(380);

const ROW_HEIGHT = 48;
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
  const cat = selectedCat.value;

  if (!q) {
    if (cat === 'all') return store.itemsList;
    return store.itemsList.filter((it) => it.cat === cat);
  }

  const qNoSpace = q.replace(/[\s_\-\.]+/g, '');
  // 中文同音/别字转换：分型 -> 分形
  const qZhAlias = q.replace(/分型/g, '分形');
  const isPureNum = /^\d+$/.test(q);
  const qNum = isPureNum ? parseInt(q, 10) : null;

  const list = store.itemsList.filter((it) => {
    if (cat !== 'all' && it.cat !== cat) return false;

    // 1. 中文名称匹配 (含分型别字)
    if (it.name.toLowerCase().includes(q) || it.name.includes(qZhAlias)) return true;

    // 2. 拼音全拼与首字母匹配
    if (it.py.includes(qNoSpace) || it.pys.includes(qNoSpace)) return true;

    // 3. 英文名匹配 (标准包含匹配，以及去符号匹配以支持 "firstfractal" 匹配 "First Fractal" 或 "ItemName.FirstFractal")
    const enLower = it.en.toLowerCase();
    const enNoSpace = enLower.replace(/[\s_\-\.]+/g, '');
    if (enLower.includes(q) || enNoSpace.includes(qNoSpace)) return true;

    // 4. 数字 ID 匹配
    if (isPureNum && it.id.toString().includes(q)) return true;

    return false;
  });

  if (isPureNum && qNum !== null) {
    return list.slice().sort((a, b) => {
      // 1. 完全匹配 ID 优先排在最前
      const aExact = a.id === qNum;
      const bExact = b.id === qNum;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // 2. 以该前缀开头的 ID 排在前列
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
  return filteredItems.value.slice(startIndex.value, endIndex.value).map((item, idx) => ({
    item,
    offsetY: (startIndex.value + idx) * ROW_HEIGHT,
  }));
});

function onScroll(e: Event) {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

let drawerOpenedAt = Date.now();

function syncContainerHeight() {
  if (scrollAreaRef.value && scrollAreaRef.value.clientHeight > 0) {
    containerHeight.value = scrollAreaRef.value.clientHeight;
  }
}

watch(
  () => store.selectedSlot,
  () => {
    drawerOpenedAt = Date.now();
    nextTick(syncContainerHeight);
  }
);

function handlePickItem(itemId: number) {
  if (props.isDrawer && Date.now() - drawerOpenedAt < 250) {
    return;
  }
  if (store.selectedSlot) {
    replaceSelectedWithItem(itemId);
  } else {
    addItemToFirstEmpty(itemId);
  }
  if (props.isDrawer) {
    emit('close');
  }
}

function getRarityColor(r: number) {
  const colors = [
    '#4A3F3D', // 0 普通常见 (深暖灰棕)
    '#3b82f6', // 1 蓝
    '#16a34a', // 2 绿
    '#ea580c', // 3 橙
    '#dc2626', // 4 浅红
    '#db2777', // 5 粉
    '#9333ea', // 6 浅紫
    '#65a30d', // 7 青柠
    '#ca8a04', // 8 黄
    '#0891b2', // 9 青
    '#b91c1c', // 10 红
    '#7e22ce', // 11 紫
  ];
  return colors[Math.max(0, Math.min(colors.length - 1, r))];
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  drawerOpenedAt = Date.now();
  nextTick(syncContainerHeight);
  if (typeof ResizeObserver !== 'undefined' && scrollAreaRef.value) {
    resizeObserver = new ResizeObserver(() => syncContainerHeight());
    resizeObserver.observe(scrollAreaRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div :class="['flex flex-col h-full', isDrawer ? 'gap-2' : 'gap-3']">
    <!-- 顶部选中状态与属性编辑卡片 -->
    <div
      v-if="slot && item"
      :class="[
        'rounded-xl border border-[#EADFD9] bg-white shadow-xs flex flex-col',
        isDrawer ? 'p-2.5 gap-2' : 'p-3.5 gap-3'
      ]"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div
            v-if="item.id > 0"
            class="flex items-center justify-center w-12 h-12 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] shrink-0"
          >
            <div
              :style="{
                ...getItemSpriteStyle(item.id, 40),
                imageRendering: 'pixelated',
              }"
            ></div>
          </div>
          <div
            v-else
            class="w-12 h-12 rounded-lg bg-[#EFE7E2] border border-dashed border-[#EADFD9] flex items-center justify-center text-xs text-[#8E807C] shrink-0 font-medium"
          >
            空
          </div>

          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span
                class="font-bold text-base leading-tight truncate"
                :style="{ color: itemMeta ? getRarityColor(itemMeta.rarity) : '#4A3F3D' }"
              >
                <span v-if="prefixMeta" class="text-[#739CBF] font-bold">{{ prefixMeta.name }} </span>
                {{ itemMeta ? itemMeta.name : (item.id > 0 ? `未知物品 (#${item.id})` : '未放置物品') }}
              </span>
              <Badge v-if="itemMeta" variant="secondary" class="text-xs px-1.5 py-0 h-4 bg-[#F9D6DB]/50 text-[#4A3F3D] border-[#EADFD9]">
                {{ getCategoryLabel(itemMeta.cat) }}
              </Badge>
            </div>
            <span v-if="itemMeta" class="text-xs text-[#8E807C] truncate mt-0.5">
              ID: #{{ item.id }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <Button
            v-if="item.id > 0 && (slot.slotType === 'inventory' || slot.slotType === 'bank4')"
            variant="ghost"
            size="xs"
            class="h-7 w-7 p-0"
            :class="item.favorited ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-[#8E807C] hover:text-amber-500 hover:bg-[#EFE7E2]'"
            :title="item.favorited ? '取消收藏' : '标记收藏'"
            @click="toggleFav"
          >
            <Star class="w-3.5 h-3.5" :class="item.favorited ? 'fill-current' : ''" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            class="h-7 w-7 p-0 text-[#8E807C] hover:text-[#4A3F3D]"
            @click="deselectSlot(); emit('close');"
            title="关闭"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <!-- 快捷操作区 (一键最强词缀、一键满堆叠、清空格子) -->
      <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#EADFD9]">
        <!-- 一键最强词缀 -->
        <Button
          v-if="item.id > 0"
          variant="outline"
          size="xs"
          class="h-7 text-xs font-semibold gap-1 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/60 px-1"
          @click="applySmartGodPrefix"
          title="自动匹配当前武器或饰品的最强词缀"
        >
          <span :style="{ ...getItemSpriteStyle(989, 14), imageRendering: 'pixelated' }"></span>
          <span>最强词缀</span>
        </Button>

        <!-- 一键满堆叠 -->
        <Button
          v-if="item.id > 0"
          variant="outline"
          size="xs"
          class="h-7 text-xs font-semibold gap-1 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/60 px-1"
          @click="maxStackSelectedSlot"
          title="补满至该物品最大堆叠数量"
        >
          <span :style="{ ...getItemSpriteStyle(74, 14), imageRendering: 'pixelated' }"></span>
          <span>满堆叠</span>
        </Button>

        <!-- 清空格子 -->
        <Button
          variant="outline"
          size="xs"
          class="h-7 text-xs font-semibold gap-1 btn-danger-soft px-1"
          @click="clearSelectedSlot"
          title="清空当前槽位"
        >
          <span :style="{ ...getItemSpriteStyle(344, 14), imageRendering: 'pixelated' }"></span>
          <span>清空此格</span>
        </Button>
      </div>

      <!-- 属性细调区 (仅在有物品时展示) -->
      <div v-if="item.id > 0" class="flex flex-col gap-2 pt-1.5 border-t border-[#EADFD9]">
        <!-- 堆叠数量 & 附魔词缀 并排 -->
        <div class="grid grid-cols-2 gap-2 items-end text-xs">
          <div class="flex flex-col gap-1">
            <span class="text-[11px] font-semibold text-[#8E807C]">堆叠数量</span>
            <div class="flex items-center gap-1">
              <Button variant="outline" size="xs" class="w-7 h-7 p-0 border-[#EADFD9] text-[#4A3F3D] shrink-0" @click="changeStack(-1)">-</Button>
              <input
                type="number"
                :value="item.stack"
                class="flex-1 min-w-0 h-7 text-center font-bold text-xs rounded-lg border border-[#EADFD9] bg-[#FFF7F2] text-[#4A3F3D] outline-none"
                @input="updateSelectedSlot({ stack: Math.max(1, parseInt(($event.target as HTMLInputElement).value) || 1) })"
              />
              <Button variant="outline" size="xs" class="w-7 h-7 p-0 border-[#EADFD9] text-[#4A3F3D] shrink-0" @click="changeStack(1)">+</Button>
            </div>
          </div>

          <div class="flex flex-col gap-1 min-w-0">
            <span class="text-[11px] font-semibold text-[#8E807C]">附魔词缀</span>
            <button
              class="flex items-center justify-between h-7 px-2 rounded-lg border border-[#EADFD9] bg-white hover:bg-[#EFE7E2] transition-colors cursor-pointer text-xs font-semibold text-[#4A3F3D] w-full shadow-2xs truncate"
              @click="prefixModalOpen = true"
            >
              <span class="truncate">
                {{ item.prefix > 0 ? (prefixMeta?.name || `词缀 #${item.prefix}`) : '无词缀' }}
              </span>
              <span class="text-[10px] font-mono text-[#8E807C] ml-1 shrink-0">
                {{ item.prefix > 0 ? `#${item.prefix}` : '选择' }}
              </span>
            </button>
          </div>
        </div>

        <!-- 常用毕业词缀速点 -->
        <div class="flex flex-col gap-1 text-xs">
          <span class="text-[11px] font-semibold text-[#8E807C]">快捷词缀</span>
          <div :class="['flex gap-1', isDrawer ? 'items-center overflow-x-auto no-scrollbar' : 'flex-wrap']">
            <button
              v-for="gp in godPrefixes"
              :key="gp.id"
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded-md font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0',
                item.prefix === gp.id
                  ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold'
                  : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/60'
              ]"
              @click="applyGodPrefixToSelected(gp.id)"
            >
              {{ gp.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 未选中格子时的轻提示 -->
    <div
      v-else
      class="rounded-xl border border-dashed border-[#EADFD9] bg-white/70 p-3 text-center text-xs text-[#8E807C]"
    >
      未选中物品格
    </div>

    <!-- 物品搜索大厅 (随时可见，随时替换) -->
    <div
      :class="[
        'rounded-xl border border-[#EADFD9] bg-white shadow-xs flex flex-col flex-1 min-h-0',
        isDrawer ? 'p-2.5' : 'p-3 min-h-[360px]'
      ]"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <span
            class="inline-block shrink-0"
            :style="{ ...getItemSpriteStyle(48, 14), imageRendering: 'pixelated' }"
          ></span>
          <span class="text-xs font-bold text-[#4A3F3D]">物品库</span>
          <Badge variant="secondary" class="text-xs px-1.5 py-0 h-4 font-normal text-[#8E807C] bg-[#EFE7E2]">
            {{ filteredItems.length }}
          </Badge>
        </div>
      </div>

      <!-- 搜索输入框 -->
      <div class="relative mb-2">
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="搜索物品名称 / 英文 / 拼音 / ID..."
          class="h-8 text-xs pr-7 bg-[#FFF7F2] border-[#EADFD9] text-[#4A3F3D]"
        />
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E807C] hover:text-[#4A3F3D] text-xs cursor-pointer"
          @click="searchQuery = ''"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- 分类胶囊按钮 -->
      <div class="flex gap-1 overflow-x-auto pb-1 mb-2 no-scrollbar">
        <button
          v-for="c in categories"
          :key="c.id"
          :class="[
            'text-[11px] px-2.5 py-0.5 rounded-lg font-medium shrink-0 transition-all duration-150 cursor-pointer border',
            selectedCat === c.id
              ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
              : 'bg-[#EFE7E2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#E8DFD9]'
          ]"
          @click="selectedCat = c.id; scrollTop = 0; if (scrollAreaRef) scrollAreaRef.scrollTop = 0;"
        >
          {{ c.label }}
        </button>
      </div>

      <!-- 虚拟滚动物品列表 -->
      <div
        ref="scrollAreaRef"
        class="relative flex-1 min-h-[140px] overflow-y-auto overscroll-contain rounded-lg border border-[#EADFD9]"
        @scroll.passive="onScroll"
      >
        <div class="absolute inset-x-0 top-0 pointer-events-none" :style="{ height: `${totalHeight}px` }"></div>

        <div
          v-for="{ item: it, offsetY } in visibleItems"
          :key="it.id"
          class="absolute inset-x-0 h-[48px] flex items-center justify-between px-2.5 py-1 border-b border-[#EADFD9]/60 hover:bg-[#FFF7F2] cursor-pointer transition-colors"
          :style="{ transform: `translateY(${offsetY}px)` }"
          @click="handlePickItem(it.id)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center shrink-0">
              <div
                :style="{
                  ...getItemSpriteStyle(it.id, 28),
                  imageRendering: 'pixelated',
                }"
              ></div>
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-xs font-bold truncate leading-snug"
                :style="{ color: getRarityColor(it.rarity) }"
              >
                {{ it.name }}
              </span>
              <span class="text-[10px] text-[#8E807C] truncate">
                #{{ it.id }}
              </span>
            </div>
          </div>

          <Badge variant="outline" class="text-xs px-1.5 py-0 h-4 shrink-0 text-[#8E807C] border-[#EADFD9] font-normal">
            {{ getCategoryLabel(it.cat) }}
          </Badge>
        </div>

        <div v-if="filteredItems.length === 0" class="py-12 text-center text-xs text-[#8E807C]">
          未检索到匹配的物品
        </div>
      </div>
    </div>

    <!-- 附魔词缀选择弹窗 -->
    <AppModal
      :open="Boolean(prefixModalOpen && item)"
      title="选择附魔词缀"
      :subtitle="item && item.prefix > 0 ? `当前: ${prefixMeta?.name || `#${item.prefix}`}` : undefined"
      max-width-class="max-w-lg"
      panel-class="max-h-[82dvh]"
      body-class="flex-1 min-h-0 flex flex-col overflow-hidden"
      z-index-class="z-[75]"
      @close="prefixModalOpen = false"
    >
      <div class="p-2.5 border-b border-[#EADFD9] flex flex-col gap-1.5 bg-[#FFF7F2]/40 shrink-0">
        <!-- 搜索框 -->
        <div class="relative">
          <Input
            v-model="prefixSearch"
            type="text"
            placeholder="搜索词缀名称 / 属性加成 (如 传奇, 险恶, 暴击, 伤害)..."
            class="h-8 text-xs pr-7 bg-white border-[#EADFD9] text-[#4A3F3D]"
          />
          <button
            v-if="prefixSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
            @click="prefixSearch = ''"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- 分类筛选 -->
        <div class="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            v-for="cat in [
              { id: 'all' as const, label: '全部' },
              { id: 'god' as const, label: '毕业神级' },
              { id: 'weapon' as const, label: '武器类' },
              { id: 'accessory' as const, label: '饰品类' },
              { id: 'negative' as const, label: '减益/负面' }
            ]"
            :key="cat.id"
            :class="[
              'text-[11px] px-2.5 py-0.5 rounded-lg font-semibold border transition-all cursor-pointer whitespace-nowrap',
              prefixCat === cat.id
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] shadow-2xs'
                : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
            ]"
            @click="prefixCat = cat.id"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- 词缀列表 -->
      <div v-if="item" class="p-2.5 overflow-y-auto overscroll-contain grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1 min-h-0">
        <!-- 清除词缀选项 -->
        <button
          :class="[
            'p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer col-span-full',
            item.prefix === 0
              ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] shadow-2xs'
              : 'bg-[#FFF7F2] text-[#8E807C] border-[#EADFD9] hover:bg-[#EFE7E2]'
          ]"
          @click="selectPrefix(0)"
        >
          <span class="text-xs font-bold">无词缀 (清除附魔效果)</span>
          <span class="text-[10px] font-mono opacity-80">ID: 0</span>
        </button>

        <button
          v-for="p in filteredPrefixes"
          :key="p.id"
          :class="[
            'p-2 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer',
            item.prefix === p.id
              ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] shadow-2xs'
              : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#FFF7F2]'
          ]"
          @click="selectPrefix(p.id)"
        >
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold">{{ p.name }}</span>
              <span v-if="p.isGod" class="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                毕业
              </span>
            </div>
            <span class="text-[10px] font-mono opacity-70">#{{ p.id }}</span>
          </div>
          <span
            class="text-[10px] leading-tight truncate max-w-full"
            :class="item.prefix === p.id ? 'text-[#2F658D]/85' : 'text-[#8E807C]'"
            :title="PREFIX_STATS[p.id] || p.en"
          >
            {{ PREFIX_STATS[p.id] || p.en }}
          </span>
        </button>

        <div v-if="filteredPrefixes.length === 0" class="col-span-full py-8 text-center text-xs text-[#8E807C]">
          未检索到匹配的词缀
        </div>
      </div>
    </AppModal>
  </div>
</template>
