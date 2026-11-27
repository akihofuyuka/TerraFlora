<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Copy, Download, FileUp, Search, Sparkles, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  BUILTIN_FILTER_PRESETS,
  collectBuiltinPresetKeys,
  exportMaterialFilterPreset,
  materialKey,
  normalizeKeyList,
  parseMaterialFilterPreset,
  type BuiltinFilterPreset,
  type FilterMode,
  type KindFilter,
  type MatchOptions,
  type MaterialDef,
  type MaterialTag,
  type MaterialsRepository,
} from '@/core/pixelArt';

const props = defineProps<{
  open: boolean;
  repository: MaterialsRepository;
  options: MatchOptions;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:options', value: MatchOptions): void;
}>();

type ScopeTab = 'include' | 'exclude';
type ViewKindFilter = KindFilter | 'checked';

const activeTab = ref<ScopeTab>('include');
const searchText = ref('');
const kindFilter = ref<ViewKindFilter>('all');
const pasteOpen = ref(false);
const pasteText = ref('');
const importMerge = ref(true);
const importFileRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    activeTab.value = props.options.filterMode ?? 'exclude';
    pasteOpen.value = false;
    pasteText.value = '';
  },
  { immediate: true }
);

const includedSet = computed(() => new Set(normalizeKeyList(props.options.includedMaterialKeys)));
const excludedSet = computed(() => new Set(normalizeKeyList(props.options.excludedMaterialKeys)));
const currentSet = computed(() => (activeTab.value === 'include' ? includedSet.value : excludedSet.value));

const tagLabels: Record<MaterialTag, string> = {
  falling: '下落',
  solid_top: '平台',
  unsafe_wall: '不安全墙',
  special: '特殊',
};

const filteredMaterials = computed<MaterialDef[]>(() => {
  const q = searchText.value.trim().toLowerCase();
  const cur = currentSet.value;
  return props.repository.materials.filter((m) => {
    const key = materialKey(m);
    if (kindFilter.value === 'checked' && !cur.has(key)) return false;
    if (kindFilter.value === 'tile' && m.kind !== 'tile') return false;
    if (kindFilter.value === 'wall' && m.kind !== 'wall') return false;
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      String(m.itemId).includes(q) ||
      String(m.id).includes(q) ||
      key.includes(q)
    );
  });
});

function updateKeysForTab(tab: ScopeTab, nextKeys: string[]) {
  if (tab === 'include') {
    emit('update:options', { ...props.options, includedMaterialKeys: nextKeys });
  } else {
    emit('update:options', { ...props.options, excludedMaterialKeys: nextKeys });
  }
}

