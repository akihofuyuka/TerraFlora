<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <h3 :class="cn('font-semibold leading-none tracking-tight text-[#4A3F3D]', props.class)">
    <slot />
  </h3>
</template>
