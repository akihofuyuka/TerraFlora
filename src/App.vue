<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref, computed } from 'vue';
import {
  store,
  initData,
  loadPlrFile,
  createNewPlayer,
  deselectSlot,
  cancelMoveMode,
  setActiveTool
} from '@/store';
import TopBar from '@/components/TopBar.vue';
import TabNav from '@/components/TabNav.vue';
import InventoryView from '@/components/InventoryView.vue';
import EquipmentView from '@/components/EquipmentView.vue';
import CharacterView from '@/components/CharacterView.vue';
import BuffView from '@/components/BuffView.vue';
import ResearchView from '@/components/ResearchView.vue';
import SlotEditorPanel from '@/components/SlotEditorPanel.vue';
import BackupNoticeModal from '@/components/BackupNoticeModal.vue';
import ErrorModal from '@/components/ErrorModal.vue';

const AboutView = defineAsyncComponent(() => import('@/components/AboutView.vue'));
const WorldView = defineAsyncComponent(() => import('@/components/world/WorldView.vue'));
const PixelArtView = defineAsyncComponent(() => import('@/components/pixelart/PixelArtView.vue'));
const GuideView = defineAsyncComponent(() => import('@/components/guide/GuideView.vue'));
import AppModal from '@/components/ui/AppModal.vue';
import { Button } from '@/components/ui/button';
import { getItemSpriteStyle } from '@/utils/sprite';

const fileInputRef = ref<HTMLInputElement | null>(null);
const isMobile = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

onMounted(() => {
  initData();
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const isMobileDrawerOpen = computed({
  get: () => store.activeTool === 'plr' && isMobile.value && store.selectedSlot !== null && !store.isMoveMode,
  set: (val: boolean) => {
    if (!val && isMobile.value) {
      deselectSlot();
    }
  },
});

function triggerUpload() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    loadPlrFile(target.files[0]);
    target.value = '';
  }
}
</script>

