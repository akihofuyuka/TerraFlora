<script setup lang="ts">
import { DrawerContent, DrawerPortal } from 'vaul-vue';
import { cn } from '@/lib/utils';
import DrawerOverlay from './DrawerOverlay.vue';

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerContent
      :class="
        cn(
          'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[90vh] flex-col rounded-t-[16px] border border-slate-200 bg-white shadow-2xl',
          props.class
        )
      "
    >
      <div class="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300" />
      <slot />
    </DrawerContent>
  </DrawerPortal>
</template>
