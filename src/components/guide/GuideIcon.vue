<script setup lang="ts">
import { computed } from 'vue';
import { getItemSpriteStyle } from '@/utils/sprite';

const props = withDefaults(
  defineProps<{
    itemId: number;
    size?: number;
    standalone?: boolean;
  }>(),
  {
    size: 20,
    standalone: false,
  }
);

const spriteStyle = computed(() =>
  props.standalone ? null : getItemSpriteStyle(props.itemId, props.size)
);
</script>

<template>
  <span
    v-if="!standalone && spriteStyle"
    class="inline-block shrink-0"
    :style="{ ...spriteStyle, imageRendering: 'pixelated' }"
  ></span>
  <slot v-else />
</template>
