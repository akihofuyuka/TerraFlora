<script setup lang="ts">
import { computed } from 'vue';
import { Ban, Copy } from 'lucide-vue-next';
import { showToast } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  PixelArtMatcher,
  materialKey,
  parseHexColor,
  type MatchCandidate,
  type MatchOptions,
  type MaterialTag,
  type TagCounts,
} from '@/core/pixelArt';
import PixelArtFilterBar from './PixelArtFilterBar.vue';

const props = withDefaults(
  defineProps<{
    matcher: PixelArtMatcher;
    targetHex: string;
    options: MatchOptions;
    tagCounts?: TagCounts;
    detail?: string;
    transparentHint?: boolean;
    maxListHeightClass?: string;
  }>(),
  {
    detail: '',
    transparentHint: false,
    maxListHeightClass: 'max-h-[420px]',
  }
);

const emit = defineEmits<{
  (e: 'update:options', value: MatchOptions): void;
}>();

const normalizedHex = computed(() => parseHexColor(props.targetHex));

const candidates = computed<MatchCandidate[]>(() => {
  if (!normalizedHex.value) return [];
  return props.matcher.matchCandidates(normalizedHex.value, props.options);
});

const tagLabels: Record<MaterialTag, string> = {
  falling: '下落',
  solid_top: '平台',
  unsafe_wall: '不安全墙',
  special: '特殊',
};

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`已复制${label}：${text}`);
  } catch {
    showToast('复制失败，请手动选中复制');
  }
}

function formatCandidateCopy(c: MatchCandidate): string {
  return `${c.material.name} (物品ID ${c.material.itemId}-${c.paintName}-#${c.hex})`;
}

