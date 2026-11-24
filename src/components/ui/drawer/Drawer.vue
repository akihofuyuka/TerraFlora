<script setup lang="ts">
import { DrawerRoot } from 'vaul-vue';

const props = withDefaults(
  defineProps<{
    open?: boolean;
    defaultOpen?: boolean;
    shouldScaleBackground?: boolean;
    dismissible?: boolean;
  }>(),
  {
    shouldScaleBackground: true,
  }
);

const emits = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();
</script>

<template>
  <DrawerRoot
    :open="props.open"
    :should-scale-background="props.shouldScaleBackground"
    @update:open="emits('update:open', $event)"
  >
    <slot />
  </DrawerRoot>
</template>