<template>
  <div class="min-h-screen text-[#4A3F3D] flex flex-col font-sans select-none" style="background-color: var(--radix-sakura-canvas);">
    <!-- 顶部全局导航栏 -->
    <TopBar />

    <!-- 地图存档工具 -->
    <main v-if="store.activeTool === 'wld'" class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
      <WorldView />
    </main>

    <!-- 像素画选色工具（KeepAlive 保留图片与画布状态） -->
    <main v-show="store.activeTool === 'pixelart'" class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
      <KeepAlive>
        <PixelArtView v-if="store.activeTool === 'pixelart'" />
      </KeepAlive>
    </main>

    <!-- 存档寻找向导 -->
    <main v-if="store.activeTool === 'guide'" class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
      <GuideView />
    </main>

    <!-- 独立关于页（未载入存档或从像素画工具点击关于时显示） -->
    <main v-if="store.activeTool === 'about'" class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
      <AboutView />
    </main>

    <!-- 角色存档编辑：已载入角色时的功能界面 -->
    <template v-if="store.activeTool === 'plr' && store.player">
      <!-- 移动待命提示横条 (手机端抽屉收起后常驻顶部，视野 100% 毫无遮挡) -->
      <transition name="fade">
        <div
          v-if="store.isMoveMode"
          class="sticky top-12 z-30 bg-[#F9D6DB] border-b border-[#E598A3] px-4 py-2 flex items-center justify-between shadow-xs"
        >
          <div class="flex items-center gap-2 text-xs font-bold text-[#4A3F3D]">
            <span :style="{ ...getItemSpriteStyle(84, 16), imageRendering: 'pixelated' }"></span>
            <span>已选定物品，点击目标格子完成互换</span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            class="h-6 text-xs text-[#4A3F3D] hover:bg-white/60 px-2 font-semibold"
            @click="cancelMoveMode"
          >
            取消移动
          </Button>
        </div>
      </transition>

      <!-- 页面主体容器 (桌面端居中 max-w-6xl) -->
      <div class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
        <!-- 桌面端与移动端双栏响应式网格 -->
        <div class="flex flex-col md:flex-row md:items-start gap-4 lg:gap-6 flex-1">
          <!-- 左侧主要展示区 (~65% 宽) -->
          <div class="flex-1 min-w-0 flex flex-col gap-3">
            <!-- 视图 Tab 切换 -->
            <TabNav />

            <!-- 选中的视图内容 -->
            <main class="flex-1">
              <InventoryView v-if="store.activeTab === 'inventory'" />
              <EquipmentView v-else-if="store.activeTab === 'equipment'" />
              <CharacterView v-else-if="store.activeTab === 'character'" />
              <BuffView v-else-if="store.activeTab === 'buff'" />
              <ResearchView v-else-if="store.activeTab === 'research'" />
              <AboutView v-else-if="store.activeTab === 'about'" />
            </main>
          </div>

          <!-- 桌面端右侧常驻粘性面板 (~35% 宽，sticky top-20，仅在 md: 及以上显示) -->
          <aside class="hidden md:block w-80 lg:w-96 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)]">
            <SlotEditorPanel />
          </aside>
        </div>
      </div>

      <!-- 移动端物品编辑面板 -->
      <AppModal
        :open="isMobileDrawerOpen"
        variant="sheet"
        :show-close="false"
        max-width-class="max-w-lg"
        panel-class="h-[90dvh] max-h-[92dvh]"
        body-class="p-2.5 flex-1 min-h-0 flex flex-col overflow-hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        z-index-class="z-[60]"
        @close="deselectSlot"
      >
        <SlotEditorPanel :is-drawer="true" @close="deselectSlot" />
      </AppModal>
    </template>

    <!-- 角色存档编辑：未载入时的迎宾引导界面 -->
    <main v-else-if="store.activeTool === 'plr'" class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
      <div class="max-w-xl w-full mx-auto flex flex-col gap-3.5">
        <div class="bg-white rounded-2xl border border-[#EADFD9] shadow-sm p-5 md:p-6 text-center flex flex-col gap-4">
          <div class="flex flex-col items-center gap-1.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#F9D6DB]/55 border border-[#E598A3]/60 text-[#4A3F3D]">
              <span :style="{ ...getItemSpriteStyle(48, 14), imageRendering: 'pixelated' }"></span>
              <span>角色存档编辑</span>
            </span>
            <h2 class="text-base font-bold text-[#4A3F3D]">载入或创建泰拉瑞亚角色</h2>
            <p class="text-xs text-[#8E807C]">本地解析与编辑 .plr 存档，支持国际服与心动版</p>
          </div>

          <input
            ref="fileInputRef"
            type="file"
            accept=".plr, application/octet-stream, application/*"
            class="hidden"
            @change="onFileSelected"
          />

          <div
            class="border-2 border-dashed border-[#739CBF]/60 bg-[#FFF7F2] hover:bg-[#F9D6DB]/40 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors"
            @click="triggerUpload"
          >
            <div :style="{ ...getItemSpriteStyle(48, 32), imageRendering: 'pixelated' }"></div>
            <span class="text-xs font-bold text-[#739CBF]">点击或拖入 .plr 存档</span>
            <span class="text-xs text-[#8E807C]">支持官方国际服与心动版</span>
          </div>

          <div class="flex items-center gap-2 my-0.5">
            <div class="h-px bg-[#EADFD9] flex-1"></div>
            <span class="text-[11px] text-[#8E807C]">或</span>
            <div class="h-px bg-[#EADFD9] flex-1"></div>
          </div>

          <Button
            variant="secondary"
            class="w-full h-9 text-xs font-bold bg-[#F9D6DB]/70 hover:bg-[#F9D6DB] text-[#4A3F3D] border border-[#EADFD9] flex items-center justify-center gap-2 shadow-2xs"
            @click="createNewPlayer('Player', 'relogic')"
          >
            <span :style="{ ...getItemSpriteStyle(3507, 16), imageRendering: 'pixelated' }"></span>
            <span>从零创建新角色</span>
          </Button>

          <div class="bg-[#F9D6DB]/35 border border-[#E598A3]/60 rounded-xl p-3 text-left text-xs text-[#4A3F3D] leading-relaxed">
            如果你是在浏览器中使用本工具，且为 <strong>Android 11</strong> 及以上版本，请先将存档移动到浏览器可访问的目录（例如：<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">Download</code> 文件夹）。如果你找不到存档位置，可以访问：<button type="button" class="font-bold text-[#739CBF] hover:underline cursor-pointer" @click="setActiveTool('guide')">存档寻找向导</button>。
          </div>

          <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3 text-left text-xs text-[#8E807C] flex flex-col gap-1">
            <div class="font-bold text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(149, 14), imageRendering: 'pixelated' }"></span>
              <span>系统默认存档路径：</span>
            </div>
            <p>• <strong>Windows：</strong>文档 \ My Games \ Terraria \ Players</p>
            <p>• <strong>Android：</strong>Android/data/com.and.games505.TerrariaPaid/Players</p>
            <p>• <strong>iOS / iPad：</strong>文件 App \ 我的 iPhone/iPad \ Terraria \ Players</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 拖拽幽灵预览 -->
    <div
      v-if="store.dragState.isDragging && store.dragState.item"
      :class="[
        'fixed pointer-events-none z-50 flex items-center justify-center rounded-xl bg-white/95 border-2 border-[#739CBF] shadow-2xl transition-transform duration-75',
        store.dragState.isTouch
          ? '-translate-x-1/2 -translate-y-[135%] w-14 h-14 scale-110'
          : '-translate-x-1/2 -translate-y-1/2 w-12 h-12 scale-105'
      ]"
      :style="{ left: `${store.dragState.x}px`, top: `${store.dragState.y}px` }"
    >
      <div
        :style="{
          ...getItemSpriteStyle(store.dragState.item.id, store.dragState.isTouch ? 40 : 36),
          imageRendering: 'pixelated',
        }"
        class="drop-shadow-sm"
      ></div>
      <span
        v-if="store.dragState.item.stack > 1"
        class="absolute bottom-1 right-1 text-[11px] font-black text-[#4A3F3D] leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
      >
        {{ store.dragState.item.stack }}
      </span>
    </div>

    <!-- 全局 Toast 提示 -->
    <transition name="toast-fade">
      <div
        v-if="store.toastMessage"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#4A3F3D]/95 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg z-50 backdrop-blur-xs pointer-events-none"
      >
        {{ store.toastMessage }}
      </div>
    </transition>

    <!-- 加载遮罩 -->
    <div
      v-if="store.isLoading"
      class="fixed inset-0 bg-[#FFF7F2]/75 backdrop-blur-xs z-50 flex flex-col items-center justify-center gap-3 text-xs font-semibold text-[#4A3F3D]"
    >
      <div class="w-8 h-8 border-3 border-[#EADFD9] border-t-[#739CBF] rounded-full animate-spin"></div>
      <span>正在处理存档...</span>
    </div>

    <!-- 首次访问/手动调起的备份与安全须知弹窗 -->
    <BackupNoticeModal />
    <ErrorModal />
  </div>
</template>

<style>
.toast-fade-enter-active,
.toast-fade-leave-active,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
