<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  store,
  showToast,
  setTargetEdition,
  setTargetVersion
} from '@/store';
import {
  SUPPORTED_EDITIONS,
  VERSION_GROUPS,
  findVersionInfo,
} from '@/core/plr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getItemSpriteStyle, getHairSpriteStyle, HAIR_COUNT } from '@/utils/sprite';
import CharacterAvatar from '@/components/CharacterAvatar.vue';

const p = computed(() => store.player);
const currentVersionInfo = computed(() => findVersionInfo(store.targetVersion));

const subTabs = [
  { id: 'base' as const, label: '基础属性', itemId: 29 },       // 生命水晶
  { id: 'appearance' as const, label: '外观设置', itemId: 239 }, // 便服衬衫
  { id: 'permanent' as const, label: '永久能力', itemId: 3335 }, // 恶魔之心
];

// ----------------- 折叠状态管理 -----------------
const versionPanelOpen = ref(false); // 版本库折叠
const hairPickerOpen = ref(false);   // 发型全量列表折叠
const permanentPanelOpen = ref(true); // 永久能力卡片

// ----------------- 版本筛选逻辑 -----------------
const versionSearch = ref('');
const onlyShowLandmarks = ref(true); // 默认展示精简里程碑版本

const filteredVersionGroups = computed(() => {
  const query = versionSearch.value.trim().toLowerCase();
  return VERSION_GROUPS.map(grp => {
    let list = grp.versions;
    if (onlyShowLandmarks.value && !query) {
      list = list.filter(v => v.highlight || v.version === store.targetVersion);
    }
    if (query) {
      list = list.filter(v =>
        v.gameVersion.toLowerCase().includes(query) ||
        v.version.toString().includes(query) ||
        (v.desc && v.desc.toLowerCase().includes(query))
      );
    }
    return {
      ...grp,
      versions: list
    };
  }).filter(grp => grp.versions.length > 0);
});

function setFullHealth() {
  if (!p.value) return;
  p.value.statLife = 400;
  p.value.statLifeMax = 400;
  store.isModified = true;
  showToast('生命已设为 400/400 (满红心)');
}

function setMaxHealthGolden() {
  if (!p.value) return;
  p.value.statLife = 500;
  p.value.statLifeMax = 500;
  store.isModified = true;
  showToast('生命已设为 500/500 (满金心 / 生命果全满)');
}

function setFullMana() {
  if (!p.value) return;
  p.value.statMana = 200;
  p.value.statManaMax = 200;
  store.isModified = true;
  showToast('魔力已设为 200/200');
}

function getVersionFeatureSummary(v: number): string {
  if (v >= 329) return "1.4.6 · 最新官方正式版";
  if (v >= 315) return "1.4.5 · 法爷归来";
  if (v >= 279) return "1.4.4.9 · 三套独立配置与微光";
  if (v >= 262) return "1.4.4 · 包含三套独立装备配置";
  if (v >= 248) return "1.4.3.6 饥荒联动 · 单套装备配置、四大陆行库与虚空库";
  if (v >= 218) return "1.4.0.5 旅途终点 · 包含旅途研究与虚空保险库";
  if (v >= 194) return "1.3.5.3 终版 · 经典饰品栏与四大陆行仓库";
  if (v >= 182) return "1.3.4 · 包含护卫熔炉";
  return `版本协议号 v${v} · 自动适配对应历史协议分支`;
}

function unlockAllPermanent() {
  if (!p.value) return;
  p.value.extraAccessory = true;
  p.value.unlockedBiomeTorches = true;
  p.value.usingBiomeTorches = true;
  p.value.ateArtisanBread = true;
  p.value.finishedDD2 = true;
  p.value.aegisCrystal = true;
  p.value.aegisFruit = true;
  p.value.arcaneCrystal = true;
  p.value.galaxyPearl = true;
  p.value.gummyWorm = true;
  p.value.ambrosia = true;
  store.isModified = true;
  showToast('已解锁全部永久能力与微光强化！');
}

// ----------------- 十六进制与 RGB 颜色转换 -----------------
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => Math.max(0, Math.min(255, n || 0)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '').trim();
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

type ColorKey = 'hairColor' | 'skinColor' | 'eyeColor' | 'shirtColor' | 'underShirtColor' | 'pantsColor' | 'shoeColor';

const colorFields: { key: ColorKey; label: string }[] = [
  { key: 'hairColor', label: '发色' },
  { key: 'skinColor', label: '肤色' },
  { key: 'eyeColor', label: '瞳色' },
  { key: 'shirtColor', label: '上衣' },
  { key: 'underShirtColor', label: '内衬' },
  { key: 'pantsColor', label: '长裤' },
  { key: 'shoeColor', label: '鞋子' },
];

