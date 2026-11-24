<script setup lang="ts">
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon';
    class?: any;
    as?: string;
  }>(),
  {
    as: 'button',
    variant: 'default',
    size: 'default',
  }
);
</script>

<template>
  <component
    :is="as"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <slot />
  </component>
</template>
