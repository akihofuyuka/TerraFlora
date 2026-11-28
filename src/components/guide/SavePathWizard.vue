<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Folder,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Lock,
  Monitor,
  SlidersHorizontal,
  Smartphone,
  Wand2,
} from 'lucide-vue-next';
import AppModal from '@/components/ui/AppModal.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { setActiveTool, setGuideSubTab, showToast } from '@/store';
import CopyChip from './CopyChip.vue';
import GuideIcon from './GuideIcon.vue';
import QuickPathPanel from './QuickPathPanel.vue';
import {
  FAQ_ITEMS,
  PC_PATHS,
  STEP_PROGRESS,
  buildAllPlatformGuideText,
  buildSummaryText,
  copyToClipboard,
  detectDeviceHint,
  getEditionMeta,
  getStepCrumbLabel,
  type DesktopOs,
  type EditionChoice,
  type GoalType,
  type GuideLang,
  type GuideStepId,
  type OsType,
  type PlatformType,
  type WizardState,
} from './guideData';

const props = defineProps<{
  standalone?: boolean;
}>();

const viewMode = ref<'wizard' | 'quick'>('wizard');
const lang = ref<GuideLang>('zh');
const troubleshootOpen = ref(false);
const openFaqId = ref<string>(FAQ_ITEMS[0].id);

const deviceHint = detectDeviceHint();
const selectedPcOs = ref<DesktopOs>(deviceHint.desktopOs);
const iosSaveTab = ref<'import' | 'export' | 'cable'>('import');

function openPlrEditor() {
  if (props.standalone) {
    window.open('https://terraflora-8cm.pages.dev/', '_blank', 'noopener,noreferrer');
  } else {
    setActiveTool('plr');
  }
}

function openWorldTool() {
  if (props.standalone) {
    setGuideSubTab('converter');
  } else {
    setActiveTool('wld');
  }
}

const state = reactive<WizardState>({
  history: ['start'],
  platform: null,
  os: null,
  edition: null,
  goal: null,
  hasDataPerm: null,
});

const currentStep = computed<GuideStepId>(() => state.history[state.history.length - 1]);
const progress = computed(() => STEP_PROGRESS[currentStep.value] ?? 15);
const isZh = computed(() => lang.value === 'zh');
const meta = computed(() => getEditionMeta(state.edition, lang.value));
const copyPrefix = computed(() => (isZh.value ? '已复制' : 'Copied'));
const isFinalStep = computed(
  () => currentStep.value === 'pc_final' || currentStep.value === 'android_final' || currentStep.value === 'ios_final'
);
const activePcPath = computed(
  () => PC_PATHS.find((item) => item.os === selectedPcOs.value) ?? PC_PATHS[0]
);

const crumbs = computed(() =>
  state.history.map((id, idx) => ({
    id,
    idx,
    isLast: idx === state.history.length - 1,
    label: getStepCrumbLabel(id, state, lang.value),
  }))
);

function toggleLang() {
  lang.value = lang.value === 'zh' ? 'en' : 'zh';
}

