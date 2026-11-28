<script setup lang="ts">
import { computed, ref } from 'vue';
import { Copy, Globe, HelpCircle } from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { showToast } from '@/store';
import {
  QUICK_PATH_ENTRIES,
  copyToClipboard,
  type DeviceHint,
  type GuideLang,
  type QuickPathEntry,
} from './guideData';

const props = defineProps<{
  lang: GuideLang;
  deviceHint: DeviceHint;
}>();

const emit = defineEmits<{
  (e: 'toggle-lang'): void;
  (e: 'open-faq'): void;
}>();

type PlatformFilter = 'pc' | 'android' | 'ios' | 'all';
const initialFilter: PlatformFilter =
  props.deviceHint.platform === 'pc' ? 'pc' : (props.deviceHint.mobileOs ?? 'android');
const activeFilter = ref<PlatformFilter>(initialFilter);

const isZh = computed(() => props.lang === 'zh');

const filterTabs = computed<Array<{ id: PlatformFilter; label: string }>>(() =>
  isZh.value
    ? [
        { id: 'pc', label: '电脑' },
        { id: 'android', label: '安卓' },
        { id: 'ios', label: '苹果' },
        { id: 'all', label: '全部' },
      ]
    : [
        { id: 'pc', label: 'PC' },
        { id: 'android', label: 'Android' },
        { id: 'ios', label: 'iOS' },
        { id: 'all', label: 'All' },
      ]
);

const filteredEntries = computed<QuickPathEntry[]>(() => {
  if (activeFilter.value === 'all') return QUICK_PATH_ENTRIES;
  return QUICK_PATH_ENTRIES.filter((entry) => entry.group === activeFilter.value);
});

async function copyValue(text: string) {
  const ok = await copyToClipboard(text);
  if (ok) {
    showToast(`${isZh.value ? '已复制' : 'Copied'}: ${text}`);
  } else {
    showToast(isZh.value ? '复制失败，请手动选中复制' : 'Copy failed');
  }
}
</script>

<template>
  <Card class="bg-white border-[#EADFD9] shadow-sm">
    <CardContent class="p-3.5 flex flex-col gap-3">
      <!-- 平台筛选与操作 -->
      <div class="flex items-center justify-between gap-2 shadow-[inset_0_-1px_0_0_#EADFD9]">
        <div class="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          <button
            v-for="tab in filterTabs"
            :key="tab.id"
            type="button"
            :class="[
              'px-2.5 py-2 text-xs whitespace-nowrap transition-colors cursor-pointer border-b-2 rounded-t-md',
              activeFilter === tab.id
                ? 'border-[#739CBF] text-[#2F658D] font-bold'
                : 'border-transparent text-[#8E807C] font-semibold hover:text-[#4A3F3D]',
            ]"
            @click="activeFilter = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="flex items-center gap-1 pb-1 shrink-0">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
            @click="emit('toggle-lang')"
          >
            <Globe class="w-3 h-3" />
            <span>{{ isZh ? 'EN' : '中文' }}</span>
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
            @click="emit('open-faq')"
          >
            <HelpCircle class="w-3 h-3" />
            <span>{{ isZh ? '排查' : 'FAQ' }}</span>
          </button>
        </div>
      </div>

      <!-- 通用目录规则 -->
      <div class="px-3 py-2 rounded-lg bg-[#EEF4F9] border border-[#C4D6E5] text-[11.5px] text-[#2F658D] flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap font-semibold">
        <template v-if="isZh">
          <span>地图 <code class="font-mono">.wld</code> → Worlds</span>
          <span class="opacity-45">·</span>
          <span>人物 <code class="font-mono">.plr</code> → Players</span>
          <span class="opacity-45">·</span>
          <span>备份 <code class="font-mono">.bak</code> → 删后缀恢复</span>
        </template>
        <template v-else>
          <span>Worlds <code class="font-mono">.wld</code> → Worlds</span>
          <span class="opacity-45">·</span>
          <span>Players <code class="font-mono">.plr</code> → Players</span>
          <span class="opacity-45">·</span>
          <span><code class="font-mono">.bak</code> → drop suffix</span>
        </template>
      </div>

      <!-- 路径列表 -->
      <div class="rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 divide-y divide-[#EADFD9]/70 overflow-hidden">
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="p-3 flex flex-col gap-1.5"
        >
          <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-[#4A3F3D]">
                {{ isZh ? entry.titleZh : entry.titleEn }}
              </span>
              <span
                v-if="entry.matchDevice?.(deviceHint)"
                class="px-1.5 py-0 rounded text-[10px] font-semibold bg-[#F9D6DB]/65 border border-[#E598A3]/60 text-[#4A3F3D]"
              >
                {{ isZh ? '当前' : 'Current' }}
              </span>
            </div>
            <span class="text-[11px] text-[#8E807C]">
              {{ isZh ? entry.tipZh : entry.tipEn }}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <div class="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white border border-[#EADFD9] text-[11.5px] text-[#4A3F3D] flex items-center gap-1.5">
              <span
                v-if="entry.patchPath"
                class="text-[10px] font-semibold text-[#8E807C] shrink-0"
              >
                {{ isZh ? '存档' : 'Save' }}
              </span>
              <code class="font-mono break-all select-text">{{ entry.savePath }}</code>
            </div>

            <button
              v-if="entry.copyText"
              type="button"
              class="h-8 px-2.5 rounded-lg bg-white border border-[#C4D6E5] text-[#2F658D] hover:bg-[#EEF4F9] text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              @click="copyValue(entry.copyText)"
            >
              <Copy class="w-3 h-3" />
              <span>{{ isZh ? (entry.copyLabelZh ?? '复制') : (entry.copyLabelEn ?? 'Copy') }}</span>
            </button>
          </div>

          <div
            v-if="entry.patchPath"
            class="px-2.5 py-1.5 rounded-lg bg-white border border-[#EADFD9] text-[11.5px] text-[#4A3F3D] flex items-center gap-1.5"
          >
            <span class="text-[10px] font-semibold text-[#8E807C] shrink-0">
              {{ isZh ? '补丁' : 'Patch' }}
            </span>
            <code class="font-mono break-all select-text">{{ entry.patchPath }}</code>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
