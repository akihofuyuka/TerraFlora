<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  store,
  getLoadoutArmor,
  getLoadoutDye,
  setActiveLoadout,
  isSlotHidden,
  toggleSlotVisibility,
  isMiscHidden,
  toggleMiscVisibility,
  showToast,
} from '@/store';
import ItemSlot from './ItemSlot.vue';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getItemSpriteStyle } from '@/utils/sprite';
import CharacterAvatar from '@/components/CharacterAvatar.vue';
import { Eye, EyeOff } from 'lucide-vue-next';

type EquipmentTabKey = 0 | 1 | 2 | 'misc';

// 顶部选项：配置 1~3 与 特殊装备
const equipmentTabs: { id: EquipmentTabKey; label: string; itemId: number }[] = [
  { id: 0, label: '配置 1', itemId: 2764 }, // 耀斑胸甲
  { id: 1, label: '配置 2', itemId: 2758 }, // 星旋胸甲
  { id: 2, label: '配置 3', itemId: 2761 }, // 星云胸甲
  { id: 'misc', label: '特殊装备', itemId: 84 }, // 抓钩
];

// 当前正在查看的标签
const currentTab = ref<EquipmentTabKey>(store.loadoutTab ?? 0);

const armorLabels = [
  '头盔',
  '胸甲',
  '护腿',
  '饰品 1',
  '饰品 2',
  '饰品 3',
  '饰品 4',
  '饰品 5',
  '专家饰品',
  '大师饰品',
];

const miscLabels = ['宠物', '照明宠物', '矿车', '坐骑', '钩爪'];

// 当前配置 1~3 的有效索引 (0, 1, 2)
const activeLoadoutNum = computed(() => {
  return typeof currentTab.value === 'number' ? currentTab.value : (store.loadoutTab ?? 0);
});

// 当前查看的配置是否为游戏当前生效配置
const isCurrentLoadoutActive = computed(() => {
  if (currentTab.value === 'misc') return false;
  return (store.player?.currentLoadoutIndex ?? 0) === currentTab.value;
});

// 槽位数据绑定
const currentArmorArray = computed(() => getLoadoutArmor(activeLoadoutNum.value));
const currentDyeArray = computed(() => getLoadoutDye(activeLoadoutNum.value));

const armorSlots = computed(() => currentArmorArray.value.slice(0, 10));
const vanitySlots = computed(() => currentArmorArray.value.slice(10, 20));
const dyeSlots = computed(() => currentDyeArray.value.slice(0, 10));

const miscSlots = computed(() => (store.player ? store.player.miscEquips : []));
const miscDyeSlots = computed(() => (store.player ? store.player.miscDyes : []));

// 顶部 Tab 点击事件处理（支持二次点击设为生效）
function handleTabClick(tabKey: EquipmentTabKey) {
  if (tabKey === 'misc') {
    currentTab.value = 'misc';
    return;
  }

  const gameActiveIdx = store.player?.currentLoadoutIndex ?? 0;

  if (currentTab.value === tabKey) {
    // 再次点击已选中的配置：设为游戏当前生效配置
    if (gameActiveIdx !== tabKey) {
      setActiveLoadout(tabKey);
    } else {
      showToast(`当前已在游戏中生效【配置 ${tabKey + 1}】`);
    }
  } else {
    // 首次点击未选中的配置：仅切换查看与编辑
    currentTab.value = tabKey;
    store.loadoutTab = tabKey;
    if (gameActiveIdx !== tabKey) {
      showToast(`正在查看与编辑【配置 ${tabKey + 1}】，再次点击可设为当前生效`, 2200);
    }
  }
}