function goTo(stepId: GuideStepId) {
  if (state.history[state.history.length - 1] !== stepId) {
    state.history.push(stepId);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (state.history.length > 1) {
    state.history.pop();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function jumpToHistoryIndex(index: number) {
  if (index >= 0 && index < state.history.length - 1) {
    state.history = state.history.slice(0, index + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function resetWizard() {
  state.history = ['start'];
  state.platform = null;
  state.os = null;
  state.edition = null;
  state.goal = null;
  state.hasDataPerm = null;
  showToast(isZh.value ? '已重置向导' : 'Wizard reset');
}

function selectPlatform(platform: PlatformType, edition?: EditionChoice) {
  state.platform = platform;
  state.edition = edition || null;
  state.os = null;
  state.goal = null;
  state.hasDataPerm = null;
  goTo(platform === 'pc' ? 'pc_goal' : 'select_os');
}

function selectOS(os: OsType) {
  state.os = os;
  state.goal = null;
  state.hasDataPerm = null;
  goTo('select_goal');
}

function selectGoal(goal: GoalType) {
  state.goal = goal;
  state.hasDataPerm = null;
  goTo(state.os === 'android' ? 'android_prep' : 'ios_final');
}

function selectPcGoal(goal: GoalType) {
  state.goal = goal;
  goTo('pc_final');
}

function selectDataPerm(hasPerm: boolean) {
  state.hasDataPerm = hasPerm;
  goTo(hasPerm ? 'android_final' : 'shizuku_guide');
}

async function copySummaryText() {
  const { text, toast } = buildSummaryText(state, lang.value);
  const ok = await copyToClipboard(text);
  if (ok) {
    showToast(toast);
  } else {
    showToast(isZh.value ? '复制失败，请长按手动选择' : 'Copy failed, please copy manually');
  }
}

async function copyAllGuideText() {
  const { text, toast } = buildAllPlatformGuideText(lang.value);
  const ok = await copyToClipboard(text);
  if (ok) {
    showToast(toast);
  } else {
    showToast(isZh.value ? '复制失败，请长按手动选择' : 'Copy failed, please copy manually');
  }
}

function toggleFaq(id: string) {
  openFaqId.value = openFaqId.value === id ? '' : id;
}
</script>

<template>
  <div class="flex flex-col gap-3 select-text">
    <!-- 模式切换 -->
    <nav class="bg-white border border-[#EADFD9] rounded-xl p-1.5 grid grid-cols-2 gap-1.5 shadow-2xs select-none">
      <button
        type="button"
        :class="[
          'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all duration-150 cursor-pointer border',
          viewMode === 'wizard'
            ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
            : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]/70',
        ]"
        @click="viewMode = 'wizard'"
      >
        <GuideIcon :item-id="149" :size="16" :standalone="standalone">
          <Compass class="w-3.5 h-3.5 shrink-0" />
        </GuideIcon>
        <span>{{ isZh ? '分步向导' : 'Step Wizard' }}</span>
      </button>

      <button
        type="button"
        :class="[
          'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all duration-150 cursor-pointer border',
          viewMode === 'quick'
            ? 'bg-[#EEF4F9] text-[#2F658D] border-[#C4D6E5] font-bold shadow-2xs'
            : 'text-[#4A3F3D] font-semibold border-transparent hover:bg-[#EFE7E2]/70',
        ]"
        @click="viewMode = 'quick'"
      >
        <GuideIcon :item-id="393" :size="16" :standalone="standalone">
          <Folder class="w-3.5 h-3.5 shrink-0" />
        </GuideIcon>
        <span>{{ isZh ? '路径速查' : 'Quick Paths' }}</span>
      </button>
    </nav>

    <!-- 路径速查视图 -->
    <QuickPathPanel
      v-if="viewMode === 'quick'"
      :lang="lang"
      :device-hint="deviceHint"
      @toggle-lang="toggleLang"
      @open-faq="troubleshootOpen = true"
    />

    <!-- 分步向导视图 -->
    <template v-else>
      <Card class="bg-white border-[#EADFD9] shadow-sm overflow-hidden">
        <!-- 面包屑与快捷操作 -->
        <div class="px-4 md:px-5 pt-3.5 pb-2.5 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <template v-for="(c, idx) in crumbs" :key="`${c.id}-${idx}`">
              <button
                type="button"
                :disabled="c.isLast"
                :class="[
                  'px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-colors border',
                  c.isLast
                    ? 'bg-[#EEF4F9] border-[#C4D6E5] text-[#2F658D] font-bold cursor-default'
                    : 'bg-transparent border-transparent text-[#8E807C] hover:text-[#4A3F3D] hover:bg-[#EFE7E2] cursor-pointer',
                ]"
                @click="!c.isLast && jumpToHistoryIndex(c.idx)"
              >
                {{ c.label }}
              </button>
              <ChevronRight v-if="!c.isLast" class="w-3 h-3 text-[#C7B9B3] shrink-0" />
            </template>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
              :title="isZh ? 'Switch to English' : '切换为中文'"
              @click="toggleLang"
            >
              <Globe class="w-3 h-3" />
              <span>{{ isZh ? 'EN' : '中文' }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
              @click="troubleshootOpen = true"
            >
              <HelpCircle class="w-3 h-3" />
              <span>{{ isZh ? '常见排查' : 'FAQ' }}</span>
            </button>
          </div>
        </div>

        <!-- 进度分隔条 -->
        <div class="w-full h-[3px] bg-[#EADFD9]/70 overflow-hidden">
          <div
            class="h-full bg-[#739CBF] transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>

        <CardContent class="p-4 md:p-5">
          <!-- Step 1: 平台与版本 -->
          <template v-if="currentStep === 'start'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F9D6DB]/55 border border-[#E598A3]/60 text-[#4A3F3D]">
              {{ isZh ? '第 1 步 · 确认平台与版本' : 'Step 1 · Platform & Edition' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-3.5">
            {{ isZh ? '你用的是哪个版本的泰拉瑞亚？' : 'Which edition of Terraria are you playing?' }}
          </h2>

          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectPlatform('mobile', 'xd')"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="58" :size="20" :standalone="standalone">
                    <Heart class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-bold text-[#4A3F3D]">
                      {{ isZh ? '手机心动版' : 'Mobile: XD Edition' }}
                    </span>
                    <span
                      v-if="deviceHint.platform === 'mobile'"
                      class="px-1.5 py-0 rounded text-[10px] font-semibold bg-[#F9D6DB]/65 border border-[#E598A3]/60 text-[#4A3F3D]"
                    >
                      {{ isZh ? '当前设备' : 'This device' }}
                    </span>
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '安卓 / 苹果手机上的国服心动版' : 'China XD release on Android / iOS' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectPlatform('mobile', 'normal')"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="393" :size="20" :standalone="standalone">
                    <Globe class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-bold text-[#4A3F3D]">
                      {{ isZh ? '手机国际版' : 'Mobile: Global Edition' }}
                    </span>
                    <span
                      v-if="deviceHint.platform === 'mobile'"
                      class="px-1.5 py-0 rounded text-[10px] font-semibold bg-[#F9D6DB]/65 border border-[#E598A3]/60 text-[#4A3F3D]"
                    >
                      {{ isZh ? '当前设备' : 'This device' }}
                    </span>
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? 'Google Play / App Store 国际版' : 'App Store or Google Play (505 Games)' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectPlatform('pc')"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="395" :size="20" :standalone="standalone">
                    <Monitor class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-bold text-[#4A3F3D]">
                      {{ isZh ? '电脑 Steam 版' : 'PC: Steam Edition' }}
                    </span>
                    <span
                      v-if="deviceHint.platform === 'pc'"
                      class="px-1.5 py-0 rounded text-[10px] font-semibold bg-[#F9D6DB]/65 border border-[#E598A3]/60 text-[#4A3F3D]"
                    >
                      {{ isZh ? '当前设备' : 'This device' }}
                    </span>
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? 'Windows / macOS / Linux Steam 版' : 'Windows / macOS / Linux via Steam' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>
          </div>
          </template>

          <!-- Step 2 (Mobile): 手机系统 -->
          <template v-else-if="currentStep === 'select_os'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ meta.name }} · {{ isZh ? '第 2 步' : 'Step 2' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-3.5">
            {{ isZh ? '你的手机是什么系统？' : 'What OS does your mobile device run?' }}
          </h2>

          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectOS('android')"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="3124" :size="20" :standalone="standalone">
                    <Smartphone class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-bold text-[#4A3F3D]">
                      {{ isZh ? '安卓 / 鸿蒙手机' : 'Android / HarmonyOS' }}
                    </span>
                    <span
                      v-if="deviceHint.mobileOs === 'android'"
                      class="px-1.5 py-0 rounded text-[10px] font-semibold bg-[#F9D6DB]/65 border border-[#E598A3]/60 text-[#4A3F3D]"
                    >
                      {{ isZh ? '当前设备' : 'This device' }}
                    </span>
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '小米、华为/荣耀、OPPO、vivo、三星等' : 'Samsung, Xiaomi, Pixel, OnePlus, Huawei, etc.' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectOS('ios')"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="4009" :size="20" :standalone="standalone">
                    <Smartphone class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-bold text-[#4A3F3D]">
                      {{ isZh ? '苹果（iOS / iPadOS）' : 'Apple (iOS / iPadOS)' }}
                    </span>
                    <span
                      v-if="deviceHint.mobileOs === 'ios'"
                      class="px-1.5 py-0 rounded text-[10px] font-semibold bg-[#F9D6DB]/65 border border-[#E598A3]/60 text-[#4A3F3D]"
                    >
                      {{ isZh ? '当前设备' : 'This device' }}
                    </span>
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? 'iPhone 或 iPad' : 'iPhone or iPad' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>
          </div>
          </template>

          <!-- Step 3 (Mobile): 操作目的 -->
          <template v-else-if="currentStep === 'select_goal'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ meta.name }} · {{ isZh ? '第 3 步' : 'Step 3' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-3.5">
            {{ isZh ? '你想进行哪项操作？' : 'What would you like to do?' }}
          </h2>

          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectGoal('save')"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="48" :size="20" :standalone="standalone">
                    <Folder class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '导入 / 导出人物或地图存档' : 'Import / Export Saves (Worlds & Characters)' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '全物品存档、建筑地图' : 'All-item maps, player characters, backups' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectGoal('editor')"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="509" :size="20" :standalone="standalone">
                    <SlidersHorizontal class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '使用存档编辑器修改物品 / 属性' : 'Use Save Editor (Modify Items & Stats)' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{
                      state.os === 'android'
                        ? isZh ? '用本站修改 .plr 或手机端编辑器' : 'TerraFlora Web Editor or Android app'
                        : isZh ? '浏览器直接修改人物存档' : 'Web-based save editor (No jailbreak)'
                    }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectGoal('patch')"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="4722" :size="20" :standalone="standalone">
                    <Wand2 class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D] flex items-center flex-wrap gap-1.5">
                    <span>{{ isZh ? '安装第一分型等游戏补丁' : 'Install Game Patches (First Fractal, etc.)' }}</span>
                    <span
                      v-if="state.os !== 'android'"
                      class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FDECEF] text-[#B84A5A] border border-[#F2C4CD]"
                    >
                      {{ isZh ? '仅安卓支持' : 'Android Only' }}
                    </span>
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{
                      state.os === 'android'
                        ? isZh ? '替换游戏底层文件' : 'Replace core metadata files'
                        : isZh ? '当前系统不支持，点击查看替代方案' : 'Not supported on iOS; tap for alternatives'
                    }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>
          </div>
          </template>

          <!-- Step 2 (PC): 操作目的 -->
          <template v-else-if="currentStep === 'pc_goal'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? '电脑 Steam 版 · 第 2 步' : 'PC Steam · Step 2' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-3.5">
            {{ isZh ? '你想进行哪项操作？' : 'What would you like to do?' }}
          </h2>

          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectPcGoal('save')"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="48" :size="20" :standalone="standalone">
                    <Folder class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '导入 / 导出人物或地图存档' : 'Import / Export Saves' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '放进或取出存档文件' : 'Add or extract world and player files' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectPcGoal('editor')"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="509" :size="20" :standalone="standalone">
                    <SlidersHorizontal class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '使用存档编辑器修改物品 / 属性' : 'Use Save Editor (Edit Items & Stats)' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '修改人物 (.plr) 或地图 (.wld)' : 'Modify player stats or world maps' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectPcGoal('mod')"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="757" :size="20" :standalone="standalone">
                    <Wand2 class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '安装 MOD（tModLoader）' : 'Install Mods (tModLoader)' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '启用创意工坊 MOD' : 'Enable Steam Workshop mods' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>
          </div>
          </template>

          <!-- PC Final -->
          <template v-else-if="currentStep === 'pc_final'">
          <template v-if="state.goal === 'editor'">
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? '最终步骤 · 电脑存档编辑器' : 'Final Step · PC Save Editor' }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-3">
              {{ isZh ? '修改人物与地图存档' : 'Edit Character & World Saves' }}
            </h2>

            <!-- 交互式 OS 切换路径卡片 -->
            <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs text-[#5E504D] mb-3 flex flex-col gap-2">
              <div class="flex items-center gap-1 shadow-[inset_0_-1px_0_0_#EADFD9]">
                <button
                  v-for="item in PC_PATHS"
                  :key="item.os"
                  type="button"
                  :class="[
                    'px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors cursor-pointer border-b-2 rounded-t-md',
                    selectedPcOs === item.os
                      ? 'border-[#739CBF] text-[#2F658D] font-bold'
                      : 'border-transparent text-[#8E807C] font-semibold hover:text-[#4A3F3D]',
                  ]"
                  @click="selectedPcOs = item.os"
                >
                  {{ item.label }}
                </button>
              </div>
              <div>
                <template v-if="isZh">
                  先确保游戏处于<strong class="text-[#4A3F3D]">主页面</strong>再打开目录（人物在 <CopyChip text="Players" :toast-prefix="copyPrefix" />，地图在 <CopyChip text="Worlds" :toast-prefix="copyPrefix" />）：
                </template>
                <template v-else>
                  Stay on the game's <strong class="text-[#4A3F3D]">main menu</strong>, then open (<CopyChip text="Players" :toast-prefix="copyPrefix" /> / <CopyChip text="Worlds" :toast-prefix="copyPrefix" />):
                </template>
              </div>
              <CopyChip :text="activePcPath.path" :toast-prefix="copyPrefix" />
              <div class="text-[11px] text-[#8E807C]">
                {{ isZh ? activePcPath.shortcutZh : activePcPath.shortcutEn }}
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 mb-2.5">
              <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <span class="font-bold text-[#2F658D] text-sm">
                  {{ isZh ? '方法一：本站 TerraFlora / Terrasavr（改人物）' : 'Method 1: TerraFlora / Terrasavr (Characters)' }}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  class="bg-white border-[#C4D6E5] text-[#2F658D] hover:bg-[#EEF4F9]"
                  @click="openPlrEditor"
                >
                  {{ isZh ? '打开角色编辑器' : 'Open Editor' }}
                </Button>
              </div>
              <div class="text-xs text-[#5E504D] leading-relaxed">
                <template v-if="isZh">
                  1. 切换到「<strong class="text-[#4A3F3D]">角色存档</strong>」载入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> 目录下的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>。<br />
                  2. 修改后点 <strong class="text-[#4A3F3D]">导出 .plr</strong>，覆盖回原目录后在游戏主页面点进列表即可。
                </template>
                <template v-else>
                  1. Open <strong class="text-[#4A3F3D]">Character Editor</strong> and load your <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> from <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>.<br />
                  2. Export <strong class="text-[#4A3F3D]">.plr</strong>, replace the original file, and open the character list from the main menu.
                </template>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80">
              <div class="font-bold text-[#4A3F3D] text-sm mb-1">
                {{ isZh ? '方法二：桌面版 TEdit（改地图）' : 'Method 2: Desktop TEdit (Worlds)' }}
              </div>
              <div class="text-xs text-[#5E504D] leading-relaxed">
                {{
                  isZh
                    ? '下载运行 TEdit，打开 Worlds 中的 .wld 编辑地形与箱子后保存。'
                    : 'Run TEdit to open and edit .wld maps from Worlds, then save.'
                }}
              </div>
            </div>

            <div class="mt-3 p-3 rounded-xl bg-[#FDECEF] border border-[#F2C4CD] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#B84A5A] mb-0.5">{{ isZh ? '修改前先备份' : 'Backup Before Editing' }}</div>
              <div>
                {{
                  isZh
                    ? '修改前复制一份原 .plr 或 .wld 到其他文件夹留底。'
                    : 'Copy your original .plr or .wld file to another folder before editing.'
                }}
              </div>
            </div>
          </template>

          <template v-else-if="state.goal === 'mod'">
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? '最终步骤 · 电脑安装 MOD' : 'Final Step · PC Mod Setup' }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-3.5">
              {{ isZh ? '用 tModLoader 启动游戏并启用 MOD' : 'Launch with tModLoader & Enable Mods' }}
            </h2>

            <ol class="flex flex-col gap-2.5 text-xs text-[#5E504D] leading-relaxed">
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  {{
                    isZh
                      ? '在 Steam 商店搜索并安装免费的 tModLoader（需拥有原版泰拉瑞亚）。'
                      : 'Install free tModLoader from the Steam Store (requires owning Terraria).'
                  }}
                </div>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <template v-if="isZh">
                    在创意工坊点 <strong class="text-[#4A3F3D]">订阅</strong> 想要的 MOD，等待下载完成。
                  </template>
                  <template v-else>
                    Find mods in Steam Workshop, click <strong class="text-[#4A3F3D]">Subscribe</strong>, and wait for downloads.
                  </template>
                </div>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <template v-if="isZh">
                    从游戏库启动 <strong class="text-[#2F658D]">tModLoader</strong>，在 <strong class="text-[#4A3F3D]">MOD 管理</strong> 中启用并点 <strong class="text-[#4A3F3D]">重新加载</strong>。
                  </template>
                  <template v-else>
                    Launch <strong class="text-[#2F658D]">tModLoader</strong> from Steam, open <strong class="text-[#4A3F3D]">Manage Mods</strong>, enable them and click <strong class="text-[#4A3F3D]">Reload Mods</strong>.
                  </template>
                </div>
              </li>
            </ol>

            <div class="mt-3 p-3 rounded-xl bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#2F658D] mb-0.5">{{ isZh ? '联机与版本提示' : 'Multiplayer & Versions' }}</div>
              <div>
                {{
                  isZh
                    ? '联机需双方启用相同 MOD 列表；更新后若闪退先检查 MOD 与游戏版本是否匹配。'
                    : 'All multiplayer participants need matching enabled mods; check version compatibility on crashes.'
                }}
              </div>
            </div>
          </template>

          <template v-else>
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? '最终步骤 · 电脑导入/导出存档' : 'Final Step · PC Import / Export Saves' }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-3">
              {{ isZh ? '把存档放进对应的角色/地图目录' : 'Place Saves into Worlds / Players Folders' }}
            </h2>

            <!-- 交互式 OS 切换路径卡片 -->
            <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs text-[#5E504D] mb-3 flex flex-col gap-2">
              <div class="flex items-center gap-1 shadow-[inset_0_-1px_0_0_#EADFD9]">
                <button
                  v-for="item in PC_PATHS"
                  :key="item.os"
                  type="button"
                  :class="[
                    'px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors cursor-pointer border-b-2 rounded-t-md',
                    selectedPcOs === item.os
                      ? 'border-[#739CBF] text-[#2F658D] font-bold'
                      : 'border-transparent text-[#8E807C] font-semibold hover:text-[#4A3F3D]',
                  ]"
                  @click="selectedPcOs = item.os"
                >
                  {{ item.label }}
                </button>
              </div>
              <div>
                <template v-if="isZh">操作前确保游戏退回<strong class="text-[#4A3F3D]">主页面</strong>，再打开对应系统目录：</template>
                <template v-else>Return to the game's <strong class="text-[#4A3F3D]">main menu</strong> first, then open:</template>
              </div>
              <CopyChip :text="activePcPath.path" :toast-prefix="copyPrefix" />
              <div class="text-[11px] text-[#8E807C]">
                {{ isZh ? activePcPath.shortcutZh : activePcPath.shortcutEn }}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs">
                <div class="font-bold text-[#2F658D] mb-1">{{ isZh ? '地图文件夹' : 'World Folder' }}</div>
                <div>{{ isZh ? '目录：' : 'Folder: ' }}<CopyChip text="Worlds" :toast-prefix="copyPrefix" /></div>
                <div class="text-[#8E807C] mt-1">{{ isZh ? '放 .wld 地图文件' : 'Put .wld files here' }}</div>
              </div>
              <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs">
                <div class="font-bold text-[#2F658D] mb-1">{{ isZh ? '人物文件夹' : 'Character Folder' }}</div>
                <div>{{ isZh ? '目录：' : 'Folder: ' }}<CopyChip text="Players" :toast-prefix="copyPrefix" /></div>
                <div class="text-[#8E807C] mt-1">{{ isZh ? '放 .plr 人物文件' : 'Put .plr files here' }}</div>
              </div>
            </div>

            <ol class="flex flex-col gap-2 text-xs text-[#5E504D] leading-relaxed mb-3">
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[10px] font-bold flex items-center justify-center shrink-0">{{ isZh ? '导' : 'In' }}</span>
                <div>
                  <strong class="text-[#4A3F3D]">{{ isZh ? '导入：' : 'Import: ' }}</strong>
                  {{
                    isZh
                      ? '.wld 放进 Worlds，.plr 放进 Players，在游戏主页面点进列表即可看到。'
                      : 'Put .wld into Worlds and .plr into Players, then open the list from the main menu.'
                  }}
                </div>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[10px] font-bold flex items-center justify-center shrink-0">{{ isZh ? '出' : 'Out' }}</span>
                <div>
                  <strong class="text-[#4A3F3D]">{{ isZh ? '导出：' : 'Export: ' }}</strong>
                  {{
                    isZh
                      ? '直接从目录内复制 .wld 或 .plr 分享或备份。'
                      : 'Copy .wld or .plr directly out of these folders to share or backup.'
                  }}
                </div>
              </li>
            </ol>

            <div class="p-3 rounded-xl bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#2F658D] mb-0.5">{{ isZh ? 'Steam 云存档与 .bak 备份' : 'Steam Cloud & Backups' }}</div>
              <div>
                {{
                  isZh
                    ? '开启 Steam 云存档时替换文件可能被覆盖，可先关闭云存档再替换；带 .bak / .bak2 后缀删掉后缀可作正式存档。'
                    : 'Disable Steam Cloud temporarily if replaced saves get overwritten; delete .bak / .bak2 suffixes to restore backups.'
                }}
              </div>
              <div class="mt-2 pt-2 border-t border-[#C4D6E5]/70 flex items-center justify-between gap-2 flex-wrap">
                <span>{{ isZh ? '手机心动版地图显示不了？可用「地图存档」转换签名。' : 'XD edition world not loading? Convert its signature.' }}</span>
                <button
                  type="button"
                  class="font-bold text-[#2F658D] hover:underline cursor-pointer"
                  @click="openWorldTool"
                >
                  {{ isZh ? '前往地图存档 →' : 'Open World Tool →' }}
                </button>
              </div>
            </div>
          </template>
          </template>

          <!-- Android Prep -->
          <template v-else-if="currentStep === 'android_prep'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ meta.name }} · {{ isZh ? '准备工作' : 'Preparation' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-3.5">
            <template v-if="state.goal === 'editor'">{{ isZh ? '准备文件管理器与修改方式' : 'Prepare File Manager & Editor' }}</template>
            <template v-else-if="state.goal === 'save'">{{ isZh ? '下载存档并装好文件管理器' : 'Download Save & File Manager' }}</template>
            <template v-else>{{ isZh ? '下载补丁并装好文件管理器' : 'Download Patch & File Manager' }}</template>
          </h2>

          <ol class="flex flex-col gap-2.5 text-xs text-[#5E504D] leading-relaxed">
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <template v-if="isZh">
                  装一个能进 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code> 的文件管理器。推荐 <strong class="text-[#4A3F3D]">MT 管理器</strong>（<a class="text-[#2F658D] border-b border-[#C4D6E5] hover:border-[#2F658D]" href="https://mt2.cn/download/" target="_blank" rel="noopener">官网下载</a>）或 <strong class="text-[#4A3F3D]">ZArchiver</strong>，装好后先打开一次并允许存储权限。
                </template>
                <template v-else>
                  Install <strong class="text-[#4A3F3D]">MT Manager</strong> (<a class="text-[#2F658D] border-b border-[#C4D6E5]" href="https://mt2.cn/download/" target="_blank" rel="noopener">Official Site</a>) or <strong class="text-[#4A3F3D]">ZArchiver</strong>, launch it once, and grant basic storage permissions.
                </template>
              </div>
            </li>

            <li v-if="state.goal === 'editor'" class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <template v-if="isZh">
                  若只改人物（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>），可直接使用本站「角色存档」；若改地图或用手机端编辑器 App，请先安装并打开确认可运行。
                </template>
                <template v-else>
                  To edit characters (<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>), use TerraFlora directly; otherwise install and launch your mobile Save Editor app once.
                </template>
              </div>
            </li>
            <li v-else class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <template v-if="state.goal === 'patch'">
                  {{ isZh ? '把补丁下载到手机（通常在 Download），在 MT 管理器一侧窗口定位到该文件。' : 'Download the patch to your phone and locate it on one pane of MT Manager (usually Download).' }}
                </template>
                <template v-else>
                  {{ isZh ? '把要导入的存档下载到手机并在 MT 一侧定位到它；仅导出自己的存档可跳过此步。' : 'Locate your downloaded save file on one pane of MT Manager (skip if only exporting).' }}
                </template>
              </div>
            </li>
          </ol>

          <div
            v-if="state.goal !== 'editor'"
            class="mt-3 p-3 rounded-xl bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed"
          >
            <div class="font-bold text-[#2F658D] mb-0.5">{{ isZh ? '双窗口口诀' : 'Dual-Pane Tip' }}</div>
            <div>
              <template v-if="isZh">
                MT 管理器左右两个窗口独立浏览：一侧留着下载文件，另一侧进入游戏 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code> 目录。下一步先检测权限。
              </template>
              <template v-else>
                Keep your downloaded file on one MT Manager pane and navigate to <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code> on the other. Let's check data access next.
              </template>
            </div>
          </div>
          <div
            v-else
            class="mt-3 p-3 rounded-xl bg-[#FDECEF] border border-[#F2C4CD] text-xs text-[#5E504D] leading-relaxed"
          >
            <div class="font-bold text-[#B84A5A] mb-0.5">{{ isZh ? '权限与备份提示' : 'Permission & Backup' }}</div>
            <div>
              {{
                isZh
                  ? '安卓 11+ 默认限制访问 Android/data，下一步先检测权限；修改前建议先复制备份原 .plr / .wld。'
                  : 'Android 11+ restricts Android/data. We will check access next; always backup original files before editing.'
              }}
            </div>
          </div>

          <Button
            class="w-full mt-3.5 h-9 bg-[#739CBF] hover:bg-[#5F87A8] text-white font-semibold text-xs gap-2"
            @click="goTo('android_check_perm')"
          >
            <span>{{ isZh ? '已准备好，检测 data 权限' : 'Ready, Check Android/data Access' }}</span>
            <ArrowRight class="w-4 h-4" />
          </Button>
          </template>

          <!-- Android Permission Check -->
          <template v-else-if="currentStep === 'android_check_perm'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? '安卓/鸿蒙 · 权限检测' : 'Android / HarmonyOS · Access Check' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-1.5">
            {{ isZh ? '检查 Android/data 访问权限' : 'Check Android/data Access Permission' }}
          </h2>
          <p class="text-xs text-[#8E807C] mb-3">
            <template v-if="isZh">
              在 MT 管理器<strong>另一侧窗口</strong>进入：<CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" />
            </template>
            <template v-else>
              On the target pane in MT Manager, navigate to: <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" />
            </template>
          </p>

          <div class="p-3 rounded-xl bg-[#FDECEF] border border-[#F2C4CD] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#B84A5A] mb-0.5">{{ isZh ? '注意目录名' : 'Check Folder Name' }}</div>
            <div>
              <template v-if="isZh">
                若同时看到 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.Android</code> 和 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android</code>，务必点没有小数点的 <strong>Android</strong>。
              </template>
              <template v-else>
                Tap <strong>Android</strong> without a leading dot, not <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.Android</code>.
              </template>
            </div>
          </div>

          <p class="font-bold text-[#4A3F3D] text-xs mt-3.5 mb-2">
            {{ isZh ? '点进 data 后显示哪种情况？' : 'What happens when you open data?' }}
          </p>

          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectDataPerm(true)"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="327" :size="20" :standalone="standalone">
                    <Check class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '能看到里面的一堆应用文件夹' : 'I can see package folders normally' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '可直接跳过授权进入下一步' : 'Skip Shizuku authorization' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>

            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
              @click="selectDataPerm(false)"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-[#EFE7E2] border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                  <GuideIcon :item-id="329" :size="20" :standalone="standalone">
                    <Lock class="w-[18px] h-[18px]" />
                  </GuideIcon>
                </div>
                <div>
                  <div class="text-sm font-bold text-[#4A3F3D]">
                    {{ isZh ? '提示“没有权限”或显示为空' : 'Shows "Access Denied" or empty' }}
                  </div>
                  <div class="text-xs text-[#8E807C] mt-0.5">
                    {{ isZh ? '按 Shizuku 流程解锁权限' : 'Unlock via Shizuku' }}
                  </div>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
            </button>
          </div>
          </template>

          <!-- Shizuku Guide -->
          <template v-else-if="currentStep === 'shizuku_guide'">
          <div class="mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? '安卓/鸿蒙 · 解锁 data 权限' : 'Android / HarmonyOS · Unlock Data' }}
            </span>
          </div>
          <h2 class="text-base font-bold text-[#4A3F3D] mb-3">
            {{ isZh ? '用 Shizuku 打开 Android/data' : 'Unlock Android/data Using Shizuku' }}
          </h2>

          <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs mb-3 flex flex-col gap-2">
            <div class="text-[#8E807C]">
              {{ isZh ? '安卓 11+ 免电脑可通过「无线调试」配对启动 Shizuku：' : 'On Android 11+, start Shizuku without a PC via Wireless Debugging:' }}
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <a
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#739CBF] text-white font-semibold hover:bg-[#5F87A8] transition-colors"
                :href="isZh ? 'https://shizuku.rikka.app/zh-hans/guide/setup/#%E9%80%9A%E8%BF%87%E6%97%A0%E7%BA%BF%E8%B0%83%E8%AF%95%E5%90%AF%E5%8A%A8' : 'https://shizuku.rikka.app/guide/setup/#start-via-wireless-debugging'"
                target="_blank"
                rel="noopener"
              >
                <span>{{ isZh ? '无线调试启动教程 →' : 'Wireless Debugging Guide →' }}</span>
              </a>
              <a
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#EADFD9] text-[#4A3F3D] font-semibold hover:bg-[#F9D6DB]/40 transition-colors"
                :href="isZh ? 'https://shizuku.rikka.app/zh-hans/download/' : 'https://shizuku.rikka.app/download/'"
                target="_blank"
                rel="noopener"
              >
                <span>{{ isZh ? '下载 Shizuku' : 'Download Shizuku' }}</span>
              </a>
            </div>
          </div>

          <ol class="flex flex-col gap-2.5 text-xs text-[#5E504D] leading-relaxed">
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <template v-if="isZh">
                  按官方教程配对启动 Shizuku，主页显示 <strong class="text-[#2F658D]">已启动</strong>。
                </template>
                <template v-else>
                  Pair and start Shizuku until it shows <strong class="text-[#2F658D]">Shizuku is running</strong>.
                </template>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <template v-if="isZh">
                  打开「已授权应用」，勾选 <strong class="text-[#4A3F3D]">MT 管理器</strong>（或 ZArchiver）；若有装存档编辑器 App 也一并打开。
                </template>
                <template v-else>
                  Open <strong class="text-[#4A3F3D]">Authorized Applications</strong> and enable <strong class="text-[#4A3F3D]">MT Manager</strong> (and Save Editor if installed).
                </template>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                <template v-if="isZh">
                  <strong class="text-[#B84A5A]">彻底划掉文件管理器后台重开</strong>，再进 <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" /> 即可看到目录。
                </template>
                <template v-else>
                  <strong class="text-[#B84A5A]">Force close and reopen your file manager</strong>, then navigate to <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" />.
                </template>
              </div>
            </li>
          </ol>

          <Button
            class="w-full mt-3.5 h-9 bg-[#739CBF] hover:bg-[#5F87A8] text-white font-semibold text-xs gap-2"
            @click="goTo('android_final')"
          >
            <span>{{ isZh ? '已能打开 data，进入下一步' : 'Data accessible, continue' }}</span>
            <ArrowRight class="w-4 h-4" />
          </Button>
          </template>

          <!-- Android Final -->
          <template v-else-if="currentStep === 'android_final'">
          <template v-if="state.goal === 'patch'">
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? `最终步骤 · ${meta.name}安装补丁` : `Final Step · ${meta.name} Patch` }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-1.5">
              {{ isZh ? '替换游戏底层补丁文件' : 'Replace Core Patch Files' }}
            </h2>
            <p class="text-xs text-[#8E807C] mb-3">
              {{ isZh ? '在 MT 管理器进入 data 的那一侧继续打开：' : 'On the Android/data pane in MT Manager, open:' }}
            </p>

            <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs mb-3 flex flex-col gap-1.5">
              <div class="flex flex-wrap items-center gap-1.5">
                <CopyChip text="Android" :toast-prefix="copyPrefix" />
                <span>→</span>
                <CopyChip text="data" :toast-prefix="copyPrefix" />
                <span>→</span>
                <CopyChip :text="meta.androidPkg" :toast-prefix="copyPrefix" />
                <span>→</span>
                <CopyChip text="files" :toast-prefix="copyPrefix" />
                <span>→</span>
                <CopyChip text="il2cpp" :toast-prefix="copyPrefix" />
                <span>→</span>
                <CopyChip text="Metadata" :toast-prefix="copyPrefix" />
              </div>
              <div class="text-[11px] text-[#8E807C]">
                {{ isZh ? '补丁目录不包含数字 ID 文件夹，两版本均在包名下的 files / il2cpp / Metadata。' : 'No numeric ID folder for patches on either edition; open files / il2cpp / Metadata directly under the package folder.' }}
              </div>
            </div>

            <ol class="flex flex-col gap-2 text-xs text-[#5E504D] leading-relaxed mb-3">
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <template v-if="isZh">
                    进入 <CopyChip text="Metadata" :toast-prefix="copyPrefix" /> 找到原版同名文件（通常是 <CopyChip text="global-metadata.dat" :toast-prefix="copyPrefix" />），建议先长按复制留一份备份。
                  </template>
                  <template v-else>
                    Find <CopyChip text="global-metadata.dat" :toast-prefix="copyPrefix" /> inside <CopyChip text="Metadata" :toast-prefix="copyPrefix" /> and backup a copy first.
                  </template>
                </div>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <template v-if="isZh">
                    在另一侧（Download）长按补丁文件选择<strong class="text-[#4A3F3D]">复制 / 移动</strong>到 Metadata，弹窗选择<strong class="text-[#2F658D]">替换</strong>，重启游戏生效。
                  </template>
                  <template v-else>
                    Copy/Move your patch file from Download into Metadata, choose <strong class="text-[#2F658D]">Replace</strong>, and restart Terraria.
                  </template>
                </div>
              </li>
            </ol>

            <div class="p-3 rounded-xl bg-[#FDECEF] border border-[#F2C4CD] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#B84A5A] mb-0.5">{{ isZh ? '防闪退提示' : 'Crash Prevention' }}</div>
              <div>
                {{
                  isZh
                    ? '若替换后打开游戏闪退，说明补丁版本与当前游戏版本号不匹配。'
                    : 'If Terraria crashes on launch, the patch version mismatches your game build.'
                }}
              </div>
            </div>
          </template>

          <template v-else-if="state.goal === 'editor'">
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? `最终步骤 · ${meta.name}存档编辑器` : `Final Step · ${meta.name} Save Editor` }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-3">
              {{ isZh ? '修改人物或地图存档' : 'Modify Character & World Saves on Android' }}
            </h2>

            <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs mb-3 space-y-1.5">
              <div>
                {{ isZh ? '游戏存档路径：' : 'Game path: ' }}
                <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" /> → <CopyChip :text="meta.androidPkg" :toast-prefix="copyPrefix" />
              </div>
              <div class="text-[#5E504D]">
                <template v-if="meta.isXD">
                  <template v-if="isZh">再点进 <strong class="text-[#B84A5A]">一串数字的心动ID</strong>，里面就是 <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /> 和 <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" />。</template>
                  <template v-else>Open the <strong class="text-[#B84A5A]">numeric XD ID folder</strong> for <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /> and <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" />.</template>
                </template>
                <template v-else>
                  <template v-if="isZh">进去后直接可见 <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /> 和 <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" />。</template>
                  <template v-else>Directly inside are <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /> and <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" />.</template>
                </template>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 mb-2.5">
              <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <span class="font-bold text-[#2F658D] text-sm">
                  {{ isZh ? '方法一：用本站 TerraFlora 改人物（推荐）' : 'Method 1: TerraFlora Web Editor (Recommended)' }}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  class="bg-white border-[#C4D6E5] text-[#2F658D] hover:bg-[#EEF4F9]"
                  @click="openPlrEditor"
                >
                  {{ isZh ? '打开角色编辑器' : 'Open Editor' }}
                </Button>
              </div>
              <div class="text-xs text-[#5E504D] leading-relaxed">
                <template v-if="isZh">
                  1. 用 MT 把要改的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 复制到 <CopyChip text="Download" :toast-prefix="copyPrefix" />（安卓 11+ 浏览器无法直读 data 目录）。<br />
                  2. 在本站导入编辑后点「导出 .plr」，再用 MT 覆盖回 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.playerDir }}</code>，回到游戏主页面点进列表即可。
                </template>
                <template v-else>
                  1. Copy your <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> to <CopyChip text="Download" :toast-prefix="copyPrefix" /> with MT Manager.<br />
                  2. Edit in TerraFlora, export <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>, copy back to <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.playerDir }}</code>, and open the list from the main menu.
                </template>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80">
              <div class="font-bold text-[#4A3F3D] text-sm mb-1">
                {{ isZh ? '方法二：手机端存档编辑器 App' : 'Method 2: Mobile Save Editor App' }}
              </div>
              <div class="text-xs text-[#5E504D] leading-relaxed">
                {{
                  isZh
                    ? '打开编辑器 App（若提示 Shizuku 授权点允许），按上方路径打开 .plr 或 .wld 保存后，在游戏主页面点进列表生效。'
                    : 'Open your Save Editor app (allow Shizuku if prompted), pick the save at the path above, save, and open the list from the main menu.'
                }}
              </div>
            </div>
          </template>

          <template v-else>
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? `最终步骤 · ${meta.name}导入/导出存档` : `Final Step · ${meta.name} Import / Export` }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-1.5">
              {{ isZh ? '将存档放入对应的角色/地图目录' : 'Put Saves into Worlds / Players Folder' }}
            </h2>
            <p class="text-xs text-[#8E807C] mb-3">
              {{ isZh ? '在 MT 管理器进入 data 的那一侧窗口操作：' : 'Navigate on the Android/data pane in MT Manager:' }}
            </p>

            <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs mb-3 space-y-1.5">
              <div>
                {{ isZh ? '1. 进入游戏包名：' : '1. Open package folder: ' }}<CopyChip :text="meta.androidPkg" :toast-prefix="copyPrefix" />
              </div>
              <div>
                <template v-if="meta.isXD">
                  <template v-if="isZh">2. 点进 <strong class="text-[#B84A5A]">一串纯数字</strong> 的心动账号 ID 文件夹（有多个则代表登过多个账号）。</template>
                  <template v-else>2. Open the <strong class="text-[#B84A5A]">numeric XD account ID folder</strong>.</template>
                </template>
                <template v-else>
                  <template v-if="isZh">2. 国际版没有数字 ID 文件夹，进去直接可见 <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> 和 <CopyChip text="Players" :toast-prefix="copyPrefix" />。</template>
                  <template v-else>2. Global edition has NO numeric folder; <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> and <CopyChip text="Players" :toast-prefix="copyPrefix" /> are right inside.</template>
                </template>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
              <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs">
                <div class="font-bold text-[#2F658D] mb-1">{{ isZh ? '地图文件夹' : 'World Folder' }}</div>
                <div>{{ isZh ? '目录：' : 'Name: ' }}<CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /></div>
                <div class="text-[#8E807C] mt-1">{{ isZh ? '放 .wld 地图文件' : 'Put .wld files here' }}</div>
              </div>
              <div class="p-3 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs">
                <div class="font-bold text-[#2F658D] mb-1">{{ isZh ? '人物文件夹' : 'Player Folder' }}</div>
                <div>{{ isZh ? '目录：' : 'Name: ' }}<CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" /></div>
                <div class="text-[#8E807C] mt-1">{{ isZh ? '放 .plr 人物文件' : 'Put .plr files here' }}</div>
              </div>
            </div>

            <ol class="flex flex-col gap-2 text-xs text-[#5E504D] leading-relaxed mb-3">
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[10px] font-bold flex items-center justify-center shrink-0">{{ isZh ? '导' : 'In' }}</span>
                <div>
                  <strong class="text-[#4A3F3D]">{{ isZh ? '导入：' : 'Import: ' }}</strong>
                  {{
                    isZh
                      ? `将下载的存档复制/移动到 ${meta.worldDir} 或 ${meta.playerDir}，回到游戏主页面点进列表即可。`
                      : `Copy/Move downloaded saves into ${meta.worldDir} or ${meta.playerDir}, then open the list from the main menu.`
                  }}
                </div>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#2F658D] text-[10px] font-bold flex items-center justify-center shrink-0">{{ isZh ? '出' : 'Out' }}</span>
                <div>
                  <strong class="text-[#4A3F3D]">{{ isZh ? '导出：' : 'Export: ' }}</strong>
                  {{
                    isZh
                      ? '长按文件夹内的 .wld 或 .plr 点击「分享」即可发送或备份。'
                      : 'Long-press any .wld or .plr file and choose Share to send or backup.'
                  }}
                </div>
              </li>
            </ol>

            <div class="p-3 rounded-xl bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#2F658D] mb-0.5">
                {{ meta.isXD ? (isZh ? '心动云存档与 .bak 备份' : 'Cloud Saves & .bak Backups') : (isZh ? '.bak 备份恢复' : '.bak Backup Recovery') }}
              </div>
              <div>
                <template v-if="meta.isXD">
                  <template v-if="isZh">① 心动云存档须先在游戏内<strong>下载到本地</strong>才会出现在数字目录；<br /></template>
                  <template v-else>① Download XD cloud saves to local in-game first;<br /></template>
                </template>
                <template v-if="isZh">
                  <span v-if="meta.isXD">② </span>带 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak / .bak2</code> 后缀删掉后缀可作正式存档。
                </template>
                <template v-else>
                  <span v-if="meta.isXD">② </span>Remove <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak / .bak2</code> suffixes to restore auto-backups.
                </template>
              </div>
              <div class="mt-2 pt-2 border-t border-[#C4D6E5]/70 flex items-center justify-between gap-2 flex-wrap">
                <span>{{ isZh ? '国服 / 国际服地图不互通？可用「地图存档」转换签名。' : 'Map edition mismatch? Convert its signature.' }}</span>
                <button
                  type="button"
                  class="font-bold text-[#2F658D] hover:underline cursor-pointer"
                  @click="openWorldTool"
                >
                  {{ isZh ? '前往地图存档 →' : 'Open World Tool →' }}
                </button>
              </div>
            </div>
          </template>
          </template>

          <!-- iOS Final -->
          <template v-else-if="currentStep === 'ios_final'">
          <template v-if="state.goal === 'patch'">
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FDECEF] border border-[#F2C4CD] text-[#B84A5A]">
                {{ isZh ? '苹果 iOS 端 · 功能限制说明' : 'Apple iOS · Patch Notice' }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-1.5">
              {{ isZh ? '苹果端不支持安装底层补丁' : 'Core Patches Unsupported on iOS' }}
            </h2>
            <p class="text-xs text-[#5E504D] mb-3 leading-relaxed">
              {{
                isZh
                  ? '因 iOS 应用沙盒限制，无法访问游戏内部 il2cpp/Metadata 目录，不能安装修改游戏底层代码的补丁（无需下载 MT 管理器）。'
                  : 'iOS sandbox blocks access to internal app code (no il2cpp/Metadata directory), so binary patches cannot be installed.'
              }}
            </p>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 mb-3">
              <div class="font-bold text-[#2F658D] text-sm mb-1.5">
                {{ isZh ? '可用替代方案：' : 'Supported Alternatives:' }}
              </div>
              <div class="text-xs text-[#5E504D] leading-relaxed">
                <template v-if="isZh">
                  1. <strong class="text-[#4A3F3D]">导入全物品存档</strong>：苹果端完全支持直接导入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> 地图和 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 人物。<br />
                  2. <strong class="text-[#4A3F3D]">使用网页角色编辑器</strong>：在 Safari 打开本站可直接向人物背包添加装备材料。
                </template>
                <template v-else>
                  1. <strong class="text-[#4A3F3D]">Import All-Item Saves</strong>: <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> and <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> saves work natively on iOS.<br />
                  2. <strong class="text-[#4A3F3D]">Use Web Save Editor</strong>: Open TerraFlora in Safari to edit your character inventory directly.
                </template>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <Button class="bg-[#739CBF] hover:bg-[#5F87A8] text-white text-xs font-semibold h-9" @click="selectGoal('save')">
                {{ isZh ? '查看导存档步骤' : 'Import Save Guide' }}
              </Button>
              <Button variant="secondary" class="bg-[#F9D6DB]/70 hover:bg-[#F9D6DB] text-[#4A3F3D] border border-[#EADFD9] text-xs font-semibold h-9" @click="selectGoal('editor')">
                {{ isZh ? '看修改器教程' : 'Web Editor Guide' }}
              </Button>
            </div>
          </template>

          <template v-else-if="state.goal === 'editor'">
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? `苹果 ${meta.name} · 存档编辑器` : `Apple ${meta.name} · Save Editor` }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-3">
              {{ isZh ? '免越狱修改人物物品与属性' : 'Modify Items & Stats (No Jailbreak)' }}
            </h2>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 mb-2.5">
              <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <span class="font-bold text-[#2F658D] text-sm">
                  {{ isZh ? '方法一：本站 TerraFlora / Terrasavr' : 'Method 1: TerraFlora / Terrasavr' }}
                </span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EEF4F9] text-[#2F658D] border border-[#C4D6E5]">
                  {{ isZh ? '推荐 · 免安装' : 'Recommended' }}
                </span>
              </div>
              <div class="text-xs text-[#5E504D] leading-relaxed">
                <template v-if="isZh">
                  1. 用 Safari 打开本站，点击导入并选择 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.isXD ? '我的 iPhone / 泰拉瑞亚 / [心动ID] / Players' : '我的 iPhone / Terraria / Players' }}</code> 下的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>。<br />
                  2. 编辑后点导出下载，将新 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 存回原目录覆盖，回到游戏主页面点进列表即可。
                </template>
                <template v-else>
                  1. Open TerraFlora in Safari and load your <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> from <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.isXD ? 'On My iPhone / Terraria / [XD ID] / Players' : 'On My iPhone / Terraria / Players' }}</code>.<br />
                  2. Edit and export <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>, move it back to overwrite in Players, and open the list from the main menu.
                </template>
              </div>
              <Button
                variant="outline"
                size="xs"
                class="mt-2.5 bg-white border-[#C4D6E5] text-[#2F658D] hover:bg-[#EEF4F9]"
                @click="openPlrEditor"
              >
                {{ isZh ? '打开角色编辑器' : 'Open Character Editor' }}
              </Button>
            </div>

            <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 mb-3">
              <div class="font-bold text-[#4A3F3D] text-sm mb-1">
                {{ isZh ? '方法二：App Store 编辑器' : 'Method 2: App Store Editor' }}
              </div>
              <div class="text-xs text-[#8E807C] leading-relaxed">
                {{
                  isZh
                    ? 'App Store 搜索 TR Save Editor 等工具选择游戏文件夹编辑，但功能不如网页版完整。'
                    : 'Search TR Save Editor on App Store; note mobile app editors often have limited features.'
                }}
              </div>
            </div>

            <div class="p-3 rounded-xl bg-[#FDECEF] border border-[#F2C4CD] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#B84A5A] mb-0.5">{{ isZh ? '修改前先备份' : 'Backup First' }}</div>
              <div>
                {{
                  isZh
                    ? '编辑前务必在“文件”App 里长按原 .plr 复制一份留底。'
                    : 'Duplicate your original .plr in Apple Files before editing.'
                }}
              </div>
            </div>
          </template>

          <template v-else>
            <div class="mb-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
                {{ isZh ? `苹果 ${meta.name} · 导入与导出存档` : `Apple ${meta.name} · Import & Export` }}
              </span>
            </div>
            <h2 class="text-base font-bold text-[#4A3F3D] mb-2.5">
              {{ isZh ? '通过苹果“文件”App 管理存档' : 'Manage Saves via Apple "Files" App' }}
            </h2>

            <!-- 方式切换 -->
            <div class="flex items-center gap-1 shadow-[inset_0_-1px_0_0_#EADFD9] mb-3 overflow-x-auto no-scrollbar">
              <button
                v-for="tab in [
                  { id: 'import' as const, label: isZh ? '文件 App 导入' : 'Import' },
                  { id: 'export' as const, label: isZh ? '导出分享' : 'Export' },
                  { id: 'cable' as const, label: isZh ? '电脑数据线' : 'USB Cable' },
                ]"
                :key="tab.id"
                type="button"
                :class="[
                  'px-3 py-2 text-xs whitespace-nowrap transition-colors cursor-pointer border-b-2 rounded-t-md',
                  iosSaveTab === tab.id
                    ? 'border-[#739CBF] text-[#2F658D] font-bold'
                    : 'border-transparent text-[#8E807C] font-semibold hover:text-[#4A3F3D]',
                ]"
                @click="iosSaveTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>

            <div v-if="iosSaveTab === 'import'" class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs text-[#5E504D] leading-relaxed mb-3">
              <template v-if="isZh">
                1. 下载存档（地图 <CopyChip text=".wld" :toast-prefix="copyPrefix" />，人物 <CopyChip text=".plr" :toast-prefix="copyPrefix" />），点分享选择 <strong class="text-[#2F658D]">存储到“文件”</strong>。<br />
                2. 进入：<strong class="text-[#4A3F3D]">浏览</strong> → <strong class="text-[#4A3F3D]">我的 iPhone</strong> →
                <template v-if="meta.isXD">
                  <strong class="text-[#2F658D]">泰拉瑞亚</strong> → <strong class="text-[#B84A5A]">一串数字的心动ID</strong>
                </template>
                <template v-else>
                  <strong class="text-[#2F658D]">Terraria</strong>（国际版无数字 ID 文件夹）
                </template>。<br />
                3. 地图放 <CopyChip text="Worlds" :toast-prefix="copyPrefix" />，人物放 <CopyChip text="Players" :toast-prefix="copyPrefix" />，存储后回到游戏主页面点进列表即可。
              </template>
              <template v-else>
                1. Download save (<CopyChip text=".wld" :toast-prefix="copyPrefix" /> / <CopyChip text=".plr" :toast-prefix="copyPrefix" />) -> Share -> <strong class="text-[#2F658D]">Save to Files</strong>.<br />
                2. Browse to <strong class="text-[#4A3F3D]">On My iPhone</strong> →
                <template v-if="meta.isXD">
                  <strong class="text-[#2F658D]">Terraria</strong> → <strong class="text-[#B84A5A]">Numeric XD ID</strong>
                </template>
                <template v-else>
                  <strong class="text-[#2F658D]">Terraria</strong>
                </template>.<br />
                3. Put worlds in <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> and players in <CopyChip text="Players" :toast-prefix="copyPrefix" />, tap Save, then open the list from the main menu.
              </template>
            </div>

            <div v-else-if="iosSaveTab === 'export'" class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs text-[#5E504D] leading-relaxed mb-3">
              <template v-if="isZh">
                打开“文件”App，进入相同路径下的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds</code> 或 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>，长按要导出的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> / <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 点击「共享」即可发送或备份。
              </template>
              <template v-else>
                Open Apple Files, browse to <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds</code> or <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>, long-press the file and tap Share.
              </template>
            </div>

            <div v-else class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]/80 text-xs text-[#5E504D] leading-relaxed mb-3">
              <template v-if="isZh">
                1. 数据线连电脑并在手机上点<strong class="text-[#4A3F3D]">信任此电脑</strong>。<br />
                2. macOS 在访达选中设备切到「文件」；Windows 打开 iTunes /「Apple 设备」→ 文件共享。<br />
                3. 选 <strong class="text-[#2F658D]">Terraria</strong>{{ meta.isXD ? '，进入数字心动 ID 文件夹' : '' }}，把 <CopyChip text=".wld" :toast-prefix="copyPrefix" /> 拖进 <CopyChip text="Worlds" :toast-prefix="copyPrefix" />、<CopyChip text=".plr" :toast-prefix="copyPrefix" /> 拖进 <CopyChip text="Players" :toast-prefix="copyPrefix" /> 替换，回到游戏主页面点进列表即可。
              </template>
              <template v-else>
                1. Connect iPhone via USB and tap <strong class="text-[#4A3F3D]">Trust</strong>.<br />
                2. macOS: Finder -> Files tab. Windows: iTunes / Apple Devices -> File Sharing.<br />
                3. Open <strong class="text-[#2F658D]">Terraria</strong>{{ meta.isXD ? ' -> numeric XD ID' : '' }}, drag saves into <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> / <CopyChip text="Players" :toast-prefix="copyPrefix" />, and open the list from the main menu.
              </template>
            </div>

            <div class="p-3 rounded-xl bg-[#FDECEF] border border-[#F2C4CD] text-xs text-[#5E504D] leading-relaxed">
              <div class="font-bold text-[#B84A5A] mb-0.5">{{ isZh ? '苹果端提醒' : 'iOS Notice' }}</div>
              <div>
                <template v-if="meta.isXD">
                  <template v-if="isZh">① 心动版云存档须先上游戏<strong>下载到本地</strong>才会显示；<br /></template>
                  <template v-else>① Download XD cloud saves to local in-game first;<br /></template>
                </template>
                <template v-if="isZh">
                  <span v-if="meta.isXD">② </span>切勿放入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">OldSaves</code> 文件夹，否则无法读取。
                </template>
                <template v-else>
                  <span v-if="meta.isXD">② </span>Never place files in <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">OldSaves</code>.
                </template>
              </div>
              <div class="mt-2 pt-2 border-t border-[#F2C4CD]/80 flex items-center justify-between gap-2 flex-wrap">
                <span>{{ isZh ? '国服 / 国际服地图不互通？可用「地图存档」转换签名。' : 'Map edition mismatch? Convert its signature.' }}</span>
                <button
                  type="button"
                  class="font-bold text-[#2F658D] hover:underline cursor-pointer"
                  @click="openWorldTool"
                >
                  {{ isZh ? '前往地图存档 →' : 'Open World Tool →' }}
                </button>
              </div>
            </div>
          </template>
          </template>
        </CardContent>
      </Card>

      <!-- 底部操作栏：完成具体路线后提供复制纯文字教程 -->
      <div v-if="state.history.length > 1" class="flex items-center gap-2">
        <Button
          variant="outline"
          class="flex-1 bg-white border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 text-xs font-semibold h-9 gap-1.5"
          @click="goBack"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>{{ isZh ? '上一步' : 'Back' }}</span>
        </Button>

        <Button
          v-if="isFinalStep"
          variant="default"
          class="bg-[#739CBF] hover:bg-[#5f87a8] text-white text-xs font-semibold h-9 px-3.5 gap-1.5"
          @click="copySummaryText"
        >
          <Copy class="w-3.5 h-3.5" />
          <span>{{ isZh ? '复制文字教程' : 'Copy Guide' }}</span>
        </Button>

        <Button
          variant="outline"
          class="bg-white border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D] hover:bg-[#F9D6DB]/40 text-xs font-semibold h-9 px-3 gap-1.5"
          @click="resetWizard"
        >
          <Home class="w-3.5 h-3.5" />
          <span>{{ isZh ? '重选' : 'Restart' }}</span>
        </Button>
      </div>
    </template>

    <!-- 完整文字教程导出栏 -->
    <div
      v-if="viewMode === 'quick' || !isFinalStep"
      class="bg-white border border-[#EADFD9] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2.5 shadow-2xs"
    >
      <span class="text-xs text-[#8E807C]">
        {{ isZh ? '可将完整文字教程发群，或直接粘贴给 AI 追问' : 'Share text guide or paste directly to AI' }}
      </span>
      <Button
        variant="outline"
        size="sm"
        class="h-8 px-3 text-xs font-semibold bg-[#FFF7F2] border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/45 gap-1.5 shrink-0"
        @click="copyAllGuideText"
      >
        <Copy class="w-3.5 h-3.5 text-[#739CBF]" />
        <span>{{ isZh ? '复制文字教程' : 'Copy Guide' }}</span>
      </Button>
    </div>

    <!-- 常见排查手风琴弹窗 -->
    <AppModal
      :open="troubleshootOpen"
      :title="isZh ? '常见排查' : 'Troubleshooting FAQ'"
      max-width-class="max-w-lg"
      body-class="p-3.5 overflow-y-auto flex-1 flex flex-col gap-2 text-xs text-[#5E504D] leading-relaxed"
      z-index-class="z-[70]"
      @close="troubleshootOpen = false"
    >
      <div
        v-for="(item, idx) in FAQ_ITEMS"
        :key="item.id"
        class="rounded-xl bg-[#FFF7F2] border border-[#EADFD9] overflow-hidden"
      >
        <button
          type="button"
          class="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left font-bold text-[#4A3F3D] hover:bg-[#F9D6DB]/30 transition-colors cursor-pointer"
          @click="toggleFaq(item.id)"
        >
          <span>{{ idx + 1 }}. {{ isZh ? item.titleZh : item.titleEn }}</span>
          <ChevronDown
            :class="[
              'w-4 h-4 text-[#8E807C] shrink-0 transition-transform duration-150',
              openFaqId === item.id ? 'rotate-180 text-[#2F658D]' : '',
            ]"
          />
        </button>
        <div
          v-if="openFaqId === item.id"
          class="px-3 pb-3 pt-1 border-t border-[#EADFD9]/60 whitespace-pre-line text-[#5E504D]"
        >
          {{ isZh ? item.bodyZh : item.bodyEn }}
        </div>
      </div>
    </AppModal>
  </div>
</template>
