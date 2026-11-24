<script setup lang="ts">
import { TabsList } from 'radix-vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  loop?: boolean;
  class?: any;
}>();
</script>

<template>
  <TabsList
    :loop="props.loop"
    :class="
      cn(
        'inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500 select-none',
        props.class
      )
    "
  >
    <slot />
  </TabsList>
</template>
