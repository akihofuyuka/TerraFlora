<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  MAX_BATCH_CELLS,
  MAX_TILES_HEIGHT,
  MAX_TILES_WIDTH,
  clampGridSize,
  defaultGridSize,
  fitLongSideGridSize,
  keepRatioGridDim,
  resolveGridSize,
  type SampleStyle,
  type ScaleMode,
} from '@/core/pixelArt';

const props = defineProps<{
  open: boolean;
  sourceCanvas: HTMLCanvasElement;
  sourceWidth: number;
  sourceHeight: number;
  initialMode?: ScaleMode;
  initialSampleStyle?: SampleStyle;
  initialColumns?: number;
  initialRows?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (
    e: 'confirm',
    payload: { mode: ScaleMode; sampleStyle: SampleStyle; columns: number; rows: number }
  ): void;
}>();

const mode = ref<ScaleMode>('keep_ratio');
const sampleStyle = ref<SampleStyle>('smooth');
const colsText = ref('');
const rowsText = ref('');

const defaultSize = computed(() => defaultGridSize(props.sourceWidth, props.sourceHeight));

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    const [defCols, defRows] = defaultSize.value;
    mode.value = props.initialMode ?? 'keep_ratio';
    sampleStyle.value = props.initialSampleStyle ?? 'smooth';
    colsText.value = String(props.initialColumns ?? defCols);
    rowsText.value = String(props.initialRows ?? defRows);
  },
  { immediate: true }
);

function parseDim(raw: string, fallback: number): number {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isNaN(n) ? fallback : n;
}

function digitsOnly(val: string | number): string {
  return String(val).replace(/\D/g, '').slice(0, 4);
}

const resolvedTarget = computed(() => {
  const [defCols, defRows] = defaultSize.value;
  return resolveGridSize(
    props.sourceWidth,
    props.sourceHeight,
    mode.value,
    parseDim(colsText.value, defCols),
    parseDim(rowsText.value, defRows)
  );
});

const totalCells = computed(() => resolvedTarget.value[0] * resolvedTarget.value[1]);

const scaleModes: Array<{ value: ScaleMode; label: string; desc: string }> = [
  { value: 'keep_ratio', label: '按原比例', desc: '锁定宽高比' },
  { value: 'fill', label: '填满裁切', desc: '居中裁切边缘' },
  { value: 'manual', label: '自由拉伸', desc: '独立指定宽高' },
];

function selectMode(nextMode: ScaleMode) {
  mode.value = nextMode;
  if (nextMode === 'keep_ratio') {
    const reqCols = parseDim(colsText.value, defaultSize.value[0]);
    const r = clampGridSize(
      keepRatioGridDim(props.sourceWidth, props.sourceHeight, reqCols, 0),
      MAX_TILES_HEIGHT
    );
    rowsText.value = String(r);
  }
}

function onColsInput(val: string | number) {
  const clean = digitsOnly(val);
  colsText.value = clean;
  if (mode.value === 'keep_ratio') {
    const c = parseDim(clean, defaultSize.value[0]);
    const r = clampGridSize(
      keepRatioGridDim(props.sourceWidth, props.sourceHeight, c, 0),
      MAX_TILES_HEIGHT
    );
    rowsText.value = String(r);
  }
}

function onRowsInput(val: string | number) {
  const clean = digitsOnly(val);
  rowsText.value = clean;
  if (mode.value === 'keep_ratio') {
    const r = parseDim(clean, defaultSize.value[1]);
    const c = clampGridSize(
      keepRatioGridDim(props.sourceWidth, props.sourceHeight, 0, r),
      MAX_TILES_WIDTH
    );
    colsText.value = String(c);
  }
}

function applyLongSidePreset(maxSide: number) {
  const [c, r] = fitLongSideGridSize(props.sourceWidth, props.sourceHeight, maxSide);
  colsText.value = String(c);
  rowsText.value = String(r);
}

function applyOriginalPreset() {
  const [c, r] = resolveGridSize(
    props.sourceWidth,
    props.sourceHeight,
    mode.value === 'manual' ? 'manual' : 'keep_ratio',
    props.sourceWidth,
    props.sourceHeight
  );
  colsText.value = String(c);
  rowsText.value = String(r);
}

function handleConfirm() {
  const [columns, rows] = resolvedTarget.value;
  emit('confirm', { mode: mode.value, sampleStyle: sampleStyle.value, columns, rows });
}
</script>

