<script setup lang="ts">
import { computed, ref } from 'vue';
import { Copy, Download, FolderUp, Globe, MapPin, X } from 'lucide-vue-next';
import {
  SUPPORTED_EDITIONS,
  findVersionInfo,
  closeWldFile,
  exportWldFile,
  loadWldFile,
  setActiveTool,
  setGuideSubTab,
  setWorldTargetEdition,
  showToast,
  store,
} from '@/store';
import { formatFileSize } from '@/core/wld';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GuideIcon from '@/components/guide/GuideIcon.vue';

const props = defineProps<{
  standalone?: boolean;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const header = computed(() => store.worldHeader);
const versionInfo = computed(() =>
  header.value && header.value.version > 0 ? findVersionInfo(header.value.version) : null
);

const gameModeOptions = [
  { val: 0, label: '经典' },
  { val: 1, label: '专家' },
  { val: 2, label: '大师' },
  { val: 3, label: '旅途' },
] as const;

function triggerUpload() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    loadWldFile(file);
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    loadWldFile(file);
  }
}

function openGuide() {
  if (props.standalone) {
    setGuideSubTab('path');
  } else {
    setActiveTool('guide');
  }
}

async function copySeed(seed: string) {
  try {
    await navigator.clipboard.writeText(seed);
    showToast(`已复制世界种子：${seed}`);
  } catch {
    showToast('复制失败，请手动选中复制');
  }
}
</script>

