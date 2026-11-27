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
  { value: 'exclude', label: '全库排除' },
  { value: 'include', label: '只用自选' },
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

function patch(partial: Partial<MatchOptions>) {
  emit('update:options', { ...props.options, ...partial });
}

function clearExcluded() {
  patch({ excludedMaterialKeys: [] });
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-[#8E807C] px-0.5">材料类型</span>
        <div class="grid grid-cols-3 gap-0.5 bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5">
          <button
            v-for="item in kindOptions"
            :key="item.value"
            type="button"
            :class="[
              'py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
              options.filter === item.value
                ? 'bg-[#739CBF] text-white shadow-2xs'
                : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ filter: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-[#8E807C] px-0.5">油漆变体</span>
        <div class="grid grid-cols-2 gap-0.5 bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5">
          <button
            v-for="item in paintOptions"
            :key="String(item.value)"
            type="button"
            :class="[
              'py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
              options.includePaint === item.value
                ? 'bg-[#739CBF] text-white shadow-2xs'
                : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ includePaint: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-semibold text-[#8E807C] px-0.5">匹配算法</span>
        <div class="grid grid-cols-2 gap-0.5 bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5">
          <button
            v-for="item in algoOptions"
            :key="item.value"
            type="button"
            :class="[
              'py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
              options.algorithm === item.value
                ? 'bg-[#739CBF] text-white shadow-2xs'
                : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
            ]"
            @click="patch({ algorithm: item.value })"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 筛选模式切换（全库排除 vs 只用自选） + 清单管理入口 -->
    <div class="flex items-center justify-between gap-2 flex-wrap bg-[#FFF7F2] border border-[#EADFD9] rounded-xl px-2.5 py-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[11px] font-semibold text-[#8E807C]">筛选模式</span>
        <div class="flex items-center bg-white border border-[#EADFD9] rounded-lg p-0.5 gap-0.5">
          <button
            v-for="item in filterModeOptions"
            :key="item.value"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none',
              activeFilterMode === item.value
                ? 'bg-[#739CBF] text-white shadow-2xs'
                : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
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
          class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[#F9D6DB]/60 border border-[#E598A3] text-[#4A3F3D] font-semibold hover:bg-[#F9D6DB] cursor-pointer"
          title="点击清空屏蔽清单"
          @click="clearExcluded"
        >
          <RotateCcw class="w-3 h-3" />
          <span>已屏蔽 {{ excludedCount }}</span>
        </button>

        <button
          v-if="repository"
          type="button"
          class="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#739CBF]/45 text-[#2F658D] font-semibold hover:bg-[#739CBF]/10 cursor-pointer"
          @click="filterModalOpen = true"
        >
          <ListFilter class="w-3.5 h-3.5" />
          <span>管理清单 / 导入导出</span>
        </button>
      </div>
    </div>

    <p
      v-if="activeFilterMode === 'include' && includedCount === 0"
      class="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200 rounded-lg px-2.5 py-1.5"
    >
      当前「自选清单」为空；可点击上方「管理清单 / 导入导出」批量勾选或导入，也可在取色结果中点 + 加入。
    </p>

    <!-- 可调回忽略档位（仅全库排除模式生效） -->
    <div v-if="activeFilterMode === 'exclude'" class="flex items-center justify-between gap-2 flex-wrap">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#739CBF] hover:underline cursor-pointer select-none"
        @click="showAdvanced = !showAdvanced"
      >
        <ChevronUp v-if="showAdvanced" class="w-3.5 h-3.5" />
        <ChevronDown v-else class="w-3.5 h-3.5" />
        <span>
          扩展材料档位
          <template v-if="activeTierCount > 0">（已启用 {{ activeTierCount }} 档）</template>
        </span>
      </button>
    </div>

    <div
      v-if="activeFilterMode === 'exclude' && showAdvanced"
      class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-2.5 flex items-center gap-1.5 flex-wrap"
    >
      <button
        type="button"
        :class="[
          'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
          options.includeFalling
            ? 'bg-[#739CBF] text-white border-[#739CBF]'
            : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
        ]"
        title="沙块、雪泥、硬化沙等受重力下落方块"
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
            ? 'bg-[#739CBF] text-white border-[#739CBF]'
            : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
        ]"
        title="木平台、工作台等顶部实心类方块"
        @click="patch({ includeSolidTop: !options.includeSolidTop })"
      >
        平台/顶部实心
        <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.solid_top }}</span>
      </button>

      <button
        type="button"
        :class="[
          'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
          options.includeUnsafeWalls
            ? 'bg-[#739CBF] text-white border-[#739CBF]'
            : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
        ]"
        title="部分可放置但属于天然/不安全类别的墙体"
        @click="patch({ includeUnsafeWalls: !options.includeUnsafeWalls })"
      >
        天然不安全墙
        <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.unsafe_wall }}</span>
      </button>

      <button
        type="button"
        :class="[
          'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer select-none',
          options.includeSpecial
            ? 'bg-[#739CBF] text-white border-[#739CBF]'
            : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#F9D6DB]/35'
        ]"
        title="彩虹砖、发光苔藓块、回声块等特殊效果方块"
        @click="patch({ includeSpecial: !options.includeSpecial })"
      >
        发光/特殊块
        <span v-if="tagCounts" class="opacity-75">+{{ tagCounts.special }}</span>
      </button>
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
