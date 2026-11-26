<script setup lang="ts">
import { computed, ref } from 'vue';
import { Ban, Copy, Download, PackagePlus } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { showToast, store } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  exportBlueprintPng,
  materialKey,
  type BatchConvertResult,
  type BomEntry,
  type MatchOptions,
  type TagCounts,
} from '@/core/pixelArt';
import PixelArtFilterBar from './PixelArtFilterBar.vue';

const props = defineProps<{
  result: BatchConvertResult;
  previewCanvas: HTMLCanvasElement | null;
  options: MatchOptions;
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

function excludeBomMaterial(entry: BomEntry) {
  const key = materialKey(entry.material);
  const prev = props.options.excludedMaterialKeys;
  const next = new Set(prev ? (prev instanceof Set ? Array.from(prev) : prev) : []);
  next.add(key);
  emit('update:options', {
    ...props.options,
    excludedMaterialKeys: Array.from(next),
  });
  showToast(`已屏蔽 ${entry.material.name} 并重新计算整图`);
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
    const blob = await exportBlueprintPng(props.previewCanvas, 12);
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
    <!-- 批量转换控制与筛选 -->
    <Card class="border-[#EADFD9]">
      <CardContent class="p-3.5 sm:p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <!-- 原图 / 实景预览切换 -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-[#4A3F3D]">画布显示</span>
            <div class="flex items-center bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                  previewLayer === 'converted'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="emit('update:previewLayer', 'converted')"
              >
                泰拉实景效果
              </button>
              <button
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                  previewLayer === 'original'
                    ? 'bg-[#739CBF] text-white shadow-2xs'
                    : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                ]"
                @click="emit('update:previewLayer', 'original')"
              >
                原图对比
              </button>
            </div>
          </div>

          <!-- 抖动与透明开关 -->
          <div class="flex items-center gap-4 flex-wrap">
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
          @update:options="emit('update:options', $event)"
        />

        <!-- 转换统计与操作按钮 -->
        <div class="pt-2 border-t border-[#EADFD9]/70 flex items-center justify-between gap-2 flex-wrap">
          <div class="text-[11px] text-[#8E807C] flex items-center gap-x-3 gap-y-1 flex-wrap">
            <span>
              已填充 <strong class="text-[#4A3F3D]">{{ result.filledCells.toLocaleString() }}</strong> 格
              <template v-if="result.skippedCells > 0">（跳过透明 {{ result.skippedCells }} 格）</template>
            </span>
            <span>
              材料 <strong class="text-[#4A3F3D]">{{ result.bom.length }}</strong> 种
            </span>
            <span v-if="result.paintedCells > 0">
              耗漆 <strong class="text-[#4A3F3D]">{{ result.paintedCells.toLocaleString() }}</strong> 桶
            </span>
            <span class="font-mono">耗时 {{ result.durationMs }}ms</span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
              @click="copyBomText"
            >
              <Copy class="w-3.5 h-3.5 text-[#739CBF]" />
              <span>复制清单</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
              :disabled="exportingBlueprint"
              @click="downloadBlueprint"
            >
              <Download class="w-3.5 h-3.5 text-[#739CBF]" />
              <span>{{ exportingBlueprint ? '生成中…' : '导出图纸 PNG' }}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
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
        </div>
      </CardContent>
    </Card>

    <!-- 油漆汇总条 -->
    <Card v-if="paintSummaries.length > 0" class="border-[#EADFD9]">
      <CardContent class="p-3 flex flex-col gap-2">
        <div class="text-xs font-bold text-[#4A3F3D]">油漆消耗汇总</div>
        <div class="flex items-center gap-2 flex-wrap">
          <div
            v-for="p in paintSummaries"
            :key="p.paintId"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs"
          >
            <span :style="{ ...getItemSpriteStyle(p.paintItemId, 16), imageRendering: 'pixelated' }"></span>
            <span class="font-semibold text-[#4A3F3D]">{{ p.paintName }}</span>
            <span class="font-mono text-[#739CBF] font-bold">×{{ p.count }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 方块/墙壁材料统计清单 -->
    <Card class="border-[#EADFD9]">
      <CardContent class="p-3.5 sm:p-4 flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs sm:text-sm font-bold text-[#4A3F3D]">材料采购清单</h3>
          <span class="text-[11px] text-[#8E807C]">按用量从多到少排序（点击可屏蔽重算）</span>
        </div>

        <div
          v-if="result.bom.length === 0"
          class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl py-8 text-center text-xs text-[#8E807C]"
        >
          无可用材料输出
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
              class="w-6 h-6 rounded-full border border-[#EADFD9] shrink-0"
              :style="{ backgroundColor: `#${b.hex}` }"
            ></div>

            <div class="relative w-8 h-8 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] flex items-center justify-center shrink-0">
              <span :style="{ ...getItemSpriteStyle(b.material.itemId, 24), imageRendering: 'pixelated' }"></span>
              <span
                v-if="b.paintItemId"
                class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#EADFD9] flex items-center justify-center shadow-2xs"
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
                      ? 'bg-[#739CBF]/10 text-[#2F658D] border-[#739CBF]/30'
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
              type="button"
              class="p-1.5 rounded-lg text-[#8E807C] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="屏蔽此材料并重新生成整图"
              @click="excludeBomMaterial(b)"
            >
              <Ban class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
