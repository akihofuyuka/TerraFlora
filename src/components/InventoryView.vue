<script setup lang="ts">
import { computed } from 'vue';
import { store, maxStackAllInventory, maxStackCurrentBank } from '@/store';
import ItemSlot from './ItemSlot.vue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getItemSpriteStyle } from '@/utils/sprite';

const subTabs = [
  { id: 'main', label: '随身背包', itemId: 48 },   // 宝箱
  { id: 'piggy', label: '猪猪存钱罐', itemId: 87 },  // 猪猪存钱罐
  { id: 'safe', label: '保险箱', itemId: 346 },      // 保险箱
  { id: 'forge', label: '护卫熔炉', itemId: 3813 },  // 护卫熔炉
  { id: 'void', label: '虚空保险库', itemId: 4076 }, // 虚空保险库
] as const;

// 随身背包细分
const hotbarSlots = computed(() => (store.player ? store.player.inventory.slice(0, 10) : []));
const mainSlots = computed(() => (store.player ? store.player.inventory.slice(10, 50) : []));
const coinSlots = computed(() => (store.player ? store.player.inventory.slice(50, 54) : []));
const ammoSlots = computed(() => (store.player ? store.player.inventory.slice(54, 58) : []));
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 仓库子分类切换胶囊与满堆叠操作 -->
    <div class="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          v-for="st in subTabs"
          :key="st.id"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border',
            store.inventorySubTab === st.id
              ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
              : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2] shadow-2xs'
          ]"
          @click="store.inventorySubTab = st.id"
        >
          <span
            class="inline-block shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
            :style="{ ...getItemSpriteStyle(st.itemId, 16), imageRendering: 'pixelated' }"
          ></span>
          <span>{{ st.label }}</span>
        </button>
      </div>

      <Button
        variant="outline"
        size="xs"
        class="h-7 text-xs gap-1.5 font-medium border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/50 shrink-0 whitespace-nowrap"
        @click="store.inventorySubTab === 'main' ? maxStackAllInventory() : maxStackCurrentBank()"
      >
        <span :style="{ ...getItemSpriteStyle(74, 14), imageRendering: 'pixelated' }"></span>
        <span>全满堆叠</span>
      </Button>
    </div>

    <!-- 随身背包展示 (快捷栏 + 主背包 + 钱币与弹药) -->
    <div v-if="store.inventorySubTab === 'main'" class="flex flex-col gap-3">
      <!-- 快捷栏 (1-10 格) -->
      <Card class="bg-white border-[#EADFD9] shadow-sm">
        <CardHeader class="p-3 pb-2 flex flex-row items-center justify-between">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <span :style="{ ...getItemSpriteStyle(3507, 14), imageRendering: 'pixelated' }"></span>
            <span>快捷栏</span>
          </CardTitle>
          <div v-if="store.player" class="flex items-center gap-2 text-xs">
            <span class="text-[#8E807C] font-medium">锁定快捷栏</span>
            <Switch
              :checked="store.player.hbLocked"
              @update:checked="(val: boolean) => { if (store.player) { store.player.hbLocked = val; store.isModified = true; } }"
            />
          </div>
        </CardHeader>
        <CardContent class="p-3 pt-0">
          <div class="grid grid-cols-5 md:grid-cols-10 gap-1.5" data-slot="radix-petal-frame">
            <ItemSlot
              v-for="(item, idx) in hotbarSlots"
              :key="'hotbar-' + idx"
              :item="item"
              slot-type="inventory"
              :index="idx"
              :label="`${idx + 1}`"
            />
          </div>
        </CardContent>
      </Card>

      <!-- 主背包 (11-50 格) -->
      <Card class="bg-white border-[#EADFD9] shadow-sm">
        <CardHeader class="p-3 pb-2">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <span :style="{ ...getItemSpriteStyle(48, 14), imageRendering: 'pixelated' }"></span>
            <span>主背包</span>
          </CardTitle>
        </CardHeader>
        <CardContent class="p-3 pt-0">
          <div class="grid grid-cols-5 md:grid-cols-10 gap-1.5" data-slot="radix-petal-frame">
            <ItemSlot
              v-for="(item, idx) in mainSlots"
              :key="'main-' + idx"
              :item="item"
              slot-type="inventory"
              :index="10 + idx"
            />
          </div>
        </CardContent>
      </Card>

      <!-- 钱币与弹药栏 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- 钱币 -->
        <Card class="bg-white border-[#EADFD9] shadow-sm">
          <CardHeader class="p-3 pb-2">
            <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(74, 14), imageRendering: 'pixelated' }"></span>
              <span>钱币</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="p-3 pt-0">
            <div class="grid grid-cols-4 gap-1.5">
              <ItemSlot
                v-for="(item, idx) in coinSlots"
                :key="'coin-' + idx"
                :item="item"
                slot-type="inventory"
                :index="50 + idx"
                :label="['铜', '银', '金', '铂'][idx]"
              />
            </div>
          </CardContent>
        </Card>

        <!-- 弹药 -->
        <Card class="bg-white border-[#EADFD9] shadow-sm">
          <CardHeader class="p-3 pb-2">
            <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(97, 14), imageRendering: 'pixelated' }"></span>
              <span>弹药</span>
            </CardTitle>
          </CardHeader>
          <CardContent class="p-3 pt-0">
            <div class="grid grid-cols-4 gap-1.5">
              <ItemSlot
                v-for="(item, idx) in ammoSlots"
                :key="'ammo-' + idx"
                :item="item"
                slot-type="inventory"
                :index="54 + idx"
                :label="`弹${idx + 1}`"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- 四大个人仓库 (40 格) -->
    <div v-else class="flex flex-col gap-3">
      <Card class="bg-white border-[#EADFD9] shadow-sm">
        <CardHeader class="p-3 pb-2">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <span
              :style="{ ...getItemSpriteStyle(subTabs.find(s => s.id === store.inventorySubTab)?.itemId || 87, 16), imageRendering: 'pixelated' }"
            ></span>
            <span>{{ subTabs.find((s) => s.id === store.inventorySubTab)?.label }} (40 格)</span>
          </CardTitle>
        </CardHeader>
        <CardContent class="p-3 pt-0">
          <div class="grid grid-cols-5 md:grid-cols-10 gap-1.5" data-slot="radix-petal-frame">
            <ItemSlot
              v-for="(item, idx) in (
                store.inventorySubTab === 'piggy' ? store.player?.bank :
                store.inventorySubTab === 'safe' ? store.player?.bank2 :
                store.inventorySubTab === 'forge' ? store.player?.bank3 :
                store.player?.bank4
              ) || []"
              :key="store.inventorySubTab + '-' + idx"
              :item="item"
              :slot-type="
                store.inventorySubTab === 'piggy' ? 'bank' :
                store.inventorySubTab === 'safe' ? 'bank2' :
                store.inventorySubTab === 'forge' ? 'bank3' : 'bank4'
              "
              :index="idx"
              :label="`${idx + 1}`"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
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
