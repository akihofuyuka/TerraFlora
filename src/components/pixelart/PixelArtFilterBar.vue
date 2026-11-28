<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown, ChevronUp, ListFilter, RotateCcw } from 'lucide-vue-next';
import {
  normalizeKeyList,
  type FilterMode,
  type KindFilter,
  type MatchAlgorithm,
  type MatchOptions,
  type MaterialsRepository,
  type TagCounts,
} from '@/core/pixelArt';
import PixelArtFilterModal from './PixelArtFilterModal.vue';

const props = defineProps<{
  options: MatchOptions;
  tagCounts?: TagCounts;
  repository?: MaterialsRepository | null;
}>();

const emit = defineEmits<{
  (e: 'update:options', value: MatchOptions): void;
}>();

const showAdvanced = ref(false);
const filterModalOpen = ref(false);

const kindOptions: Array<{ value: KindFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'tile', label: '方块' },
  { value: 'wall', label: '墙壁' },
];

const paintOptions: Array<{ value: boolean; label: string }> = [
  { value: true, label: '含漆' },
  { value: false, label: '不含漆' },
];

const algoOptions: Array<{ value: MatchAlgorithm; label: string }> = [
  { value: 'lab', label: 'Lab 色差' },
  { value: 'rgb', label: 'RGB 距离' },
];

const filterModeOptions: Array<{ value: FilterMode; label: string }> = [
  { value: 'exclude', label: '全库' },
  { value: 'include', label: '自选' },
];

const activeFilterMode = computed<FilterMode>(() => props.options.filterMode ?? 'exclude');
const excludedCount = computed(() => normalizeKeyList(props.options.excludedMaterialKeys).length);
const includedCount = computed(() => normalizeKeyList(props.options.includedMaterialKeys).length);

const activeTierCount = computed(() => {
  let n = 0;
  if (props.options.includeFalling) n++;
  if (props.options.includeSolidTop) n++;
  if (props.options.includeUnsafeWalls) n++;
  if (props.options.includeSpecial) n++;
  return n;
});

const advancedBadgeCount = computed(() => {
  let n = activeFilterMode.value === 'exclude' ? activeTierCount.value : 0;
  if (props.options.algorithm === 'rgb') n++;
  return n;
});

function patch(partial: Partial<MatchOptions>) {
  emit('update:options', { ...props.options, ...partial });
}

