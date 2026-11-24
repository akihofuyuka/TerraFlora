<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { store } from '@/store';
import { drawCharacterAvatar, initAvatarAssets, type ArmorDataFile } from '@/utils/avatar';
import { Button } from '@/components/ui/button';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    scale?: number;
    allowGearToggle?: boolean;
    embedded?: boolean;
    hideLoadoutSelector?: boolean;
  }>(),
  {
    compact: false,
    scale: 2.5,
    allowGearToggle: true,
    embedded: false,
    hideLoadoutSelector: false,
  }
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const showGear = ref(true);
const isReady = ref(false);
const renderFailed = ref(false);
const armorMeta = ref<ArmorDataFile | null>(null);

const activeLoadoutIdx = computed({
  get: () => store.loadoutTab ?? store.player?.currentLoadoutIndex ?? 0,
  set: (val: number) => {
    store.loadoutTab = val;
  }
});

let isRendering = false;
let renderPending = false;

async function renderAvatar() {
  if (!canvasRef.value || !store.player) return;
  if (isRendering) {
    renderPending = true;
    return;
  }
  isRendering = true;
  renderFailed.value = false;
  try {
    do {
      renderPending = false;
      await drawCharacterAvatar(canvasRef.value, store.player, {
        showGear: showGear.value,
        loadoutIndex: activeLoadoutIdx.value,
      });
    } while (renderPending);
  } catch (err) {
    renderFailed.value = true;
    console.error('Failed to render character avatar:', err);
  } finally {
    isRendering = false;
  }
}

onMounted(async () => {
  try {
    const assets = await initAvatarAssets();
    armorMeta.value = assets.armorData;
    isReady.value = true;
    await renderAvatar();
  } catch (e) {
    renderFailed.value = true;
    console.warn('Avatar assets preloading:', e);
  }
});

// 监听角色外观、装备、染料、配置切换或显示模式，实现实时刷新
watch(
  [() => store.player, () => store.loadoutTab, () => showGear.value],
  () => {
    if (isReady.value) {
      renderAvatar();
    }
  },
  { deep: true }
);

