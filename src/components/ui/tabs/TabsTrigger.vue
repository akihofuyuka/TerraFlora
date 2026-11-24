<script setup lang="ts">
import { TabsTrigger } from 'radix-vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  value: string;
  disabled?: boolean;
  class?: any;
}>();
</script>

<template>
  <TabsTrigger
    :value="props.value"
    :disabled="props.disabled"
    :class="
      cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs cursor-pointer',
        props.class
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
