<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { store, clearError, showToast } from '@/store';
import { formatDiagnosticReport } from '@/core/errors';
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
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="modal"
        class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none"
      >
        <div
          class="bg-white rounded-2xl border border-[#EADFD9] shadow-2xl max-w-md w-full p-5 flex flex-col gap-3.5 text-[#4A3F3D]"
        >
          <div class="flex items-center justify-between pb-2.5 border-b border-[#EADFD9]">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                <span :style="{ ...getItemSpriteStyle(3099, 20), imageRendering: 'pixelated' }"></span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-rose-800">{{ modal.error.title }}</h3>
                <span class="text-[11px] font-mono text-[#8E807C]">{{ modal.error.code }}</span>
              </div>
            </div>
            <button
              type="button"
              class="text-xs text-[#8E807C] hover:text-[#4A3F3D] px-2 py-1 cursor-pointer"
              @click="clearError"
              aria-label="关闭"
            >
              关闭
            </button>
          </div>

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

          <div class="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-3"
              @click="copyReport"
            >
              {{ copied ? '已复制报告' : '复制诊断报告' }}
            </Button>

            <div class="flex items-center gap-2">
              <Button
                v-if="modal.onRetry"
                variant="outline"
                size="sm"
                class="h-8 text-xs border-[#739CBF] text-[#739CBF] hover:bg-[#739CBF]/10 px-3"
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
        </div>
      </div>
    </transition>
  </Teleport>
</template>
