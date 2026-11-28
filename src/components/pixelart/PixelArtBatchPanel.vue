<script setup lang="ts">
import { computed, ref } from 'vue';
import { Ban, Copy, Download, PackagePlus, Plus, Sparkles, Star, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { showToast, store } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  exportBlueprintPng,
  materialKey,
  normalizeKeyList,
  toggleKeyInList,
  type BatchConvertResult,
  type BomEntry,
  type MatchOptions,
  type MaterialsRepository,
  type TagCounts,
} from '@/core/pixelArt';
import PixelArtFilterBar from './PixelArtFilterBar.vue';

const props = defineProps<{
  result: BatchConvertResult;
  previewCanvas: HTMLCanvasElement | null;
  options: MatchOptions;
  repository: MaterialsRepository;
  tagCounts: TagCounts;
  dithering: boolean;
  skipTransparent: boolean;
  previewLayer: 'converted' | 'original';
}>();

const emit = defineEmits<{
  (e: 'update:options', value: MatchOptions): void;
  (e: 'update:dithering', value: boolean): void;
  (e: 'update:skipTransparent', value: boolean): void;
  (e: 'update:previewLayer', value: 'converted' | 'original'): void;
}>();

const exportingBlueprint = ref(false);
const topExtractCount = ref(12);

interface PaintSummary {
  paintId: number;
  paintName: string;
  paintItemId: number;
  count: number;
}

