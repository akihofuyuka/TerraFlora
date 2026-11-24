<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl border bg-white text-card-foreground',
        props.class
      )
    "
    style="border-color: var(--radix-petal-border); box-shadow: var(--radix-mist-shadow);"
  >
    <slot />
  </div>
</template>