function updateColorHex(key: ColorKey, hex: string) {
  if (!p.value) return;
  const rgb = hexToRgb(hex);
  if (rgb) {
    p.value[key].r = rgb.r;
    p.value[key].g = rgb.g;
    p.value[key].b = rgb.b;
    store.isModified = true;
  }
}

// ----------------- 发型调节助手 -----------------
function changeHair(delta: number) {
  if (!p.value) return;
  const next = Math.max(0, Math.min(HAIR_COUNT - 1, (p.value.hair || 0) + delta));
  p.value.hair = next;
  store.isModified = true;
}

function setHair(idx: number) {
  if (!p.value) return;
  p.value.hair = Math.max(0, Math.min(HAIR_COUNT - 1, idx));
  store.isModified = true;
}

// ----------------- 队伍预设 -----------------
const teamOptions = [
  { val: 0, label: '无队伍', bg: '#8E807C', border: '#736B69' },
  { val: 1, label: '红队', bg: '#ef4444', border: '#dc2626' },
  { val: 2, label: '绿队', bg: '#22c55e', border: '#16a34a' },
  { val: 3, label: '蓝队', bg: '#3b82f6', border: '#2563eb' },
  { val: 4, label: '黄队', bg: '#eab308', border: '#ca8a04' },
  { val: 5, label: '紫队', bg: '#a855f7', border: '#9333ea' },
];

// ----------------- 常服体型款式 (skinVariant 0~11) -----------------
const skinVariants = [
  { val: 0, label: '普通款', gender: 'male' },
  { val: 1, label: '夹克款', gender: 'male' },
  { val: 2, label: '休闲款', gender: 'male' },
  { val: 3, label: '短袖款', gender: 'male' },
  { val: 8, label: '贴身款', gender: 'male' },
  { val: 10, label: '宽大款', gender: 'male' },
  { val: 4, label: '普通款', gender: 'female' },
  { val: 5, label: '短裙款', gender: 'female' },
  { val: 6, label: '休闲款', gender: 'female' },
  { val: 7, label: '短袖款', gender: 'female' },
  { val: 9, label: '贴身款', gender: 'female' },
  { val: 11, label: '宽大款', gender: 'female' },
];

const currentGender = computed<'male' | 'female'>({
  get: () => {
    if (!p.value) return 'female';
    const isMale = [0, 1, 2, 3, 8, 10].includes(p.value.skinVariant ?? 0);
    return isMale ? 'male' : 'female';
  },
  set: (g: 'male' | 'female') => {
    if (!p.value) return;
    const isCurrentlyMale = [0, 1, 2, 3, 8, 10].includes(p.value.skinVariant ?? 0);
    if ((g === 'male' && !isCurrentlyMale) || (g === 'female' && isCurrentlyMale)) {
      const maleMap = [0, 1, 2, 3, 8, 10];
      const femaleMap = [4, 5, 6, 7, 9, 11];
      if (g === 'male') {
        const idx = femaleMap.indexOf(p.value.skinVariant);
        p.value.skinVariant = idx >= 0 ? maleMap[idx] : 0;
        p.value.male = true;
      } else {
        const idx = maleMap.indexOf(p.value.skinVariant);
        p.value.skinVariant = idx >= 0 ? femaleMap[idx] : 4;
        p.value.male = false;
      }
      store.isModified = true;
    }
  }
});

const currentGenderVariants = computed(() => {
  return skinVariants.filter(s => s.gender === currentGender.value);
});

// ----------------- 受击音效与语音 (1.4.6 原生字段) -----------------
function updateVoicePitch(val: number) {
  if (!p.value) return;
  p.value.voicePitch = Math.max(-1, Math.min(1, val));
  store.isModified = true;
}

// ----------------- 染发剂预设与弹窗 -----------------
export interface HairDyeOption {
  val: number;
  label: string;
  itemId: number;
}

const hairDyePresets: HairDyeOption[] = [
  { val: 0, label: '无染发剂', itemId: 1990 },
  { val: 1, label: '生命染发剂', itemId: 1977 },
  { val: 2, label: '魔力染发剂', itemId: 1978 },
  { val: 3, label: '深度染发剂', itemId: 1979 },
  { val: 4, label: '钱币染发剂', itemId: 1980 },
  { val: 5, label: '时间染发剂', itemId: 1981 },
  { val: 6, label: '团队染发剂', itemId: 1982 },
  { val: 7, label: '生物群系染发剂', itemId: 1983 },
  { val: 8, label: '派对染发剂', itemId: 1984 },
  { val: 9, label: '彩虹染发剂', itemId: 1985 },
  { val: 10, label: '速度染发剂', itemId: 1986 },
  { val: 11, label: '火星染发剂', itemId: 2863 },
  { val: 12, label: '阴阳染发剂', itemId: 3259 },
];

