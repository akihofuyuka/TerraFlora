<script setup lang="ts">
import { ref } from 'vue';
import {
  ArrowUpDown,
  Check,
  Download,
  FileText,
  Flag,
  Globe,
  HelpCircle,
  Package,
  Upload,
  X,
  Zap,
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showToast } from '@/store';
import { buildZipBlob } from '@/core/zip';
import GuideIcon from './GuideIcon.vue';

defineProps<{
  standalone?: boolean;
}>();

type ConvertMode = 'auto' | 'china' | 'global';
type SigType = 'china' | 'global' | 'unknown';

interface MapFileEntry {
  id: string;
  file: File;
  header: Uint8Array;
  sigType: SigType;
  offset: number;
  targetType: SigType;
  outName: string;
  hexOpen: boolean;
}

interface HexCell {
  hex: string;
  highlight: boolean;
}

interface HexRow {
  offset: string;
  bytes: HexCell[];
  ascii: { ch: string; highlight: boolean }[];
}

const SIG_GLOBAL_BYTES = new Uint8Array([0x72, 0x65, 0x6c, 0x6f, 0x67, 0x69, 0x63]); // relogic
const SIG_CHINA_BYTES = new Uint8Array([0x78, 0x69, 0x6e, 0x64, 0x6f, 0x6e, 0x67]); // xindong
const HEADER_SCAN_LEN = 64;