function toggleMaterial(m: MaterialDef) {
  const key = materialKey(m);
  const next = new Set(currentSet.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  updateKeysForTab(activeTab.value, Array.from(next));
}

function setActiveFilterMode(mode: FilterMode) {
  emit('update:options', { ...props.options, filterMode: mode });
  showToast(mode === 'include' ? '已切换为「只用自选清单」模式' : '已切换为「全库排除」模式');
}

function applyBuiltinPreset(preset: BuiltinFilterPreset) {
  const keys = collectBuiltinPresetKeys(props.repository, preset.id);
  const next = new Set(includedSet.value);
  for (const k of keys) next.add(k);
  emit('update:options', {
    ...props.options,
    filterMode: 'include',
    includedMaterialKeys: Array.from(next),
  });
  activeTab.value = 'include';
  showToast(`已添加「${preset.label}」(${keys.length}种) 并启用自选模式`);
}

function addAllFiltered() {
  const next = new Set(currentSet.value);
  for (const m of filteredMaterials.value) {
    next.add(materialKey(m));
  }
  updateKeysForTab(activeTab.value, Array.from(next));
  showToast(
    activeTab.value === 'include'
      ? `已将当前 ${filteredMaterials.value.length} 项加入自选清单`
      : `已将当前 ${filteredMaterials.value.length} 项加入屏蔽清单`
  );
}

function clearCurrentList() {
  updateKeysForTab(activeTab.value, []);
  showToast(activeTab.value === 'include' ? '已清空自选清单' : '已清空屏蔽清单');
}

function buildPresetJson(): string {
  const preset = exportMaterialFilterPreset(
    props.repository,
    activeTab.value === 'include' ? 'TerraFlora 自选材料清单' : 'TerraFlora 屏蔽材料清单',
    activeTab.value,
    Array.from(currentSet.value)
  );
  return JSON.stringify(preset, null, 2);
}

function exportJsonFile() {
  const keys = currentSet.value;
  if (keys.size === 0) {
    showToast('当前清单为空，先勾选一些材料再导出吧');
    return;
  }
  const blob = new Blob([buildPresetJson()], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `terraflora-materials-${activeTab.value}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`已导出 ${keys.size} 种材料的筛选配置文件`);
}

async function copyPresetText() {
  if (currentSet.value.size === 0) {
    showToast('当前清单为空');
    return;
  }
  try {
    await navigator.clipboard.writeText(buildPresetJson());
    showToast('已复制筛选配置 JSON 到剪贴板');
  } catch {
    showToast('复制失败，请使用导出文件');
  }
}

function applyImportedText(raw: string) {
  try {
    const res = parseMaterialFilterPreset(raw, props.repository);
    if (res.keys.length === 0) {
      showToast('未识别到有效材料条目');
      return;
    }
    const targetTab: ScopeTab = res.filterMode ?? activeTab.value;
    const base = targetTab === 'include' ? includedSet.value : excludedSet.value;
    const nextSet = importMerge.value ? new Set([...base, ...res.keys]) : new Set(res.keys);

    if (targetTab === 'include') {
      emit('update:options', {
        ...props.options,
        filterMode: 'include',
        includedMaterialKeys: Array.from(nextSet),
      });
    } else {
      emit('update:options', {
        ...props.options,
        filterMode: 'exclude',
        excludedMaterialKeys: Array.from(nextSet),
      });
    }
    activeTab.value = targetTab;
    pasteOpen.value = false;
    pasteText.value = '';
    const skipHint = res.invalidCount > 0 ? `（跳过 ${res.invalidCount} 项无效条目）` : '';
    showToast(`已导入 ${res.keys.length} 种材料${skipHint}`);
  } catch (err: any) {
    showToast(`导入失败：${err?.message || '格式无效'}`);
  }
}

function triggerImportFile() {
  importFileRef.value?.click();
}

async function onImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const text = await file.text();
  applyImportedText(text);
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs select-none"
        @click.self="emit('close')"
      >
        <div
          class="bg-white rounded-2xl border border-[#EADFD9] shadow-2xl max-w-xl w-full h-[86vh] max-h-[680px] flex flex-col overflow-hidden text-[#4A3F3D]"
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-[#EADFD9] shrink-0 gap-2">
            <h3 class="text-sm font-bold text-[#4A3F3D] truncate">材料筛选清单管理</h3>
            <button
              type="button"
              class="text-xs text-[#8E807C] hover:text-[#4A3F3D] px-1.5 py-0.5 cursor-pointer shrink-0"
              @click="emit('close')"
            >
              关闭
            </button>
          </div>

          <!-- 控制区 -->
          <div class="px-3 sm:px-4 py-2 border-b border-[#EADFD9]/70 flex flex-col gap-2 shrink-0 bg-[#FFF7F2]/60">
            <!-- 行 1：清单切换 + 模式状态 -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center bg-white border border-[#EADFD9] rounded-lg p-0.5 gap-0.5 shrink-0">
                <button
                  type="button"
                  :class="[
                    'px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                    activeTab === 'include'
                      ? 'bg-[#739CBF] text-white shadow-2xs'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                  ]"
                  @click="activeTab = 'include'"
                >
                  自选池 ({{ includedSet.size }})
                </button>
                <button
                  type="button"
                  :class="[
                    'px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                    activeTab === 'exclude'
                      ? 'bg-[#739CBF] text-white shadow-2xs'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                  ]"
                  @click="activeTab = 'exclude'"
                >
                  屏蔽池 ({{ excludedSet.size }})
                </button>
              </div>

              <button
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap transition-all cursor-pointer shrink-0',
                  (options.filterMode ?? 'exclude') === activeTab
                    ? 'border-[#739CBF] bg-[#739CBF]/10 text-[#2F658D]'
                    : 'border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40'
                ]"
                @click="setActiveFilterMode(activeTab)"
              >
                {{
                  (options.filterMode ?? 'exclude') === activeTab
                    ? '已生效 ✓'
                    : activeTab === 'include'
                      ? '设为只用自选'
                      : '设为全库排除'
                }}
              </button>
            </div>

            <!-- 行 2：搜索 + 分类 -->
            <div class="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <div class="relative flex-1 min-w-[140px]">
                <Search class="w-3.5 h-3.5 text-[#8E807C] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  v-model="searchText"
                  placeholder="搜索材料名或物品 ID…"
                  class="pl-8 h-8 text-xs bg-white border-[#EADFD9]"
                />
              </div>

              <div class="flex items-center bg-white border border-[#EADFD9] rounded-lg p-0.5 gap-0.5 text-[11px] font-semibold shrink-0">
                <button
                  v-for="item in [
                    { v: 'all', label: '全部' },
                    { v: 'tile', label: '方块' },
                    { v: 'wall', label: '墙壁' },
                    { v: 'checked', label: `已选(${currentSet.size})` }
                  ]"
                  :key="item.v"
                  type="button"
                  :class="[
                    'px-2 py-1 rounded-md whitespace-nowrap transition-all cursor-pointer',
                    kindFilter === item.v
                      ? 'bg-[#739CBF] text-white'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                  ]"
                  @click="kindFilter = item.v as ViewKindFilter"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <!-- 行 3：预设 + 快捷操作 -->
            <div class="flex items-center justify-between gap-1.5 flex-wrap text-[11px]">
              <div class="flex items-center gap-1.5 flex-wrap">
                <template v-if="activeTab === 'include'">
                  <button
                    v-for="preset in BUILTIN_FILTER_PRESETS"
                    :key="preset.id"
                    type="button"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#739CBF]/40 text-[#2F658D] font-semibold hover:bg-[#739CBF]/10 cursor-pointer whitespace-nowrap"
                    :title="preset.desc"
                    @click="applyBuiltinPreset(preset)"
                  >
                    <Sparkles class="w-3 h-3" />
                    <span>{{ preset.label }} ({{ preset.keys.length }})</span>
                  </button>
                </template>
                <button
                  v-if="searchText.trim() !== '' || kindFilter !== 'all' || activeTab === 'exclude'"
                  type="button"
                  class="px-2 py-1 rounded-lg bg-white border border-[#EADFD9] text-[#4A3F3D] font-semibold hover:bg-[#F9D6DB]/35 cursor-pointer whitespace-nowrap"
                  @click="addAllFiltered"
                >
                  {{ activeTab === 'include' ? '全选筛选结果' : '屏蔽筛选结果' }} ({{ filteredMaterials.length }})
                </button>
              </div>

              <button
                v-if="currentSet.size > 0"
                type="button"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer whitespace-nowrap"
                @click="clearCurrentList"
              >
                <Trash2 class="w-3 h-3" />
                <span>清空</span>
              </button>
            </div>
          </div>

          <!-- 材料浏览列表 -->
          <div class="flex-1 min-h-0 overflow-y-auto divide-y divide-[#EADFD9]/60 px-2">
            <div
              v-if="filteredMaterials.length === 0"
              class="py-10 text-center text-xs text-[#8E807C]"
            >
              没有符合条件的材料。
            </div>
            <button
              v-for="m in filteredMaterials"
              :key="materialKey(m)"
              type="button"
              class="w-full px-2 py-1.5 flex items-center gap-2 text-left hover:bg-[#FFF7F2] transition-colors cursor-pointer"
              @click="toggleMaterial(m)"
            >
              <span
                :class="[
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  currentSet.has(materialKey(m))
                    ? activeTab === 'include'
                      ? 'bg-[#739CBF] border-[#739CBF] text-white'
                      : 'bg-rose-500 border-rose-500 text-white'
                    : 'bg-white border-[#D6C7C0]'
                ]"
              >
                <Check v-if="currentSet.has(materialKey(m))" class="w-3 h-3" />
              </span>

              <span
                class="w-4 h-4 rounded-full border border-[#EADFD9] shrink-0"
                :style="{ backgroundColor: `#${m.baseHex}` }"
              ></span>

              <span class="w-6 h-6 rounded bg-[#FFF7F2] border border-[#EADFD9] flex items-center justify-center shrink-0">
                <span class="inline-block shrink-0" :style="{ ...getItemSpriteStyle(m.itemId, 18), imageRendering: 'pixelated' }"></span>
              </span>

              <span class="text-xs font-bold text-[#4A3F3D] truncate flex-1">{{ m.name }}</span>

              <span
                v-for="tag in m.tags"
                :key="tag"
                class="text-[10px] px-1 py-0 rounded bg-[#EFE7E2] text-[#5E504D] font-medium shrink-0"
              >
                {{ tagLabels[tag] }}
              </span>

              <span
                :class="[
                  'text-[10px] px-1.5 py-0 rounded font-semibold shrink-0 border',
                  m.kind === 'tile'
                    ? 'bg-[#739CBF]/10 text-[#2F658D] border-[#739CBF]/30'
                    : 'bg-[#F9D6DB]/60 text-[#4A3F3D] border-[#E598A3]/50'
                ]"
              >
                {{ m.kind === 'tile' ? '方块' : '墙壁' }}
              </span>

              <span class="text-[10px] font-mono text-[#8E807C] shrink-0">
                #{{ m.itemId }}
              </span>
            </button>
          </div>

          <!-- 粘贴导入展开区 -->
          <div v-if="pasteOpen" class="px-3 sm:px-4 py-2 border-t border-[#EADFD9] bg-[#FFF7F2] flex flex-col gap-1.5 shrink-0">
            <div class="flex items-center justify-between gap-2 flex-wrap text-[11px]">
              <span class="font-semibold text-[#4A3F3D]">粘贴导出的 JSON 或键列表</span>
              <label class="inline-flex items-center gap-1 cursor-pointer text-[#5E504D]">
                <input v-model="importMerge" type="checkbox" class="accent-[#739CBF]" />
                <span>合并（不勾则覆盖）</span>
              </label>
            </div>
            <textarea
              v-model="pasteText"
              rows="2"
              placeholder='{"filterMode":"include","keys":["wall:153","wall:154",...]}'
              class="w-full rounded-lg border border-[#EADFD9] bg-white p-2 text-[11px] font-mono focus:outline-none focus:border-[#739CBF]"
            />
            <div class="flex items-center justify-end gap-1.5">
              <Button variant="outline" size="sm" class="h-7 text-xs px-2.5" @click="pasteOpen = false">
                收起
              </Button>
              <Button
                variant="default"
                size="sm"
                class="h-7 text-xs px-3 bg-[#739CBF] hover:bg-[#5f87a8] text-white"
                @click="applyImportedText(pasteText)"
              >
                确认导入
              </Button>
            </div>
          </div>

          <!-- 底部导入导出栏 -->
          <div class="px-3 sm:px-4 py-2 border-t border-[#EADFD9] bg-[#FFF7F2]/80 flex items-center justify-between gap-2 shrink-0">
            <input
              ref="importFileRef"
              type="file"
              accept=".json,.txt,application/json"
              class="hidden"
              @change="onImportFileChange"
            />
            <div class="flex items-center gap-1 flex-wrap min-w-0">
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-[11px] font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2 gap-1"
                title="导出清单为 JSON 文件"
                @click="exportJsonFile"
              >
                <Download class="w-3 h-3 text-[#739CBF]" />
                <span>导出</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-[11px] font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2 gap-1"
                title="复制 JSON 配置到剪贴板"
                @click="copyPresetText"
              >
                <Copy class="w-3 h-3 text-[#739CBF]" />
                <span>复制</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-[11px] font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2 gap-1"
                title="从 JSON 文件导入"
                @click="triggerImportFile"
              >
                <FileUp class="w-3 h-3 text-[#739CBF]" />
                <span>导入</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-[11px] font-semibold border-[#EADFD9] bg-white text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2"
                title="直接粘贴配置文本导入"
                @click="pasteOpen = !pasteOpen"
              >
                粘贴
              </Button>
            </div>

            <Button
              variant="default"
              size="sm"
              class="h-7 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-3.5 shrink-0"
              @click="emit('close')"
            >
              完成
            </Button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