function downloadAvatar() {
  if (!canvasRef.value || !store.player) return;
  // Create high-res export canvas (160x224)
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 160;
  exportCanvas.height = 224;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvasRef.value, 0, 0, 40, 56, 0, 0, 160, 224);

  const link = document.createElement('a');
  link.download = `${store.player.name || 'character'}_avatar.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}
</script>

<template>
  <!-- 紧凑型展示 (适合嵌入侧边栏或列表) -->
  <div v-if="compact" class="flex flex-col items-center gap-1.5">
    <div
      class="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-b from-[#FFF7F2] to-[#EFE7E2] border border-[#EADFD9] shadow-inner"
    >
      <canvas
        ref="canvasRef"
        width="40"
        height="56"
        class="w-16 h-[89.6px] drop-shadow-[0_4px_6px_rgba(74,63,61,0.18)]"
        style="image-rendering: pixelated; image-rendering: crisp-edges;"
      ></canvas>
    </div>
  </div>

  <!-- 嵌入卡片型展示 (专为装备大卡片内部左侧设计) -->
  <div
    v-else-if="embedded"
    class="flex flex-row lg:flex-col items-center justify-center gap-3 p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] w-full lg:w-44 xl:w-48 shrink-0 shadow-2xs"
  >
    <!-- 像素人物画布与地台效果 -->
    <div class="flex flex-col items-center shrink-0">
      <div
        class="relative w-28 h-36 flex items-center justify-center rounded-xl bg-gradient-to-b from-[#FFFDFB] to-[#EFE7E2] border border-[#EADFD9] shadow-inner group overflow-hidden"
      >
        <!-- 微弱地台阴影环 -->
        <div
          class="absolute bottom-2.5 w-16 h-3 rounded-full bg-[#4A3F3D]/10 blur-[1px] pointer-events-none"
        ></div>

        <!-- 人物 Canvas 40x56 -->
        <canvas
          ref="canvasRef"
          width="40"
          height="56"
          class="relative z-10 w-20 h-28 drop-shadow-[0_5px_8px_rgba(74,63,61,0.22)] transition-transform duration-200 group-hover:scale-105"
          style="image-rendering: pixelated; image-rendering: crisp-edges;"
        ></canvas>
        <span
          v-if="renderFailed"
          class="absolute inset-0 z-10 flex items-center justify-center text-[10px] text-[#8E807C] bg-[#FFF7F2]/80 text-center px-2"
        >
          纸娃娃加载失败
        </span>

        <!-- 右上角快捷导出按钮 -->
        <button
          class="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 hover:bg-white text-[#4A3F3D] border border-[#EADFD9] shadow-2xs opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
          title="导出人物像素头像 (PNG)"
          @click="downloadAvatar"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 角色名称与穿戴/常服切换 -->
    <div class="flex flex-col items-center gap-2 min-w-0">
      <span class="text-[11px] font-mono font-bold text-[#8E807C] truncate max-w-[140px] lg:max-w-full">
        {{ store.player?.name || '未命名角色' }}
      </span>

      <!-- 控制条: 装备模式切换 -->
      <div v-if="allowGearToggle" class="flex flex-col sm:flex-row lg:flex-row items-center gap-1.5">
        <Button
          :variant="showGear ? 'default' : 'outline'"
          size="xs"
          class="h-6 text-[11px] font-semibold px-2"
          :class="showGear ? 'bg-[#739CBF] text-white hover:bg-[#6087A9]' : 'border-[#EADFD9] text-[#4A3F3D] bg-white'"
          @click="showGear = true"
        >
          全身穿戴
        </Button>
        <Button
          :variant="!showGear ? 'default' : 'outline'"
          size="xs"
          class="h-6 text-[11px] font-semibold px-2"
          :class="!showGear ? 'bg-[#739CBF] text-white hover:bg-[#6087A9]' : 'border-[#EADFD9] text-[#4A3F3D] bg-white'"
          @click="showGear = false"
        >
          发型常服
        </Button>
      </div>
    </div>
  </div>

  <!-- 完整型展示卡片 (角色属性页与装备页) -->
  <div
    v-else
    class="flex flex-col sm:flex-row items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] shadow-xs"
  >
    <!-- 左侧: 像素人物画布与地台效果 -->
    <div class="flex flex-col items-center gap-2 shrink-0">
      <div
        class="relative w-28 h-36 flex items-center justify-center rounded-xl bg-gradient-to-b from-[#FFFDFB] to-[#EFE7E2] border border-[#EADFD9] shadow-inner group overflow-hidden"
      >
        <!-- 微弱地台阴影环 -->
        <div
          class="absolute bottom-2.5 w-16 h-3 rounded-full bg-[#4A3F3D]/10 blur-[1px] pointer-events-none"
        ></div>

        <!-- 人物 Canvas 40x56 -->
        <canvas
          ref="canvasRef"
          width="40"
          height="56"
          class="relative z-10 w-20 h-28 drop-shadow-[0_5px_8px_rgba(74,63,61,0.22)] transition-transform duration-200 group-hover:scale-105"
          style="image-rendering: pixelated; image-rendering: crisp-edges;"
        ></canvas>
        <span
          v-if="renderFailed"
          class="absolute inset-0 z-10 flex items-center justify-center text-[10px] text-[#8E807C] bg-[#FFF7F2]/80 text-center px-2"
        >
          纸娃娃加载失败
        </span>

        <!-- 右上角快捷导出按钮 -->
        <button
          class="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 hover:bg-white text-[#4A3F3D] border border-[#EADFD9] shadow-2xs opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
          title="导出人物像素头像 (PNG)"
          @click="downloadAvatar"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </button>
      </div>

      <div class="text-[11px] font-mono text-[#8E807C]">
        {{ store.player?.name || '未命名角色' }}
      </div>
    </div>

    <!-- 右侧: 装备外观切换 -->
    <div class="flex flex-col gap-2 w-full min-w-0">
      <!-- 控制条: 装备模式切换 -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div v-if="allowGearToggle" class="flex items-center gap-1.5">
          <Button
            :variant="showGear ? 'default' : 'outline'"
            size="xs"
            class="h-6 text-[11px] font-semibold px-2"
            :class="showGear ? 'bg-[#739CBF] text-white hover:bg-[#6087A9]' : 'border-[#EADFD9] text-[#4A3F3D]'"
            @click="showGear = true"
          >
            全身穿戴
          </Button>
          <Button
            :variant="!showGear ? 'default' : 'outline'"
            size="xs"
            class="h-6 text-[11px] font-semibold px-2"
            :class="!showGear ? 'bg-[#739CBF] text-white hover:bg-[#6087A9]' : 'border-[#EADFD9] text-[#4A3F3D]'"
            @click="showGear = false"
          >
            发型常服
          </Button>
        </div>

        <!-- 配置切换 (若包含多套装备) -->
        <div
          v-if="!hideLoadoutSelector && showGear && store.player?.loadouts && store.player.loadouts.length > 1"
          class="flex items-center gap-1.5 text-xs text-[#8E807C]"
        >
          <span class="text-[11px] shrink-0">配置:</span>
          <div class="flex items-center gap-1">
            <button
              v-for="idx in [0, 1, 2]"
              :key="idx"
              :class="[
                'px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer',
                activeLoadoutIdx === idx
                  ? 'bg-[#739CBF] text-white border-[#739CBF]'
                  : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="activeLoadoutIdx = idx"
            >
              {{ idx + 1 }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