<template>
  <input
    ref="fileInputRef"
    type="file"
    accept=".wld, application/octet-stream, application/*"
    class="hidden"
    @change="onFileSelected"
  />

  <!-- 未载入地图 -->
  <div v-if="!store.worldFile || !header" class="max-w-xl w-full mx-auto flex flex-col gap-3.5">
    <div class="bg-white rounded-2xl border border-[#EADFD9] shadow-sm p-5 md:p-6 text-center flex flex-col gap-4">
      <div class="flex flex-col items-center gap-1.5">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#F9D6DB]/55 border border-[#E598A3]/60 text-[#4A3F3D]">
          <GuideIcon :item-id="893" :size="14" :standalone="standalone">
            <Globe class="w-3.5 h-3.5 text-[#739CBF]" />
          </GuideIcon>
          <span>地图存档</span>
        </span>
        <h2 class="text-base font-bold text-[#4A3F3D]">载入泰拉瑞亚地图</h2>
        <p class="text-xs text-[#8E807C]">本地读取与转换 .wld 存档，支持国际服与心动版</p>
      </div>

      <div
        :class="[
          'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors',
          isDragging
            ? 'border-[#739CBF] bg-[#EEF4F9]/70'
            : 'border-[#739CBF]/60 bg-[#FFF7F2] hover:bg-[#F9D6DB]/40',
        ]"
        @click="triggerUpload"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <GuideIcon :item-id="893" :size="32" :standalone="standalone">
          <Globe class="w-8 h-8 text-[#739CBF]" />
        </GuideIcon>
        <span class="text-xs font-bold text-[#739CBF]">点击或拖入 .wld 存档</span>
        <span class="text-xs text-[#8E807C]">支持官方国际服与心动版</span>
      </div>

      <div class="bg-[#F9D6DB]/35 border border-[#E598A3]/60 rounded-xl p-3 text-left text-xs text-[#4A3F3D] leading-relaxed">
        如果你是在浏览器中使用本工具，且为 <strong>Android 11</strong> 及以上版本，请先将存档移动到浏览器可访问的目录（例如：<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">Download</code> 文件夹）。如果你找不到存档位置，可以访问：<button type="button" class="font-bold text-[#739CBF] hover:underline cursor-pointer" @click="openGuide">存档寻找向导</button>。
      </div>

      <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3 text-left text-xs text-[#8E807C] flex flex-col gap-1">
        <div class="font-bold text-[#4A3F3D] flex items-center gap-1.5">
          <GuideIcon :item-id="149" :size="14" :standalone="standalone">
            <MapPin class="w-3.5 h-3.5 text-[#739CBF]" />
          </GuideIcon>
          <span>系统默认存档路径：</span>
        </div>
        <p>• <strong>Windows：</strong>文档 \ My Games \ Terraria \ Worlds</p>
        <p>• <strong>Android：</strong>Android/data/com.and.games505.TerrariaPaid/Worlds</p>
        <p>• <strong>iOS / iPad：</strong>文件 App \ 我的 iPhone/iPad \ Terraria \ Worlds</p>
      </div>
    </div>
  </div>

  <!-- 已载入地图 -->
  <div v-else class="max-w-3xl w-full mx-auto flex flex-col gap-3">
    <!-- 二级导航栏 -->
    <nav class="bg-white border border-[#EADFD9] rounded-xl p-1.5 flex items-center justify-between gap-1.5 shadow-2xs">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-default select-none border bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs"
        >
          <GuideIcon :item-id="893" :size="18" :standalone="standalone">
            <Globe class="w-4 h-4 text-[#739CBF]" />
          </GuideIcon>
          <span>基础信息</span>
        </button>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          type="button"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A3F3D] hover:bg-[#EFE7E2]/70 transition-colors cursor-pointer"
          @click="triggerUpload"
        >
          <FolderUp class="w-3.5 h-3.5 text-[#739CBF]" />
          <span>更换地图</span>
        </button>
        <button
          type="button"
          class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-[#8E807C] hover:text-[#4A3F3D] hover:bg-[#EFE7E2]/70 transition-colors cursor-pointer"
          @click="closeWldFile"
        >
          <X class="w-3.5 h-3.5" />
          <span>关闭</span>
        </button>
      </div>
    </nav>

    <!-- 主内容卡片 -->
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardHeader class="p-3 pb-2">
        <div class="flex items-center justify-between gap-2">
          <CardTitle class="text-xs font-bold text-[#4A3F3D] flex items-center gap-1.5">
            <GuideIcon :item-id="893" :size="14" :standalone="standalone">
              <Globe class="w-3.5 h-3.5 text-[#739CBF]" />
            </GuideIcon>
            <span>基础信息</span>
          </CardTitle>
          <span class="text-[11px] font-mono text-[#8E807C] truncate">
            {{ header.fileName }} · {{ formatFileSize(header.fileSize) }}
          </span>
        </div>
      </CardHeader>

      <CardContent class="p-3 pt-0 flex flex-col gap-3">
        <!-- 分组 1：世界名称、难度与尺寸/种子 -->
        <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 flex flex-col gap-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-[#4A3F3D]">世界名称</label>
              <div class="h-8 px-2.5 rounded-lg border border-[#EADFD9] bg-white text-xs font-semibold text-[#4A3F3D] flex items-center truncate">
                <span class="truncate">{{ header.worldName || header.fileName }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-[#4A3F3D]">世界难度</label>
              <div class="grid grid-cols-4 gap-1.5">
                <div
                  v-for="mode in gameModeOptions"
                  :key="mode.val"
                  :class="[
                    'py-1.5 rounded-lg text-xs border text-center select-none',
                    header.gameMode === mode.val
                      ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                      : 'bg-white text-[#8E807C] font-semibold border-[#EADFD9]',
                  ]"
                >
                  {{ mode.label }}
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-[#4A3F3D]">地图尺寸</label>
              <div class="h-8 px-2.5 rounded-lg border border-[#EADFD9] bg-white text-xs flex items-center justify-between gap-1.5">
                <span class="font-semibold text-[#4A3F3D]">{{ header.sizeLabel || '-' }}</span>
                <span v-if="header.maxTilesX && header.maxTilesY" class="font-mono text-[11px] text-[#8E807C]">
                  {{ header.maxTilesX }}×{{ header.maxTilesY }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-[#4A3F3D]">世界 ID</label>
              <div class="h-8 px-2.5 rounded-lg border border-[#EADFD9] bg-white text-xs font-mono text-[#4A3F3D] flex items-center truncate">
                {{ header.worldId ?? '-' }}
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-[#4A3F3D]">世界种子</label>
              <button
                v-if="header.seed"
                type="button"
                class="h-8 px-2.5 rounded-lg border border-[#EADFD9] bg-white hover:bg-[#EFE7E2]/50 text-xs font-mono text-[#4A3F3D] flex items-center justify-between gap-1.5 cursor-pointer transition-colors text-left"
                title="点击复制种子"
                @click="copySeed(header.seed!)"
              >
                <span class="truncate">{{ header.seed }}</span>
                <Copy class="w-3 h-3 shrink-0 text-[#8E807C]" />
              </button>
              <div
                v-else
                class="h-8 px-2.5 rounded-lg border border-[#EADFD9] bg-white text-xs font-mono text-[#8E807C] flex items-center"
              >
                -
              </div>
            </div>
          </div>
        </div>

        <!-- 分组 2：存档版本与服务器签名 -->
        <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[#4A3F3D] flex items-center gap-1.5">
              <GuideIcon :item-id="5011" :size="14" :standalone="standalone">
                <Globe class="w-3.5 h-3.5 text-[#739CBF]" />
              </GuideIcon>
              <span>存档版本与服务器签名</span>
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 sm:gap-2">
            <button
              v-for="ed in SUPPORTED_EDITIONS"
              :key="ed.id"
              type="button"
              :class="[
                'p-2 rounded-lg text-xs border transition-all cursor-pointer text-left flex flex-col gap-0.5',
                store.worldTargetEdition === ed.id
                  ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
                  : 'bg-white text-[#4A3F3D] font-semibold border-[#EADFD9] hover:bg-[#EFE7E2]',
              ]"
              @click="setWorldTargetEdition(ed.id)"
            >
              <span class="font-bold truncate text-xs">{{ ed.label }}</span>
              <span class="text-[11px] opacity-80 truncate">{{ ed.desc }}</span>
            </button>
          </div>

          <div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-[#EADFD9] text-xs">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-xs font-bold text-[#8E807C]">当前协议版本:</span>
              <span class="px-2 py-0.5 font-mono font-bold text-xs rounded-lg border border-[#EADFD9] bg-[#FFF7F2] text-[#4A3F3D]">
                {{ header.version }}
              </span>
            </div>
            <span class="font-bold text-[#2F658D] truncate text-xs">
              {{ versionInfo ? versionInfo.label : `v${header.version}` }}
            </span>
          </div>
        </div>

        <!-- 独立向导单页模式下无全局顶栏导出按钮，在此保留导出入口 -->
        <div v-if="standalone" class="flex justify-end">
          <Button
            variant="default"
            size="sm"
            class="h-8 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white shadow-sm px-3 gap-1.5"
            @click="exportWldFile"
          >
            <Download class="w-3.5 h-3.5" />
            <span>导出 .wld</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
