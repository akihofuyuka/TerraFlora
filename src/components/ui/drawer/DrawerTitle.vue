<script setup lang="ts">
import { DrawerTitle } from 'vaul-vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <DrawerTitle
    :class="cn('text-lg font-semibold leading-none tracking-tight text-slate-900', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>
