<script setup lang="ts">
import { DrawerOverlay } from 'vaul-vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <DrawerOverlay
    :class="cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-xs', props.class)"
  />
</template>
