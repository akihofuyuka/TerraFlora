<script lang="ts">
const modalStack: symbol[] = [];
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    open: boolean;
    variant?: 'dialog' | 'sheet';
    title?: string;
    subtitle?: string;
    maxWidthClass?: string;
    bodyClass?: string;
    panelClass?: string;
    zIndexClass?: string;
    closeOnOverlay?: boolean;
    showClose?: boolean;
  }>(),
  {
    variant: 'dialog',
    maxWidthClass: 'max-w-lg',
    bodyClass: 'p-3 overflow-y-auto flex-1 overscroll-contain',
    zIndexClass: 'z-[70]',
    closeOnOverlay: true,
    showClose: true,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const modalId = Symbol('app-modal');

function syncStack(isOpen: boolean) {
  if (typeof document === 'undefined') return;
  if (isOpen) {
    if (!modalStack.includes(modalId)) {
      modalStack.push(modalId);
    }
    document.body.style.overflow = 'hidden';
  } else {
    const idx = modalStack.indexOf(modalId);
    if (idx !== -1) {
      modalStack.splice(idx, 1);
    }
    if (modalStack.length === 0) {
      document.body.style.overflow = '';
    }
  }
}

watch(
  () => props.open,
  (val) => syncStack(val),
  { immediate: true }
);

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    emit('close');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (
    e.key === 'Escape' &&
    props.open &&
    props.showClose &&
    modalStack[modalStack.length - 1] === modalId
  ) {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  syncStack(false);
});
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        :class="
          cn(
            'fixed inset-0 flex justify-center bg-[#4A3F3D]/38 backdrop-blur-[2px] select-none pointer-events-auto',
            variant === 'sheet'
              ? 'items-end sm:items-center sm:p-4'
              : 'items-center p-3 sm:p-4',
            zIndexClass
          )
        "
        @click.self="handleOverlayClick"
      >
        <div
          :class="
            cn(
              'bg-white border border-[#EADFD9] shadow-2xl w-full max-h-[86dvh] flex flex-col overflow-hidden text-[#4A3F3D] pointer-events-auto',
              variant === 'sheet' ? 'rounded-t-2xl sm:rounded-2xl' : 'rounded-2xl',
              maxWidthClass,
              panelClass
            )
          "
          role="dialog"
          aria-modal="true"
        >
          <div
            v-if="title || $slots.header || showClose"
            class="px-3.5 py-2.5 border-b border-[#EADFD9] bg-[#FFF7F2]/80 flex items-center justify-between gap-2 shrink-0"
          >
            <slot name="header">
              <div class="flex items-center gap-2 min-w-0">
                <slot name="icon" />
                <div class="min-w-0">
                  <h3 v-if="title" class="text-sm font-bold text-[#4A3F3D] truncate">{{ title }}</h3>
                  <p v-if="subtitle" class="text-[11px] text-[#8E807C] truncate mt-0.5">{{ subtitle }}</p>
                </div>
              </div>
            </slot>

            <button
              v-if="showClose"
              type="button"
              class="p-1.5 rounded-lg text-[#8E807C] hover:text-[#4A3F3D] hover:bg-[#EFE7E2] transition-colors cursor-pointer shrink-0"
              aria-label="关闭"
              title="关闭"
              @click="emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div :class="bodyClass">
            <slot />
          </div>

          <div
            v-if="$slots.footer"
            class="px-3.5 py-2 border-t border-[#EADFD9] bg-[#FFF7F2]/75 shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
