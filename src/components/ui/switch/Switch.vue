<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'radix-vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  class?: any;
}>();

const emits = defineEmits<{
  (e: 'update:checked', payload: boolean): void;
}>();
</script>

<template>
  <SwitchRoot
    :checked="props.checked"
    :default-checked="props.defaultChecked"
    :disabled="props.disabled"
    :class="
      cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#739CBF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#739CBF] data-[state=unchecked]:bg-[#EADFD9]',
        props.class
      )
    "
    @update:checked="emits('update:checked', $event)"
  >
    <SwitchThumb
      :class="
        cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
        )
      "
    />
  </SwitchRoot>
</template>
