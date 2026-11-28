<script setup lang="ts">
import {
  store,
  exportPlrFile,
  exportWldFile,
  openBackupNotice,
  setActiveTool,
} from '@/store';
import { Button } from '@/components/ui/button';
import { getItemSpriteStyle } from '@/utils/sprite';

function openAbout() {
  setActiveTool('about');
}
</script>

<template>
  <header class="bg-white border-b border-[#EADFD9] sticky top-0 z-40 px-3 md:px-4 py-2 shadow-xs">
    <div class="max-w-6xl mx-auto flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2 min-h-[36px]">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer"
            @click="setActiveTool('plr')"
          >
            <img src="/logo.png" alt="Logo" class="w-7 h-7 object-contain drop-shadow-xs" />
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <h1
              class="text-sm font-bold text-[#4A3F3D] leading-tight cursor-pointer"
              @click="setActiveTool('plr')"
            >
              TerraFlora
            </h1>

            <!-- 桌面端内联功能切换器 -->
            <div class="hidden md:flex items-center gap-1 ml-2 bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-0.5">
              <button
                type="button"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                  store.activeTool === 'plr'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="setActiveTool('plr')"
              >
                <span :style="{ ...getItemSpriteStyle(48, 14), imageRendering: 'pixelated' }"></span>
                <span>角色存档</span>
              </button>
              <button
                type="button"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                  store.activeTool === 'wld'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="setActiveTool('wld')"
              >
                <span :style="{ ...getItemSpriteStyle(893, 14), imageRendering: 'pixelated' }"></span>
                <span>地图存档</span>
              </button>
              <button
                type="button"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                  store.activeTool === 'pixelart'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="setActiveTool('pixelart')"
              >
                <span :style="{ ...getItemSpriteStyle(1071, 14), imageRendering: 'pixelated' }"></span>
                <span>像素画选色</span>
              </button>
              <button
                type="button"
                :class="[
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                  store.activeTool === 'guide'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="setActiveTool('guide')"
              >
                <span :style="{ ...getItemSpriteStyle(149, 14), imageRendering: 'pixelated' }"></span>
                <span>存档向导</span>
              </button>
            </div>

            <button
              type="button"
              class="text-xs text-[#8E807C] hover:text-[#739CBF] transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
              @click="openBackupNotice"
              title="查看注意事项与备份说明"
            >
              <span :style="{ ...getItemSpriteStyle(3099, 12), imageRendering: 'pixelated' }"></span>
              <span>注意事项</span>
            </button>

            <button
              type="button"
              :class="[
                'text-xs transition-colors cursor-pointer ml-1 inline-flex items-center gap-1',
                store.activeTool === 'about'
                  ? 'text-[#739CBF] font-bold'
                  : 'text-[#8E807C] hover:text-[#739CBF]'
              ]"
              @click="openAbout"
              title="关于项目"
            >
              <span :style="{ ...getItemSpriteStyle(757, 12), imageRendering: 'pixelated' }"></span>
              <span>关于</span>
            </button>
          </div>
        </div>

        <!-- 右侧工具栏：已载入角色或地图时显示导出 -->
        <div v-if="store.activeTool === 'plr' && store.player" class="flex items-center gap-1.5 md:gap-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            class="h-8 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-sm px-2.5"
            @click="exportPlrFile"
          >
            导出 .plr
          </Button>
        </div>
        <div v-else-if="store.activeTool === 'wld' && store.worldFile" class="flex items-center gap-1.5 md:gap-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            class="h-8 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-sm px-2.5"
            @click="exportWldFile"
          >
            导出 .wld
          </Button>
        </div>
      </div>

      <!-- 移动端紧凑功能切换栏 -->
      <div class="grid grid-cols-4 gap-1 md:hidden bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-0.5">
        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
            store.activeTool === 'plr'
              ? 'bg-[#739CBF] text-white shadow-2xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="setActiveTool('plr')"
        >
          <span :style="{ ...getItemSpriteStyle(48, 13), imageRendering: 'pixelated' }"></span>
          <span>角色存档</span>
        </button>
        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
            store.activeTool === 'wld'
              ? 'bg-[#739CBF] text-white shadow-2xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="setActiveTool('wld')"
        >
          <span :style="{ ...getItemSpriteStyle(893, 13), imageRendering: 'pixelated' }"></span>
          <span>地图存档</span>
        </button>
        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
            store.activeTool === 'pixelart'
              ? 'bg-[#739CBF] text-white shadow-2xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="setActiveTool('pixelart')"
        >
          <span :style="{ ...getItemSpriteStyle(1071, 13), imageRendering: 'pixelated' }"></span>
          <span class="sm:hidden">像素画</span>
          <span class="hidden sm:inline">像素画选色</span>
        </button>
        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
            store.activeTool === 'guide'
              ? 'bg-[#739CBF] text-white shadow-2xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="setActiveTool('guide')"
        >
          <span :style="{ ...getItemSpriteStyle(149, 13), imageRendering: 'pixelated' }"></span>
          <span>存档向导</span>
        </button>
      </div>
    </div>
  </header>
</template>
