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
    title="备份提醒"
    max-width-class="max-w-md"
    body-class="p-3.5 overflow-y-auto overscroll-contain flex-1"
    z-index-class="z-[70]"
    :show-close="false"
    :close-on-overlay="false"
  >
    <template #icon>
      <div class="w-8 h-8 rounded-lg bg-[#F9D6DB] flex items-center justify-center shrink-0 border border-[#E598A3]">
        <span :style="{ ...getItemSpriteStyle(327, 20), imageRendering: 'pixelated' }"></span>
      </div>
    </template>

    <!-- 提示内容卡片 -->
    <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3.5 flex flex-col gap-2.5 text-xs text-[#4A3F3D] leading-relaxed">
      <div class="flex items-start gap-2">
        <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(3099, 16), imageRendering: 'pixelated' }"></span>
        <div>
          <strong class="text-[#B84A5A]">务必提前备份原存档：</strong>
          <p class="text-[#4A3F3D] mt-0.5">在导入、修改或转换前，请<strong>务必复制并备份原有的人物（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">.plr</code>）和地图（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">.wld</code>）存档文件</strong>（建议同时保留对应的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">.bak</code> 备份文件）。</p>
        </div>
      </div>

      <div class="flex items-start gap-2">
        <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(544, 16), imageRendering: 'pixelated' }"></span>
        <div>
          <strong class="text-amber-800">部分操作属于暴力更改：</strong>
          <p class="text-[#8E807C] mt-0.5">本工具支持国服/国际服签名互转、跨大版本格式转换、以及突破堆叠上限等操作。游戏客户端在加载未预期或异常格式数据时，可能会发生自动校验回滚或崩溃。</p>
        </div>
      </div>

      <div class="flex items-start gap-2">
        <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(156, 16), imageRendering: 'pixelated' }"></span>
        <div>
          <strong class="text-[#2F658D]">100% 纯本地离线运行：</strong>
          <p class="text-[#8E807C] mt-0.5">所有加解密与二进制读写均在您的浏览器本地内存中完成，<strong>绝不向任何云端服务器上传您的存档</strong>，请放心使用。</p>
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