const currentMode = ref<ConvertMode>('auto');
const fileList = ref<MapFileEntry[]>([]);
const isDragging = ref(false);
const isZipping = ref(false);
const faqOpen = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function indexOfSequence(source: Uint8Array, target: Uint8Array): number {
  outer: for (let i = 0; i <= source.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (source[i + j] !== target[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function detectSignature(header: Uint8Array): { sigType: SigType; offset: number } {
  const glIdx = indexOfSequence(header, SIG_GLOBAL_BYTES);
  const chIdx = indexOfSequence(header, SIG_CHINA_BYTES);
  if (glIdx < 0 && chIdx < 0) return { sigType: 'unknown', offset: -1 };
  if (glIdx < 0) return { sigType: 'china', offset: chIdx };
  if (chIdx < 0) return { sigType: 'global', offset: glIdx };
  return glIdx < chIdx
    ? { sigType: 'global', offset: glIdx }
    : { sigType: 'china', offset: chIdx };
}

function calcTargetAndName(fileName: string, sigType: SigType, mode: ConvertMode): { targetType: SigType; outName: string } {
  let targetType: SigType = 'unknown';
  if (mode === 'china') {
    targetType = 'china';
  } else if (mode === 'global') {
    targetType = 'global';
  } else {
    if (sigType === 'china') targetType = 'global';
    else if (sigType === 'global') targetType = 'china';
  }

  let base = fileName;
  let ext = '';
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx !== -1) {
    base = fileName.substring(0, dotIdx);
    ext = fileName.substring(dotIdx);
  }

  const suffixCn = '_国服';
  const suffixGl = '_国际服';
  if (base.endsWith(suffixCn)) base = base.substring(0, base.length - suffixCn.length);
  else if (base.endsWith(suffixGl)) base = base.substring(0, base.length - suffixGl.length);

  let newSuffix = '';
  if (targetType === 'china') newSuffix = suffixCn;
  else if (targetType === 'global') newSuffix = suffixGl;

  return { targetType, outName: `${base}${newSuffix}${ext}` };
}

function setMode(mode: ConvertMode) {
  currentMode.value = mode;
  for (const item of fileList.value) {
    const { targetType, outName } = calcTargetAndName(item.file.name, item.sigType, mode);
    item.targetType = targetType;
    item.outName = outName;
  }
  const label = mode === 'auto' ? '自动互转' : mode === 'china' ? '强制转为国服' : '强制转为国际服';
  showToast(`已切换为: ${label}`);
}

function triggerBrowse() {
  fileInputRef.value?.click();
}

async function handleFiles(files: FileList | null) {
  if (!files || files.length === 0) return;
  let addedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const buffer = await file.slice(0, HEADER_SCAN_LEN).arrayBuffer();
    const header = new Uint8Array(buffer);
    const { sigType, offset } = detectSignature(header);
    const { targetType, outName } = calcTargetAndName(file.name, sigType, currentMode.value);

    fileList.value.push({
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      header,
      sigType,
      offset,
      targetType,
      outName,
      hexOpen: false,
    });
    addedCount++;
  }

  if (fileInputRef.value) fileInputRef.value.value = '';
  showToast(`已导入 ${addedCount} 个地图文件`);
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  handleFiles(input.files);
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files?.length) {
    handleFiles(e.dataTransfer.files);
  }
}

function createConvertedBlob(item: MapFileEntry): Blob {
  if (item.offset < 0 || item.targetType === 'unknown') {
    return item.file;
  }
  const replacementBytes = item.targetType === 'china' ? SIG_CHINA_BYTES : SIG_GLOBAL_BYTES;
  return new Blob(
    [item.file.slice(0, item.offset), replacementBytes, item.file.slice(item.offset + 7)],
    { type: 'application/octet-stream' }
  );
}

async function createConvertedBytes(item: MapFileEntry): Promise<Uint8Array> {
  const blob = createConvertedBlob(item);
  return new Uint8Array(await blob.arrayBuffer());
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadItem(item: MapFileEntry) {
  const blob = createConvertedBlob(item);
  triggerBlobDownload(blob, item.outName);
  showToast(`已生成下载: ${item.outName}`);
}

function downloadAll() {
  if (fileList.value.length === 0) return;
  fileList.value.forEach((item, index) => {
    setTimeout(() => downloadItem(item), index * 300);
  });
}

async function downloadZip() {
  if (fileList.value.length === 0 || isZipping.value) return;
  isZipping.value = true;
  try {
    const entries = await Promise.all(
      fileList.value.map(async (item) => ({
        name: item.outName,
        data: await createConvertedBytes(item),
      }))
    );
    const zipBlob = buildZipBlob(entries);
    triggerBlobDownload(zipBlob, `Terraria_Maps_${Date.now()}.zip`);
    showToast('ZIP 打包完成并开始下载！');
  } catch (err: any) {
    console.error(err);
    showToast(`打包失败: ${err?.message || '未知错误'}`);
  } finally {
    isZipping.value = false;
  }
}

function deleteItem(id: string) {
  fileList.value = fileList.value.filter((f) => f.id !== id);
}

function clearList() {
  fileList.value = [];
  showToast('已清空列表');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getHexRows(data: Uint8Array, highlightOffset: number): HexRow[] {
  const rows: HexRow[] = [];
  for (let i = 0; i < data.length; i += 16) {
    const bytes: HexCell[] = [];
    const ascii: { ch: string; highlight: boolean }[] = [];
    for (let j = 0; j < 16; j++) {
      const idx = i + j;
      if (idx < data.length) {
        const b = data[idx];
        const highlight = highlightOffset >= 0 && idx >= highlightOffset && idx < highlightOffset + 7;
        bytes.push({ hex: b.toString(16).padStart(2, '0').toUpperCase(), highlight });
        ascii.push({ ch: b >= 32 && b <= 126 ? String.fromCharCode(b) : '.', highlight });
      } else {
        bytes.push({ hex: '  ', highlight: false });
      }
    }
    rows.push({
      offset: i.toString(16).padStart(4, '0').toUpperCase(),
      bytes,
      ascii,
    });
  }
  return rows;
}
</script>

<template>
  <div class="flex flex-col gap-3.5 select-none">
    <!-- 第 1 步：选择转换方向 -->
    <Card class="bg-white border-[#EADFD9]">
      <CardContent class="p-5">
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF]">
            第 1 步 · 选择转换方向
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
            @click="faqOpen = true"
          >
            <HelpCircle class="w-3 h-3" />
            <span>原理说明</span>
          </button>
        </div>
        <h2 class="text-base font-bold text-[#4A3F3D] mb-1">设定目标标识类型</h2>
        <p class="text-xs text-[#8E807C] mb-3.5">自动检测原地图签名并对调，也可固定转换为指定版本</p>

        <div class="flex flex-col gap-2">
          <!-- 自动互转 -->
          <button
            type="button"
            :class="[
              'w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer',
              currentMode === 'auto'
                ? 'bg-[#EEF4F9] border-[#C4D6E5]'
                : 'bg-[#FFF7F2] border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3]',
            ]"
            @click="setMode('auto')"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#739CBF] shrink-0">
                <GuideIcon :item-id="2997" :size="20" :standalone="standalone">
                  <ArrowUpDown class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-sm font-bold text-[#4A3F3D] flex items-center gap-1.5">
                  <span>自动互转</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#eef5f1] text-[#3f6d57] border border-[#cfe0d6]">推荐</span>
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">国服地图转国际服，国际服地图转国服</div>
              </div>
            </div>
            <div
              :class="[
                'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                currentMode === 'auto'
                  ? 'border-[#739CBF] bg-[#739CBF] text-white'
                  : 'border-[#EADFD9] bg-white text-transparent',
              ]"
            >
              <Check class="w-3 h-3" :stroke-width="3" />
            </div>
          </button>

          <!-- 转为国服 -->
          <button
            type="button"
            :class="[
              'w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer',
              currentMode === 'china'
                ? 'bg-[#EEF4F9] border-[#C4D6E5]'
                : 'bg-[#FFF7F2] border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3]',
            ]"
            @click="setMode('china')"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#739CBF] shrink-0">
                <GuideIcon :item-id="58" :size="20" :standalone="standalone">
                  <FileText class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-sm font-bold text-[#4A3F3D]">转为国服地图 (心动版)</div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  文件头统一写入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">xindong</code> 签名
                </div>
              </div>
            </div>
            <div
              :class="[
                'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                currentMode === 'china'
                  ? 'border-[#739CBF] bg-[#739CBF] text-white'
                  : 'border-[#EADFD9] bg-white text-transparent',
              ]"
            >
              <Check class="w-3 h-3" :stroke-width="3" />
            </div>
          </button>

          <!-- 转为国际服 -->
          <button
            type="button"
            :class="[
              'w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer',
              currentMode === 'global'
                ? 'bg-[#EEF4F9] border-[#C4D6E5]'
                : 'bg-[#FFF7F2] border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3]',
            ]"
            @click="setMode('global')"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#739CBF] shrink-0">
                <GuideIcon :item-id="393" :size="20" :standalone="standalone">
                  <Globe class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-sm font-bold text-[#4A3F3D]">转为国际服地图 (Steam / 移动国际版)</div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  文件头统一写入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px]">relogic</code> 签名
                </div>
              </div>
            </div>
            <div
              :class="[
                'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                currentMode === 'global'
                  ? 'border-[#739CBF] bg-[#739CBF] text-white'
                  : 'border-[#EADFD9] bg-white text-transparent',
              ]"
            >
              <Check class="w-3 h-3" :stroke-width="3" />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- 第 2 步：导入地图文件 -->
    <Card class="bg-white border-[#EADFD9]">
      <CardContent class="p-5">
        <div class="mb-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF]">
            第 2 步 · 导入地图文件
          </span>
        </div>
        <h2 class="text-base font-bold text-[#4A3F3D] mb-1">选择或拖入地图 (.wld)</h2>
        <p class="text-xs text-[#8E807C] mb-3.5">
          支持多选及批量处理，通常位于游戏的 <code class="px-1 py-0.5 bg-[#FFF7F2] rounded border border-[#EADFD9] font-mono text-[11px]">Worlds</code> 目录下
        </p>

        <div
          :class="[
            'border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
            isDragging
              ? 'border-[#739CBF] bg-[#EEF4F9]'
              : 'border-[#739CBF]/60 bg-[#FFF7F2] hover:bg-[#F9D6DB]/40',
          ]"
          @click="triggerBrowse"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <div class="w-11 h-11 rounded-xl bg-[#EEF4F9] text-[#739CBF] flex items-center justify-center">
            <GuideIcon :item-id="893" :size="24" :standalone="standalone">
              <Upload class="w-5 h-5" />
            </GuideIcon>
          </div>
          <div class="text-sm font-bold text-[#4A3F3D]">拖拽地图文件到这里</div>
          <div class="text-xs text-[#8E807C]">或点击下方按钮选择本地文件（支持批量）</div>
          <Button
            type="button"
            size="sm"
            class="mt-1 bg-[#739CBF] hover:bg-[#5F87A8] text-white text-xs font-semibold"
            @click.stop="triggerBrowse"
          >
            选择 .wld 地图文件
          </Button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".wld, application/octet-stream, application/*"
            multiple
            class="hidden"
            @change="onFileChange"
          />
        </div>
      </CardContent>
    </Card>

    <!-- 待处理地图列表 -->
    <Card v-if="fileList.length > 0" class="bg-white border-[#EADFD9]">
      <CardContent class="p-5">
        <div class="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div class="flex items-center gap-1.5">
            <h3 class="text-[15px] font-bold text-[#4A3F3D]">待处理地图</h3>
            <span class="text-xs text-[#8E807C]">({{ fileList.length }})</span>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <Button
              size="xs"
              class="bg-[#739CBF] hover:bg-[#5F87A8] text-white text-[11.5px] font-semibold gap-1"
              @click="downloadAll"
            >
              <Zap class="w-3 h-3" />
              <span>全部转换下载</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              class="bg-[#FFF7F2] border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 text-[11.5px] font-semibold gap-1"
              :disabled="isZipping"
              @click="downloadZip"
            >
              <Package class="w-3 h-3" />
              <span>{{ isZipping ? '打包中...' : 'ZIP 打包' }}</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              class="bg-[#FFF7F2] border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 text-[11.5px] font-semibold"
              @click="clearList"
            >
              清空
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <div
            v-for="item in fileList"
            :key="item.id"
            class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[13.5px] font-bold text-[#4A3F3D] break-all select-text">{{ item.file.name }}</div>
                <div class="flex items-center gap-1.5 flex-wrap text-[11.5px] text-[#8E807C] mt-1">
                  <span>{{ formatBytes(item.file.size) }}</span>
                  <span>·</span>
                  <span>当前:</span>
                  <span
                    v-if="item.sigType === 'china'"
                    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#faf0f1] border border-[#ecd2d5] text-[#9a4f56]"
                  >
                    国服 (xindong)
                  </span>
                  <span
                    v-else-if="item.sigType === 'global'"
                    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF]"
                  >
                    国际服 (relogic)
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fbf6ec] border border-[#ecdcbd] text-[#8a6526]"
                  >
                    未检测到签名
                  </span>
                  <span v-if="item.offset >= 0">
                    · 偏移 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[10.5px]">0x{{ item.offset.toString(16).toUpperCase() }}</code>
                  </span>
                </div>
              </div>

              <button
                type="button"
                class="p-1.5 rounded-md bg-white border border-[#EADFD9] text-[#8E807C] hover:text-[#9a4f56] hover:bg-[#faf0f1] transition-colors cursor-pointer shrink-0"
                title="移除"
                @click="deleteItem(item.id)"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#EADFD9]">
              <div class="flex items-center gap-1.5 flex-wrap text-[11.5px] text-[#8E807C]">
                <span>转为:</span>
                <span
                  v-if="item.targetType === 'china'"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#faf0f1] border border-[#ecd2d5] text-[#9a4f56]"
                >
                  <Flag class="w-2.5 h-2.5" />
                  <span>国服</span>
                </span>
                <span
                  v-else-if="item.targetType === 'global'"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF]"
                >
                  <Globe class="w-2.5 h-2.5" />
                  <span>国际服</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#fbf6ec] border border-[#ecdcbd] text-[#8a6526]"
                >
                  原样保留
                </span>
                <code class="px-1.5 py-0.5 bg-white rounded border border-[#EADFD9] font-mono text-[11px] text-[#4A3F3D] select-text">
                  {{ item.outName }}
                </code>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold bg-white border border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
                  @click="item.hexOpen = !item.hexOpen"
                >
                  <span>{{ item.hexOpen ? '收起头' : '查看头' }}</span>
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] hover:bg-[#dce9f5] transition-colors cursor-pointer"
                  @click="downloadItem(item)"
                >
                  <Download class="w-3 h-3" />
                  <span>下载</span>
                </button>
              </div>
            </div>

            <!-- 十六进制文件头查看 -->
            <pre
              v-if="item.hexOpen"
              class="bg-[#4A3F3D] text-[#FFF7F2] rounded-lg p-2.5 font-mono text-[11px] leading-snug overflow-x-auto select-text"
            ><div v-for="row in getHexRows(item.header, item.offset)" :key="row.offset">{{ row.offset }}  <template v-for="(cell, idx) in row.bytes" :key="idx"><span v-if="cell.highlight" class="bg-[#F9D6DB] text-[#4A3F3D] font-bold px-0.5 rounded-sm">{{ cell.hex }}</span><template v-else>{{ cell.hex }}</template>{{ idx < row.bytes.length - 1 ? ' ' : '' }}</template>  |<template v-for="(ac, idx) in row.ascii" :key="idx"><span v-if="ac.highlight" class="bg-[#F9D6DB] text-[#4A3F3D] font-bold px-0.5 rounded-sm">{{ ac.ch }}</span><template v-else>{{ ac.ch }}</template></template>|</div></pre>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 原理说明与常见问题弹窗 -->
    <Teleport to="body">
      <div
        v-if="faqOpen"
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
        @click.self="faqOpen = false"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl border border-[#EADFD9] shadow-2xl max-w-lg w-full max-h-[84vh] flex flex-col overflow-hidden text-[#4A3F3D]">
          <div class="px-4 py-3.5 border-b border-[#EADFD9] flex items-center justify-between">
            <span class="font-bold text-sm text-[#4A3F3D]">核心原理与常见问题</span>
            <button
              type="button"
              class="p-1 text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
              aria-label="关闭"
              @click="faqOpen = false"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-4 overflow-y-auto flex flex-col gap-3 text-xs text-[#5E504D] leading-relaxed">
            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#4A3F3D] mb-1">1. 什么是地图签名？为什么要转换？</div>
              泰拉瑞亚官方国际服与心动代理的国服，在地图文件（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code>）前 64 字节中使用不同的标识字符串标记发行版本。<br />
              • <strong class="text-[#739CBF]">国际服 (Steam/GOG/移动版)</strong> 标识为：<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">relogic</code><br />
              • <strong class="text-[#9a4f56]">国服 (心动代理版)</strong> 标识为：<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">xindong</code><br />
              如果签名不匹配，游戏在载入地图时会提示“无法加载地图”或在选图列表中不显示。
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#4A3F3D] mb-1">2. 转换会损坏地图里的建筑、箱子或 NPC 吗？</div>
              转换本身仅替换文件头 7 字节签名，不破坏地图原有结构。但请特别注意：<br />
              • 如果从<strong class="text-[#9a4f56]">国服转换到国际服</strong>，进入游戏后会丢失国服专属的数据；<br />
              • 当<strong class="text-[#8a6526]">版本不一致</strong>时，转换成低版本会丢失属于高版本的物品。
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#4A3F3D] mb-1">3. 为什么转换速度这么快？</div>
              由于采用了浏览器底层的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">File.slice()</code> 技术，它只是在操作系统层面创建虚拟数据引用指针，在保存瞬间才拼合输出，因此无需把几百兆的数据解压或载入内存，即使在手机浏览器上也是毫秒级完成。
            </div>
          </div>

          <div class="px-4 py-3 border-t border-[#EADFD9]">
            <Button
              class="w-full h-9 bg-[#739CBF] hover:bg-[#5F87A8] text-white text-xs font-semibold"
              @click="faqOpen = false"
            >
              我知道了
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
