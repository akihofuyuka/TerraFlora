<script setup lang="ts">
import {
  computed,
  markRaw,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import {
  Eye,
  EyeOff,
  Grid2x2Check,
  ImagePlus,
  Move,
  Pipette,
  RotateCcw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { showToast } from '@/store';
import { getItemSpriteStyle } from '@/utils/sprite';
import {
  DEFAULT_TOP_N,
  MaterialsRepository,
  PixelArtMatcher,
  TILE_SIZE,
  batchConvertRgba,
  buildBatchPreviewCanvas,
  buildImagePlan,
  clampViewport,
  dominantHexFromRgba,
  fitViewport,
  letterbox,
  loadSampledImageCanvas,
  parseHexColor,
  sourceRectOf,
  transformViewport,
  type BatchConvertResult,
  type CellPick,
  type ImagePlan,
  type MatchCandidate,
  type MatchOptions,
  type RawMaterialsDatabase,
  type ScaleMode,
  type Viewport,
} from '@/core/pixelArt';
import PixelArtResultPanel from './PixelArtResultPanel.vue';
import PixelArtScaleModal from './PixelArtScaleModal.vue';
import PixelArtResultModal from './PixelArtResultModal.vue';
import PixelArtBatchPanel from './PixelArtBatchPanel.vue';

type InputMode = 'color' | 'image';
type PanelTool = 'move' | 'pick';

const RECENT_COLORS_KEY = 'terraflora_pixelart_recent_colors';
const EXCLUDED_MATERIALS_KEY = 'terraflora_pixelart_excluded_materials';

/* ==================== 材料库加载 ==================== */
const repository = shallowRef<MaterialsRepository | null>(null);
const matcher = computed(() =>
  repository.value ? markRaw(new PixelArtMatcher(repository.value)) : null
);
const dataLoading = ref(true);
const dataError = ref<string | null>(null);

async function loadMaterials() {
  dataLoading.value = true;
  dataError.value = null;
  try {
    const base = import.meta.env.BASE_URL || './';
    const prefix = base.endsWith('/') ? base : `${base}/`;
    const res = await fetch(`${prefix}data/materials.json`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const raw = (await res.json()) as RawMaterialsDatabase;
    repository.value = markRaw(MaterialsRepository.fromRaw(raw));
  } catch (err: any) {
    dataError.value = err?.message || '材料库加载失败';
  } finally {
    dataLoading.value = false;
  }
}

function loadSavedExcluded(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDED_MATERIALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSavedRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

/* ==================== 模式与共享筛选选项 ==================== */
const mode = ref<InputMode>('color');
const matchOptions = ref<MatchOptions>({
  filter: 'all',
  includePaint: true,
  algorithm: 'lab',
  topN: DEFAULT_TOP_N,
  includeFalling: false,
  includeSolidTop: false,
  includeUnsafeWalls: false,
  includeSpecial: false,
  excludedMaterialKeys: loadSavedExcluded(),
});

watch(
  () => matchOptions.value.excludedMaterialKeys,
  (val) => {
    try {
      const arr = val instanceof Set ? Array.from(val) : (val ?? []);
      localStorage.setItem(EXCLUDED_MATERIALS_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  },
  { deep: true }
);

/* ==================== 色号输入模式 ==================== */
const colorInput = ref('#4A90E2');
const matchedHex = ref('4A90E2');
const colorError = ref<string | null>(null);
const recentColors = ref<string[]>(loadSavedRecentColors());

const colorPresets = [
  '4A90E2',
  'E598A3',
  '739CBF',
  'F59E0B',
  '10B981',
  '8B5CF6',
  'EF4444',
  'FFFFFF',
  '1F2937',
];

function recordRecentColor(hex: string) {
  const next = [hex, ...recentColors.value.filter((c) => c !== hex)].slice(0, 10);
  recentColors.value = next;
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const pickerColorValue = computed(() => {
  const valid = parseHexColor(colorInput.value) ?? matchedHex.value;
  return `#${valid}`;
});

function onColorInputChange(val: string | number) {
  const text = String(val);
  colorInput.value = text;
  colorError.value = null;
  const parsed = parseHexColor(text);
  if (parsed) {
    matchedHex.value = parsed;
  }
}

function onNativeColorPick(e: Event) {
  const val = (e.target as HTMLInputElement).value.toUpperCase();
  colorInput.value = val;
  colorError.value = null;
  const parsed = parseHexColor(val);
  if (parsed) {
    matchedHex.value = parsed;
    recordRecentColor(parsed);
  }
}

function applyColorMatch() {
  const parsed = parseHexColor(colorInput.value);
  if (!parsed) {
    colorError.value = '请输入 6 位十六进制色号，例如 #4A90E2';
    return;
  }
  colorError.value = null;
  colorInput.value = `#${parsed}`;
  matchedHex.value = parsed;
  recordRecentColor(parsed);
}

function selectPreset(hex: string) {
  colorInput.value = `#${hex}`;
  colorError.value = null;
  matchedHex.value = hex;
  recordRecentColor(hex);
}

/* ==================== 图片取色 & 全图批量转换 ==================== */
const imageFileInputRef = ref<HTMLInputElement | null>(null);
const sourceCanvas = shallowRef<HTMLCanvasElement | null>(null);
const plan = shallowRef<ImagePlan | null>(null);
const imageLoading = ref(false);
const imageError = ref<string | null>(null);
const isDragOver = ref(false);

const scaleModalOpen = ref(false);
const panelTool = ref<PanelTool>('move');
const showOverview = ref(true);
const viewport = ref<Viewport | null>(null);
const picked = ref<CellPick | null>(null);
const resultModalOpen = ref(false);
const hoverCell = ref<{ col: number; row: number } | null>(null);

// 全图批量转换状态
const batchMode = ref(false);
const batchDithering = ref(false);
const batchSkipTransparent = ref(true);
const previewLayer = ref<'converted' | 'original'>('converted');

const batchResult = computed<BatchConvertResult | null>(() => {
  if (!batchMode.value || !repository.value || !plan.value) return null;
  return markRaw(
    batchConvertRgba(
      repository.value,
      plan.value.imageData.data,
      plan.value.columns,
      plan.value.rows,
      matchOptions.value,
      {
        dithering: batchDithering.value,
        skipTransparent: batchSkipTransparent.value,
      }
    )
  );
});

const batchPreviewCanvas = computed<HTMLCanvasElement | null>(() => {
  if (!batchResult.value) return null;
  return markRaw(buildBatchPreviewCanvas(batchResult.value));
});

const activeDisplayCanvas = computed<HTMLCanvasElement | null>(() => {
  if (!plan.value) return null;
  if (batchMode.value && previewLayer.value === 'converted' && batchPreviewCanvas.value) {
    return batchPreviewCanvas.value;
  }
  return plan.value.canvas;
});

function samplePlanCell(curPlan: ImagePlan, col: number, row: number) {
  const rect = sourceRectOf(
    curPlan.canvas.width,
    curPlan.canvas.height,
    curPlan.targetWidth,
    curPlan.targetHeight,
    col,
    row
  );
  return dominantHexFromRgba(curPlan.imageData.data, curPlan.canvas.width, rect);
}

const hoverPreview = computed<{
  col: number;
  row: number;
  hex: string;
  transparent: boolean;
  topMatch: MatchCandidate | null;
} | null>(() => {
  if (!hoverCell.value || !plan.value || !matcher.value) return null;
  const { col, row } = hoverCell.value;
  const res = samplePlanCell(plan.value, col, row);
  let topMatch: MatchCandidate | null = null;
  if (batchResult.value) {
    topMatch = batchResult.value.cells[row * plan.value.columns + col] ?? null;
  } else if (!res.transparent) {
    const list = matcher.value.matchCandidates(res.hex, { ...matchOptions.value, topN: 1 });
    topMatch = list[0] ?? null;
  }
  return { col, row, hex: res.hex, transparent: res.transparent, topMatch };
});

const viewerWrapRef = ref<HTMLDivElement | null>(null);
const viewerCanvasRef = ref<HTMLCanvasElement | null>(null);
const overviewCanvasRef = ref<HTMLCanvasElement | null>(null);
const viewerSize = ref({ width: 0, height: 0 });
const overviewSize = ref({ width: 0, height: 0 });

let resizeObserver: ResizeObserver | null = null;

function triggerImagePicker() {
  imageFileInputRef.value?.click();
}

function onImageFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleImageFile(target.files[0]);
    target.value = '';
  }
}

function onDropImage(e: DragEvent) {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleImageFile(file);
}

function onPasteImage(e: ClipboardEvent) {
  if (mode.value !== 'image') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        handleImageFile(file);
        return;
      }
    }
  }
}

async function handleImageFile(file: Blob) {
  imageLoading.value = true;
  imageError.value = null;
  try {
    const decoded = await loadSampledImageCanvas(file);
    sourceCanvas.value = markRaw(decoded);
    picked.value = null;
    resultModalOpen.value = false;
    scaleModalOpen.value = true;
  } catch {
    imageError.value = '这张图片无法读取或格式不受支持，请换一张 PNG / JPG / WebP 试试。';
    showToast('图片读取失败');
  } finally {
    imageLoading.value = false;
  }
}

function onScaleConfirm(payload: { mode: ScaleMode; width: number; height: number }) {
  if (!sourceCanvas.value) return;
  const nextPlan = buildImagePlan(
    sourceCanvas.value,
    payload.mode,
    payload.width,
    payload.height
  );
  plan.value = markRaw(nextPlan);
  picked.value = null;
  resultModalOpen.value = false;
  panelTool.value = 'move';
  scaleModalOpen.value = false;
  nextTick(() => {
    resetViewport();
  });
}

function onScaleClose() {
  scaleModalOpen.value = false;
  if (!plan.value) {
    sourceCanvas.value = null;
  }
}

function resetViewport() {
  if (!plan.value) return;
  const { width, height } = viewerSize.value;
  if (width > 0 && height > 0) {
    viewport.value = fitViewport(plan.value.targetWidth, plan.value.targetHeight, width, height);
  }
}

function zoomBy(factor: number) {
  const curPlan = plan.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = viewerSize.value;
  if (!curPlan || !vp || boxW <= 0 || boxH <= 0) return;
  viewport.value = transformViewport(
    vp,
    curPlan.targetWidth,
    curPlan.targetHeight,
    boxW / 2,
    boxH / 2,
    0,
    0,
    factor,
    boxW,
    boxH
  );
}

/* ==================== Canvas 绘制 ==================== */
function drawViewer() {
  const canvas = viewerCanvasRef.value;
  const curPlan = plan.value;
  const dispCanvas = activeDisplayCanvas.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = viewerSize.value;
  if (!canvas || !curPlan || !dispCanvas || !vp || boxW <= 0 || boxH <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(boxW * dpr);
  const targetH = Math.round(boxH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(0, 0, boxW, boxH);

  const scale = boxW / vp.visibleW;

  // 按图格世界坐标 (columns * 16, rows * 16) 整体绘制并裁剪到 targetWidth × targetHeight，
  // 保证每一格像素与 16×16 网格线 100% 严格对齐
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    -vp.originX * scale,
    -vp.originY * scale,
    curPlan.targetWidth * scale,
    curPlan.targetHeight * scale
  );
  ctx.clip();
  ctx.imageSmoothingEnabled = dispCanvas.width / (curPlan.columns * TILE_SIZE) > scale;
  ctx.drawImage(
    dispCanvas,
    -vp.originX * scale,
    -vp.originY * scale,
    curPlan.columns * TILE_SIZE * scale,
    curPlan.rows * TILE_SIZE * scale
  );
  ctx.restore();

  const cell = TILE_SIZE * scale;
  if (cell >= 4) {
    ctx.strokeStyle = 'rgba(160, 160, 160, 0.42)';
    ctx.lineWidth = 1 / dpr;
    ctx.beginPath();
    const firstCol = Math.max(0, Math.floor(vp.originX / TILE_SIZE));
    const lastCol = Math.min(curPlan.columns, Math.ceil((vp.originX + vp.visibleW) / TILE_SIZE));
    for (let col = firstCol; col <= lastCol; col++) {
      const x = (col * TILE_SIZE - vp.originX) * scale;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, boxH);
    }
    const firstRow = Math.max(0, Math.floor(vp.originY / TILE_SIZE));
    const lastRow = Math.min(curPlan.rows, Math.ceil((vp.originY + vp.visibleH) / TILE_SIZE));
    for (let row = firstRow; row <= lastRow; row++) {
      const y = (row * TILE_SIZE - vp.originY) * scale;
      ctx.moveTo(0, y);
      ctx.lineTo(boxW, y);
    }
    ctx.stroke();
  }

  if (panelTool.value === 'pick' && hoverCell.value) {
    const hx = (hoverCell.value.col * TILE_SIZE - vp.originX) * scale;
    const hy = (hoverCell.value.row * TILE_SIZE - vp.originY) * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hx, hy, cell, cell);
  }

  if (picked.value) {
    const cellLeft = picked.value.col * TILE_SIZE;
    const cellTop = picked.value.row * TILE_SIZE;
    const x0 = Math.max(cellLeft, vp.originX);
    const x1 = Math.min(cellLeft + TILE_SIZE, vp.originX + vp.visibleW);
    const y0 = Math.max(cellTop, vp.originY);
    const y1 = Math.min(cellTop + TILE_SIZE, vp.originY + vp.visibleH);
    if (x1 > x0 && y1 > y0) {
      ctx.strokeStyle = '#FF3B30';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (x0 - vp.originX) * scale,
        (y0 - vp.originY) * scale,
        (x1 - x0) * scale,
        (y1 - y0) * scale
      );
    }
  }
}

