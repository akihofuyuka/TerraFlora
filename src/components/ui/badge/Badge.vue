<script setup lang="ts">
import { cn } from '@/lib/utils';
import { badgeVariants } from './badge';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    class?: any;
  }>(),
  {
    variant: 'default',
  }
);
</script>

<template>
  <div :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot />
  </div>
</template>