// 快速设为当前生效
function activateCurrentLoadout() {
  if (typeof currentTab.value === 'number') {
    setActiveLoadout(currentTab.value);
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 顶部横向切换栏（轻量化文字底线）：配置 1、配置 2、配置 3、特殊装备 -->
    <div class="flex items-center gap-1 shadow-[inset_0_-1px_0_0_#EADFD9] overflow-x-auto overflow-y-hidden no-scrollbar">
      <button
        v-for="t in equipmentTabs"
        :key="t.id"
        :class="[
          'flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap transition-colors duration-150 cursor-pointer border-b-2 rounded-t-lg',
          currentTab === t.id
            ? 'border-[#739CBF] text-[#2F658D] bg-white/80 font-bold'
            : 'border-transparent text-[#8E807C] font-semibold hover:text-[#4A3F3D] hover:bg-[#EFE7E2]/40'
        ]"
        @click="handleTabClick(t.id)"
      >
        <span
          class="inline-block shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
          :style="{ ...getItemSpriteStyle(t.itemId, 16), imageRendering: 'pixelated' }"
        ></span>
        <span>{{ t.label }}</span>

        <!-- 徽章与微提示 -->
        <template v-if="typeof t.id === 'number'">
          <!-- 生效中标识 -->
          <span
            v-if="(store.player?.currentLoadoutIndex ?? 0) === t.id"
            class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0 rounded-md font-semibold bg-[#EEF4F9] text-[#2F658D] border border-[#C4D6E5]"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#739CBF]"></span>
            <span>生效中</span>
          </span>
          <!-- 首次点击选中后的二次点击提示 -->
          <span
            v-else-if="currentTab === t.id"
            class="text-[10px] px-1.5 py-0 rounded-md font-semibold bg-[#F9D6DB]/70 text-[#4A3F3D] border border-[#E598A3]/60"
          >
            再点生效
          </span>
        </template>
      </button>
    </div>

    <!-- 装备主大卡片 (包含角色立绘内嵌预览与槽位列表) -->
    <Card class="bg-white border-[#EADFD9] shadow-sm overflow-hidden">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              class="inline-block shrink-0"
              :style="{
                ...getItemSpriteStyle(
                  currentTab === 'misc'
                    ? 84
                    : (equipmentTabs.find(tab => tab.id === currentTab)?.itemId || 559),
                  16
                ),
                imageRendering: 'pixelated'
              }"
            ></span>
            <span>
              {{ currentTab === 'misc' ? '特殊装备' : `装备配置 ${activeLoadoutNum + 1}` }}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent class="p-3 pt-0">
        <!-- 响应式双栏排布：移动端上下结构，桌面端 (lg: 及以上) 左右双栏 -->
        <div class="flex flex-col lg:flex-row items-stretch lg:items-start gap-3.5">
          <!-- 左侧：内嵌精简版角色全身预览面板 -->
          <CharacterAvatar :embedded="true" />

          <!-- 右侧：槽位列表内容区 -->
          <div class="flex-1 min-w-0">
            <!-- 1. 常规装备与饰品槽位列表 (配置 1~3) -->
            <div v-if="currentTab !== 'misc'" class="flex flex-col">
              <!-- 表头 -->
              <div class="grid grid-cols-[75px_1fr_1fr_28px_1fr] sm:grid-cols-[90px_50px_50px_28px_50px] gap-2 pb-1.5 border-b border-[#EADFD9] text-[11px] font-semibold text-[#8E807C] items-center">
                <div>槽位名称</div>
                <div class="text-center">穿戴</div>
                <div class="text-center">社交时装</div>
                <div class="text-center">显示</div>
                <div class="text-center">染料</div>
              </div>

              <!-- 10 个主装备/饰品槽位行 -->
              <div class="flex flex-col gap-1.5 pt-2" data-slot="radix-petal-frame">
                <div
                  v-for="(label, i) in armorLabels"
                  :key="'equip-row-' + activeLoadoutNum + '-' + i"
                  class="grid grid-cols-[75px_1fr_1fr_28px_1fr] sm:grid-cols-[90px_50px_50px_28px_50px] gap-2 items-center"
                >
                  <span class="text-xs font-medium text-[#4A3F3D] truncate">
                    {{ label }}
                  </span>

                  <div class="flex justify-center">
                    <ItemSlot
                      v-if="armorSlots[i]"
                      :item="armorSlots[i]"
                      slot-type="armor"
                      :index="i"
                      :loadout-idx="activeLoadoutNum"
                    />
                  </div>

                  <div class="flex justify-center">
                    <ItemSlot
                      v-if="vanitySlots[i]"
                      :item="vanitySlots[i]"
                      slot-type="armorVanity"
                      :index="i"
                      :loadout-idx="activeLoadoutNum"
                    />
                  </div>

                  <!-- 可见性隐藏开关 (针对饰品 3..9 及护甲时装) -->
                  <div class="flex justify-center">
                    <button
                      v-if="i >= 3"
                      type="button"
                      :class="[
                        'w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer',
                        isSlotHidden(activeLoadoutNum, i)
                          ? 'text-[#8E807C]/40 hover:text-[#8E807C] bg-transparent'
                          : 'text-[#739CBF] hover:bg-[#739CBF]/10'
                      ]"
                      @click="toggleSlotVisibility(activeLoadoutNum, i)"
                    >
                      <EyeOff v-if="isSlotHidden(activeLoadoutNum, i)" class="w-3.5 h-3.5" />
                      <Eye v-else class="w-3.5 h-3.5" />
                    </button>
                    <span v-else class="w-6 h-6"></span>
                  </div>

                  <div class="flex justify-center">
                    <ItemSlot
                      v-if="dyeSlots[i]"
                      :item="dyeSlots[i]"
                      slot-type="armorDye"
                      :index="i"
                      :loadout-idx="activeLoadoutNum"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. 特殊装备槽位列表 (特殊装备选项) -->
            <div v-else class="flex flex-col">
              <!-- 表头 -->
              <div class="grid grid-cols-[75px_1fr_28px_1fr] sm:grid-cols-[90px_50px_28px_50px] gap-2 pb-1.5 border-b border-[#EADFD9] text-[11px] font-semibold text-[#8E807C] items-center">
                <div>槽位名称</div>
                <div class="text-center">装备</div>
                <div class="text-center">显示</div>
                <div class="text-center">染料</div>
              </div>

              <!-- 5 个特殊装备槽位行 -->
              <div class="flex flex-col gap-1.5 pt-2">
                <div
                  v-for="(label, i) in miscLabels"
                  :key="'misc-row-' + i"
                  class="grid grid-cols-[75px_1fr_28px_1fr] sm:grid-cols-[90px_50px_28px_50px] gap-2 items-center"
                >
                  <span class="text-xs font-medium text-[#4A3F3D] truncate">
                    {{ label }}
                  </span>

                  <div class="flex justify-center">
                    <ItemSlot
                      v-if="miscSlots[i]"
                      :item="miscSlots[i]"
                      slot-type="miscEquips"
                      :index="i"
                    />
                  </div>

                  <!-- 可见性开关 -->
                  <div class="flex justify-center">
                    <button
                      type="button"
                      :class="[
                        'w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer',
                        isMiscHidden(i)
                          ? 'text-[#8E807C]/40 hover:text-[#8E807C] bg-transparent'
                          : 'text-[#739CBF] hover:bg-[#739CBF]/10'
                      ]"
                      @click="toggleMiscVisibility(i)"
                    >
                      <EyeOff v-if="isMiscHidden(i)" class="w-3.5 h-3.5" />
                      <Eye v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div class="flex justify-center">
                    <ItemSlot
                      v-if="miscDyeSlots[i]"
                      :item="miscDyeSlots[i]"
                      slot-type="miscDyes"
                      :index="i"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
