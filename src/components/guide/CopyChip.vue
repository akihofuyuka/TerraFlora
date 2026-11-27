<script setup lang="ts">
import { Copy } from 'lucide-vue-next';
import { showToast } from '@/store';
import { copyToClipboard } from './guideData';

const props = defineProps<{
  text: string;
  toastPrefix?: string;
}>();

async function handleCopy() {
  const ok = await copyToClipboard(props.text);
  if (ok) {
    showToast(`${props.toastPrefix ?? '已复制'}: ${props.text}`);
  } else {
    showToast(props.toastPrefix === 'Copied' ? 'Copy failed, please copy manually' : '复制失败，请长按手动选择');
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded-md bg-white border border-[#C4D6E5] text-[#739CBF] hover:bg-[#EEF4F9] font-mono text-[11.5px] font-semibold align-baseline transition-all active:scale-95 cursor-pointer select-text"
    :title="toastPrefix === 'Copied' ? 'Copy' : '复制'"
    @click="handleCopy"
  >
    <span>{{ text }}</span>
    <Copy class="w-2.5 h-2.5 shrink-0 opacity-80" />
  </button>
</template>
