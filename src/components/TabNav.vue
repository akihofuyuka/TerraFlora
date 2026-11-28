<script setup lang="ts">
import { store } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';

const tabs = [
  { id: 'character', label: '属性', itemId: 29 },       // 生命水晶
  { id: 'inventory', label: '背包仓库', itemId: 48 },    // 宝箱
  { id: 'equipment', label: '装备配置', itemId: 559 },   // 神圣面具
  { id: 'buff', label: '状态增益', itemId: 292 },         // 铁皮药水
  { id: 'research', label: '旅途图鉴', itemId: 149 }      // 复制研究
] as const;
</script>

<template>
  <nav class="bg-white border border-[#EADFD9] rounded-xl p-1.5 flex gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
    <button
      v-for="t in tabs"
      :key="t.id"
      :class="[
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all duration-150 cursor-pointer select-none border',
        store.activeTab === t.id
          ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
          : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]/70'
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
