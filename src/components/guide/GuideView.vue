<script setup lang="ts">
import { store } from '@/store';
import SavePathWizard from './SavePathWizard.vue';
import WorldView from '@/components/world/WorldView.vue';

defineProps<{
  standalone?: boolean;
}>();
</script>

<template>
  <div v-if="!standalone" class="max-w-xl w-full mx-auto flex flex-col gap-3.5">
    <SavePathWizard :standalone="false" />
  </div>
  <div v-else class="w-full mx-auto flex flex-col gap-3.5">
    <div v-if="store.guideSubTab === 'path'" class="max-w-xl w-full mx-auto">
      <SavePathWizard :standalone="true" />
    </div>
    <WorldView v-else :standalone="true" />
  </div>
</template>
