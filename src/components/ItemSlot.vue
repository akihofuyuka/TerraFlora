<script setup lang="ts">
import { computed, onUnmounted } from "vue";
import type { ItemData } from "../core/plr";
import {
  store,
  handleSlotClick,
  startDrag,
  updateDragPosition,
  endDrag,
  cancelDrag
} from "../store";
import { getItemSpriteStyle } from "../utils/sprite";

const props = defineProps<{
  item: ItemData;
  slotType: any;
  index: number;
  label?: string;
  size?: number;
  loadoutIdx?: number;
}>();

const displaySize = props.size || 34;

const isSelected = computed(() => {
  return (
    store.selectedSlot !== null &&
    store.selectedSlot.slotType === props.slotType &&
    store.selectedSlot.index === props.index &&
    (props.loadoutIdx === undefined || store.selectedSlot.loadoutIdx === props.loadoutIdx)
  );
});

const isMoveSource = computed(() => {
  return (
    store.isMoveMode &&
    store.moveSourceSlot !== null &&
    store.moveSourceSlot.slotType === props.slotType &&
    store.moveSourceSlot.index === props.index &&
    (props.loadoutIdx === undefined || store.moveSourceSlot.loadoutIdx === props.loadoutIdx)
  );
});

const isBeingDragged = computed(() => {
  return (
    store.dragState.isDragging &&
    store.dragState.sourceSlotType === props.slotType &&
    store.dragState.sourceIndex === props.index &&
    (props.loadoutIdx === undefined || store.dragState.sourceLoadoutIdx === props.loadoutIdx)
  );
});

const isHoverTarget = computed(() => {
  return (
    store.dragState.isDragging &&
    store.dragState.hoverTarget !== null &&
    store.dragState.hoverTarget.slotType === props.slotType &&
    store.dragState.hoverTarget.index === props.index &&
    (props.loadoutIdx === undefined || store.dragState.hoverTarget.loadoutIdx === props.loadoutIdx)
  );
});

const itemMeta = computed(() => {
  if (props.item.id <= 0) return null;
  return store.itemsMap.get(props.item.id) || null;
});

const prefixMeta = computed(() => {
  if (props.item.prefix <= 0) return null;
  return store.prefixesMap.get(props.item.prefix) || null;
});

const spriteStyle = computed(() => {
  return getItemSpriteStyle(props.item.id, displaySize);
});

// ================= 触控（Touch）与鼠标（Mouse）双轨拖拽 =================

let lastTouchTime = 0;

// ---------- 电脑鼠标交互 ----------
let mouseStartX = 0;
let mouseStartY = 0;
let isMouseDown = false;
let mouseMoved = false;

function onMouseDown(e: MouseEvent) {
  // 屏蔽触屏触发的合成 mouse 事件
  if (Date.now() - lastTouchTime < 500) return;
  if (e.button !== 0) return; // 仅左键

  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  isMouseDown = true;
  mouseMoved = false;

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!isMouseDown) return;
  const dist = Math.hypot(e.clientX - mouseStartX, e.clientY - mouseStartY);

  if (!mouseMoved && dist > 5 && props.item.id > 0) {
    mouseMoved = true;
    startDrag(props.slotType, props.index, props.item, props.loadoutIdx, e.clientX, e.clientY, false);
  }

  if (mouseMoved) {
    updateDragPosition(e.clientX, e.clientY);
  }
}

function onMouseUp(e: MouseEvent) {
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);

  if (mouseMoved) {
    endDrag(e.clientX, e.clientY);
  } else if (isMouseDown) {
    handleSlotClick(props.slotType, props.index, props.loadoutIdx);
  }

  isMouseDown = false;
  mouseMoved = false;
}

// ---------- 手机触控交互 (Touch Events) ----------
let touchStartX = 0;
let touchStartY = 0;
let currentTouchX = 0;
let currentTouchY = 0;
let touchTimer: ReturnType<typeof setTimeout> | null = null;
let isTouchDragging = false;
let touchMovedFar = false;

function onTouchStart(e: TouchEvent) {
  lastTouchTime = Date.now();
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  currentTouchX = t.clientX;
  currentTouchY = t.clientY;
  isTouchDragging = false;
  touchMovedFar = false;

  if (touchTimer) clearTimeout(touchTimer);

    // 若格子内有物品，长按 420ms 触发抓取（避免轻点快捷栏/背包时误触发拖拽）
    if (props.item.id > 0) {
      touchTimer = setTimeout(() => {
        isTouchDragging = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(30);
        }
        startDrag(
          props.slotType,
          props.index,
          props.item,
          props.loadoutIdx,
          currentTouchX,
          currentTouchY,
          true
        );
      }, 420);
    }

  window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
  window.addEventListener("touchend", onWindowTouchEnd, { passive: false });
  window.addEventListener("touchcancel", onWindowTouchCancel);
}

