<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  MAX_CANVAS_HEIGHT,
  MAX_CANVAS_WIDTH,
  TILE_SIZE,
  clampCanvasSize,
  defaultScaleSize,
  keepRatioDim,
  maxFitSize,
  pixelPerTileSize,
  resolveTargetSize,
  type ScaleMode,
} from '@/core/pixelArt';

const props = defineProps<{
  open: boolean;
  sourceWidth: number;
  sourceHeight: number;
  initialMode?: ScaleMode;
  initialWidth?: number;
  initialHeight?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', payload: { mode: ScaleMode; width: number; height: number }): void;
}>();

const mode = ref<ScaleMode>('keep_ratio');
const inputUnit = ref<'tiles' | 'pixels'>('tiles');
const widthText = ref('');
const heightText = ref('');

const defaultSize = computed(() => defaultScaleSize(props.sourceWidth, props.sourceHeight));
const maxTilesCols = Math.floor(MAX_CANVAS_WIDTH / TILE_SIZE);
const maxTilesRows = Math.floor(MAX_CANVAS_HEIGHT / TILE_SIZE);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    const [defW, defH] = defaultSize.value;
    mode.value = props.initialMode ?? 'keep_ratio';
    widthText.value = String(props.initialWidth ?? defW);
    heightText.value = String(props.initialHeight ?? defH);
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
  const [defW, defH] = defaultSize.value;
  return resolveTargetSize(
    props.sourceWidth,
    props.sourceHeight,
    mode.value,
    parseDim(widthText.value, defW),
    parseDim(heightText.value, defH)
  );
});

const tileCols = computed(() => Math.ceil(resolvedTarget.value[0] / TILE_SIZE));
const tileRows = computed(() => Math.ceil(resolvedTarget.value[1] / TILE_SIZE));

const displayWidthValue = computed(() =>
  inputUnit.value === 'tiles'
    ? String(Math.max(1, Math.round(parseDim(widthText.value, defaultSize.value[0]) / TILE_SIZE)))
    : widthText.value
);

const displayHeightValue = computed(() =>
  inputUnit.value === 'tiles'
    ? String(Math.max(1, Math.round(parseDim(heightText.value, defaultSize.value[1]) / TILE_SIZE)))
    : heightText.value
);

const scaleModes: Array<{ value: ScaleMode; label: string; desc: string }> = [
  { value: 'keep_ratio', label: '按原比例', desc: '锁定宽高比' },
  { value: 'fill', label: '填满裁切', desc: '居中裁切边缘' },
  { value: 'manual', label: '自由拉伸', desc: '独立指定宽高' },
];

function selectMode(nextMode: ScaleMode) {
  mode.value = nextMode;
  if (nextMode === 'keep_ratio') {
    const reqW = parseDim(widthText.value, defaultSize.value[0]);
    const h = clampCanvasSize(
      keepRatioDim(props.sourceWidth, props.sourceHeight, reqW, 0),
      MAX_CANVAS_HEIGHT
    );
    heightText.value = String(h);
  }
}

function onWidthInput(val: string | number) {
  const clean = digitsOnly(val);
  const pxVal = inputUnit.value === 'tiles'
    ? String(Math.max(1, parseDim(clean, 1)) * TILE_SIZE)
    : clean;
  widthText.value = pxVal;
  if (mode.value === 'keep_ratio') {
    const w = parseDim(pxVal, defaultSize.value[0]);
    const h = clampCanvasSize(
      keepRatioDim(props.sourceWidth, props.sourceHeight, w, 0),
      MAX_CANVAS_HEIGHT
    );
    heightText.value = String(h);
  }
}

function onHeightInput(val: string | number) {
  const clean = digitsOnly(val);
  const pxVal = inputUnit.value === 'tiles'
    ? String(Math.max(1, parseDim(clean, 1)) * TILE_SIZE)
    : clean;
  heightText.value = pxVal;
  if (mode.value === 'keep_ratio') {
    const h = parseDim(pxVal, defaultSize.value[1]);
    const w = clampCanvasSize(
      keepRatioDim(props.sourceWidth, props.sourceHeight, 0, h),
      MAX_CANVAS_WIDTH
    );
    widthText.value = String(w);
  }
}

function applyPresetPixelPerTile() {
  const [w, h] = pixelPerTileSize(props.sourceWidth, props.sourceHeight);
  widthText.value = String(w);
  heightText.value = String(h);
}

function applyPresetMaxFit() {
  const [w, h] = maxFitSize(props.sourceWidth, props.sourceHeight);
  widthText.value = String(w);
  heightText.value = String(h);
}

