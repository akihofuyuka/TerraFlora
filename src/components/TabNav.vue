<script setup lang="ts">
import { store } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';

const tabs = [
  { id: 'character', label: '属性', itemId: 29 },       // 生命水晶
  { id: 'inventory', label: '背包仓库', itemId: 48 },    // 宝箱
  { id: 'equipment', label: '装备配置', itemId: 559 },   // 神圣面具
  { id: 'buff', label: '状态增益', itemId: 292 },         // 铁皮药水
  { id: 'research', label: '旅途图鉴', itemId: 149 },     // 复制研究
  { id: 'about', label: '关于', itemId: 757 }            // 泰拉之刃
] as const;
</script>

<template>
  <nav class="bg-white border-b border-[#EADFD9] px-4 py-1.5 flex gap-2 overflow-x-auto no-scrollbar shadow-xs">
    <button
      v-for="t in tabs"
      :key="t.id"
      :class="[
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none',
        store.activeTab === t.id
          ? 'bg-[#739CBF] text-white shadow-xs'
          : 'text-[#4A3F3D] hover:text-[#4A3F3D] hover:bg-[#EFE7E2] border border-transparent'
      ]"
      @click="store.activeTab = t.id"
    >
      <span
        class="inline-block shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
        :style="{ ...getItemSpriteStyle(t.itemId, 18), imageRendering: 'pixelated' }"
      ></span>
      <span>{{ t.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
