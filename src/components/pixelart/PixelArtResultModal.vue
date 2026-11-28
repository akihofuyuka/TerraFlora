<script setup lang="ts">
import AppModal from '@/components/ui/AppModal.vue';
import { getItemSpriteStyle } from '@/utils/sprite';
import PixelArtResultPanel from './PixelArtResultPanel.vue';
import type { MatchOptions, PixelArtMatcher } from '@/core/pixelArt';

defineProps<{
  open: boolean;
  title: string;
  detail?: string;
  targetHex: string;
  transparentHint?: boolean;
  matcher: PixelArtMatcher;
  options: MatchOptions;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:options', value: MatchOptions): void;
}>();
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    max-width-class="max-w-lg"
    body-class="p-3 overflow-y-auto overscroll-contain flex-1"
    z-index-class="z-[75]"
    @close="emit('close')"
  >
    <template #icon>
      <div class="w-7 h-7 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center shrink-0">
        <span :style="{ ...getItemSpriteStyle(1071, 16), imageRendering: 'pixelated' }"></span>
      </div>
    </template>

    <PixelArtResultPanel
      :matcher="matcher"
      :target-hex="targetHex"
      :detail="detail"
      :transparent-hint="transparentHint"
      :options="options"
      :tag-counts="matcher.repository.tagCounts"
      max-list-height-class="max-h-[52dvh]"
      @update:options="emit('update:options', $event)"
    />
  </AppModal>
</template>
