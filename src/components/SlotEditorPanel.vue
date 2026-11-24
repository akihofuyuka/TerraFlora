<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
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
import { getPrefixOptionLabel, PREFIX_STATS } from '@/data/prefixes';
import { getItemSpriteStyle } from '@/utils/sprite';
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

function handlePickItem(itemId: number) {
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

onMounted(() => {
  if (scrollAreaRef.value) {
    containerHeight.value = scrollAreaRef.value.clientHeight || 380;
  }
});
</script>

<template>
  <div class="flex flex-col gap-3 h-full">
    <!-- 顶部选中状态与属性编辑卡片 -->
    <div
      v-if="slot && item"
      class="rounded-xl border border-[#EADFD9] bg-white p-3.5 shadow-xs flex flex-col gap-3"
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

        <Button
          variant="ghost"
          size="xs"
          class="h-7 w-7 p-0 text-[#8E807C] hover:text-[#4A3F3D]"
          @click="deselectSlot(); emit('close');"
          title="关闭"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </Button>
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
          class="h-7 text-xs font-semibold gap-1 border-[#EADFD9] text-rose-600 hover:bg-rose-50 px-1"
          @click="clearSelectedSlot"
          title="清空当前槽位"
        >
          <span :style="{ ...getItemSpriteStyle(344, 14), imageRendering: 'pixelated' }"></span>
          <span>清空此格</span>
        </Button>
      </div>

      <!-- 属性细调区 (仅在有物品时展示) -->
      <div v-if="item.id > 0" class="flex flex-col gap-2.5 pt-2 border-t border-[#EADFD9]">
        <!-- 堆叠步进调节 -->
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-[#4A3F3D]">堆叠数量</span>
          <div class="flex items-center gap-1.5">
            <Button variant="outline" size="xs" class="w-7 h-7 p-0 border-[#EADFD9] text-[#4A3F3D]" @click="changeStack(-1)">-</Button>
            <input
              type="number"
              :value="item.stack"
              class="w-16 h-7 text-center font-bold text-xs rounded border border-[#EADFD9] bg-[#FFF7F2] text-[#4A3F3D] outline-none"
              @input="updateSelectedSlot({ stack: Math.max(1, parseInt(($event.target as HTMLInputElement).value) || 1) })"
            />
            <Button variant="outline" size="xs" class="w-7 h-7 p-0 border-[#EADFD9] text-[#4A3F3D]" @click="changeStack(1)">+</Button>
          </div>
        </div>

        <!-- 词缀选择 -->
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-[#4A3F3D] shrink-0">附魔词缀</span>
          <button
            class="flex items-center justify-between h-7 px-2.5 rounded-lg border border-[#EADFD9] bg-white hover:bg-[#EFE7E2] transition-colors cursor-pointer text-xs font-semibold text-[#4A3F3D] max-w-[210px] shadow-2xs truncate"
            @click="prefixModalOpen = true"
          >
            <span class="truncate">
              {{ item.prefix > 0 ? (prefixMeta?.name || `词缀 #${item.prefix}`) : '无词缀' }}
            </span>
            <span class="text-[10px] font-mono text-[#8E807C] ml-1.5 shrink-0">
              {{ item.prefix > 0 ? `#${item.prefix}` : '点击选择' }}
            </span>
          </button>
        </div>

        <!-- 常用毕业词缀速点 -->
        <div class="flex flex-col gap-1 text-xs">
          <span class="text-[11px] font-semibold text-[#8E807C]">快捷词缀</span>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="gp in godPrefixes"
              :key="gp.id"
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded font-medium border transition-colors cursor-pointer',
                item.prefix === gp.id
                  ? 'bg-[#739CBF] text-white border-[#739CBF]'
                  : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/60'
              ]"
              @click="applyGodPrefixToSelected(gp.id)"
            >
              {{ gp.label }}
            </button>
          </div>
        </div>

        <!-- 收藏状态 -->
        <div v-if="slot.slotType === 'inventory' || slot.slotType === 'bank4'" class="pt-1">
          <Button
            :variant="item.favorited ? 'default' : 'outline'"
            size="xs"
            class="w-full text-xs font-semibold gap-1.5"
            :class="item.favorited ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500' : 'border-[#EADFD9] text-[#4A3F3D] hover:bg-[#EFE7E2]'"
            @click="toggleFav"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
            <span>{{ item.favorited ? '已标记收藏' : '标记收藏' }}</span>
          </Button>
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
    <div class="rounded-xl border border-[#EADFD9] bg-white p-3 shadow-xs flex flex-col flex-1 min-h-[360px]">
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
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- 分类胶囊按钮 -->
      <div class="flex gap-1 overflow-x-auto pb-1 mb-2 no-scrollbar">
        <button
          v-for="c in categories"
          :key="c.id"
          :class="[
            'text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 transition-all duration-150 cursor-pointer border',
            selectedCat === c.id
              ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
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
        class="relative flex-1 overflow-y-auto rounded-md border border-[#EADFD9]"
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
    <Teleport to="body">
      <div
        v-if="prefixModalOpen && item"
        class="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-6"
        @click.self="prefixModalOpen = false"
      >
        <div class="bg-white rounded-2xl border border-[#EADFD9] shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <!-- 弹窗顶栏 -->
        <div class="p-3.5 border-b border-[#EADFD9] flex items-center justify-between bg-[#FFF7F2]">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[#4A3F3D]">选择附魔词缀</span>
            <span v-if="item.prefix > 0" class="text-[10px] font-mono font-bold text-[#739CBF]">
              当前: {{ prefixMeta?.name || `#${item.prefix}` }}
            </span>
          </div>
          <button
            class="text-[#8E807C] hover:text-[#4A3F3D] text-base font-bold p-1 cursor-pointer"
            @click="prefixModalOpen = false"
          >
            ✕
          </button>
        </div>

        <div class="p-3 border-b border-[#EADFD9] flex flex-col gap-2 bg-[#FFF7F2]/40">
          <!-- 搜索框 -->
          <div class="relative">
            <Input
              v-model="prefixSearch"
              type="text"
              placeholder="搜索词缀名称 / 属性加成 (如 传奇, 险恶, 暴击, 伤害)..."
              class="h-8 text-xs bg-white border-[#EADFD9] text-[#4A3F3D]"
            />
            <button
              v-if="prefixSearch"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E807C] hover:text-[#4A3F3D] text-xs cursor-pointer"
              @click="prefixSearch = ''"
            >
              ✕
            </button>
          </div>

          <!-- 分类筛选胶囊 -->
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
                'text-[11px] px-2.5 py-0.5 rounded-full font-semibold border transition-all cursor-pointer whitespace-nowrap',
                prefixCat === cat.id
                  ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
                  : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="prefixCat = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- 词缀列表 -->
        <div class="p-3 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 flex-1 min-h-0">
          <!-- 清除词缀选项 -->
          <button
            :class="[
              'p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer col-span-full',
              item.prefix === 0
                ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
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
                ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
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
              :class="item.prefix === p.id ? 'opacity-90' : 'text-[#8E807C]'"
              :title="PREFIX_STATS[p.id] || p.en"
            >
              {{ PREFIX_STATS[p.id] || p.en }}
            </span>
          </button>

          <div v-if="filteredPrefixes.length === 0" class="col-span-full py-8 text-center text-xs text-[#8E807C]">
            未检索到匹配的词缀
          </div>
        </div>

        <div class="p-2.5 border-t border-[#EADFD9] bg-[#FFF7F2] flex justify-end">
          <Button
            variant="default"
            size="xs"
            class="h-7 text-xs font-semibold bg-[#739CBF] text-white px-3"
            @click="prefixModalOpen = false"
          >
            关闭
          </Button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