function handleConfirm() {
  const [width, height] = resolvedTarget.value;
  emit('confirm', { mode: mode.value, width, height });
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
        @click.self="emit('close')"
      >
        <div
          class="bg-white rounded-2xl border border-[#EADFD9] shadow-2xl max-w-md w-full p-5 flex flex-col gap-4 text-[#4A3F3D]"
        >
          <!-- 标题 -->
          <div class="flex items-center justify-between pb-2 border-b border-[#EADFD9]">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-[#FFF7F2] flex items-center justify-center shrink-0 border border-[#EADFD9]">
                <span :style="{ ...getItemSpriteStyle(149, 18), imageRendering: 'pixelated' }"></span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-[#4A3F3D]">画布与图格尺寸</h3>
                <p class="text-[11px] text-[#8E807C]">
                  原图尺寸：{{ sourceWidth }} × {{ sourceHeight }} px
                </p>
              </div>
            </div>
            <button
              type="button"
              class="text-xs text-[#8E807C] hover:text-[#4A3F3D] px-2 py-1 cursor-pointer"
              @click="emit('close')"
            >
              取消
            </button>
          </div>

          <!-- 缩放模式 -->
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
                    ? 'bg-[#739CBF]/10 border-[#739CBF] text-[#4A3F3D] shadow-2xs'
                    : 'bg-[#FFF7F2] border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D]'
                ]"
                @click="selectMode(item.value)"
              >
                <div class="text-xs font-bold text-[#4A3F3D]">{{ item.label }}</div>
                <div class="text-[10px] text-[#8E807C] mt-0.5">{{ item.desc }}</div>
              </button>
            </div>
          </div>

          <!-- 输入单位切换 + 数值输入 -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[#4A3F3D]">目标尺寸</span>
              <div class="flex items-center bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  :class="[
                    'px-2 py-0.5 rounded-md font-semibold cursor-pointer',
                    inputUnit === 'tiles' ? 'bg-[#739CBF] text-white' : 'text-[#8E807C]'
                  ]"
                  @click="inputUnit = 'tiles'"
                >
                  按图格数
                </button>
                <button
                  type="button"
                  :class="[
                    'px-2 py-0.5 rounded-md font-semibold cursor-pointer',
                    inputUnit === 'pixels' ? 'bg-[#739CBF] text-white' : 'text-[#8E807C]'
                  ]"
                  @click="inputUnit = 'pixels'"
                >
                  按画布像素
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-[#8E807C]">
                  {{ inputUnit === 'tiles' ? `宽度 (图格，上限 ${maxTilesCols})` : `宽度 (px，上限 ${MAX_CANVAS_WIDTH})` }}
                </label>
                <Input
                  :model-value="displayWidthValue"
                  type="text"
                  inputmode="numeric"
                  class="bg-[#FFF7F2] border-[#EADFD9] font-mono text-sm h-9"
                  @update:model-value="onWidthInput"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-[#8E807C]">
                  {{ inputUnit === 'tiles' ? `高度 (图格，上限 ${maxTilesRows})` : `高度 (px，上限 ${MAX_CANVAS_HEIGHT})` }}
                </label>
                <Input
                  :model-value="displayHeightValue"
                  type="text"
                  inputmode="numeric"
                  class="bg-[#FFF7F2] border-[#EADFD9] font-mono text-sm h-9"
                  @update:model-value="onHeightInput"
                />
              </div>
            </div>
          </div>

          <!-- 快捷尺寸与结果摘要 -->
          <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3 flex flex-col gap-2 text-xs">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-[#739CBF] font-bold">
                {{ tileCols }} × {{ tileRows }} 图格（共 {{ (tileCols * tileRows).toLocaleString() }} 格）
              </span>
              <span class="font-mono text-[#8E807C]">
                {{ resolvedTarget[0] }}×{{ resolvedTarget[1] }} px
              </span>
            </div>
            <p class="text-[11px] text-[#8E807C]">
              1 图格 = 16×16 px，上限 {{ maxTilesCols }}×{{ maxTilesRows }} 格。
            </p>
            <div class="flex items-center gap-2 pt-0.5 flex-wrap">
              <button
                type="button"
                class="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#739CBF]/40 text-[#739CBF] font-semibold hover:bg-[#739CBF]/10 cursor-pointer"
                @click="applyPresetPixelPerTile"
              >
                1 像素 = 1 图格
              </button>
              <button
                type="button"
                class="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#EADFD9] text-[#4A3F3D] font-semibold hover:bg-[#F9D6DB]/40 cursor-pointer"
                @click="applyPresetMaxFit"
              >
                铺满上限
              </button>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-3"
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
              确认生成图格
            </Button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