function clearExcluded() {
  patch({ excludedMaterialKeys: [] });
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- 行 1：类型 + 油漆 -->
    <div class="grid grid-cols-2 gap-2">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-[#8E807C] px-0.5">类型</span>
        <div class="grid grid-cols-3 gap-0.5 bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5">
          <button
            v-for="item in kindOptions"
            :key="item.value"
            type="button"
            :class="[
              'py-1 rounded-md text-xs transition-all cursor-pointer select-none border',
              options.filter === item.value
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ filter: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-[#8E807C] px-0.5">油漆</span>
        <div class="grid grid-cols-2 gap-0.5 bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5">
          <button
            v-for="item in paintOptions"
            :key="String(item.value)"
            type="button"
            :class="[
              'py-1 rounded-md text-xs transition-all cursor-pointer select-none border',
              options.includePaint === item.value
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ includePaint: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 行 2：材料池 + 清单/高级入口 -->
    <div class="flex items-center justify-between gap-2 flex-wrap bg-[#FFF7F2] border border-[#EADFD9] rounded-xl px-2.5 py-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] font-semibold text-[#8E807C]">材料池</span>
        <div class="flex items-center bg-white border border-[#EADFD9] rounded-lg p-0.5 gap-0.5">
          <button
            v-for="item in filterModeOptions"
            :key="item.value"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer select-none border',
              activeFilterMode === item.value
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ filterMode: item.value })"
          >
            {{ item.label }}
            <template v-if="item.value === 'include'">({{ includedCount }})</template>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-1.5 flex-wrap">
        <button
          v-if="activeFilterMode === 'exclude' && excludedCount > 0"
          type="button"
          class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg btn-danger-soft font-semibold cursor-pointer"
          title="点击清空屏蔽清单"
          @click="clearExcluded"
        >
          <RotateCcw class="w-3 h-3" />
          <span>已屏蔽 {{ excludedCount }}</span>
        </button>

        <button
          v-if="repository"
          type="button"
          class="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#C4D6E5] text-[#2F658D] font-semibold hover:bg-[#EEF4F9] cursor-pointer"
          @click="filterModalOpen = true"
        >
          <ListFilter class="w-3.5 h-3.5" />
          <span>管理清单</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors cursor-pointer select-none"
          :class="showAdvanced || advancedBadgeCount > 0 ? 'bg-white border-[#C4D6E5] text-[#2F658D] font-semibold' : 'bg-white border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D]'"
          @click="showAdvanced = !showAdvanced"
        >
          <span>高级</span>
          <span v-if="advancedBadgeCount > 0" class="text-[10px] font-mono">({{ advancedBadgeCount }})</span>
          <ChevronUp v-if="showAdvanced" class="w-3 h-3" />
          <ChevronDown v-else class="w-3 h-3" />
        </button>
      </div>
    </div>

    <p
      v-if="activeFilterMode === 'include' && includedCount === 0"
      class="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200 rounded-lg px-2.5 py-1.5"
    >
      自选清单为空，点「管理清单」勾选，或在结果中点 + 加入。
    </p>

    <!-- 高级设置：算法 + 非常规材料 -->
    <div
      v-if="showAdvanced"
      class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-2.5 flex flex-col gap-2.5"
    >
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="text-[11px] font-semibold text-[#8E807C]">匹配算法</span>
        <div class="grid grid-cols-2 gap-0.5 bg-white border border-[#EADFD9] rounded-lg p-0.5">
          <button
            v-for="item in algoOptions"
            :key="item.value"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer select-none border',
              options.algorithm === item.value
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ algorithm: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div v-if="activeFilterMode === 'exclude'" class="flex flex-col gap-1.5 pt-2 border-t border-[#EADFD9]/70">
        <span class="text-[11px] font-semibold text-[#8E807C]">包含非常规材料（默认跳过）</span>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            :class="[
              'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
              options.includeFalling
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5]'
                : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
            ]"
            title="沙块、黑檀沙、珍珠沙、泥沙、雪泥等受重力下落方块"
            @click="patch({ includeFalling: !options.includeFalling })"
          >
            下落方块
            <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.falling }}</span>
          </button>

          <button
            type="button"
            :class="[
              'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
              options.includeSolidTop
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5]'
                : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
            ]"
            title="木平台（同图格共享）与 6 色团队平台"
            @click="patch({ includeSolidTop: !options.includeSolidTop })"
          >
            平台 (木/团队)
            <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.solid_top }}</span>
          </button>

          <button
            type="button"
            :class="[
              'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
              options.includeUnsafeWalls
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5]'
                : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
            ]"
            title="天然土墙、诅咒地牢墙、蜘蛛栖息墙等不安全天然墙"
            @click="patch({ includeUnsafeWalls: !options.includeUnsafeWalls })"
          >
            不安全天然墙
            <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.unsafe_wall }}</span>
          </button>

          <button
            type="button"
            :class="[
              'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
              options.includeSpecial
                ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5]'
                : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
            ]"
            title="彩虹砖（持续变色）、反传送门块与 6 种发光苔藓砖"
            @click="patch({ includeSpecial: !options.includeSpecial })"
          >
            变色/发光块
            <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.special }}</span>
          </button>
        </div>
      </div>

      <p v-else class="text-[11px] text-[#8E807C] pt-1.5 border-t border-[#EADFD9]/70">
        当前使用「自选」材料池，仅从自选清单中匹配，不受非常规材料开关限制。
      </p>
    </div>

    <PixelArtFilterModal
      v-if="repository"
      :open="filterModalOpen"
      :repository="repository"
      :options="options"
      @close="filterModalOpen = false"
      @update:options="emit('update:options', $event)"
    />
  </div>
</template>