function drawOverview() {
  const canvas = overviewCanvasRef.value;
  const curPlan = plan.value;
  const dispCanvas = activeDisplayCanvas.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = overviewSize.value;
  if (!canvas || !curPlan || !dispCanvas || !vp || boxW <= 0 || boxH <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(boxW * dpr);
  const targetH = Math.round(boxH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(0, 0, boxW, boxH);

  const box = letterbox(boxW, boxH, curPlan.targetWidth, curPlan.targetHeight);
  if (box.width <= 0 || box.height <= 0) return;

  ctx.imageSmoothingEnabled = dispCanvas.width > box.width;
  ctx.drawImage(dispCanvas, box.left, box.top, box.width, box.height);

  const sx = box.width / curPlan.targetWidth;
  const sy = box.height / curPlan.targetHeight;
  const vx0 = Math.max(0, vp.originX);
  const vx1 = Math.min(curPlan.targetWidth, vp.originX + vp.visibleW);
  const vy0 = Math.max(0, vp.originY);
  const vy1 = Math.min(curPlan.targetHeight, vp.originY + vp.visibleH);
  if (vx1 > vx0 && vy1 > vy0) {
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      box.left + vx0 * sx,
      box.top + vy0 * sy,
      (vx1 - vx0) * sx,
      (vy1 - vy0) * sy
    );
  }
}

watch(
  [plan, activeDisplayCanvas, viewport, viewerSize, panelTool, picked, hoverCell],
  () => drawViewer(),
  { deep: true }
);
watch([plan, activeDisplayCanvas, viewport, overviewSize, showOverview], () => drawOverview(), {
  deep: true,
});

/* ==================== 指针交互 ==================== */
const activePointers = new Map<number, { x: number; y: number }>();
let tapStartPos: { x: number; y: number; pointerId: number } | null = null;
let lastPanMid: { x: number; y: number } | null = null;
let lastPinchDist = 0;

function pointerLocalPos(e: PointerEvent, el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getTwoPointerStats() {
  const pts = Array.from(activePointers.values());
  const a = pts[0];
  const b = pts[1];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return { mid, dist };
}

function pickAtCanvasPoint(localX: number, localY: number) {
  const curPlan = plan.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = viewerSize.value;
  if (!curPlan || !vp || boxW <= 0 || boxH <= 0) return;

  const canvasX = vp.originX + (localX / boxW) * vp.visibleW;
  const canvasY = vp.originY + (localY / boxH) * vp.visibleH;
  const col = Math.max(0, Math.min(curPlan.columns - 1, Math.floor(canvasX / TILE_SIZE)));
  const row = Math.max(0, Math.min(curPlan.rows - 1, Math.floor(canvasY / TILE_SIZE)));
  const res = samplePlanCell(curPlan, col, row);
  picked.value = { col, row, hex: res.hex, transparent: res.transparent };
  resultModalOpen.value = true;
}

function onViewerPointerDown(e: PointerEvent) {
  const el = viewerCanvasRef.value;
  if (!el) return;
  el.setPointerCapture(e.pointerId);
  const pos = pointerLocalPos(e, el);
  activePointers.set(e.pointerId, pos);

  if (activePointers.size === 1) {
    tapStartPos = { x: pos.x, y: pos.y, pointerId: e.pointerId };
    lastPanMid = pos;
    lastPinchDist = 0;
  } else if (activePointers.size === 2) {
    tapStartPos = null;
    const stats = getTwoPointerStats();
    lastPanMid = stats.mid;
    lastPinchDist = stats.dist;
  }
}

function onViewerPointerMove(e: PointerEvent) {
  const el = viewerCanvasRef.value;
  const curPlan = plan.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = viewerSize.value;
  if (!el || !curPlan || !vp || boxW <= 0 || boxH <= 0) return;

  const pos = pointerLocalPos(e, el);

  if (activePointers.size === 0) {
    const canvasX = vp.originX + (pos.x / boxW) * vp.visibleW;
    const canvasY = vp.originY + (pos.y / boxH) * vp.visibleH;
    if (
      canvasX >= 0 &&
      canvasX < curPlan.targetWidth &&
      canvasY >= 0 &&
      canvasY < curPlan.targetHeight
    ) {
      hoverCell.value = {
        col: Math.max(0, Math.min(curPlan.columns - 1, Math.floor(canvasX / TILE_SIZE))),
        row: Math.max(0, Math.min(curPlan.rows - 1, Math.floor(canvasY / TILE_SIZE))),
      };
    } else {
      hoverCell.value = null;
    }
  }

  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, pos);

  if (activePointers.size >= 2) {
    const { mid, dist } = getTwoPointerStats();
    const panX = lastPanMid ? mid.x - lastPanMid.x : 0;
    const panY = lastPanMid ? mid.y - lastPanMid.y : 0;
    const zoom = lastPinchDist > 4 && dist > 4 ? dist / lastPinchDist : 1;
    viewport.value = transformViewport(
      vp,
      curPlan.targetWidth,
      curPlan.targetHeight,
      mid.x,
      mid.y,
      panX,
      panY,
      zoom,
      boxW,
      boxH
    );
    lastPanMid = mid;
    lastPinchDist = dist;
    return;
  }

  const allowDragPan = panelTool.value === 'move' || e.buttons === 4 || e.buttons === 2;
  if (allowDragPan && lastPanMid) {
    const panX = pos.x - lastPanMid.x;
    const panY = pos.y - lastPanMid.y;
    viewport.value = transformViewport(
      vp,
      curPlan.targetWidth,
      curPlan.targetHeight,
      pos.x,
      pos.y,
      panX,
      panY,
      1,
      boxW,
      boxH
    );
    lastPanMid = pos;
  }
}

function onViewerPointerUp(e: PointerEvent) {
  const el = viewerCanvasRef.value;
  if (el && el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  const pos = el ? pointerLocalPos(e, el) : null;

  if (
    panelTool.value === 'pick' &&
    tapStartPos &&
    tapStartPos.pointerId === e.pointerId &&
    pos &&
    e.button === 0
  ) {
    const moved = Math.hypot(pos.x - tapStartPos.x, pos.y - tapStartPos.y);
    if (moved < 6) {
      pickAtCanvasPoint(pos.x, pos.y);
    }
  }

  activePointers.delete(e.pointerId);
  if (activePointers.size === 1) {
    const remaining = Array.from(activePointers.values())[0];
    lastPanMid = remaining;
    lastPinchDist = 0;
  } else {
    lastPanMid = null;
    lastPinchDist = 0;
    tapStartPos = null;
  }
}

function onViewerPointerLeave() {
  hoverCell.value = null;
}

function onViewerWheel(e: WheelEvent) {
  const el = viewerCanvasRef.value;
  const curPlan = plan.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = viewerSize.value;
  if (!el || !curPlan || !vp || boxW <= 0 || boxH <= 0) return;

  const rect = el.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const zoom = Math.exp(-e.deltaY * 0.0015);
  viewport.value = transformViewport(
    vp,
    curPlan.targetWidth,
    curPlan.targetHeight,
    cx,
    cy,
    0,
    0,
    zoom,
    boxW,
    boxH
  );
}

/* ==================== 预览图缩略跳转 ==================== */
let overviewDragging = false;

function jumpFromOverview(e: PointerEvent) {
  const el = overviewCanvasRef.value;
  const curPlan = plan.value;
  const vp = viewport.value;
  const { width: boxW, height: boxH } = overviewSize.value;
  if (!el || !curPlan || !vp || boxW <= 0 || boxH <= 0) return;

  const box = letterbox(boxW, boxH, curPlan.targetWidth, curPlan.targetHeight);
  if (box.width <= 0 || box.height <= 0) return;

  const pos = pointerLocalPos(e, el);
  const cx = Math.max(
    0,
    Math.min(curPlan.targetWidth, ((pos.x - box.left) / box.width) * curPlan.targetWidth)
  );
  const cy = Math.max(
    0,
    Math.min(curPlan.targetHeight, ((pos.y - box.top) / box.height) * curPlan.targetHeight)
  );
  viewport.value = clampViewport(
    {
      originX: cx - vp.visibleW / 2,
      originY: cy - vp.visibleH / 2,
      visibleW: vp.visibleW,
      visibleH: vp.visibleH,
    },
    curPlan.targetWidth,
    curPlan.targetHeight
  );
}

function onOverviewPointerDown(e: PointerEvent) {
  const el = overviewCanvasRef.value;
  if (!el) return;
  el.setPointerCapture(e.pointerId);
  overviewDragging = true;
  jumpFromOverview(e);
}

function onOverviewPointerMove(e: PointerEvent) {
  if (!overviewDragging) return;
  jumpFromOverview(e);
}

function onOverviewPointerUp(e: PointerEvent) {
  const el = overviewCanvasRef.value;
  if (el && el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  overviewDragging = false;
}

/* ==================== 容器尺寸监听 ==================== */
function observeCanvases() {
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(() => {
    if (viewerWrapRef.value) {
      const rect = viewerWrapRef.value.getBoundingClientRect();
      const prevW = viewerSize.value.width;
      const prevH = viewerSize.value.height;
      viewerSize.value = { width: rect.width, height: rect.height };
      if (plan.value && rect.width > 0 && rect.height > 0 && (prevW === 0 || prevH === 0 || !viewport.value)) {
        viewport.value = fitViewport(
          plan.value.targetWidth,
          plan.value.targetHeight,
          rect.width,
          rect.height
        );
      }
    }
    if (overviewCanvasRef.value) {
      const rect = overviewCanvasRef.value.getBoundingClientRect();
      overviewSize.value = { width: rect.width, height: rect.height };
    }
  });
  if (viewerWrapRef.value) resizeObserver.observe(viewerWrapRef.value);
  if (overviewCanvasRef.value) resizeObserver.observe(overviewCanvasRef.value);
}

watch([plan, showOverview, mode], () => {
  nextTick(() => {
    observeCanvases();
    drawViewer();
    drawOverview();
  });
});

onMounted(() => {
  loadMaterials();
  window.addEventListener('paste', onPasteImage);
  nextTick(() => observeCanvases());
});

onUnmounted(() => {
  window.removeEventListener('paste', onPasteImage);
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4 flex-1">
    <!-- 顶部子导航栏 -->
    <div class="bg-white border border-[#EADFD9] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap shadow-xs">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none',
            mode === 'color'
              ? 'bg-[#739CBF] text-white shadow-xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="mode = 'color'"
        >
          <span :style="{ ...getItemSpriteStyle(1073, 16), imageRendering: 'pixelated' }"></span>
          <span>色号输入</span>
        </button>

        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none',
            mode === 'image'
              ? 'bg-[#739CBF] text-white shadow-xs'
              : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
          ]"
          @click="mode = 'image'"
        >
          <span :style="{ ...getItemSpriteStyle(149, 16), imageRendering: 'pixelated' }"></span>
          <span>图片取色 / 整图转换</span>
        </button>
      </div>

      <div v-if="repository" class="text-[11px] text-[#8E807C] flex items-center gap-1.5">
        <span class="px-1.5 py-0.5 rounded bg-[#FFF7F2] border border-[#EADFD9] font-mono">
          {{ repository.gameVersion || '1.4.5' }}
        </span>
        <span>
          默认 {{ repository.defaultCount }} 种（含扩展共 {{ repository.materials.length }} 种）· 30 种漆
        </span>
      </div>
    </div>

    <!-- 材料库加载 / 失败状态 -->
    <Card v-if="dataLoading" class="border-[#EADFD9]">
      <CardContent class="py-12 flex flex-col items-center justify-center gap-3 text-xs text-[#8E807C]">
        <div class="w-7 h-7 border-2 border-[#EADFD9] border-t-[#739CBF] rounded-full animate-spin"></div>
        <span>正在加载泰拉方块与墙壁配色库…</span>
      </CardContent>
    </Card>

    <Card v-else-if="dataError || !matcher" class="border-[#EADFD9]">
      <CardContent class="py-10 flex flex-col items-center justify-center gap-3 text-xs">
        <p class="text-rose-700 font-semibold">材料库加载失败：{{ dataError }}</p>
        <Button
          size="sm"
          class="bg-[#739CBF] hover:bg-[#5f87a8] text-white text-xs h-8 px-4"
          @click="loadMaterials"
        >
          重试加载
        </Button>
      </CardContent>
    </Card>

    <!-- 模式一：色号输入 -->
    <div v-else-if="mode === 'color'" class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 items-start">
      <Card class="border-[#EADFD9]">
        <CardContent class="p-4 flex flex-col gap-3.5">
          <div class="flex items-center gap-2">
            <span :style="{ ...getItemSpriteStyle(1071, 18), imageRendering: 'pixelated' }"></span>
            <div>
              <h2 class="text-sm font-bold text-[#4A3F3D]">输入目标色号</h2>
              <p class="text-[11px] text-[#8E807C]">支持十六进制色号与原生调色盘选色</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label
              class="relative w-10 h-10 rounded-full border-2 border-white ring-1 ring-[#EADFD9] shadow-xs shrink-0 cursor-pointer overflow-hidden"
              :style="{ backgroundColor: pickerColorValue }"
              title="点击打开调色盘选色"
            >
              <input
                type="color"
                :value="pickerColorValue"
                class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                @input="onNativeColorPick"
              />
            </label>

            <Input
              :model-value="colorInput"
              placeholder="#4A90E2"
              class="bg-[#FFF7F2] border-[#EADFD9] font-mono text-sm h-10 uppercase"
              @update:model-value="onColorInputChange"
              @keyup.enter="applyColorMatch"
            />

            <Button
              variant="default"
              size="sm"
              class="h-10 px-3.5 text-xs font-bold bg-[#739CBF] hover:bg-[#5f87a8] text-white shrink-0"
              @click="applyColorMatch"
            >
              匹配
            </Button>
          </div>

          <p v-if="colorError" class="text-xs text-rose-600 font-medium">
            {{ colorError }}
          </p>

          <div v-if="recentColors.length > 0" class="flex flex-col gap-1.5 pt-1 border-t border-[#EADFD9]/70">
            <span class="text-[11px] font-semibold text-[#8E807C]">近期匹配</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="hex in recentColors"
                :key="hex"
                type="button"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 text-[11px] font-mono text-[#4A3F3D] cursor-pointer"
                @click="selectPreset(hex)"
              >
                <span class="w-3 h-3 rounded-full border border-[#EADFD9]" :style="{ backgroundColor: `#${hex}` }"></span>
                <span>#{{ hex }}</span>
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 pt-1 border-t border-[#EADFD9]/70">
            <span class="text-[11px] font-semibold text-[#8E807C]">示例色号</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="hex in colorPresets"
                :key="hex"
                type="button"
                class="w-6 h-6 rounded-full border border-[#EADFD9] shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                :style="{ backgroundColor: `#${hex}` }"
                :title="`#${hex}`"
                @click="selectPreset(hex)"
              ></button>
            </div>
          </div>

          <div class="bg-[#FFF7F2] border border-[#EADFD9] rounded-xl p-3 text-[11px] text-[#8E807C] leading-relaxed">
            输入 6 位十六进制色号实时匹配；点击结果复制信息，点屏蔽图标跳过该材料。
          </div>
        </CardContent>
      </Card>

      <Card class="border-[#EADFD9]">
        <CardContent class="p-4">
          <PixelArtResultPanel
            :matcher="matcher"
            :target-hex="matchedHex"
            :options="matchOptions"
            :tag-counts="repository?.tagCounts"
            max-list-height-class="max-h-[540px]"
            @update:options="matchOptions = $event"
          />
        </CardContent>
      </Card>
    </div>

    <!-- 模式二：图片取色 & 全图批量转换 -->
    <div v-else class="flex flex-col gap-3 flex-1">
      <input
        ref="imageFileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onImageFileSelected"
      />

      <Card v-if="!plan" class="border-[#EADFD9]">
        <CardContent class="p-5 md:p-8 flex flex-col items-center gap-4">
          <div
            :class="[
              'w-full max-w-xl border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center gap-2.5 cursor-pointer transition-colors',
              isDragOver
                ? 'border-[#739CBF] bg-[#F9D6DB]/50'
                : 'border-[#739CBF]/60 bg-[#FFF7F2] hover:bg-[#F9D6DB]/35'
            ]"
            @click="triggerImagePicker"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop.prevent="onDropImage"
          >
            <div class="w-12 h-12 rounded-2xl bg-white border border-[#EADFD9] flex items-center justify-center shadow-xs">
              <ImagePlus v-if="!imageLoading" class="w-6 h-6 text-[#739CBF]" />
              <div v-else class="w-5 h-5 border-2 border-[#EADFD9] border-t-[#739CBF] rounded-full animate-spin"></div>
            </div>
            <div class="text-sm font-bold text-[#739CBF]">
              {{ imageLoading ? '正在解码图片…' : '点击、拖入图片或 Ctrl+V 粘贴' }}
            </div>
            <p class="text-xs text-[#8E807C] max-w-md leading-relaxed">
              支持按 16×16 图格点选配色，或一键全图批量转换并生成材料清单与施工图纸。
            </p>
          </div>

          <p v-if="imageError" class="text-xs text-rose-600 font-medium">
            {{ imageError }}
          </p>
        </CardContent>
      </Card>

      <template v-else>
        <!-- 工具条：左操作模式，右画布设置 -->
        <Card class="border-[#EADFD9]">
          <CardContent class="p-2.5 sm:p-3 flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 flex-wrap">
              <div class="flex items-center bg-[#FFF7F2] border border-[#EADFD9] rounded-lg p-0.5 gap-0.5">
                <button
                  type="button"
                  :class="[
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                    panelTool === 'move'
                      ? 'bg-[#739CBF] text-white shadow-2xs'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                  ]"
                  @click="panelTool = 'move'"
                >
                  <Move class="w-3.5 h-3.5" />
                  <span>移动</span>
                </button>
                <button
                  type="button"
                  :class="[
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                    panelTool === 'pick'
                      ? 'bg-[#739CBF] text-white shadow-2xs'
                      : 'text-[#4A3F3D] hover:bg-[#EFE7E2]'
                  ]"
                  @click="panelTool = 'pick'"
                >
                  <Pipette class="w-3.5 h-3.5" />
                  <span>取色</span>
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                :class="[
                  'h-8 text-xs font-semibold px-2.5 gap-1.5',
                  batchMode
                    ? 'border-[#739CBF] bg-[#739CBF] text-white hover:bg-[#5f87a8]'
                    : 'border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40'
                ]"
                @click="batchMode = !batchMode"
              >
                <Grid2x2Check class="w-3.5 h-3.5" />
                <span>{{ batchMode ? '退出全图转换' : '全图转换' }}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                :class="[
                  'h-8 text-xs font-semibold px-2.5 gap-1.5',
                  showOverview
                    ? 'border-[#739CBF] bg-[#739CBF]/10 text-[#2F658D]'
                    : 'border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40'
                ]"
                @click="showOverview = !showOverview"
              >
                <Eye v-if="showOverview" class="w-3.5 h-3.5" />
                <EyeOff v-else class="w-3.5 h-3.5" />
                <span>缩略图</span>
              </Button>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
                @click="scaleModalOpen = true"
              >
                <SlidersHorizontal class="w-3.5 h-3.5 text-[#739CBF]" />
                <span>{{ plan.columns }}×{{ plan.rows }} 图格</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                class="h-8 text-xs font-semibold border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 px-2.5 gap-1.5"
                @click="triggerImagePicker"
              >
                <ImagePlus class="w-3.5 h-3.5 text-[#739CBF]" />
                <span>换一张</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- 工作区：全图转换模式下桌面端左右并排，无需上下滚动对比 -->
        <div
          :class="[
            'flex flex-col gap-3',
            batchMode ? 'lg:grid lg:grid-cols-[1fr_410px] lg:gap-4 lg:items-start' : ''
          ]"
        >
          <div :class="['flex flex-col gap-3 min-w-0', batchMode ? 'lg:sticky lg:top-20' : '']">
            <!-- 画布查看器 + 右侧缩略定位面板 -->
            <div
              class="bg-[#1B1B1B] rounded-2xl border border-[#EADFD9] overflow-hidden shadow-sm flex h-[54vh] min-h-[320px] max-h-[640px]"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop.prevent="onDropImage"
            >
              <div ref="viewerWrapRef" class="relative flex-1 min-w-0 h-full">
                <canvas
                  ref="viewerCanvasRef"
                  :class="[
                    'w-full h-full block touch-none select-none',
                    panelTool === 'pick' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
                  ]"
                  @pointerdown="onViewerPointerDown"
                  @pointermove="onViewerPointerMove"
                  @pointerup="onViewerPointerUp"
                  @pointercancel="onViewerPointerUp"
                  @pointerleave="onViewerPointerLeave"
                  @wheel.prevent="onViewerWheel"
                  @contextmenu.prevent
                ></canvas>

                <!-- 顶部右侧浮动图层对比切换（全图转换模式） -->
                <div
                  v-if="batchMode"
                  class="absolute top-2.5 right-2.5 flex items-center bg-black/70 backdrop-blur-xs border border-white/20 rounded-xl p-0.5 gap-0.5 text-[11px] shadow-md"
                >
                  <button
                    type="button"
                    :class="[
                      'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer select-none',
                      previewLayer === 'converted'
                        ? 'bg-[#739CBF] text-white'
                        : 'text-white/80 hover:text-white'
                    ]"
                    @click="previewLayer = 'converted'"
                  >
                    泰拉实景
                  </button>
                  <button
                    type="button"
                    :class="[
                      'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer select-none',
                      previewLayer === 'original'
                        ? 'bg-[#739CBF] text-white'
                        : 'text-white/80 hover:text-white'
                    ]"
                    @click="previewLayer = 'original'"
                  >
                    原图对比
                  </button>
                </div>

                <!-- 底部右侧浮动缩放控制 -->
                <div class="absolute bottom-2.5 right-2.5 flex items-center bg-black/70 backdrop-blur-xs border border-white/20 rounded-xl p-0.5 gap-0.5 text-white shadow-md">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title="放大"
                    @click="zoomBy(1.4)"
                  >
                    <ZoomIn class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title="缩小"
                    @click="zoomBy(1 / 1.4)"
                  >
                    <ZoomOut class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title="适应屏幕"
                    @click="resetViewport"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- 桌面悬停 HUD -->
                <div
                  v-if="hoverPreview"
                  class="hidden sm:flex items-center gap-2 absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs border border-[#EADFD9] rounded-xl px-2.5 py-1.5 shadow-md pointer-events-none text-xs text-[#4A3F3D]"
                >
                  <span
                    class="w-4 h-4 rounded-full border border-[#EADFD9] shrink-0"
                    :style="{ backgroundColor: `#${hoverPreview.hex}` }"
                  ></span>
                  <span class="font-mono font-semibold">
                    ({{ hoverPreview.col }}, {{ hoverPreview.row }}) #{{ hoverPreview.hex }}
                  </span>
                  <template v-if="hoverPreview.topMatch">
                    <span class="text-[#EADFD9]">|</span>
                    <span :style="{ ...getItemSpriteStyle(hoverPreview.topMatch.material.itemId, 16), imageRendering: 'pixelated' }"></span>
                    <span class="font-bold">{{ hoverPreview.topMatch.material.name }}</span>
                    <span v-if="hoverPreview.topMatch.paintId > 0" class="text-[#739CBF] font-medium">
                      · {{ hoverPreview.topMatch.paintName }}
                    </span>
                  </template>
                </div>
              </div>

              <div
                v-if="showOverview"
                class="w-24 sm:w-32 md:w-36 shrink-0 h-full border-l border-white/15 bg-[#1B1B1B]"
              >
                <canvas
                  ref="overviewCanvasRef"
                  class="w-full h-full block touch-none select-none cursor-pointer"
                  @pointerdown="onOverviewPointerDown"
                  @pointermove="onOverviewPointerMove"
                  @pointerup="onOverviewPointerUp"
                  @pointercancel="onOverviewPointerUp"
                ></canvas>
              </div>
            </div>

            <!-- 底部当前选中图格状态条 -->
            <div class="bg-white border border-[#EADFD9] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
              <template v-if="picked">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-6 h-6 rounded-full border border-[#EADFD9] shrink-0"
                    :style="{ backgroundColor: `#${picked.hex}` }"
                  ></div>
                  <span class="font-bold text-[#4A3F3D]">
                    已选图格 列 {{ picked.col }} · 行 {{ picked.row }}
                  </span>
                  <span class="font-mono text-[#739CBF] font-semibold">#{{ picked.hex }}</span>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  class="h-7 text-xs font-semibold bg-[#739CBF] hover:bg-[#5f87a8] text-white px-3"
                  @click="resultModalOpen = true"
                >
                  查看 Top 12 备选
                </Button>
              </template>
              <template v-else>
                <span class="text-[#8E807C]">
                  提示：滚轮/双指或右下角按钮可缩放；切到「取色」点任意格子可查看备选方案。
                </span>
              </template>
            </div>
          </div>

          <!-- 全图批量转换 & 材料清单面板 -->
          <PixelArtBatchPanel
            v-if="batchMode && batchResult && repository"
            :result="batchResult"
            :preview-canvas="batchPreviewCanvas"
            :options="matchOptions"
            :tag-counts="repository.tagCounts"
            :dithering="batchDithering"
            :skip-transparent="batchSkipTransparent"
            :preview-layer="previewLayer"
            @update:options="matchOptions = $event"
            @update:dithering="batchDithering = $event"
            @update:skip-transparent="batchSkipTransparent = $event"
            @update:preview-layer="previewLayer = $event"
          />
        </div>
      </template>
    </div>

    <!-- 尺寸设置弹窗 -->
    <PixelArtScaleModal
      v-if="sourceCanvas"
      :open="scaleModalOpen"
      :source-width="sourceCanvas.width"
      :source-height="sourceCanvas.height"
      :initial-mode="plan?.mode"
      :initial-width="plan?.targetWidth"
      :initial-height="plan?.targetHeight"
      @close="onScaleClose"
      @confirm="onScaleConfirm"
    />

    <!-- 点格取色推荐弹窗 -->
    <PixelArtResultModal
      v-if="matcher && picked"
      :open="resultModalOpen"
      :title="`图格 列 ${picked.col} · 行 ${picked.row}`"
      :detail="`画布像素 x ${picked.col * TILE_SIZE}–${(picked.col + 1) * TILE_SIZE - 1} · y ${picked.row * TILE_SIZE}–${(picked.row + 1) * TILE_SIZE - 1}`"
      :target-hex="picked.hex"
      :transparent-hint="picked.transparent"
      :matcher="matcher"
      :options="matchOptions"
      @close="resultModalOpen = false"
      @update:options="matchOptions = $event"
    />
  </div>
</template>