const paintSummaries = computed<PaintSummary[]>(() => {
  const map = new Map<number, PaintSummary>();
  for (const entry of props.result.bom) {
    if (entry.paintId <= 0 || !entry.paintItemId) continue;
    const prev = map.get(entry.paintId);
    if (prev) {
      prev.count += entry.count;
    } else {
      map.set(entry.paintId, {
        paintId: entry.paintId,
        paintName: entry.paintName,
        paintItemId: entry.paintItemId,
        count: entry.count,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
});

function getEmptyPlayerSlots(): Array<{ id: number; stack: number; prefix: number }> {
  const player = store.player;
  if (!player) return [];
  const containers = [
    player.inventory.slice(0, 50),
    player.bank,
    player.bank2,
    player.bank3,
    player.bank4,
  ];
  const slots: Array<{ id: number; stack: number; prefix: number }> = [];
  for (const box of containers) {
    for (const slot of box) {
      if (slot && slot.id === 0) slots.push(slot);
    }
  }
  return slots;
}

const availableEmptySlotCount = computed(() => getEmptyPlayerSlots().length);

function formatStacks(count: number, itemId: number): string {
  const maxStack = store.itemsMap.get(itemId)?.stack ?? 9999;
  if (count <= maxStack) return `${count} 个`;
  const stacks = Math.floor(count / maxStack);
  const rem = count % maxStack;
  return rem > 0 ? `${count} 个（${stacks}组 + ${rem}）` : `${count} 个（${stacks}组）`;
}

const includedSet = computed(() => new Set(normalizeKeyList(props.options.includedMaterialKeys)));
const distinctBomMaterialCount = computed(() => {
  const keys = new Set<string>();
  for (const entry of props.result.bom) {
    keys.add(materialKey(entry.material));
  }
  return keys.size;
});

function excludeBomMaterial(entry: BomEntry) {
  const key = materialKey(entry.material);
  const { next } = toggleKeyInList(props.options.excludedMaterialKeys, key);
  emit('update:options', {
    ...props.options,
    excludedMaterialKeys: next,
  });
  showToast(`已屏蔽 ${entry.material.name} 并重新计算整图`);
}

function toggleIncludeBom(entry: BomEntry) {
  const key = materialKey(entry.material);
  const { next, added } = toggleKeyInList(props.options.includedMaterialKeys, key);
  emit('update:options', {
    ...props.options,
    includedMaterialKeys: next,
  });
  showToast(
    added
      ? `已将 ${entry.material.name} 加入自选清单（共 ${next.length} 项）`
      : `已将 ${entry.material.name} 移出自选清单`
  );
}

function focusTopBomAsInclude() {
  const maxCount = Math.max(1, distinctBomMaterialCount.value);
  const limit = Math.max(1, Math.min(maxCount, Math.floor(Number(topExtractCount.value) || 12)));
  topExtractCount.value = limit;
  const keys = new Set<string>();
  for (const entry of props.result.bom) {
    keys.add(materialKey(entry.material));
    if (keys.size >= limit) break;
  }
  const next = Array.from(keys);
  emit('update:options', {
    ...props.options,
    filterMode: 'include',
    includedMaterialKeys: next,
  });
  showToast(`已将用量前 ${next.length} 种材料设为自选清单并重算整图`);
}

async function copyBomText() {
  if (props.result.bom.length === 0) return;
  const lines = [
    `TerraFlora 像素画材料清单 (${props.result.columns}×${props.result.rows} 图格，共 ${props.result.filledCells} 格)`,
    ...props.result.bom.map(
      (b) =>
        `- ${b.material.name} [${b.material.kind === 'tile' ? '方块' : '墙壁'}] | 物品ID ${b.material.itemId}-${b.paintName}-#${b.hex} | ${b.count} 个`
    ),
  ];
  if (paintSummaries.value.length > 0) {
    lines.push('', '油漆总需求：');
    for (const p of paintSummaries.value) {
      lines.push(`- ${p.paintName} (物品ID ${p.paintItemId}): ${p.count} 桶`);
    }
  }
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('已复制完整材料采购清单');
  } catch {
    showToast('复制失败，请手动复制');
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadBlueprint() {
  if (!props.previewCanvas || exportingBlueprint.value) return;
  exportingBlueprint.value = true;
  try {
    const blob = await exportBlueprintPng(props.previewCanvas);
    triggerDownload(blob, `terraflora-blueprint-${props.result.columns}x${props.result.rows}.png`);
    showToast('已导出带坐标标尺的施工图纸');
  } catch {
    showToast('图纸导出失败（画布可能过大）');
  } finally {
    exportingBlueprint.value = false;
  }
}

async function downloadRawPixelPng() {
  if (!props.previewCanvas) return;
  const blob = await new Promise<Blob | null>((resolve) =>
    props.previewCanvas!.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) {
    showToast('导出失败');
    return;
  }
  triggerDownload(blob, `terraflora-pixels-${props.result.columns}x${props.result.rows}.png`);
  showToast('已导出 1:1 像素预览图');
}

function grantMaterialsToPlayer() {
  const player = store.player;
  if (!player) return;

  const itemCounts = new Map<number, number>();
  for (const entry of props.result.bom) {
    itemCounts.set(entry.material.itemId, (itemCounts.get(entry.material.itemId) ?? 0) + entry.count);
    if (entry.paintItemId) {
      itemCounts.set(entry.paintItemId, (itemCounts.get(entry.paintItemId) ?? 0) + entry.count);
    }
  }

  const emptySlots = getEmptyPlayerSlots();
  let slotCursor = 0;
  let placedStacks = 0;
  let overflowStacks = 0;

  for (const [itemId, totalCount] of itemCounts.entries()) {
    const maxStack = store.itemsMap.get(itemId)?.stack ?? 9999;
    let remaining = totalCount;
    while (remaining > 0) {
      const amt = Math.min(remaining, maxStack);
      remaining -= amt;
      if (slotCursor < emptySlots.length) {
        emptySlots[slotCursor].id = itemId;
        emptySlots[slotCursor].stack = amt;
        emptySlots[slotCursor].prefix = 0;
        slotCursor++;
        placedStacks++;
      } else {
        overflowStacks++;
      }
    }
  }

  if (placedStacks > 0) {
    store.isModified = true;
  }

  if (placedStacks === 0) {
    showToast('当前角色背包与仓库已满，未能放入材料');
  } else if (overflowStacks > 0) {
    showToast(`已向「${player.name}」放入 ${placedStacks} 组材料，另有 ${overflowStacks} 组因空间不足未放入`);
  } else {
    showToast(`已向「${player.name}」背包与仓库放入全部 ${placedStacks} 组材料！`);
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 区块 1：预览控制与材料筛选 -->
    <Card class="border-[#EADFD9]">
      <CardHeader class="p-3.5 pb-2">
        <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <span :style="{ ...getItemSpriteStyle(1071, 14), imageRendering: 'pixelated' }"></span>
          <span>预览与筛选控制</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="p-3.5 pt-0 flex flex-col gap-3">
        <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-2.5 flex items-center justify-between gap-2.5 flex-wrap">
          <!-- 原图 / 实景预览切换 -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-[#4A3F3D]">画布显示</span>
            <div class="flex items-center bg-white border border-[#EADFD9] rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none border',
                  previewLayer === 'converted'
                    ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                    : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]'
                ]"
                @click="emit('update:previewLayer', 'converted')"
              >
                泰拉实景效果
              </button>
              <button
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none border',
                  previewLayer === 'original'
                    ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                    : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]'
                ]"
                @click="emit('update:previewLayer', 'original')"
              >
                原图对比
              </button>
            </div>
          </div>

          <!-- 抖动与透明开关 -->
          <div class="flex items-center gap-3.5 flex-wrap">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#4A3F3D]">
              <Switch
                :checked="dithering"
                @update:checked="emit('update:dithering', $event)"
              />
              <span>颜色抖动 (Dithering)</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#4A3F3D]">
              <Switch
                :checked="skipTransparent"
                @update:checked="emit('update:skipTransparent', $event)"
              />
              <span>跳过透明格</span>
            </label>
          </div>
        </div>

        <PixelArtFilterBar
          :options="options"
          :tag-counts="tagCounts"
          :repository="repository"
          @update:options="emit('update:options', $event)"
        />
      </CardContent>
    </Card>

    <!-- 区块 2：导出与材料清单 -->
    <Card class="border-[#EADFD9]">
      <CardHeader class="p-3.5 pb-2 flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <span :style="{ ...getItemSpriteStyle(149, 14), imageRendering: 'pixelated' }"></span>
            <span>导出与材料清单</span>
          </CardTitle>
          <div class="text-[11px] flex items-center gap-1.5 flex-wrap">
            <span class="px-2 py-0.5 rounded-md bg-[#F9D6DB]/45 border border-[#E598A3]/50 text-[#4A3F3D] font-semibold">
              已填充 {{ result.filledCells.toLocaleString() }} 格
            </span>
            <span class="px-2 py-0.5 rounded-md bg-[#FFF7F2] border border-[#EADFD9] text-[#4A3F3D] font-semibold">
              {{ result.bom.length }} 种材料
            </span>
            <span v-if="result.paintedCells > 0" class="px-2 py-0.5 rounded-md bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] font-semibold">
              耗漆 {{ result.paintedCells.toLocaleString() }} 桶
            </span>
            <span class="text-[#8E807C] font-mono">{{ result.durationMs }}ms</span>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-3.5 pt-0 flex flex-col gap-3">
        <!-- 导出与写入操作按钮 -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
            @click="copyBomText"
          >
            <Copy class="w-3.5 h-3.5 text-[#739CBF]" />
            <span>复制清单</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
            :disabled="exportingBlueprint"
            @click="downloadBlueprint"
          >
            <Download class="w-3.5 h-3.5 text-[#739CBF]" />
            <span>{{ exportingBlueprint ? '生成中…' : '导出图纸 PNG' }}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            class="h-8 text-xs font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
            @click="downloadRawPixelPng"
          >
            <Download class="w-3.5 h-3.5" />
            <span>1:1 像素图</span>
          </Button>

          <Button
            v-if="store.player"
            variant="default"
            size="sm"
            class="h-8 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-3 gap-1.5"
            :title="`将清单中的所有方块、墙壁和油漆放入当前角色背包与仓库（当前空位 ${availableEmptySlotCount} 格）`"
            @click="grantMaterialsToPlayer"
          >
            <PackagePlus class="w-3.5 h-3.5" />
            <span>放入「{{ store.player.name }}」背包（空位 {{ availableEmptySlotCount }}）</span>
          </Button>
        </div>

        <!-- 油漆汇总条 -->
        <div v-if="paintSummaries.length > 0" class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-2.5 flex flex-col gap-1.5">
          <div class="text-[11px] font-bold text-[#4A3F3D]">油漆消耗汇总</div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <div
              v-for="p in paintSummaries"
              :key="p.paintId"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-[#EADFD9] text-xs"
            >
              <span :style="{ ...getItemSpriteStyle(p.paintItemId, 16), imageRendering: 'pixelated' }"></span>
              <span class="font-semibold text-[#4A3F3D]">{{ p.paintName }}</span>
              <span class="font-mono text-[#2F658D] font-bold">×{{ p.count }}</span>
            </div>
          </div>
        </div>

        <!-- 方块/墙壁材料统计清单 -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-xs font-bold text-[#4A3F3D]">材料采购清单</span>
            <div class="flex items-center gap-2 flex-wrap">
              <div
                v-if="(options.filterMode ?? 'exclude') === 'exclude' && distinctBomMaterialCount > 1"
                class="inline-flex items-center gap-1 rounded-lg bg-[#FFF7F2] border border-[#C4D6E5] p-0.5 pl-2 text-[11px] text-[#4A3F3D]"
              >
                <span>提取前</span>
                <input
                  v-model.number="topExtractCount"
                  type="number"
                  min="1"
                  :max="Math.max(1, distinctBomMaterialCount)"
                  class="w-11 h-5.5 text-center font-mono text-[11px] font-bold rounded border border-[#EADFD9] bg-white text-[#4A3F3D] outline-none focus:border-[#739CBF]"
                  @keydown.enter="focusTopBomAsInclude"
                />
                <span>种</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#EEF4F9] text-[#2F658D] font-semibold hover:bg-[#DCE9F4] cursor-pointer transition-colors"
                  title="提取当前用量最高的指定数量主要材料，切换为只用自选模式重算整图"
                  @click="focusTopBomAsInclude"
                >
                  <Sparkles class="w-3 h-3" />
                  <span>入自选重算</span>
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="result.bom.length === 0"
            class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl py-8 px-4 text-center text-xs text-[#8E807C] flex flex-col items-center gap-2"
          >
            <span>
              {{
                (options.filterMode ?? 'exclude') === 'include' && includedSet.size === 0
                  ? '当前「自选」清单为空，请点击「管理清单」添加材料。'
                  : '当前筛选条件下无可用材料输出。'
              }}
            </span>
            <button
              v-if="(options.filterMode ?? 'exclude') === 'include'"
              type="button"
              class="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#EADFD9] text-[#4A3F3D] font-semibold hover:bg-[#F9D6DB]/40 cursor-pointer"
              @click="emit('update:options', { ...options, filterMode: 'exclude' })"
            >
              切回全库
            </button>
          </div>

          <div
            v-else
            class="bg-white border border-[#EADFD9] rounded-xl divide-y divide-[#EADFD9]/70 max-h-[400px] overflow-y-auto"
          >
            <div
              v-for="b in result.bom"
              :key="b.key"
              class="px-3 py-2 flex items-center gap-2.5 hover:bg-[#FFF7F2] transition-colors"
            >
              <div
                class="w-6 h-6 rounded-lg border border-[#EADFD9] shrink-0"
                :style="{ backgroundColor: `#${b.hex}` }"
              ></div>

              <div class="relative w-8 h-8 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center shrink-0">
                <span :style="{ ...getItemSpriteStyle(b.material.itemId, 24), imageRendering: 'pixelated' }"></span>
                <span
                  v-if="b.paintItemId"
                  class="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-white border border-[#EADFD9] flex items-center justify-center shadow-2xs"
                  :title="b.paintName"
                >
                  <span :style="{ ...getItemSpriteStyle(b.paintItemId, 12), imageRendering: 'pixelated' }"></span>
                </span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-[#4A3F3D] truncate">{{ b.material.name }}</span>
                  <span
                    :class="[
                      'text-[10px] px-1.5 py-0 rounded font-semibold border',
                      b.material.kind === 'tile'
                        ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5]'
                        : 'bg-[#F9D6DB]/60 text-[#4A3F3D] border-[#E598A3]/50'
                    ]"
                  >
                    {{ b.material.kind === 'tile' ? '方块' : '墙壁' }}
                  </span>
                </div>
                <div class="text-[11px] font-mono text-[#5E504D] mt-0.5 truncate">
                  物品ID {{ b.material.itemId }}-{{ b.paintName }}-#{{ b.hex }}
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-xs font-bold font-mono text-[#4A3F3D] tabular-nums">
                  {{ formatStacks(b.count, b.material.itemId) }}
                </div>
              </div>

              <button
                v-if="(options.filterMode ?? 'exclude') === 'include'"
                type="button"
                class="p-1.5 rounded-lg text-[#8E807C] hover:text-[#B84A5A] hover:bg-[#FDECEF] transition-colors cursor-pointer shrink-0"
                title="从自选清单移出并重算整图"
                @click="toggleIncludeBom(b)"
              >
                <X class="w-3.5 h-3.5" />
              </button>

              <template v-else>
                <button
                  type="button"
                  :class="[
                    'p-1.5 rounded-lg transition-colors cursor-pointer shrink-0',
                    includedSet.has(materialKey(b.material))
                      ? 'bg-[#EEF4F9] text-[#2F658D] hover:bg-[#FDECEF] hover:text-[#B84A5A]'
                      : 'text-[#8E807C] hover:text-[#2F658D] hover:bg-[#EEF4F9]'
                  ]"
                  :title="includedSet.has(materialKey(b.material)) ? '已在自选清单（点击取消）' : '加入自选清单'"
                  @click="toggleIncludeBom(b)"
                >
                  <Star
                    v-if="includedSet.has(materialKey(b.material))"
                    class="w-3.5 h-3.5 fill-current"
                  />
                  <Plus v-else class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  class="p-1.5 rounded-lg text-[#8E807C] hover:text-[#B84A5A] hover:bg-[#FDECEF] transition-colors cursor-pointer shrink-0"
                  title="屏蔽此材料并重新生成整图"
                  @click="excludeBomMaterial(b)"
                >
                  <Ban class="w-3.5 h-3.5" />
                </button>
              </template>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
