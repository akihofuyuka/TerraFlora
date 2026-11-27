<script setup lang="ts">
import { ArrowUpDown, BookOpen, ExternalLink } from 'lucide-vue-next';
import { store, setGuideSubTab } from '@/store';
import GuideView from './GuideView.vue';
import logoUrl from '../../../public/logo.png';
</script>

<template>
  <div class="min-h-screen text-[#4A3F3D] flex flex-col font-sans" style="background-color: var(--radix-sakura-canvas);">
    <header class="bg-white border-b border-[#EADFD9] sticky top-0 z-40 px-3 md:px-4 py-2 shadow-sm select-none">
      <div class="max-w-6xl mx-auto flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 flex items-center justify-center shrink-0">
              <img :src="logoUrl" alt="Logo" class="w-7 h-7 object-contain drop-shadow-sm" />
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <h1 class="text-sm font-bold text-[#4A3F3D] leading-tight">TerraFlora</h1>

              <div class="hidden md:flex items-center gap-1 ml-2 bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-0.5">
                <button
                  type="button"
                  :class="[
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                    store.guideSubTab === 'path'
                      ? 'bg-[#739CBF] text-white shadow-sm'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]',
                  ]"
                  @click="setGuideSubTab('path')"
                >
                  <BookOpen class="w-3.5 h-3.5" />
                  <span>存档向导</span>
                </button>
                <button
                  type="button"
                  :class="[
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                    store.guideSubTab === 'converter'
                      ? 'bg-[#739CBF] text-white shadow-sm'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]',
                  ]"
                  @click="setGuideSubTab('converter')"
                >
                  <ArrowUpDown class="w-3.5 h-3.5" />
                  <span>地图签名互转</span>
                </button>
              </div>
            </div>
          </div>

          <a
            href="https://terraflora-8cm.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-[#EADFD9] bg-white text-xs font-semibold text-[#4A3F3D] hover:bg-[#F9D6DB]/40 shadow-sm transition-colors shrink-0"
          >
            <span>在线完整版</span>
            <ExternalLink class="w-3 h-3 text-[#739CBF]" />
          </a>
        </div>

        <div class="grid grid-cols-2 gap-1 md:hidden bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-0.5">
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
              store.guideSubTab === 'path'
                ? 'bg-[#739CBF] text-white shadow-sm'
                : 'text-[#4A3F3D] hover:bg-[#EFE7E2]',
            ]"
            @click="setGuideSubTab('path')"
          >
            <BookOpen class="w-3.5 h-3.5" />
            <span>存档向导</span>
          </button>
          <button
            type="button"
            :class="[
              'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
              store.guideSubTab === 'converter'
                ? 'bg-[#739CBF] text-white shadow-sm'
                : 'text-[#4A3F3D] hover:bg-[#EFE7E2]',
            ]"
            @click="setGuideSubTab('converter')"
          >
            <ArrowUpDown class="w-3.5 h-3.5" />
            <span>地图签名互转</span>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-6xl w-full mx-auto p-3 md:p-6 flex-1 flex flex-col">
      <GuideView :standalone="true" />
    </main>

    <transition name="toast-fade">
      <div
        v-if="store.toastMessage"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#4A3F3D]/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-50 backdrop-blur-sm pointer-events-none"
      >
        {{ store.toastMessage }}
      </div>
    </transition>
  </div>
</template>

<style>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