<template>
  <AppModal
    :open="open"
    title="图格尺寸设置"
    :subtitle="`原图：${sourceWidth} × ${sourceHeight} px`"
    max-width-class="max-w-md"
    body-class="p-3.5 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-3"
    z-index-class="z-[70]"
    @close="emit('close')"
  >
    <template #icon>
      <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 border border-[#EADFD9]">
        <span :style="{ ...getItemSpriteStyle(149, 18), imageRendering: 'pixelated' }"></span>
      </div>
    </template>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold text-[#4A3F3D]">采样方式</span>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          :class="[
            'p-2 rounded-xl border text-left transition-all cursor-pointer',
            sampleStyle === 'smooth'
              ? 'bg-[#EEF4F9] border-[#C4D6E5] text-[#2F658D] shadow-2xs'
              : 'bg-[#FFF7F2] border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D]'
          ]"
          @click="sampleStyle = 'smooth'"
        >
          <div class="text-xs font-bold text-[#4A3F3D]">平滑缩放</div>
          <div class="text-[10px] text-[#8E807C] mt-0.5">适合照片、插画与截图</div>
        </button>
        <button
          type="button"
          :class="[
            'p-2 rounded-xl border text-left transition-all cursor-pointer',
            sampleStyle === 'pixel_snap'
              ? 'bg-[#EEF4F9] border-[#C4D6E5] text-[#2F658D] shadow-2xs'
              : 'bg-[#FFF7F2] border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D]'
          ]"
          @click="sampleStyle = 'pixel_snap'"
        >
          <div class="text-xs font-bold text-[#4A3F3D]">中心去噪取色</div>
          <div class="text-[10px] text-[#8E807C] mt-0.5">避开细线与边缘模糊</div>
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-semibold text-[#4A3F3D]">缩放模式</span>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="item in scaleModes"
          :key="item.value"
          type="button"
          :class="[
            'p-2 rounded-xl border text-left transition-all cursor-pointer',
            mode === item.value
              ? 'bg-[#EEF4F9] border-[#C4D6E5] text-[#2F658D] shadow-2xs'
              : 'bg-[#FFF7F2] border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D]'
          ]"
          @click="selectMode(item.value)"
        >
          <div class="text-xs font-bold text-[#4A3F3D]">{{ item.label }}</div>
          <div class="text-[10px] text-[#8E807C] mt-0.5">{{ item.desc }}</div>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-semibold text-[#8E807C]">
          宽度 (格，上限 {{ MAX_TILES_WIDTH }})
        </label>
        <Input
          :model-value="colsText"
          type="text"
          inputmode="numeric"
          class="bg-[#FFF7F2] border-[#EADFD9] font-mono text-sm h-9"
          @update:model-value="onColsInput"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-semibold text-[#8E807C]">
          高度 (格，上限 {{ MAX_TILES_HEIGHT }})
        </label>
        <Input
          :model-value="rowsText"
          type="text"
          inputmode="numeric"
          class="bg-[#FFF7F2] border-[#EADFD9] font-mono text-sm h-9"
          @update:model-value="onRowsInput"
        />
      </div>
    </div>

    <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3 flex flex-col gap-2 text-xs">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="text-[#2F658D] font-bold">
          {{ resolvedTarget[0] }} × {{ resolvedTarget[1] }} 格（共 {{ totalCells.toLocaleString() }} 块）
        </span>
        <span class="text-[11px] text-[#8E807C]">
          大世界上限 {{ MAX_TILES_WIDTH }}×{{ MAX_TILES_HEIGHT }}
        </span>
      </div>
      <p v-if="totalCells > MAX_BATCH_CELLS" class="text-[11px] text-amber-700 font-medium">
        当前超过 {{ (MAX_BATCH_CELLS / 10000).toFixed(0) }} 万格，仅支持缩放点格选色（全图批量转换需 ≤ {{ (MAX_BATCH_CELLS / 10000).toFixed(0) }} 万格）。
      </p>
      <div class="flex items-center gap-1.5 pt-0.5 flex-wrap">
        <button
          type="button"
          class="text-[11px] px-2 py-1 rounded-lg bg-white border border-[#C4D6E5] text-[#2F658D] font-semibold hover:bg-[#EEF4F9] cursor-pointer"
          @click="applyOriginalPreset"
        >
          原图 1:1
        </button>
        <button
          v-for="preset in [64, 128, 256, 512]"
          :key="preset"
          type="button"
          class="text-[11px] px-2 py-1 rounded-lg bg-white border border-[#EADFD9] text-[#4A3F3D] font-semibold hover:bg-[#F9D6DB]/40 cursor-pointer"
          @click="applyLongSidePreset(preset)"
        >
          {{ preset }} 格
        </button>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-3"
          @click="emit('close')"
        >
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          class="h-8 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-4"
          @click="handleConfirm"
        >
          确认生成
        </Button>
      </div>
    </template>
  </AppModal>
</template>