function onWindowTouchMove(e: TouchEvent) {
  if (e.touches.length < 1) return;
  const t = e.touches[0];
  currentTouchX = t.clientX;
  currentTouchY = t.clientY;

  const dist = Math.hypot(currentTouchX - touchStartX, currentTouchY - touchStartY);

  if (isTouchDragging) {
    // 已经处于抓取拖拽状态中：必须阻止浏览器原生滚屏，并实时更新拖拽位置
    if (e.cancelable) e.preventDefault();
    updateDragPosition(currentTouchX, currentTouchY);
  } else {
    // 尚未触发抓取：手指移动超过 8px 说明用户是在上下滑动查看背包/仓库
    if (dist > 8) {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      touchMovedFar = true;
      // 绝不调用 e.preventDefault()，让原生页面平滑滚动！
    }
  }
}

function onWindowTouchEnd(e: TouchEvent) {
  window.removeEventListener("touchmove", onWindowTouchMove);
  window.removeEventListener("touchend", onWindowTouchEnd);
  window.removeEventListener("touchcancel", onWindowTouchCancel);

  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }

  if (isTouchDragging) {
    if (e.cancelable) e.preventDefault();
    const t = e.changedTouches[0] || { clientX: currentTouchX, clientY: currentTouchY };
    endDrag(t.clientX, t.clientY);
    isTouchDragging = false;
  } else if (!touchMovedFar) {
    // 阻止手机浏览器在打开弹窗后补发合成 click 误点到下方物品库
    if (e.cancelable) e.preventDefault();
    // 未拖拽且未滑动页面，判定为轻触点击（查看/编辑属性）
    handleSlotClick(props.slotType, props.index, props.loadoutIdx);
  }

  touchMovedFar = false;
}

function onWindowTouchCancel() {
  window.removeEventListener("touchmove", onWindowTouchMove);
  window.removeEventListener("touchend", onWindowTouchEnd);
  window.removeEventListener("touchcancel", onWindowTouchCancel);

  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }

  if (isTouchDragging) {
    cancelDrag();
    isTouchDragging = false;
  }
  touchMovedFar = false;
}

onUnmounted(() => {
  if (touchTimer) clearTimeout(touchTimer);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
  window.removeEventListener("touchmove", onWindowTouchMove);
  window.removeEventListener("touchend", onWindowTouchEnd);
  window.removeEventListener("touchcancel", onWindowTouchCancel);
});
</script>

<template>
  <div
    :data-slot-type="slotType"
    :data-slot-index="index"
    :data-loadout-idx="loadoutIdx"
    :class="[
      'relative flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer select-none aspect-square',
      'w-full max-w-[48px] max-h-[48px] md:max-w-[50px] md:max-h-[50px]',
      isBeingDragged
        ? 'opacity-40 scale-95 border-dashed border-[#739CBF] bg-[#EFE7E2]'
        : isHoverTarget
          ? 'border-[#E598A3] bg-[#F9D6DB] ring-2 ring-[#E598A3] scale-105 z-20 shadow-md'
          : isMoveSource
            ? 'border-[#E598A3] bg-[#F9D6DB]/90 ring-2 ring-[#E598A3] scale-105 z-20 shadow-md'
            : isSelected
              ? 'border-[#739CBF] bg-[#EEF4F9] ring-2 ring-[#739CBF]/65 shadow-sm scale-105 z-10'
              : item.favorited
                ? 'border-amber-400 bg-amber-50/80 ring-1 ring-amber-400/60 hover:bg-amber-100/80 shadow-2xs'
                : 'border-[#EADFD9] bg-[#EFE7E2] hover:bg-[#E8DFD9] shadow-2xs'
    ]"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
    :title="itemMeta ? `${prefixMeta ? prefixMeta.name + ' ' : ''}${itemMeta.name} (x${item.stack})` : label || '空'"
  >
    <!-- 空格子标签 -->
    <span
      v-if="item.id <= 0 && label"
      class="text-[10px] md:text-xs font-medium text-[#8E807C] text-center pointer-events-none px-0.5 leading-tight select-none"
    >
      {{ label }}
    </span>

    <!-- 物品贴图 (像素渲染 + 软阴影) -->
    <div
      v-if="item.id > 0"
      class="pointer-events-none drop-shadow-[0_2px_3px_rgba(74,63,61,0.14)] select-none"
      :style="{ ...spriteStyle, imageRendering: 'pixelated' }"
    ></div>

    <!-- 堆叠数量标签 -->
    <span
      v-if="item.id > 0 && item.stack > 1"
      class="absolute bottom-0.5 right-1 text-[10px] md:text-[11px] font-black text-[#4A3F3D] pointer-events-none leading-none select-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
    >
      {{ item.stack > 9999 ? '9999+' : item.stack }}
    </span>

    <!-- 收藏标记: 金色五角星指示 -->
    <div
      v-if="item.favorited"
      class="absolute top-0.5 left-0.5 pointer-events-none select-none text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
      title="已标记收藏"
    >
      <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </div>
  </div>
</template>
