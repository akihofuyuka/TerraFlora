<script setup lang="ts">
import { ref } from 'vue';
import {
  store,
  loadPlrFile,
  exportPlrFile,
  createNewPlayer,
  openBackupNotice,
  setActiveTool,
} from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getItemSpriteStyle } from '@/utils/sprite';

const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    setActiveTool('plr');
    loadPlrFile(target.files[0]);
    target.value = '';
  }
}

function handleNewPlayer() {
  if (store.player && store.isModified) {
    if (!confirm('当前角色有未导出的修改，确定要新建角色吗？')) {
      return;
    }
  }
  setActiveTool('plr');
  createNewPlayer('Player', store.targetEdition || 'relogic');
}

function openAbout() {
  if (store.activeTool === 'plr' && store.player) {
    store.activeTab = 'about';
  } else {
    setActiveTool('about');
  }
}
</script>

<template>
  <header class="bg-white border-b border-[#EADFD9] sticky top-0 z-40 px-3 md:px-4 py-2 shadow-xs">
    <div class="max-w-6xl mx-auto flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
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
                  store.activeTool === 'pixelart'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="setActiveTool('pixelart')"
              >
                <span :style="{ ...getItemSpriteStyle(1071, 14), imageRendering: 'pixelated' }"></span>
                <span>像素画选色</span>
              </button>
            </div>

            <Badge
              v-if="store.activeTool === 'plr' && store.isModified"
              variant="outline"
              class="text-[10px] px-1 py-0 h-4 border-[#E598A3] text-[#4A3F3D] bg-[#F9D6DB]"
            >
              已修改
            </Badge>

            <button
              v-if="store.activeTool === 'plr'"
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

        <!-- 右侧工具栏：角色存档模式下显示新建与导入/导出 -->
        <div v-if="store.activeTool === 'plr'" class="flex items-center gap-1.5 md:gap-2 shrink-0">
          <input
            ref="fileInputRef"
            type="file"
            accept=".plr, application/octet-stream, application/*"
            class="hidden"
            @change="onFileSelected"
          />
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5"
            @click="handleNewPlayer"
            title="创建全新的空白角色"
          >
            新建
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5"
            @click="triggerFileInput"
          >
            导入
          </Button>
          <Button
            v-if="store.player"
            variant="default"
            size="sm"
            class="h-8 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-xs px-2.5"
            @click="exportPlrFile"
          >
            导出 .plr
          </Button>
        </div>
      </div>

      <!-- 移动端紧凑功能切换栏 -->
      <div class="grid grid-cols-2 gap-1 md:hidden bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-0.5">
        <button
          type="button"
          :class="[
            'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
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
            'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
            store.activeTool === 'pixelart'
              ? 'bg-[#739CBF] text-white shadow-2xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="setActiveTool('pixelart')"
        >
          <span :style="{ ...getItemSpriteStyle(1071, 14), imageRendering: 'pixelated' }"></span>
          <span>像素画选色</span>
        </button>
      </div>
    </div>
  </header>
</template>
