<script setup lang="ts">
import { ArrowUpDown, BookOpen } from 'lucide-vue-next';
import { store, setGuideSubTab } from '@/store';
import GuideIcon from './GuideIcon.vue';
import SavePathWizard from './SavePathWizard.vue';
import MapConverterView from './MapConverterView.vue';

defineProps<{
  standalone?: boolean;
}>();
</script>

<template>
  <div class="max-w-xl w-full mx-auto flex flex-col gap-3.5">
    <nav
      v-if="!standalone"
      class="bg-white border border-[#EADFD9] rounded-xl p-1.5 flex gap-1.5 shadow-sm select-none"
    >
      <button
        type="button"
        :class="[
          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer',
          store.guideSubTab === 'path'
            ? 'bg-[#739CBF] text-white shadow-sm'
            : 'text-[#4A3F3D] hover:bg-[#EFE7E2]',
        ]"
        @click="setGuideSubTab('path')"
      >
        <GuideIcon :item-id="149" :size="16" :standalone="standalone">
          <BookOpen class="w-3.5 h-3.5 shrink-0" />
        </GuideIcon>
        <span>存档寻找向导</span>
      </button>

      <button
        type="button"
        :class="[
          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer',
          store.guideSubTab === 'converter'
            ? 'bg-[#739CBF] text-white shadow-sm'
            : 'text-[#4A3F3D] hover:bg-[#EFE7E2]',
        ]"
        @click="setGuideSubTab('converter')"
      >
        <GuideIcon :item-id="893" :size="16" :standalone="standalone">
          <ArrowUpDown class="w-3.5 h-3.5 shrink-0" />
        </GuideIcon>
        <span>地图签名互转</span>
      </button>
    </nav>

    <SavePathWizard v-if="store.guideSubTab === 'path'" :standalone="standalone" />
    <MapConverterView v-else :standalone="standalone" />
  </div>
</template>
