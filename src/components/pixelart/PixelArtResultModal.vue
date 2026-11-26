<script setup lang="ts">
import { Button } from '@/components/ui/button';
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
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs select-none"
        @click.self="emit('close')"
      >
        <div
          class="bg-white rounded-2xl border border-[#EADFD9] shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden text-[#4A3F3D]"
        >
          <!-- 弹窗标题栏 -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#EADFD9] shrink-0">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] flex items-center justify-center shrink-0">
                <span :style="{ ...getItemSpriteStyle(1071, 16), imageRendering: 'pixelated' }"></span>
              </div>
              <h3 class="text-sm font-bold text-[#4A3F3D] truncate">{{ title }}</h3>
            </div>
            <button
              type="button"
              class="text-xs text-[#8E807C] hover:text-[#4A3F3D] px-2 py-1 cursor-pointer shrink-0"
              @click="emit('close')"
            >
              关闭
            </button>
          </div>

          <!-- 推荐列表主体 -->
          <div class="p-4 overflow-y-auto flex-1">
            <PixelArtResultPanel
              :matcher="matcher"
              :target-hex="targetHex"
              :detail="detail"
              :transparent-hint="transparentHint"
              :options="options"
              :tag-counts="matcher.repository.tagCounts"
              max-list-height-class="max-h-[46vh]"
              @update:options="emit('update:options', $event)"
            />
          </div>

          <!-- 底部关闭 -->
          <div class="px-4 py-2.5 border-t border-[#EADFD9] bg-[#FFF7F2]/60 flex justify-end shrink-0">
            <Button
              variant="default"
              size="sm"
              class="h-8 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-4"
              @click="emit('close')"
            >
              关闭
            </Button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
