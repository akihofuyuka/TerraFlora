<script setup lang="ts">
import { ref } from 'vue';
import {
  store,
  loadPlrFile,
  exportPlrFile,
  createNewPlayer,
  openBackupNotice,
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
  createNewPlayer('Player', store.targetEdition || 'relogic');
}
</script>

<template>
  <header class="bg-white border-b border-[#EADFD9] sticky top-0 z-40 px-3 md:px-4 py-2 shadow-xs">
    <div class="max-w-6xl mx-auto flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 flex items-center justify-center shrink-0">
          <img src="/logo.png" alt="Logo" class="w-7 h-7 object-contain drop-shadow-xs" />
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <h1 class="text-sm font-bold text-[#4A3F3D] leading-tight">TerraFlora</h1>
          <Badge v-if="store.isModified" variant="outline" class="text-[10px] px-1 py-0 h-4 border-[#E598A3] text-[#4A3F3D] bg-[#F9D6DB]">
            已修改
          </Badge>
          <button
            class="text-xs text-[#8E807C] hover:text-[#739CBF] transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
            @click="openBackupNotice"
            title="查看注意事项与备份说明"
          >
            <span :style="{ ...getItemSpriteStyle(3099, 12), imageRendering: 'pixelated' }"></span>
            <span>注意事项</span>
          </button>
          <button
            v-if="store.player"
            class="text-xs text-[#8E807C] hover:text-[#739CBF] transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
            @click="store.activeTab = 'about'"
            title="关于项目"
          >
            <span :style="{ ...getItemSpriteStyle(757, 12), imageRendering: 'pixelated' }"></span>
            <span>关于</span>
          </button>
        </div>
      </div>

      <!-- 右侧工具栏：新建与导入/导出 -->
      <div class="flex items-center gap-1.5 md:gap-2 shrink-0">
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
  </header>
</template>