const dyePickerOpen = ref(false);
const currentHairDyeItem = computed(() => {
  return hairDyePresets.find(d => d.val === (p.value?.hairDye || 0)) || {
    val: p.value?.hairDye || 0,
    label: `自定义染发 #${p.value?.hairDye}`,
    itemId: 1990,
  };
});

const shimmerItems = [
  { key: 'aegisCrystal' as const, label: '活力水晶 (生命回复提升)', itemId: 5337 },
  { key: 'aegisFruit' as const, label: '埃癸斯果 (永久增加 4 点防御)', itemId: 5338 },
  { key: 'arcaneCrystal' as const, label: '奥术水晶 (魔力回复提升)', itemId: 5339 },
  { key: 'galaxyPearl' as const, label: '银河珍珠 (永久增加幸运)', itemId: 5340 },
  { key: 'gummyWorm' as const, label: '软体蠕虫 (永久增加 3 点钓鱼力)', itemId: 5341 },
  { key: 'ambrosia' as const, label: '仙馔密酒 (采矿与放置速度提升)', itemId: 5342 },
];
</script>

<template>
  <div v-if="p" class="flex flex-col gap-4">
    <!-- 顶部子分类导航栏 (类似装备配置切换) -->
    <div class="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
      <div class="flex items-center gap-1.5">
        <button
          v-for="tab in subTabs"
          :key="tab.id"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border',
            store.characterSubTab === tab.id
              ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
              : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2] shadow-2xs'
          ]"
          @click="store.characterSubTab = tab.id"
        >
          <span
            class="inline-block shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]"
            :style="{ ...getItemSpriteStyle(tab.itemId, 16), imageRendering: 'pixelated' }"
          ></span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 1. 基础属性 (名称, 版本, 模式, 血量/魔力, 队伍)                        -->
    <!-- ===================================================================== -->
    <Card v-if="store.characterSubTab === 'base'" class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(29, 14), imageRendering: 'pixelated' }"></span>
          <span>基础属性</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col gap-3">
        <!-- 角色名称与游戏模式 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- 角色名称 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-[#4A3F3D]">角色名称</label>
            <Input
              v-model="p.name"
              type="text"
              class="h-8 text-xs bg-[#FFF7F2] border-[#EADFD9] text-[#4A3F3D]"
              @input="store.isModified = true"
            />
          </div>

          <!-- 游戏模式 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-[#4A3F3D]">游戏模式</label>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="d in [
                  { val: 0, label: '经典' },
                  { val: 1, label: '中核' },
                  { val: 2, label: '硬核' },
                  { val: 3, label: '旅途' }
                ]"
                :key="d.val"
                :class="[
                  'py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer text-center',
                  p.difficulty === d.val
                    ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
                    : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
                ]"
                @click="p.difficulty = d.val; store.isModified = true"
              >
                {{ d.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 队伍选择 (PVP / 多人联机组队) -->
        <div class="flex flex-col gap-1.5 pt-1 border-t border-[#EADFD9]">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-[#4A3F3D]">多人联机队伍</label>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            <button
              v-for="t in teamOptions"
              :key="t.val"
              :class="[
                'py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                (p.team || 0) === t.val
                  ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
                  : 'bg-white text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="p.team = t.val; store.isModified = true"
            >
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                :style="{ backgroundColor: t.bg, borderColor: t.border, borderWidth: '1px' }"
              ></span>
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <!-- 生命与魔力设置 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-[#EADFD9]">
          <!-- 生命值 -->
          <div class="p-2 sm:p-2.5 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-[#4A3F3D]">
              <div class="flex items-center gap-1.5">
                <span :style="{ ...getItemSpriteStyle(29, 14), imageRendering: 'pixelated' }"></span>
                <span>生命值</span>
              </div>
              <div class="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="xs"
                  class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/60"
                  @click="setFullHealth"
                >
                  400 满红心
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  class="h-5 text-[10px] px-1.5 text-[#4A3F3D] bg-[#F9D6DB]/60 border border-[#EADFD9] hover:bg-[#F9D6DB]"
                  @click="setMaxHealthGolden"
                >
                  500 满金心
                </Button>
              </div>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="text-[#8E807C] shrink-0">当前:</span>
              <input
                v-model.number="p.statLife"
                type="number"
                class="w-16 h-6.5 text-center font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                @input="store.isModified = true"
              />
              <span class="text-[#8E807C] shrink-0 ml-1">上限:</span>
              <input
                v-model.number="p.statLifeMax"
                type="number"
                class="w-16 h-6.5 text-center font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                @input="store.isModified = true"
              />
            </div>
          </div>

          <!-- 魔力值 -->
          <div class="p-2 sm:p-2.5 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-[#4A3F3D]">
              <div class="flex items-center gap-1.5">
                <span :style="{ ...getItemSpriteStyle(109, 14), imageRendering: 'pixelated' }"></span>
                <span>魔力值</span>
              </div>
              <Button
                variant="outline"
                size="xs"
                class="h-5 text-[10px] px-1.5 border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/60"
                @click="setFullMana"
              >
                200 满魔力
              </Button>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="text-[#8E807C] shrink-0">当前:</span>
              <input
                v-model.number="p.statMana"
                type="number"
                class="w-16 h-6.5 text-center font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                @input="store.isModified = true"
              />
              <span class="text-[#8E807C] shrink-0 ml-1">上限:</span>
              <input
                v-model.number="p.statManaMax"
                type="number"
                class="w-16 h-6.5 text-center font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                @input="store.isModified = true"
              />
            </div>
          </div>
        </div>

        <!-- 存档版本设置 (整合进基础属性卡片底部) -->
        <div class="flex flex-col gap-2 pt-1 border-t border-[#EADFD9]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(5011, 14), imageRendering: 'pixelated' }"></span>
              <span>存档版本</span>
            </span>
            <button
              class="text-xs text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
              @click="versionPanelOpen = !versionPanelOpen"
            >
              {{ versionPanelOpen ? '收起版本库' : '展开版本库' }}
            </button>
          </div>

          <!-- 发行版 (国际版 vs 心动版) -->
          <div class="grid grid-cols-2 gap-1.5 sm:gap-2">
            <button
              v-for="ed in SUPPORTED_EDITIONS"
              :key="ed.id"
              :class="[
                'p-1.5 sm:p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-left flex flex-col gap-0.5',
                store.targetEdition === ed.id
                  ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
                  : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="setTargetEdition(ed.id)"
            >
              <span class="font-bold truncate text-xs">{{ ed.label }}</span>
              <span class="text-[10px] opacity-80 truncate">{{ ed.desc }}</span>
            </button>
          </div>

          <!-- 当前目标版本状态概览条 (紧凑横条) -->
          <div class="flex flex-col gap-1 px-2.5 py-1.5 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
            <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-xs font-bold text-[#8E807C]">当前协议版本:</span>
                <input
                  :value="store.targetVersion"
                  type="number"
                  min="1"
                  class="w-14 h-6 text-center font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none shadow-2xs"
                  @input="setTargetVersion(parseInt(($event.target as HTMLInputElement).value) || 1)"
                />
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-[#739CBF] truncate text-xs">{{ currentVersionInfo.label }}</span>
                <span v-if="currentVersionInfo.desc" class="text-[10px] text-[#8E807C] truncate hidden sm:inline">
                  ({{ currentVersionInfo.desc }})
                </span>
              </div>
            </div>
            <span class="text-[10px] text-[#8E807C] truncate">
              {{ getVersionFeatureSummary(store.targetVersion) }}
            </span>
          </div>

          <!-- 展开后展示版本选择库 -->
          <div v-if="versionPanelOpen" class="flex flex-col gap-2 pt-1 border-t border-[#EADFD9]/60">
            <!-- 快速筛选与展示切换 -->
            <div class="flex items-center justify-between gap-2">
              <div class="relative flex-1 max-w-xs">
                <input
                  v-model="versionSearch"
                  type="text"
                  placeholder="搜索版本号 (如 1.4.4 或 279)..."
                  class="w-full h-7 text-xs rounded-md border border-[#EADFD9] bg-[#FFF7F2] text-[#4A3F3D] px-2 outline-none focus:border-[#739CBF]"
                />
                <button
                  v-if="versionSearch"
                  @click="versionSearch = ''"
                  class="absolute right-1.5 top-2 text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <button
                :class="[
                  'text-[10px] px-2 py-1 rounded-md border font-semibold transition-all cursor-pointer whitespace-nowrap',
                  onlyShowLandmarks
                    ? 'bg-[#739CBF] text-white border-[#739CBF]'
                    : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
                ]"
                @click="onlyShowLandmarks = !onlyShowLandmarks"
              >
                {{ onlyShowLandmarks ? '精简里程碑版本' : '展示全部 88 个版本' }}
              </button>
            </div>

            <!-- 分组版本按钮 -->
            <div class="flex flex-col gap-2 pt-1 max-h-60 overflow-y-auto">
              <div
                v-for="grp in filteredVersionGroups"
                :key="grp.group"
                class="flex flex-col gap-1 text-xs"
              >
                <div class="flex items-center justify-between text-[11px] font-bold text-[#4A3F3D]">
                  <span class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#739CBF]"></span>
                    <span>{{ grp.group }}</span>
                    <span class="text-[10px] text-[#8E807C] font-normal">({{ grp.versions.length }}个)</span>
                  </span>
                  <span class="text-[10px] font-normal text-[#8E807C] hidden sm:inline">{{ grp.desc }}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="v in grp.versions"
                    :key="v.gameVersion + '-' + v.version"
                    :class="[
                      'px-2 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1',
                      store.targetVersion === v.version
                        ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-2xs scale-102 z-10'
                        : v.highlight
                          ? 'bg-[#F9D6DB] text-[#4A3F3D] border-[#E598A3] hover:bg-[#f5cad0]'
                          : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
                    ]"
                    @click="setTargetVersion(v.version)"
                    :title="`${v.desc || ''} (内部协议号: ${v.version})`"
                  >
                    <span>{{ v.gameVersion }}</span>
                    <span class="text-[9px] opacity-75 font-mono">v{{ v.version }}</span>
                  </button>
                </div>
              </div>
              <div v-if="filteredVersionGroups.length === 0" class="text-xs text-[#8E807C] text-center py-4 bg-[#FFF7F2] rounded-lg border border-dashed border-[#EADFD9]">
                未找到匹配 "{{ versionSearch }}" 的版本
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ===================================================================== -->
    <!-- 2. 外观设置 (外观预览, 发型, 常服款式, 染发剂, 颜色配色)               -->
    <!-- ===================================================================== -->
    <Card v-if="store.characterSubTab === 'appearance'" class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(239, 14), imageRendering: 'pixelated' }"></span>
          <span>外观设置</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3 pt-0 flex flex-col gap-3">
        <!-- 桌面端两栏布局: 角色全身纸娃娃 与 发型/染发剂配置左右并排 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          <!-- 角色全身实时外貌与装备渲染纸娃娃 -->
          <CharacterAvatar />

          <!-- 发型预览与染发/声线/音调 (4层紧凑精密面板，与左侧纸娃娃严格等高) -->
          <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] flex flex-col justify-between shadow-2xs overflow-hidden">
            <!-- 1. 发型 -->
            <div class="flex items-center justify-between gap-2 min-w-0">
              <div class="flex items-center gap-2 shrink-0">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center shrink-0 shadow-xs">
                  <div :style="getHairSpriteStyle(p.hair, 32)"></div>
                </div>
                <div class="flex flex-col shrink-0">
                  <span class="text-xs font-bold text-[#4A3F3D] leading-tight">发型</span>
                  <span class="text-[11px] font-mono font-bold text-[#739CBF] leading-tight">#{{ p.hair }}</span>
                </div>
              </div>

              <!-- 步进调节与图鉴展开 -->
              <div class="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="xs"
                  class="h-6 w-6 p-0 text-xs font-bold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/60"
                  @click="changeHair(-1)"
                  :disabled="p.hair <= 0"
                  title="上一个发型"
                >
                  ‹
                </Button>
                <input
                  v-model.number="p.hair"
                  type="number"
                  min="0"
                  max="227"
                  class="w-11 h-6 text-center font-bold text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                  @input="store.isModified = true"
                />
                <Button
                  variant="outline"
                  size="xs"
                  class="h-6 w-6 p-0 text-xs font-bold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/60"
                  @click="changeHair(1)"
                  :disabled="p.hair >= HAIR_COUNT - 1"
                  title="下一个发型"
                >
                  ›
                </Button>
                <Button
                  :variant="hairPickerOpen ? 'default' : 'secondary'"
                  size="xs"
                  class="h-6 text-xs font-semibold px-2 ml-0.5"
                  :class="hairPickerOpen ? 'bg-[#739CBF] text-white' : 'bg-[#F9D6DB]/50 text-[#4A3F3D] hover:bg-[#F9D6DB]'"
                  @click="hairPickerOpen = !hairPickerOpen"
                >
                  {{ hairPickerOpen ? '收起' : '图鉴' }}
                </Button>
              </div>
            </div>

            <!-- 分割线 -->
            <div class="border-t border-[#EADFD9]/70"></div>

            <!-- 2. 染发剂效果 -->
            <div class="flex items-center justify-between gap-2 min-w-0">
              <label class="text-xs font-semibold text-[#4A3F3D] shrink-0">染发剂效果</label>
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  class="flex items-center gap-1.5 h-6.5 px-2 rounded-lg border border-[#EADFD9] bg-white hover:bg-[#EFE7E2] transition-colors cursor-pointer text-xs font-semibold text-[#4A3F3D] shadow-2xs max-w-[170px] truncate"
                  @click="dyePickerOpen = true"
                >
                  <span :style="{ ...getItemSpriteStyle(currentHairDyeItem.itemId, 16), imageRendering: 'pixelated' }"></span>
                  <span class="truncate">{{ currentHairDyeItem.label }}</span>
                  <span class="text-[10px] font-mono text-[#8E807C] shrink-0">#{{ p.hairDye }}</span>
                </button>
                <input
                  v-model.number="p.hairDye"
                  type="number"
                  min="0"
                  max="64"
                  class="w-10 h-6.5 text-center font-bold text-xs rounded-lg border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none shrink-0"
                  @input="store.isModified = true"
                />
              </div>
            </div>

            <!-- 分割线 -->
            <div class="border-t border-[#EADFD9]/70"></div>

            <!-- 3. 受击声线 -->
            <div class="flex items-center justify-between gap-2 min-w-0">
              <span class="text-xs font-semibold text-[#4A3F3D] shrink-0">受击声线</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <div class="flex items-center rounded-lg bg-[#EFE7E2] p-0.5 border border-[#EADFD9]">
                  <button
                    :class="[
                      'px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                      (p.voiceVariant ?? 0) === 0
                        ? 'bg-[#739CBF] text-white shadow-xs'
                        : 'text-[#8E807C] hover:text-[#4A3F3D]'
                    ]"
                    @click="p.voiceVariant = 0; store.isModified = true"
                  >
                    男声
                  </button>
                  <button
                    :class="[
                      'px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                      p.voiceVariant === 1
                        ? 'bg-[#739CBF] text-white shadow-xs'
                        : 'text-[#8E807C] hover:text-[#4A3F3D]'
                    ]"
                    @click="p.voiceVariant = 1; store.isModified = true"
                  >
                    女声
                  </button>
                  <button
                    :class="[
                      'px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                      (p.voiceVariant ?? 0) > 1
                        ? 'bg-[#739CBF] text-white shadow-xs'
                        : 'text-[#8E807C] hover:text-[#4A3F3D]'
                    ]"
                    @click="if ((p.voiceVariant ?? 0) <= 1) { p.voiceVariant = 2; } store.isModified = true"
                  >
                    自定义
                  </button>
                </div>
                <input
                  v-model.number="p.voiceVariant"
                  type="number"
                  min="0"
                  max="255"
                  class="w-10 h-6 text-center font-bold font-mono text-xs rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none"
                  title="语音编号 (0~255)"
                  @input="store.isModified = true"
                />
              </div>
            </div>

            <!-- 分割线 -->
            <div class="border-t border-[#EADFD9]/70"></div>

            <!-- 4. 音调微调 -->
            <div class="flex items-center justify-between gap-2 min-w-0">
              <span class="text-xs font-semibold text-[#4A3F3D] shrink-0">音调微调</span>
              <div class="flex items-center gap-1.5 flex-1 max-w-[210px] justify-end min-w-0">
                <span class="text-[10px] text-[#8E807C] shrink-0">低</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  :value="p.voicePitch ?? 0"
                  class="flex-1 min-w-[50px] h-1.5 bg-[#EFE7E2] rounded-lg appearance-none cursor-pointer accent-[#739CBF]"
                  @input="updateVoicePitch(parseFloat(($event.target as HTMLInputElement).value))"
                  :title="`音调: ${(p.voicePitch ?? 0) >= 0 ? '+' : ''}${(p.voicePitch ?? 0).toFixed(2)}`"
                />
                <span class="text-[10px] text-[#8E807C] shrink-0">高</span>
                <span class="text-[10px] font-mono font-bold text-[#739CBF] w-8 text-right shrink-0">
                  {{ (p.voicePitch ?? 0) >= 0 ? `+${(p.voicePitch ?? 0).toFixed(1)}` : (p.voicePitch ?? 0).toFixed(1) }}
                </span>
                <button
                  type="button"
                  class="text-[9px] px-1 py-0.5 rounded border border-[#EADFD9] bg-white text-[#8E807C] hover:text-[#4A3F3D] shrink-0 cursor-pointer font-medium"
                  @click="updateVoicePitch(0)"
                  title="重置为默认 0.0"
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 全部发型可视化预览展开网格 (折叠) -->
        <div
          v-if="hairPickerOpen"
          class="p-2.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] flex flex-col gap-2 transition-all max-h-72 overflow-y-auto"
        >
          <div class="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
            <button
              v-for="hIdx in HAIR_COUNT"
              :key="hIdx - 1"
              :class="[
                'p-1 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5',
                p.hair === (hIdx - 1)
                  ? 'bg-[#739CBF]/20 border-[#739CBF] ring-1 ring-[#739CBF] shadow-2xs'
                  : 'bg-white border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="setHair(hIdx - 1)"
              :title="`发型 #${hIdx - 1}`"
            >
              <div :style="getHairSpriteStyle(hIdx - 1, 32)"></div>
              <span class="text-[9px] font-mono font-semibold opacity-75">#{{ hIdx - 1 }}</span>
            </button>
          </div>
        </div>

        <!-- 常服体型款式 (按性别折叠，仅渲染 6 款式) -->
        <div class="flex flex-col gap-1.5 pt-1 border-t border-[#EADFD9]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <label class="text-xs font-semibold text-[#4A3F3D]">常服款式与体型</label>
              <span class="text-[11px] font-mono text-[#739CBF]">
                #{{ p.skinVariant }} ({{ skinVariants.find(s => s.val === p.skinVariant)?.label || '自定义' }})
              </span>
            </div>
            <!-- 性别切换分段按钮 -->
            <div class="flex items-center rounded-lg bg-[#EFE7E2] p-0.5 border border-[#EADFD9]">
              <button
                :class="[
                  'px-2.5 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                  currentGender === 'male'
                    ? 'bg-[#739CBF] text-white shadow-xs'
                    : 'text-[#8E807C] hover:text-[#4A3F3D]'
                ]"
                @click="currentGender = 'male'"
              >
                男款
              </button>
              <button
                :class="[
                  'px-2.5 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer',
                  currentGender === 'female'
                    ? 'bg-[#739CBF] text-white shadow-xs'
                    : 'text-[#8E807C] hover:text-[#4A3F3D]'
                ]"
                @click="currentGender = 'female'"
              >
                女款
              </button>
            </div>
          </div>
          <!-- 6 款式两行紧凑排布 -->
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            <button
              v-for="sv in currentGenderVariants"
              :key="sv.val"
              :class="[
                'py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center flex flex-col items-center justify-center',
                p.skinVariant === sv.val
                  ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
                  : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
              ]"
              @click="p.skinVariant = sv.val; store.isModified = true"
            >
              <span>{{ sv.label }}</span>
            </button>
          </div>
        </div>

        <!-- 角色外观配色 (紧凑微缩色块卡片，确保标题清晰与零溢出) -->
        <div class="flex flex-col gap-1.5 pt-1 border-t border-[#EADFD9]">
          <div class="flex items-center justify-between text-xs text-[#8E807C]">
            <span class="font-semibold text-[#4A3F3D]">身体与服饰调色</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
            <div
              v-for="field in colorFields"
              :key="field.key"
              class="p-1.5 sm:p-2 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] flex flex-col gap-1.5 shadow-2xs min-w-0"
            >
              <!-- 顶部：分类名称 + 取色器色块 -->
              <div class="flex items-center justify-between gap-1 min-w-0">
                <span class="text-xs font-bold text-[#4A3F3D] shrink-0">{{ field.label }}</span>
                <div
                  class="relative w-5 h-5 rounded-md border border-[#EADFD9] shrink-0 overflow-hidden cursor-pointer shadow-2xs transition-transform active:scale-95"
                  :style="{ backgroundColor: rgbToHex(p[field.key].r, p[field.key].g, p[field.key].b) }"
                  :title="`点击调节${field.label}`"
                >
                  <input
                    type="color"
                    :value="rgbToHex(p[field.key].r, p[field.key].g, p[field.key].b)"
                    class="absolute -inset-2 w-10 h-10 cursor-pointer bg-transparent border-none p-0 opacity-0"
                    @input="updateColorHex(field.key, ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>

              <!-- 底部：16进制颜色输入框 -->
              <input
                type="text"
                maxlength="7"
                :value="rgbToHex(p[field.key].r, p[field.key].g, p[field.key].b)"
                class="w-full h-5.5 text-center font-mono text-[10px] font-bold rounded-md border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none uppercase focus:border-[#739CBF] shadow-2xs"
                @change="updateColorHex(field.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ===================================================================== -->
    <!-- 3. 永久物品 (恶魔之心, 火把神, 工匠面包, 撒旦军团, 6款微光)            -->
    <!-- ===================================================================== -->
    <Card v-if="store.characterSubTab === 'permanent'" class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(5337, 14), imageRendering: 'pixelated' }"></span>
          <span>永久物品与微光强化</span>
        </CardTitle>
        <div class="flex items-center gap-2">
          <Button
            variant="secondary"
            size="xs"
            class="h-6 text-xs text-[#739CBF] bg-[#F9D6DB]/40 hover:bg-[#F9D6DB] font-semibold"
            @click="unlockAllPermanent"
          >
            一键全开
          </Button>
          <button
            class="text-xs text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
            @click="permanentPanelOpen = !permanentPanelOpen"
          >
            {{ permanentPanelOpen ? '收起' : '展开' }}
          </button>
        </div>
      </CardHeader>
      <CardContent v-if="permanentPanelOpen" class="p-3 pt-0 flex flex-col gap-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div class="flex items-center justify-between p-2 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(3335, 14), imageRendering: 'pixelated' }"></span>
              <span>恶魔之心 (第6饰品栏)</span>
            </span>
            <Switch
              :checked="p.extraAccessory"
              @update:checked="(val: boolean) => { if (p) { p.extraAccessory = val; store.isModified = true; } }"
            />
          </div>

          <div class="flex items-center justify-between p-2 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(5043, 14), imageRendering: 'pixelated' }"></span>
              <span>火把神的恩赐</span>
            </span>
            <Switch
              :checked="p.unlockedBiomeTorches"
              @update:checked="(val: boolean) => { if (p) { p.unlockedBiomeTorches = val; store.isModified = true; } }"
            />
          </div>

          <div class="flex items-center justify-between p-2 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(5326, 14), imageRendering: 'pixelated' }"></span>
              <span>工匠面包 (提高建造范围)</span>
            </span>
            <Switch
              :checked="p.ateArtisanBread"
              @update:checked="(val: boolean) => { if (p) { p.ateArtisanBread = val; store.isModified = true; } }"
            />
          </div>

          <div class="flex items-center justify-between p-2 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(3813, 14), imageRendering: 'pixelated' }"></span>
              <span>撒旦军队全通关 (第3酒馆饰品栏)</span>
            </span>
            <Switch
              :checked="p.finishedDD2"
              @update:checked="(val: boolean) => { if (p) { p.finishedDD2 = val; store.isModified = true; } }"
            />
          </div>
        </div>

        <!-- 6 个微光永久升级 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#EADFD9]/60">
          <div
            v-for="s in shimmerItems"
            :key="s.key"
            class="flex items-center justify-between p-2 rounded-lg bg-[#F9D6DB]/20 border border-[#EADFD9] text-xs"
          >
            <span class="font-medium text-[#4A3F3D] flex items-center gap-1.5">
              <span :style="{ ...getItemSpriteStyle(s.itemId, 14), imageRendering: 'pixelated' }"></span>
              <span>{{ s.label }}</span>
            </span>
            <Switch
              :checked="p[s.key]"
              @update:checked="(val: boolean) => { if (p) { p[s.key] = val; store.isModified = true; } }"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 染发剂选择弹窗 -->
    <Teleport to="body">
      <div
        v-if="dyePickerOpen"
        class="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-6"
        @click.self="dyePickerOpen = false"
      >
        <div class="bg-white rounded-2xl border border-[#EADFD9] shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div class="p-3.5 border-b border-[#EADFD9] flex items-center justify-between bg-[#FFF7F2]">
          <div class="flex items-center gap-2">
            <span :style="{ ...getItemSpriteStyle(1990, 16), imageRendering: 'pixelated' }"></span>
            <span class="text-xs font-bold text-[#4A3F3D]">选择染发剂</span>
          </div>
          <button
            class="text-[#8E807C] hover:text-[#4A3F3D] text-base font-bold p-1 cursor-pointer"
            @click="dyePickerOpen = false"
          >
            ✕
          </button>
        </div>

        <div class="p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          <button
            v-for="d in hairDyePresets"
            :key="d.val"
            :class="[
              'p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer',
              p.hairDye === d.val
                ? 'bg-[#739CBF] text-white border-[#739CBF] shadow-xs'
                : 'bg-[#FFF7F2] text-[#4A3F3D] border-[#EADFD9] hover:bg-[#EFE7E2]'
            ]"
            @click="p.hairDye = d.val; store.isModified = true; dyePickerOpen = false"
          >
            <div class="w-7 h-7 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center shrink-0">
              <div
                :style="{ ...getItemSpriteStyle(d.itemId, 18), imageRendering: 'pixelated' }"
              ></div>
            </div>
            <div class="flex items-center justify-between min-w-0 flex-1 gap-1">
              <span class="text-xs font-bold truncate">{{ d.label }}</span>
              <span class="text-[10px] font-mono opacity-70 shrink-0">#{{ d.val }}</span>
            </div>
          </button>
        </div>

        <div class="p-2.5 border-t border-[#EADFD9] bg-[#FFF7F2] flex justify-end">
          <Button
            variant="default"
            size="xs"
            class="h-7 text-xs font-semibold bg-[#739CBF] text-white px-3"
            @click="dyePickerOpen = false"
          >
            完成
          </Button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>
