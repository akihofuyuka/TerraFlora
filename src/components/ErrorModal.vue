<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { store, clearError, showToast } from '@/store';
import { formatDiagnosticReport } from '@/core/errors';
import AppModal from '@/components/ui/AppModal.vue';
import { Button } from '@/components/ui/button';
import { getItemSpriteStyle } from '@/utils/sprite';

const showDetails = ref(false);
const copied = ref(false);

const modal = computed(() => store.errorModal);

watch(modal, () => {
  showDetails.value = false;
  copied.value = false;
});

const diagnosticText = computed(() => {
  if (!modal.value) return '';
  return formatDiagnosticReport(modal.value.error, modal.value.extra);
});

async function copyReport() {
  if (!diagnosticText.value) return;
  try {
    await navigator.clipboard.writeText(diagnosticText.value);
    copied.value = true;
    showToast('诊断报告已复制到剪贴板');
  } catch {
    showToast('复制失败，请展开详情后手动复制');
  }
}

function handleRetry() {
  const retryFn = modal.value?.onRetry;
  clearError();
  retryFn?.();
}
</script>

<template>
  <AppModal
    :open="Boolean(modal)"
    max-width-class="max-w-md"
    body-class="p-3.5 overflow-y-auto overscroll-contain flex-1 flex flex-col gap-3"
    z-index-class="z-[80]"
    @close="clearError"
  >
    <template #header>
      <div v-if="modal" class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[#FDECEF] flex items-center justify-center shrink-0 border border-[#F2C4CD]">
          <span :style="{ ...getItemSpriteStyle(3099, 20), imageRendering: 'pixelated' }"></span>
        </div>
        <div class="min-w-0">
          <h3 class="text-sm font-bold text-[#B84A5A] truncate">{{ modal.error.title }}</h3>
          <span class="text-[11px] font-mono text-[#8E807C]">{{ modal.error.code }}</span>
        </div>
      </div>
    </template>

    <template v-if="modal">
      <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3.5 flex flex-col gap-2 text-xs leading-relaxed">
        <p v-if="modal.error.message && modal.error.message !== modal.error.title" class="text-[#4A3F3D] font-medium">
          {{ modal.error.message }}
        </p>
        <p v-if="modal.error.suggestion" class="text-[#8E807C]">
          {{ modal.error.suggestion }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="text-left text-[11px] text-[#739CBF] hover:underline font-medium w-fit cursor-pointer"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? '收起技术详情 ▲' : '查看技术详情 ▼' }}
        </button>

        <pre
          v-if="showDetails"
          class="bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-2.5 text-[11px] font-mono text-[#5E504D] max-h-40 overflow-auto whitespace-pre-wrap break-all select-text"
        >{{ diagnosticText }}</pre>
      </div>
    </template>

    <template #footer>
      <div v-if="modal" class="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-3"
          @click="copyReport"
        >
          {{ copied ? '已复制报告' : '复制诊断报告' }}
        </Button>

        <div class="flex items-center gap-2">
          <Button
            v-if="modal.onRetry"
            variant="outline"
            size="sm"
            class="h-8 text-xs border-[#739CBF] bg-white text-[#2F658D] hover:bg-[#EEF4F9] px-3"
            @click="handleRetry"
          >
            重试
          </Button>
          <Button
            variant="default"
            size="sm"
            class="h-8 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-4"
            @click="clearError"
          >
            我知道了
          </Button>
        </div>
      </div>
    </template>
  </AppModal>
</template>
