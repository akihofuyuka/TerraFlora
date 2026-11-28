<script setup lang="ts">
import { ref } from 'vue';
import { store, closeBackupNotice } from '@/store';
import AppModal from '@/components/ui/AppModal.vue';
import { Button } from '@/components/ui/button';
import { getItemSpriteStyle } from '@/utils/sprite';

const dontShowAgain = ref(true);

function handleConfirm() {
  closeBackupNotice(dontShowAgain.value);
}
</script>

<template>
  <AppModal
    :open="store.backupNoticeOpen"
    title="注意事项"
    max-width-class="max-w-md"
    body-class="p-3.5 overflow-y-auto overscroll-contain flex-1"
    z-index-class="z-[70]"
    @close="closeBackupNotice(false)"
  >
    <template #icon>
      <div class="w-8 h-8 rounded-lg bg-[#F9D6DB] flex items-center justify-center shrink-0 border border-[#E598A3]">
        <span :style="{ ...getItemSpriteStyle(327, 20), imageRendering: 'pixelated' }"></span>
      </div>
    </template>

    <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3.5 flex flex-col gap-3 text-xs text-[#4A3F3D] leading-relaxed">
      <div class="flex items-start gap-2">
        <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(3099, 16), imageRendering: 'pixelated' }"></span>
        <div>
          <strong class="text-[#B84A5A]">提前备份并退回主页面：</strong>
          <p class="text-[#5E504D] mt-0.5">
            修改或转换 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">.plr</code> / <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">.wld</code> 前，请先复制备份原文件（可连同 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">.bak</code> 一并保留），并确保游戏已退回主页面后再覆盖替换。
          </p>
        </div>
      </div>

      <div class="flex items-start gap-2">
        <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(544, 16), imageRendering: 'pixelated' }"></span>
        <div>
          <strong class="text-[#4A3F3D]">跨版本与修改风险：</strong>
          <p class="text-[#8E807C] mt-0.5">
            跨大版本降级、国服/国际服互转或非常规数值修改，可能触发游戏校验、清理不兼容物品或导致存档无法加载。
          </p>
        </div>
      </div>

      <div class="flex items-start gap-2">
        <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(156, 16), imageRendering: 'pixelated' }"></span>
        <div>
          <strong class="text-[#2F658D]">纯本地处理：</strong>
          <p class="text-[#8E807C] mt-0.5">
            存档解析、签名转换与像素画计算均在浏览器本地完成，不会上传任何文件。
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-1.5 cursor-pointer text-xs text-[#8E807C] hover:text-[#4A3F3D]">
          <input
            type="checkbox"
            v-model="dontShowAgain"
            class="rounded border-[#EADFD9] text-[#739CBF] focus:ring-[#739CBF] h-3.5 w-3.5 cursor-pointer"
          />
          <span>不再提示</span>
        </label>

        <Button
          variant="default"
          size="sm"
          class="text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-xs h-8 px-4"
          @click="handleConfirm"
        >
          我知道了
        </Button>
      </div>
    </template>
  </AppModal>
</template>