function excludeCandidate(c: MatchCandidate) {
  const key = materialKey(c.material);
  const prev = props.options.excludedMaterialKeys;
  const next = new Set(prev ? (prev instanceof Set ? Array.from(prev) : prev) : []);
  next.add(key);
  emit('update:options', {
    ...props.options,
    excludedMaterialKeys: Array.from(next),
  });
  showToast(`已屏蔽 ${c.material.name}`);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 目标色号摘要 -->
    <div
      v-if="normalizedHex"
      class="flex items-center justify-between gap-3 bg-[#FFF7F2] border border-[#EADFD9] rounded-xl px-3 py-2.5"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="w-9 h-9 rounded-full border-2 border-white shadow-xs shrink-0 ring-1 ring-[#EADFD9]"
          :style="{ backgroundColor: `#${normalizedHex}` }"
        ></div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              class="font-mono text-sm font-bold text-[#4A3F3D] hover:text-[#739CBF] inline-flex items-center gap-1 cursor-pointer"
              title="点击复制色号"
              @click="copyText(`#${normalizedHex}`, '色号')"
            >
              <span>#{{ normalizedHex }}</span>
              <Copy class="w-3 h-3 text-[#8E807C]" />
            </button>
            <span
              v-if="transparentHint"
              class="text-[10px] px-1.5 py-0.5 rounded bg-[#F9D6DB] text-[#4A3F3D] border border-[#E598A3] font-medium"
            >
              透明格（按画布底色计算）
            </span>
          </div>
          <p v-if="detail" class="text-[11px] text-[#8E807C] mt-0.5 truncate">
            {{ detail }}
          </p>
        </div>
      </div>

      <span class="text-[11px] text-[#8E807C] shrink-0">
        Top {{ candidates.length }}
      </span>
    </div>

    <!-- 筛选控件 -->
    <PixelArtFilterBar
      :options="options"
      :tag-counts="tagCounts ?? matcher.repository.tagCounts"
      @update:options="emit('update:options', $event)"
    />

    <!-- 匹配结果列表 -->
    <div
      v-if="!normalizedHex"
      class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl py-10 px-4 text-center text-xs text-[#8E807C]"
    >
      请输入有效的 6 位十六进制色号（例如 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono">#4A90E2</code>）
    </div>

    <div
      v-else-if="candidates.length === 0"
      class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl py-10 px-4 text-center text-xs text-[#8E807C]"
    >
      当前筛选条件下无匹配结果，可尝试放开筛选条件或重置屏蔽列表。
    </div>

    <div
      v-else
      :class="[
        'bg-white border border-[#EADFD9] rounded-xl divide-y divide-[#EADFD9]/70 overflow-y-auto shadow-2xs',
        maxListHeightClass
      ]"
    >
      <div
        v-for="(c, idx) in candidates"
        :key="`${c.material.kind}-${c.material.id}-${c.paintId}-${c.hex}`"
        class="px-3 py-2 flex items-center gap-2.5 hover:bg-[#FFF7F2] transition-colors cursor-pointer group"
        title="点击复制推荐材料信息"
        @click="copyText(formatCandidateCopy(c), '材料信息')"
      >
        <!-- 目标对比色块 -->
        <div
          class="w-7 h-7 rounded-full border border-[#EADFD9] shadow-2xs shrink-0"
          :style="{ backgroundColor: `#${c.hex}` }"
        ></div>

        <!-- 游戏内物品与油漆贴图 -->
        <div class="relative w-8 h-8 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] flex items-center justify-center shrink-0">
          <span :style="{ ...getItemSpriteStyle(c.material.itemId, 24), imageRendering: 'pixelated' }"></span>
          <span
            v-if="c.paintItemId"
            class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#EADFD9] flex items-center justify-center shadow-2xs"
            :title="c.paintName"
          >
            <span :style="{ ...getItemSpriteStyle(c.paintItemId, 12), imageRendering: 'pixelated' }"></span>
          </span>
        </div>

        <!-- 名称与 ID 信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs sm:text-sm font-bold text-[#4A3F3D] truncate">
              {{ c.material.name }}
            </span>
            <span
              :class="[
                'text-[10px] px-1.5 py-0 rounded font-semibold shrink-0 border',
                c.material.kind === 'tile'
                  ? 'bg-[#739CBF]/10 text-[#2F658D] border-[#739CBF]/30'
                  : 'bg-[#F9D6DB]/60 text-[#4A3F3D] border-[#E598A3]/50'
              ]"
            >
              {{ c.material.kind === 'tile' ? '方块' : '墙壁' }}
            </span>
            <span
              v-for="tag in c.material.tags"
              :key="tag"
              class="text-[10px] px-1 py-0 rounded bg-[#EFE7E2] text-[#5E504D] font-medium shrink-0"
            >
              {{ tagLabels[tag] }}
            </span>
            <span
              v-if="idx === 0"
              class="text-[10px] px-1.5 py-0 rounded font-semibold shrink-0 bg-[#F9D6DB] text-[#4A3F3D] border border-[#E598A3]"
            >
              最佳
            </span>
          </div>

          <div class="text-[11px] font-mono text-[#5E504D] mt-0.5 flex items-center gap-x-2 flex-wrap">
            <span>物品ID {{ c.material.itemId }}-{{ c.paintName }}-#{{ c.hex }}</span>
            <span class="text-[10px] text-[#8E807C]">
              {{ c.material.kind === 'tile' ? '方块' : '墙壁' }}ID {{ c.material.id }}
            </span>
          </div>
        </div>

        <!-- 相似度 + 屏蔽按钮 -->
        <div class="flex items-center gap-1.5 shrink-0 pl-1">
          <div class="text-right">
            <div
              :class="[
                'text-xs sm:text-sm font-bold font-mono tabular-nums',
                c.similarity >= 0.95 ? 'text-[#739CBF]' : 'text-[#4A3F3D]'
              ]"
            >
              {{ (c.similarity * 100).toFixed(2) }}%
            </div>
            <div class="text-[10px] text-[#8E807C] opacity-0 group-hover:opacity-100 transition-opacity">
              点击复制
            </div>
          </div>

          <button
            type="button"
            class="p-1.5 rounded-lg text-[#8E807C] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="屏蔽此材料（下次匹配跳过）"
            @click.stop="excludeCandidate(c)"
          >
            <Ban class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
