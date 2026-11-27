<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Folder,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Lock,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Wand2,
  X,
} from 'lucide-vue-next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { setActiveTool, setGuideSubTab, showToast } from '@/store';
import CopyChip from './CopyChip.vue';
import GuideIcon from './GuideIcon.vue';
import {
  STEP_PROGRESS,
  buildSummaryText,
  copyToClipboard,
  getEditionMeta,
  getStepCrumbLabel,
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

const lang = ref<GuideLang>('zh');
const troubleshootOpen = ref(false);

function openPlrEditor() {
  if (props.standalone) {
    window.open('https://terraflora-8cm.pages.dev/', '_blank', 'noopener,noreferrer');
  } else {
    setActiveTool('plr');
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
  showToast(isZh.value ? '已重置向导，请重新选择' : 'Wizard reset, please select again');
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

const copyPrefix = computed(() => (isZh.value ? '已复制' : 'Copied'));
</script>

<template>
  <div class="flex flex-col gap-3 select-text">
    <!-- 进度、面包屑与快捷操作栏 -->
    <Card class="bg-white border-[#EADFD9]">
      <CardContent class="p-3.5 flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <template v-for="(c, idx) in crumbs" :key="`${c.id}-${idx}`">
              <button
                type="button"
                :disabled="c.isLast"
                :class="[
                  'px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-colors border',
                  c.isLast
                    ? 'bg-[#EEF4F9] border-[#C4D6E5] text-[#739CBF] font-semibold cursor-default'
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
            <button
              type="button"
              class="inline-flex items-center justify-center p-1 rounded-md bg-[#FFF7F2] border border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D] hover:bg-[#F9D6DB]/40 transition-colors cursor-pointer"
              :title="isZh ? '重新开始' : 'Restart'"
              :aria-label="isZh ? '重新开始' : 'Restart'"
              @click="resetWizard"
            >
              <RotateCcw class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div class="w-full h-1 bg-[#EADFD9] rounded-full overflow-hidden">
          <div
            class="h-full bg-[#739CBF] rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </CardContent>
    </Card>

    <!-- Step 1: Start -->
    <Card v-if="currentStep === 'start'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ isZh ? '第 1 步 · 确认平台与版本' : 'Step 1 · Choose Platform & Edition' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
          {{ isZh ? '你用的是哪个版本的泰拉瑞亚？' : 'Which edition of Terraria are you playing?' }}
        </h2>

        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
            @click="selectPlatform('mobile', 'xd')"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="58" :size="20" :standalone="standalone">
                  <Heart class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '手机心动版' : 'Mobile: TapTap / XD Edition' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? '安卓 / 苹果手机上的心动版' : 'China XD release on Android / iOS' }}
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="393" :size="20" :standalone="standalone">
                  <Globe class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '手机国际版' : 'Mobile: Global Edition' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? '安卓 / 苹果手机上的国际版' : 'App Store or Google Play release (505 Games)' }}
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="395" :size="20" :standalone="standalone">
                  <Monitor class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '电脑 Steam 版' : 'PC: Steam Edition' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? '通过 Steam 安装的泰拉瑞亚（Windows / macOS / Linux）' : 'Installed via Steam (Windows / macOS / Linux)' }}
                </div>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Step 2 (Mobile): Select OS -->
    <Card v-else-if="currentStep === 'select_os'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ meta.name }} · {{ isZh ? '第 2 步' : 'Step 2' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
          {{ isZh ? '你的手机是什么系统？' : 'What OS does your mobile device run?' }}
        </h2>

        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
            @click="selectOS('android')"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="3124" :size="20" :standalone="standalone">
                  <Smartphone class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '安卓 / 鸿蒙手机' : 'Android / HarmonyOS' }}
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="4009" :size="20" :standalone="standalone">
                  <Smartphone class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '苹果（iOS / iPadOS）' : 'Apple (iOS / iPadOS)' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? 'iPhone 或 iPad' : 'iPhone or iPad' }}
                </div>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Step 3 (Mobile): Select Goal -->
    <Card v-else-if="currentStep === 'select_goal'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ meta.name }} · {{ isZh ? '第 3 步' : 'Step 3' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
          {{ isZh ? '你今天想进行哪项操作？' : 'What would you like to do?' }}
        </h2>

        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
            @click="selectGoal('save')"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="48" :size="20" :standalone="standalone">
                  <Folder class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
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
            @click="selectGoal('patch')"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="4722" :size="20" :standalone="standalone">
                  <Wand2 class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D] flex items-center flex-wrap gap-1.5">
                  <span>{{ isZh ? '安装第一分型等游戏补丁' : 'Install Game Patches (First Fractal, etc.)' }}</span>
                  <span
                    v-if="state.os !== 'android'"
                    class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#faf0f1] text-[#9a4f56] border border-[#ecd2d5]"
                  >
                    {{ isZh ? '仅安卓支持' : 'Android Only' }}
                  </span>
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{
                    state.os === 'android'
                      ? isZh ? '替换游戏底层文件' : 'Replace core metadata files'
                      : isZh ? '当前系统不支持，点击查看原因与替代方案' : 'Not supported on iOS. Tap to see reasons & alternatives'
                  }}
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="509" :size="20" :standalone="standalone">
                  <SlidersHorizontal class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '使用存档编辑器修改物品/属性' : 'Use Save Editor (Modify Items & Stats)' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{
                    state.os === 'android'
                      ? isZh ? '手机端存档修改器' : 'Mobile save editor app'
                      : isZh ? '免越狱修改存档' : 'Web-based save editor (No jailbreak)'
                  }}
                </div>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Step 2 (PC): Select Goal -->
    <Card v-else-if="currentStep === 'pc_goal'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ isZh ? '电脑 Steam 版 · 第 2 步' : 'PC Steam · Step 2' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
          {{ isZh ? '你今天想进行哪项操作？' : 'What would you like to do?' }}
        </h2>

        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
            @click="selectPcGoal('save')"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="48" :size="20" :standalone="standalone">
                  <Folder class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="509" :size="20" :standalone="standalone">
                  <SlidersHorizontal class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '使用存档编辑器修改物品/属性' : 'Use Save Editor (Edit Items & Stats)' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? '修改人物或地图' : 'Modify player stats or world maps' }}
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="757" :size="20" :standalone="standalone">
                  <Wand2 class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
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
      </CardContent>
    </Card>

    <!-- PC Final -->
    <Card v-else-if="currentStep === 'pc_final'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <template v-if="state.goal === 'editor'">
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? '最终步骤 · 电脑存档编辑器' : 'Final Step · PC Save Editor' }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-3">
            {{ isZh ? '修改人物与地图存档' : 'Edit Character & World Saves' }}
          </h2>

          <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs text-[#5E504D] mb-3.5 space-y-2">
            <div>
              <template v-if="isZh">
                人物在 <CopyChip text="Players" :toast-prefix="copyPrefix" /> 文件夹，地图在 <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> 文件夹。修改前先<strong class="text-[#4A3F3D]">完全退出游戏</strong>，再按你的系统打开存档目录：
              </template>
              <template v-else>
                Characters are in <CopyChip text="Players" :toast-prefix="copyPrefix" />, and worlds are in <CopyChip text="Worlds" :toast-prefix="copyPrefix" />. Please <strong class="text-[#4A3F3D]">fully exit the game</strong> before editing, then open the save directory for your OS:
              </template>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[#8E807C]">Windows</span>
              <CopyChip text="%USERPROFILE%\Documents\My Games\Terraria" :toast-prefix="copyPrefix" />
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[#8E807C]">macOS</span>
              <CopyChip text="~/Library/Application Support/Terraria" :toast-prefix="copyPrefix" />
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[#8E807C]">Linux</span>
              <CopyChip text="~/.local/share/Terraria" :toast-prefix="copyPrefix" />
            </div>
            <div class="text-[#8E807C]">
              {{
                isZh
                  ? 'macOS 按 ⌘⇧G 前往文件夹，Linux 在文件管理器按 Ctrl+L 输入路径；两个系统的目录默认隐藏，需先显示隐藏文件。'
                  : 'macOS: Press ⌘⇧G to Go to Folder; Linux: Press Ctrl+L in file manager. These directories are hidden by default.'
              }}
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] mb-3">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="font-bold text-[#739CBF] text-sm">
                {{ isZh ? '方法一：本站 TerraFlora / 网页版 Terrasavr（改人物）' : 'Method 1: TerraFlora / Web Terrasavr (Edit Characters)' }}
              </span>
              <Button
                variant="outline"
                size="xs"
                class="bg-white border-[#EADFD9] text-[#739CBF] hover:bg-[#EEF4F9]"
                @click="openPlrEditor"
              >
                {{ isZh ? '打开角色编辑器' : 'Open Editor' }}
              </Button>
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                1. 直接切换到本站「<strong class="text-[#4A3F3D]">角色存档</strong>」页（或打开 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Terrasavr</code>）。<br />
                2. 点击 <strong class="text-[#4A3F3D]">导入</strong>（Load），选择 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> 文件夹里要改的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 文件。<br />
                3. 添加物品或修改生命/魔力后点击 <strong class="text-[#4A3F3D]">导出 .plr</strong>（Save），把新文件覆盖回原来的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> 文件夹。<br />
                4. 重新进入游戏即可看到修改结果。
              </template>
              <template v-else>
                1. Switch to <strong class="text-[#4A3F3D]">Character Editor</strong> in the top bar (or open <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Terrasavr</code>).<br />
                2. Click <strong class="text-[#4A3F3D]">Import</strong> (Load) and select your <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> file from <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>.<br />
                3. Add items or adjust HP/Mana, then export/save to overwrite the original file in <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>.<br />
                4. Restart the game to see the modified character.
              </template>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]">
            <div class="font-bold text-[#4A3F3D] text-sm mb-1.5">
              {{ isZh ? '方法二：桌面版 TEdit（改地图）' : 'Method 2: Desktop TEdit (Edit Worlds)' }}
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              {{
                isZh
                  ? '搜索并下载 TEdit，打开 Worlds 文件夹里的 .wld 地图即可编辑地形与箱子内容，保存后重进游戏。'
                  : 'Download and run TEdit. Open any .wld map from the Worlds folder to modify tiles and chest contents, save, and launch the game.'
              }}
            </div>
          </div>

          <div class="mt-3.5 p-3 rounded-lg bg-[#fbf6ec] border border-[#ecdcbd] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#8a6526] mb-0.5">{{ isZh ? '修改前先备份' : 'Backup Before Editing' }}</div>
            <div>
              {{
                isZh
                  ? '把要改的 .plr 或 .wld 复制一份放到别的文件夹，改坏了还能换回来。'
                  : 'Copy your original .plr or .wld file to a backup folder beforehand in case the save file becomes corrupted.'
              }}
            </div>
          </div>
        </template>

        <template v-else-if="state.goal === 'mod'">
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? '最终步骤 · 电脑安装 MOD' : 'Final Step · PC Mod Setup' }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
            {{ isZh ? '用 tModLoader 启动游戏并启用 MOD' : 'Launch with tModLoader & Enable Mods' }}
          </h2>

          <ol class="flex flex-col gap-3 text-[13.5px] text-[#5E504D]">
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                {{
                  isZh
                    ? '在 Steam 商店搜索 tModLoader，下载安装（它是免费软件，需要拥有正版泰拉瑞亚）。'
                    : 'Search for tModLoader in the Steam Store and install it (free to play, requires owning Terraria).'
                }}
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <template v-if="isZh">
                  在 Steam 创意工坊搜索想要的 MOD，点 <strong class="text-[#4A3F3D]">订阅</strong>，等待自动下载完成。
                </template>
                <template v-else>
                  Find mods on the Steam Workshop, click <strong class="text-[#4A3F3D]">Subscribe</strong>, and wait for downloads to complete.
                </template>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <template v-if="isZh">
                  从游戏库启动 <strong class="text-[#5d5a86]">tModLoader</strong>（不要启动原版），在 <strong class="text-[#4A3F3D]">MOD 管理</strong> 里把刚订阅的 MOD 点启用，然后点 <strong class="text-[#4A3F3D]">重新加载</strong>。
                </template>
                <template v-else>
                  Launch <strong class="text-[#5d5a86]">tModLoader</strong> from Steam (not vanilla Terraria), go to <strong class="text-[#4A3F3D]">Manage Mods</strong>, enable them, and click <strong class="text-[#4A3F3D]">Reload Mods</strong>.
                </template>
              </div>
            </li>
          </ol>

          <div class="mt-3.5 p-3 rounded-lg bg-[#fbf6ec] border border-[#ecdcbd] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#8a6526] mb-0.5">{{ isZh ? '联机与版本注意' : 'Multiplayer & Versions' }}</div>
            <div>
              {{
                isZh
                  ? '联机时双方需要装好相同的 MOD 并启用，否则进不去同一个世界；游戏或 MOD 更新后若闪退，先检查版本是否对应。'
                  : 'In multiplayer, all players must have the exact same mods enabled. If the game crashes after an update, verify mod and game version compatibility.'
              }}
            </div>
          </div>
        </template>

        <template v-else>
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? '最终步骤 · 电脑导入/导出存档' : 'Final Step · PC Import / Export Saves' }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-3">
            {{ isZh ? '把存档放进对应的角色/地图目录' : 'Place Saves into Worlds / Players Folders' }}
          </h2>

          <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs text-[#5E504D] mb-3.5 space-y-2">
            <div>
              <template v-if="isZh">先<strong class="text-[#4A3F3D]">完全退出游戏</strong>，再按你的系统打开存档目录：</template>
              <template v-else>First <strong class="text-[#4A3F3D]">completely exit the game</strong>, then open the save directory according to your OS:</template>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[#8E807C]">Windows</span>
              <CopyChip text="%USERPROFILE%\Documents\My Games\Terraria" :toast-prefix="copyPrefix" />
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[#8E807C]">macOS</span>
              <CopyChip text="~/Library/Application Support/Terraria" :toast-prefix="copyPrefix" />
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[#8E807C]">Linux</span>
              <CopyChip text="~/.local/share/Terraria" :toast-prefix="copyPrefix" />
            </div>
            <div class="text-[#8E807C]">
              {{
                isZh
                  ? 'macOS 按 ⌘⇧G 前往文件夹，Linux 在文件管理器按 Ctrl+L 输入路径；两个系统的目录默认隐藏，需先显示隐藏文件。'
                  : 'macOS: ⌘⇧G to Go to Folder; Linux: Ctrl+L in file manager. Ensure hidden files are visible.'
              }}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
              <div class="font-bold text-[#3f6d57] mb-1">{{ isZh ? '地图文件夹' : 'World Folder' }}</div>
              <div>{{ isZh ? '目录名：' : 'Folder: ' }}<CopyChip text="Worlds" :toast-prefix="copyPrefix" /></div>
              <div class="text-[#8E807C] mt-1">{{ isZh ? '放后缀为 .wld 的文件' : 'For files ending with .wld' }}</div>
            </div>
            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
              <div class="font-bold text-[#739CBF] mb-1">{{ isZh ? '人物文件夹' : 'Character Folder' }}</div>
              <div>{{ isZh ? '目录名：' : 'Folder: ' }}<CopyChip text="Players" :toast-prefix="copyPrefix" /></div>
              <div class="text-[#8E807C] mt-1">{{ isZh ? '放后缀为 .plr 的文件' : 'For files ending with .plr' }}</div>
            </div>
          </div>

          <ol class="flex flex-col gap-3 text-[13.5px] text-[#5E504D]">
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ isZh ? '导' : 'In' }}</span>
              <div>
                <strong class="text-[#4A3F3D]">{{ isZh ? '导入存档：' : 'Import Saves: ' }}</strong>
                {{
                  isZh
                    ? '把下载好的 .wld 放进 Worlds，.plr 放进 Players，重新启动游戏即可在角色/世界列表看到。'
                    : 'Put downloaded .wld files into Worlds and .plr files into Players. Launch Terraria to play.'
                }}
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ isZh ? '出' : 'Out' }}</span>
              <div>
                <strong class="text-[#4A3F3D]">{{ isZh ? '导出存档：' : 'Export Saves: ' }}</strong>
                {{
                  isZh
                    ? '直接从这两个文件夹里复制 .wld 或 .plr 发给好友，或留作备份。'
                    : 'Simply copy .wld or .plr files out of these folders to share or backup.'
                }}
              </div>
            </li>
          </ol>

          <div class="mt-3.5 p-3 rounded-lg bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#739CBF] mb-0.5">{{ isZh ? 'Steam 云存档与备份文件' : 'Steam Cloud & Backup Files' }}</div>
            <div>
              {{
                isZh
                  ? '若开启了 Steam 云存档，本地替换的文件可能被云端旧存档覆盖，遇到这种情况可先在游戏属性里关闭云存档再替换。带 .bak / .bak2 的是自动备份，删掉后缀即可当正式存档使用。'
                  : 'If Steam Cloud is enabled, newly replaced files may get overwritten by the cloud version. Temporarily disable Steam Cloud in game properties if this occurs. Files ending with .bak / .bak2 are automatic backups; remove the .bak extension to restore them.'
              }}
            </div>
            <div class="mt-2 pt-2 border-t border-[#C4D6E5]/70 flex items-center justify-between gap-2 flex-wrap">
              <span>{{ isZh ? '导入手机心动版地图显示不了？可用「地图签名互转」转换。' : 'World from mobile XD edition not loading? Convert its signature.' }}</span>
              <button
                type="button"
                class="font-bold text-[#739CBF] hover:underline cursor-pointer"
                @click="setGuideSubTab('converter')"
              >
                {{ isZh ? '前往地图签名互转 →' : 'Open Map Converter →' }}
              </button>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>

    <!-- Android Prep -->
    <Card v-else-if="currentStep === 'android_prep'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ meta.name }} · {{ isZh ? '准备工作' : 'Preparation' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
          <template v-if="state.goal === 'editor'">{{ isZh ? '准备文件管理器与修改方式' : 'Prepare File Manager & Editor' }}</template>
          <template v-else-if="state.goal === 'save'">{{ isZh ? '下载存档并装好文件管理器' : 'Download Save & File Manager' }}</template>
          <template v-else>{{ isZh ? '下载补丁并装好文件管理器' : 'Download Patch & File Manager' }}</template>
        </h2>

        <ol class="flex flex-col gap-3 text-[13.5px] text-[#5E504D]">
          <li class="flex items-start gap-2.5">
            <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <template v-if="isZh">
                装一个能进入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code> 的文件管理器。首选 <strong class="text-[#4A3F3D]">MT 管理器</strong><span class="mx-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold text-[#739CBF] bg-[#EEF4F9] border border-[#C4D6E5]">推荐</span>（<a class="text-[#739CBF] border-b border-[#C4D6E5] hover:border-[#739CBF]" href="https://mt2.cn/download/" target="_blank" rel="noopener">官网下载</a>）；也可以装 <strong class="text-[#4A3F3D]">ZArchiver</strong>，部分机型（小米、OPPO 等）系统自带的文件管理也能进。装好后<strong class="text-[#3f6d57]">先打开一次</strong>并允许基础存储权限。
              </template>
              <template v-else>
                Install a file manager capable of accessing <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code>. We recommend <strong class="text-[#4A3F3D]">MT Manager</strong><span class="mx-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold text-[#739CBF] bg-[#EEF4F9] border border-[#C4D6E5]">Recommended</span> (<a class="text-[#739CBF] border-b border-[#C4D6E5] hover:border-[#739CBF]" href="https://mt2.cn/download/" target="_blank" rel="noopener">Official Site</a>) or <strong class="text-[#4A3F3D]">ZArchiver</strong>. Launch it once and grant basic storage permissions.
              </template>
            </div>
          </li>

          <li v-if="state.goal === 'editor'" class="flex items-start gap-2.5">
            <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <template v-if="isZh">
                选择修改方式：若只修改人物存档（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>），可<strong class="text-[#3f6d57]">直接使用本站 TerraFlora</strong>（免装额外 App）；若要改地图或使用手机端存档编辑器 App，请先安装并打开一次，确认可正常运行。
              </template>
              <template v-else>
                Choose your editor: To edit characters (<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>), you can <strong class="text-[#3f6d57]">use TerraFlora directly</strong> without installing extra apps; otherwise install and launch your mobile Save Editor app once.
              </template>
            </div>
          </li>
          <li v-else class="flex items-start gap-2.5">
            <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <template v-if="state.goal === 'patch'">
                {{ isZh ? '把补丁文件下载到手机上（群文件、网盘、浏览器都行），并在 MT 管理器一侧窗口定位到该文件（通常在 Download 文件夹）。' : 'Download your patch file onto your phone, and locate it in one pane of MT Manager (usually inside Download).' }}
              </template>
              <template v-else>
                {{ isZh ? '把要导入的存档下载到手机上，并在 MT 管理器一侧窗口定位到它（通常在 Download 文件夹）；只导出自己的存档可跳过下载。' : 'Download the save file onto your phone and locate it in one pane of MT Manager (usually inside Download); skip downloading if you only want to export.' }}
              </template>
            </div>
          </li>
        </ol>

        <div
          v-if="state.goal !== 'editor'"
          class="mt-3.5 p-3 rounded-lg bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed"
        >
          <div class="font-bold text-[#739CBF] mb-0.5">{{ isZh ? '双窗口操作口诀' : 'Dual-Pane Tip' }}</div>
          <div>
            <template v-if="isZh">
              MT 管理器分为<strong>左右两个独立窗口</strong>：一侧放下载的文件并<strong>保持不动</strong>，另一侧用来进游戏目录。现代安卓默认限制第三方 App 访问 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code>，下一步先在另一侧窗口检测权限，解锁后再定位具体存档目录。
            </template>
            <template v-else>
              MT Manager has <strong>two independent panes</strong>: keep your downloaded file on one side, and use the other side to open the game folder. Since modern Android restricts <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code>, the next step checks your access permission before navigating to the save path.
            </template>
          </div>
        </div>
        <div
          v-else
          class="mt-3.5 p-3 rounded-lg bg-[#fbf6ec] border border-[#ecdcbd] text-xs text-[#5E504D] leading-relaxed"
        >
          <div class="font-bold text-[#8a6526] mb-0.5">{{ isZh ? '权限与备份说明' : 'Permission & Backup' }}</div>
          <div>
            {{
              isZh
                ? '现代安卓默认禁止直接读写 Android/data，下一步先检测权限。修改存档前，建议先复制一份原 .plr / .wld 文件留作备份。'
                : 'Modern Android restricts direct access to Android/data. We will check permissions next. Always copy your original .plr / .wld file as a backup before editing.'
            }}
          </div>
        </div>

        <Button
          class="w-full mt-4 h-10 bg-[#739CBF] hover:bg-[#5F87A8] text-white font-semibold text-[13.5px] gap-2"
          @click="goTo('android_check_perm')"
        >
          <span>{{ isZh ? '已准备好，下一步检测 data 权限' : 'Ready, Check Android/data Access' }}</span>
          <ArrowRight class="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>

    <!-- Android Permission Check -->
    <Card v-else-if="currentStep === 'android_check_perm'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ isZh ? '安卓/鸿蒙 · 权限分流' : 'Android / HarmonyOS · Access Check' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-1.5">
          {{ isZh ? '检查 Android/data 访问权限' : 'Check Android/data Access Permission' }}
        </h2>
        <p class="text-xs text-[#8E807C] mb-3.5">
          <template v-if="isZh">
            打开文件管理器（MT 管理器在<strong>另一侧窗口</strong>操作），依次点击进入：<CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" />
          </template>
          <template v-else>
            In your file manager (use the <strong>target pane</strong> in MT Manager), navigate to: <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" />
          </template>
        </p>

        <div class="p-3 rounded-lg bg-[#fbf6ec] border border-[#ecdcbd] text-xs text-[#5E504D] leading-relaxed">
          <div class="font-bold text-[#8a6526] mb-0.5">{{ isZh ? '防踩坑提醒' : 'Important' }}</div>
          <div>
            <template v-if="isZh">
              列表里可能同时存在 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.Android</code> 和 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android</code>，请务必点没有小数点的 <strong>Android</strong>！
            </template>
            <template v-else>
              Make sure to tap <strong>Android</strong> without a leading dot, not <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.Android</code>!
            </template>
          </div>
        </div>

        <p class="font-bold text-[#4A3F3D] text-sm mt-3.5 mb-2.5">
          {{ isZh ? '点进 data 后，屏幕显示哪种情况？' : 'What happens when you open the data folder?' }}
        </p>

        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            class="w-full text-left p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] hover:bg-[#F9D6DB]/40 hover:border-[#E598A3] flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer"
            @click="selectDataPerm(true)"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="327" :size="20" :standalone="standalone">
                  <Check class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '能正常看到里面的一堆文件夹' : 'I can see all package folders normally' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? '鸿蒙或老版本安卓常见，直接跳过授权！' : 'Common on older Android or HarmonyOS. Skip authorization!' }}
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
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-white border border-[#EADFD9] flex items-center justify-center text-[#5E504D] shrink-0">
                <GuideIcon :item-id="329" :size="20" :standalone="standalone">
                  <Lock class="w-[18px] h-[18px]" />
                </GuideIcon>
              </div>
              <div>
                <div class="text-[14.5px] font-bold text-[#4A3F3D]">
                  {{ isZh ? '提示“没有权限”或显示为空' : 'Shows "Access Denied" or appears empty' }}
                </div>
                <div class="text-xs text-[#8E807C] mt-0.5">
                  {{ isZh ? '按下一步指引解锁权限' : 'Follow next step to unlock via Shizuku' }}
                </div>
              </div>
            </div>
            <ChevronRight class="w-4 h-4 text-[#B4A59F] shrink-0" />
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Shizuku Guide -->
    <Card v-else-if="currentStep === 'shizuku_guide'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <div class="mb-2.5">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
            {{ isZh ? '安卓/鸿蒙 · 解锁 data 权限' : 'Android / HarmonyOS · Unlock Data' }}
          </span>
        </div>
        <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-3.5">
          {{ isZh ? '用 Shizuku 打开 Android/data' : 'Unlock Android/data Using Shizuku' }}
        </h2>

        <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs mb-3.5">
          <div class="text-[#8E807C]">
            {{ isZh ? '手机免电脑可直接用「无线调试」配对启动 Shizuku，按官方步骤操作：' : 'On Android 11+, start Shizuku without a PC via Wireless Debugging:' }}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
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

        <ol class="flex flex-col gap-3 text-[13.5px] text-[#5E504D]">
          <li class="flex items-start gap-2.5">
            <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <template v-if="isZh">
                跟着官方文档装好并启动 Shizuku，主页面显示 <strong class="text-[#3f6d57]">已启动</strong> 即可。
              </template>
              <template v-else>
                Follow the official instructions to pair and start Shizuku until it displays <strong class="text-[#3f6d57]">Shizuku is running</strong>.
              </template>
            </div>
          </li>
          <li class="flex items-start gap-2.5">
            <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <template v-if="isZh">
                点主页面的 <strong class="text-[#4A3F3D]">已授权 X 个应用</strong>，找到 <strong class="text-[#3f6d57]">MT 管理器</strong>（装的若是 ZArchiver 就选它）打开开关；装了<strong class="text-[#739CBF]">存档编辑器</strong>的也一并打开。
              </template>
              <template v-else>
                Tap <strong class="text-[#4A3F3D]">Authorized Applications</strong>, toggle ON for <strong class="text-[#3f6d57]">MT Manager</strong> (or ZArchiver). Also enable it for your <strong class="text-[#739CBF]">Save Editor</strong> if installed.
              </template>
            </div>
          </li>
          <li class="flex items-start gap-2.5">
            <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <template v-if="isZh">
                <strong class="text-[#8a6526]">彻底划掉后台，重新打开文件管理器</strong>，再进 <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" /> 就能看到里面的文件夹了。
              </template>
              <template v-else>
                <strong class="text-[#8a6526]">Force close and reopen your file manager</strong>, navigate to <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" />, and all app folders will now appear!
              </template>
            </div>
          </li>
        </ol>

        <Button
          class="w-full mt-4 h-10 bg-[#739CBF] hover:bg-[#5F87A8] text-white font-semibold text-[13.5px] gap-2"
          @click="goTo('android_final')"
        >
          <span>{{ isZh ? '已能打开 data，进入最终操作步骤' : 'Data is accessible, proceed to final step' }}</span>
          <ArrowRight class="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>

    <!-- Android Final -->
    <Card v-else-if="currentStep === 'android_final'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <template v-if="state.goal === 'patch'">
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? `最终步骤 · ${meta.name}安装补丁` : `Final Step · ${meta.name} Patch` }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-1.5">
            {{ isZh ? '替换游戏底层补丁文件' : 'Replace Core Patch Files' }}
          </h2>
          <p class="text-xs text-[#8E807C] mb-3.5">
            <template v-if="isZh">在 MT 管理器<strong class="text-[#4A3F3D]">另一侧窗口</strong>（已打开 data 的那一侧）继续向下点：</template>
            <template v-else>In MT Manager, on the <strong class="text-[#4A3F3D]">target pane</strong> (inside data), open:</template>
          </p>

          <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs mb-3.5">
            <div class="text-[#8E807C]">{{ isZh ? '依次进入以下目录：' : 'Navigate into this directory path:' }}</div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
              <CopyChip :text="meta.androidPkg" :toast-prefix="copyPrefix" />
              <span>→</span>
              <CopyChip text="files" :toast-prefix="copyPrefix" />
              <span>→</span>
              <CopyChip text="il2cpp" :toast-prefix="copyPrefix" />
              <span>→</span>
              <CopyChip text="Metadata" :toast-prefix="copyPrefix" />
            </div>
            <div class="text-[11px] text-[#8E807C] mt-1.5">
              {{
                isZh
                  ? '提示：补丁目录不包含数字ID文件夹，两个版本的层级结构完全一致。'
                  : 'Note: The patch directory has no numeric ID folder; both editions use this exact structure.'
              }}
            </div>
          </div>

          <ol class="flex flex-col gap-3 text-[13.5px] text-[#5E504D]">
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <template v-if="isZh">
                  进入 <CopyChip text="Metadata" :toast-prefix="copyPrefix" /> 后，你会看到里面原本就有一个与你下载的补丁<strong class="text-[#4A3F3D]">同名</strong>的文件（通常是 <CopyChip text="global-metadata.dat" :toast-prefix="copyPrefix" />）。
                </template>
                <template v-else>
                  Inside <CopyChip text="Metadata" :toast-prefix="copyPrefix" />, you will see an existing file with the same name as your patch (usually <CopyChip text="global-metadata.dat" :toast-prefix="copyPrefix" />).
                </template>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <template v-if="isZh">
                  回到 MT 管理器的<strong class="text-[#3f6d57]">另一侧窗口</strong>（补丁文件所在的那一侧，一般在 Download），长按补丁文件选择 <strong class="text-[#4A3F3D]">复制</strong> 或 <strong class="text-[#4A3F3D]">移动</strong> 到右边的 Metadata 文件夹中。
                </template>
                <template v-else>
                  On the <strong class="text-[#3f6d57]">other pane</strong> (where your downloaded patch file is), long-press the file and select <strong class="text-[#4A3F3D]">Copy</strong> or <strong class="text-[#4A3F3D]">Move</strong> to Metadata.
                </template>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <template v-if="isZh">
                  在弹出的提示框中点击 <strong class="text-[#5d5a86]">替换</strong> 原文件，重启游戏即可生效！
                </template>
                <template v-else>
                  Choose <strong class="text-[#5d5a86]">Replace / Overwrite</strong> when prompted. Restart the game to activate the patch!
                </template>
              </div>
            </li>
          </ol>

          <div class="mt-3.5 p-3 rounded-lg bg-[#fbf6ec] border border-[#ecdcbd] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#8a6526] mb-0.5">{{ isZh ? '防丢档与防闪退建议' : 'Prevent Game Crashes' }}</div>
            <div>
              {{
                isZh
                  ? '覆盖前建议长按原版 global-metadata.dat 先备份一份。如果覆盖后打开游戏闪退，说明补丁版本与当前游戏版本号不匹配。'
                  : 'Always create a backup copy of the original global-metadata.dat first. If the game crashes on startup, the patch version does not match your game version.'
              }}
            </div>
          </div>
        </template>

        <template v-else-if="state.goal === 'editor'">
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? `最终步骤 · ${meta.name}存档编辑器` : `Final Step · ${meta.name} Save Editor` }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-3">
            {{ isZh ? '修改人物或地图存档' : 'Modify Character & World Saves on Android' }}
          </h2>

          <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs mb-3.5 space-y-1.5">
            <div>
              {{ isZh ? '先在 MT 管理器进入游戏目录：' : 'Open the game path in MT Manager: ' }}
              <CopyChip text="Android" :toast-prefix="copyPrefix" /> → <CopyChip text="data" :toast-prefix="copyPrefix" /> → <CopyChip :text="meta.androidPkg" :toast-prefix="copyPrefix" />
            </div>
            <div class="text-[#5E504D]">
              <template v-if="meta.isXD">
                <template v-if="isZh">再点进 <strong class="text-[#8a6526]">一串数字的心动ID</strong>，里面就是 <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" />（地图）和 <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" />（人物）。</template>
                <template v-else>Then open the <strong class="text-[#8a6526]">numeric XD ID folder</strong> to find <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /> (Worlds) and <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" /> (Players).</template>
              </template>
              <template v-else>
                <template v-if="isZh">进去后直接就是 <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" />（地图）和 <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" />（人物）。</template>
                <template v-else>Inside, you will directly see <CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /> (Worlds) and <CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" /> (Players).</template>
              </template>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] mb-3">
            <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <span class="font-bold text-[#739CBF] text-sm">
                {{ isZh ? '方法一：用本站 TerraFlora 改人物（推荐）' : 'Method 1: TerraFlora Web Editor (Recommended)' }}
              </span>
              <Button
                variant="outline"
                size="xs"
                class="bg-white border-[#EADFD9] text-[#739CBF] hover:bg-[#EEF4F9]"
                @click="openPlrEditor"
              >
                {{ isZh ? '打开角色编辑器' : 'Open Editor' }}
              </Button>
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                1. 用 MT 管理器把要改的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 文件复制到手机 <CopyChip text="Download" :toast-prefix="copyPrefix" /> 文件夹（安卓 11+ 浏览器无法直接读取 data 目录）。<br />
                2. 点击上方「打开角色编辑器」导入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>，改好后点「导出 .plr」。<br />
                3. 用 MT 管理器把新文件从 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Download</code> 复制回原 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.playerDir }}</code> 目录替换，划掉游戏后台重进。
              </template>
              <template v-else>
                1. Copy your <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> file to <CopyChip text="Download" :toast-prefix="copyPrefix" /> using MT Manager (browsers on Android 11+ cannot read Android/data directly).<br />
                2. Open the Character Editor above, import and edit, then export the new <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>.<br />
                3. Copy the exported file back into <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.playerDir }}</code> to overwrite, then force-restart Terraria.
              </template>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]">
            <div class="font-bold text-[#4A3F3D] text-sm mb-1.5">
              {{ isZh ? '方法二：手机端存档编辑器 App' : 'Method 2: Mobile Save Editor App' }}
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              {{
                isZh
                  ? '打开装好的存档编辑器 App（若弹出 Shizuku 授权请求点「始终允许」），按上方路径选择 .plr 或 .wld 修改保存，重启游戏生效。'
                  : 'Launch your Save Editor app (tap Always Allow if Shizuku prompts), open the .plr or .wld from the path above, save, and restart Terraria.'
              }}
            </div>
          </div>
        </template>

        <template v-else>
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? `最终步骤 · ${meta.name}导入/导出存档` : `Final Step · ${meta.name} Import / Export` }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-1.5">
            {{ isZh ? '将存档放入对应的角色/地图目录' : 'Put Saves into Worlds / Players Folder' }}
          </h2>
          <p class="text-xs text-[#8E807C] mb-3.5">
            <template v-if="isZh">在 MT 管理器<strong class="text-[#4A3F3D]">另一侧窗口</strong>（已打开 data 的那一侧）继续操作：</template>
            <template v-else>In MT Manager on the target pane (inside data):</template>
          </p>

          <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs mb-3.5 space-y-1.5">
            <div>
              {{ isZh ? '1. 找到并进入游戏包名：' : '1. Open the game package folder: ' }}<CopyChip :text="meta.androidPkg" :toast-prefix="copyPrefix" />
            </div>
            <div>
              <template v-if="meta.isXD">
                <template v-if="isZh">2. 点进 <strong class="text-[#8a6526]">一串纯数字</strong> 的文件夹（这是你的心动账号 ID；若有多个说明登录过多个号）。</template>
                <template v-else>2. Tap into the <strong class="text-[#8a6526]">purely numeric folder</strong> (this is your XD account ID; multiple folders mean multiple logged-in accounts).</template>
              </template>
              <template v-else>
                <template v-if="isZh">2. <strong class="text-[#3f6d57]">注意：国际版没有数字ID文件夹！</strong>点进包名后直接就能看到 <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> 和 <CopyChip text="Players" :toast-prefix="copyPrefix" />。</template>
                <template v-else>2. <strong class="text-[#3f6d57]">Note: Global edition has NO numeric folder!</strong> Inside the package folder, you immediately see <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> and <CopyChip text="Players" :toast-prefix="copyPrefix" />.</template>
              </template>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
              <div class="font-bold text-[#3f6d57] mb-1">{{ isZh ? '地图文件夹' : 'World Folder' }}</div>
              <div>{{ isZh ? '目录名：' : 'Name: ' }}<CopyChip :text="meta.worldDir" :toast-prefix="copyPrefix" /></div>
              <div class="text-[#8E807C] mt-1">{{ isZh ? '放后缀为 .wld 的文件' : 'For files ending with .wld' }}</div>
            </div>
            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9] text-xs">
              <div class="font-bold text-[#739CBF] mb-1">{{ isZh ? '人物文件夹' : 'Player Folder' }}</div>
              <div>{{ isZh ? '目录名：' : 'Name: ' }}<CopyChip :text="meta.playerDir" :toast-prefix="copyPrefix" /></div>
              <div class="text-[#8E807C] mt-1">{{ isZh ? '放后缀为 .plr 的文件' : 'For files ending with .plr' }}</div>
            </div>
          </div>

          <ol class="flex flex-col gap-3 text-[13.5px] text-[#5E504D]">
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ isZh ? '导' : 'In' }}</span>
              <div>
                <strong class="text-[#4A3F3D]">{{ isZh ? '导入存档：' : 'Import Saves: ' }}</strong>
                <template v-if="isZh">
                  把另一侧窗口里下载好的存档，长按选择 <strong class="text-[#3f6d57]">复制或移动</strong> 到对应的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.worldDir }}</code> 或 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.playerDir }}</code> 文件夹内，最后划掉游戏后台重进。
                </template>
                <template v-else>
                  On the opposite pane where your downloaded files are, long-press the file and choose <strong class="text-[#3f6d57]">Copy / Move</strong> into <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.worldDir }}</code> or <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.playerDir }}</code>, then force-restart Terraria.
                </template>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <span class="w-[22px] h-[22px] rounded-full bg-[#EEF4F9] border border-[#C4D6E5] text-[#739CBF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{{ isZh ? '出' : 'Out' }}</span>
              <div>
                <strong class="text-[#4A3F3D]">{{ isZh ? '导出存档：' : 'Export Saves: ' }}</strong>
                <template v-if="isZh">
                  长按文件夹里的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> 或 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 文件，点击 <strong class="text-[#739CBF]">分享</strong> 即可发给好友或自己保存。
                </template>
                <template v-else>
                  Long-press any <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> or <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> file and choose <strong class="text-[#739CBF]">Share</strong> to send or backup.
                </template>
              </div>
            </li>
          </ol>

          <div class="mt-3.5 p-3 rounded-lg bg-[#EEF4F9] border border-[#C4D6E5] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#739CBF] mb-0.5">
              {{ meta.isXD ? (isZh ? '心动云存档与 .bak 备份科普' : 'Cloud Saves & .bak Backup Info') : (isZh ? '.bak 备份文件复活科普' : '.bak Backup Recovery Info') }}
            </div>
            <div>
              <template v-if="meta.isXD">
                <template v-if="isZh">① 心动云存档必须<strong>先上游戏下载到本地</strong>，数字文件夹里才会显示；<br /></template>
                <template v-else>① XD cloud saves must be <strong>downloaded to local in-game first</strong> before they appear in the numeric folder;<br /></template>
              </template>
              <template v-if="isZh">
                <span v-if="meta.isXD">② </span>带 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld.bak</code> 或 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak2</code> 的是系统自动备份，重命名把 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak</code> 后缀删掉就能当正式存档用！
              </template>
              <template v-else>
                <span v-if="meta.isXD">② </span>Files ending in <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld.bak</code> or <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak2</code> are automatic system backups. Simply remove the <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak</code> suffix to restore them as normal saves!
              </template>
            </div>
            <div class="mt-2 pt-2 border-t border-[#C4D6E5]/70 flex items-center justify-between gap-2 flex-wrap">
              <span>{{ isZh ? '国服 / 国际服地图不互通？可用「地图签名互转」转换。' : 'Map edition mismatch (XD / Global)? Convert its signature.' }}</span>
              <button
                type="button"
                class="font-bold text-[#739CBF] hover:underline cursor-pointer"
                @click="setGuideSubTab('converter')"
              >
                {{ isZh ? '前往地图签名互转 →' : 'Open Map Converter →' }}
              </button>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>

    <!-- iOS Final -->
    <Card v-else-if="currentStep === 'ios_final'" class="bg-white border-[#EADFD9] animate-in fade-in-0 duration-150">
      <CardContent class="p-5">
        <template v-if="state.goal === 'patch'">
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#faf0f1] border border-[#ecd2d5] text-[#9a4f56]">
              {{ isZh ? '苹果 iOS 端 · 补丁功能说明' : 'Apple iOS · Patch Notice' }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-1.5">
            {{ isZh ? '苹果端不支持安装第一分型等补丁' : 'Core Patches (First Fractal, etc.) are Unsupported on iOS' }}
          </h2>
          <p class="text-xs text-[#5E504D] mb-3.5 leading-relaxed">
            <template v-if="isZh">
              由于苹果 iOS 系统的封闭沙盒安全机制，普通用户无法访问 App 安装包内部的代码目录（即找不到安卓的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">il2cpp/Metadata</code> 文件夹），因此<strong class="text-[#9a4f56]">无法安装修改游戏底层数据的补丁</strong>（也无需下载 MT 管理器）。
            </template>
            <template v-else>
              Due to iOS sandbox security, users cannot access internal app code directories (no <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">il2cpp/Metadata</code> folder exists). Therefore, <strong class="text-[#9a4f56]">core game binary patches cannot be installed on iOS</strong> (no MT Manager is needed).
            </template>
          </p>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] mb-3.5">
            <div class="font-bold text-[#3f6d57] text-sm mb-1.5">
              {{ isZh ? '苹果端替代方案（同样能爽玩全物品）：' : 'iOS Alternatives (Get all items easily):' }}
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                1. <strong class="text-[#4A3F3D]">直接导入全物品地图/人物存档</strong>：群里的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> 全物品地图和 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 全物品人物，苹果端 100% 支持直接导入！<br />
                2. <strong class="text-[#4A3F3D]">使用网页版存档编辑器</strong>：通过 Safari 打开本站 TerraFlora（或 Terrasavr），可以直接往自己的人物背包里塞入任意装备和材料。
              </template>
              <template v-else>
                1. <strong class="text-[#4A3F3D]">Directly import All-Item Worlds or Characters</strong>: <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> and <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> saves are 100% supported on iOS without jailbreak!<br />
                2. <strong class="text-[#4A3F3D]">Use Web Save Editor</strong>: Open TerraFlora (or Terrasavr) in Safari to add any equipment or items directly into your character inventory.
              </template>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <Button class="bg-[#739CBF] hover:bg-[#5F87A8] text-white text-xs font-semibold h-10" @click="selectGoal('save')">
              {{ isZh ? '去导入全物品存档' : 'Import All-Item Save' }}
            </Button>
            <Button variant="secondary" class="bg-[#F9D6DB]/70 hover:bg-[#F9D6DB] text-[#4A3F3D] border border-[#EADFD9] text-xs font-semibold h-10" @click="selectGoal('editor')">
              {{ isZh ? '看网页修改器教程' : 'Web Editor Guide' }}
            </Button>
          </div>
        </template>

        <template v-else-if="state.goal === 'editor'">
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? `苹果 ${meta.name} · 存档编辑器` : `Apple ${meta.name} · Save Editor` }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
            {{ isZh ? '免越狱修改全物品与人物属性' : 'Modify Items & Character Stats (No Jailbreak)' }}
          </h2>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] mb-3">
            <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <span class="font-bold text-[#739CBF] text-sm">
                {{ isZh ? '方法 1：本站 TerraFlora / Terrasavr（最推荐）' : 'Method 1: TerraFlora / Terrasavr (Recommended)' }}
              </span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#eef5f1] text-[#3f6d57] border border-[#cfe0d6]">
                {{ isZh ? '免费免下载' : 'Free & No Install' }}
              </span>
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                1. 在苹果 Safari 浏览器直接使用本站（或打开 <CopyChip text="Terrasavr" :toast-prefix="copyPrefix" />）。<br />
                2. 点击 <strong class="text-[#4A3F3D]">导入</strong>（Load），在弹出窗口中依次打开：<br />
                <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.isXD ? '我的 iPhone / 泰拉瑞亚 / 一串数字的心动ID / Players' : '我的 iPhone / Terraria / Players' }}</code> 里的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 人物文件。<br />
                3. 自由往背包添加任意全物品、修改血量/魔力/词缀后，点击 <strong class="text-[#4A3F3D]">导出 .plr</strong>（Save）下载下来。<br />
                4. 把下载的新 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 文件存回原 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> 文件夹覆盖，重进游戏即可！
              </template>
              <template v-else>
                1. Open TerraFlora in Safari (or <CopyChip text="Terrasavr" :toast-prefix="copyPrefix" />).<br />
                2. Click <strong class="text-[#4A3F3D]">Import</strong> (Load), and browse to:<br />
                <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">{{ meta.isXD ? 'On My iPhone / Terraria / [Numeric XD ID] / Players' : 'On My iPhone / Terraria / Players' }}</code> to pick your <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> character file.<br />
                3. Add any items, change HP/mana or prefixes, then export/save to download.<br />
                4. Move the newly saved <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> file back into the <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> folder to replace it, then restart Terraria!
              </template>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="mt-2.5 bg-white border-[#EADFD9] text-[#739CBF] hover:bg-[#EEF4F9] text-xs font-semibold"
              @click="openPlrEditor"
            >
              {{ isZh ? '立即打开本站角色编辑器' : 'Open TerraFlora Character Editor' }}
            </Button>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]">
            <div class="font-bold text-[#4A3F3D] text-sm mb-1">
              {{ isZh ? '方法 2：手机 App 编辑器' : 'Method 2: App Store Editor' }}
            </div>
            <div class="text-xs text-[#8E807C] leading-relaxed">
              {{
                isZh
                  ? 'App Store 中搜索 TR Save Editor 等存档编辑器，下载后直接在软件里选择泰拉瑞亚文件夹的存档进行可视化编辑。苹果商店里的是阉割版，功能不一定齐全。'
                  : 'Search for apps like TR Save Editor on the App Store. Note that mobile store editors may have restricted feature sets.'
              }}
            </div>
          </div>

          <div class="mt-3.5 p-3 rounded-lg bg-[#fbf6ec] border border-[#ecdcbd] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#8a6526] mb-0.5">{{ isZh ? '修改前必做备份' : 'Backup First' }}</div>
            <div>
              {{
                isZh
                  ? '使用编辑器修改前，务必在苹果自带的“文件”App 里长按原 .plr 文件点一下复制留个底，防止改坏了存档！'
                  : 'Before editing, duplicate your original .plr file in the Apple Files app as a backup to prevent data loss!'
              }}
            </div>
          </div>
        </template>

        <template v-else>
          <div class="mb-2.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#FFF7F2] border border-[#EADFD9] text-[#5E504D]">
              {{ isZh ? `苹果 ${meta.name} · 导入与导出存档` : `Apple ${meta.name} · Import & Export` }}
            </span>
          </div>
          <h2 class="text-[17px] font-bold text-[#4A3F3D] mb-4">
            {{ isZh ? '通过苹果“文件”App 管理存档' : 'Manage Saves via Apple "Files" App' }}
          </h2>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] mb-3">
            <div class="font-bold text-[#739CBF] text-sm mb-1.5">{{ isZh ? '一、把存档导进游戏' : '1. Import Saves into Game' }}</div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                1. 用手机把存档下载下来（群文件、网盘、浏览器都可以；地图为 <CopyChip text=".wld" :toast-prefix="copyPrefix" />，人物为 <CopyChip text=".plr" :toast-prefix="copyPrefix" />），在下载列表里点分享图标或“用其他应用打开”，选择 <strong class="text-[#739CBF]">存储到“文件”</strong>。<br />
                2. 依次进入：<strong class="text-[#4A3F3D]">浏览</strong> → <strong class="text-[#4A3F3D]">我的 iPhone</strong> → 点开
                <template v-if="meta.isXD">
                  <strong class="text-[#3f6d57]">泰拉瑞亚（Terraria）</strong> → 点进 <strong class="text-[#8a6526]">一串纯数字的心动ID</strong>
                </template>
                <template v-else>
                  <strong class="text-[#3f6d57]">Terraria</strong>（<span class="text-[#3f6d57]">国际版没有数字ID文件夹</span>，直接就能看到 Players 和 Worlds）
                </template>。<br />
                3. 地图放进 <CopyChip text="Worlds" :toast-prefix="copyPrefix" />，人物放进 <CopyChip text="Players" :toast-prefix="copyPrefix" />，点击右上角 <strong class="text-[#4A3F3D]">存储</strong>，最后<strong class="text-[#739CBF]">彻底划掉游戏后台重进</strong>即可！
              </template>
              <template v-else>
                1. Download the save file on your device (maps end in <CopyChip text=".wld" :toast-prefix="copyPrefix" />, characters in <CopyChip text=".plr" :toast-prefix="copyPrefix" />). In the download share sheet, tap <strong class="text-[#739CBF]">Save to Files</strong>.<br />
                2. Navigate to: <strong class="text-[#4A3F3D]">Browse</strong> → <strong class="text-[#4A3F3D]">On My iPhone</strong> →
                <template v-if="meta.isXD">
                  <strong class="text-[#3f6d57]">Terraria</strong> → <strong class="text-[#8a6526]">Numeric XD ID Folder</strong>
                </template>
                <template v-else>
                  <strong class="text-[#3f6d57]">Terraria</strong> (<span class="text-[#3f6d57]">Global edition has no numeric ID folder</span>; Players and Worlds are right inside)
                </template>.<br />
                3. Put worlds into <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> and characters into <CopyChip text="Players" :toast-prefix="copyPrefix" />, tap <strong class="text-[#4A3F3D]">Save</strong> in top right. Finally, <strong class="text-[#739CBF]">force close Terraria from recent apps and relaunch</strong>!
              </template>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9] mb-3">
            <div class="font-bold text-[#3f6d57] text-sm mb-1.5">{{ isZh ? '二、导出本地存档发给别人' : '2. Export Saves to Share' }}</div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                打开桌面上的 <strong class="text-[#739CBF]">“文件”App</strong>，按上方相同路径进入 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds</code> 或 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>，长按要导出的 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> 或 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> 文件，点 <strong class="text-[#3f6d57]">共享</strong> 就能发到群里或存进网盘。
              </template>
              <template v-else>
                Open the <strong class="text-[#739CBF]">Files app</strong>, navigate along the same path into <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds</code> or <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code>, long-press the file and tap <strong class="text-[#3f6d57]">Share</strong>.
              </template>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFF7F2] border border-[#EADFD9]">
            <div class="font-bold text-[#4A3F3D] text-sm mb-1.5">
              {{ isZh ? '三、用数据线连电脑（存档在电脑上时）' : '3. Connect iPhone to PC via Cable (When Saves are on PC)' }}
            </div>
            <div class="text-[12.5px] text-[#5E504D] leading-relaxed">
              <template v-if="isZh">
                1. 数据线连接 iPhone 与电脑，手机上弹出「要信任此电脑吗」时点 <strong class="text-[#4A3F3D]">信任</strong> 并输入锁屏密码。<br />
                2. macOS 打开 <strong class="text-[#4A3F3D]">访达</strong>，左侧点你的 iPhone，顶部切到 <strong class="text-[#4A3F3D]">文件</strong>；Windows 打开 <strong class="text-[#4A3F3D]">iTunes</strong>（或「Apple 设备」App）→ 设备 → <strong class="text-[#4A3F3D]">文件共享</strong>。<br />
                3. 列表里选 <strong class="text-[#3f6d57]">泰拉瑞亚 / Terraria</strong>，右侧就是游戏的 Documents 目录{{ meta.isXD ? '，先进一串数字的心动ID文件夹' : '' }}。<br />
                4. 把 <CopyChip text=".wld" :toast-prefix="copyPrefix" /> 拖进 <CopyChip text="Worlds" :toast-prefix="copyPrefix" />、<CopyChip text=".plr" :toast-prefix="copyPrefix" /> 拖进 <CopyChip text="Players" :toast-prefix="copyPrefix" />，同名文件选<strong class="text-[#4A3F3D]">替换</strong>；导出就从右侧反向拖到电脑。改完<strong class="text-[#739CBF]">划掉游戏后台重进</strong>。
              </template>
              <template v-else>
                1. Connect iPhone to PC via USB cable. Tap <strong class="text-[#4A3F3D]">Trust This Computer</strong> on your iPhone and enter your passcode.<br />
                2. macOS: Open <strong class="text-[#4A3F3D]">Finder</strong>, select your iPhone on the sidebar, switch to the <strong class="text-[#4A3F3D]">Files</strong> tab. Windows: Open <strong class="text-[#4A3F3D]">iTunes</strong> (or Apple Devices app) → Device → <strong class="text-[#4A3F3D]">File Sharing</strong>.<br />
                3. Select <strong class="text-[#3f6d57]">Terraria</strong> in the app list to reveal the Documents directory{{ meta.isXD ? ', then open the numeric XD ID folder' : '' }}.<br />
                4. Drag <CopyChip text=".wld" :toast-prefix="copyPrefix" /> into <CopyChip text="Worlds" :toast-prefix="copyPrefix" /> and <CopyChip text=".plr" :toast-prefix="copyPrefix" /> into <CopyChip text="Players" :toast-prefix="copyPrefix" />. Choose <strong class="text-[#4A3F3D]">Replace</strong> for existing files. Force close and relaunch the game.
              </template>
            </div>
          </div>

          <div class="mt-3.5 p-3 rounded-lg bg-[#faf0f1] border border-[#ecd2d5] text-xs text-[#5E504D] leading-relaxed">
            <div class="font-bold text-[#9a4f56] mb-0.5">{{ isZh ? '苹果端防踩坑提醒' : 'iOS Notice' }}</div>
            <div>
              <template v-if="meta.isXD">
                <template v-if="isZh">① 心动版云存档需<strong>先上游戏下载到本地</strong>才会显示；<br /></template>
                <template v-else>① XD cloud saves must be <strong>downloaded to local in-game first</strong> before they appear in Files;<br /></template>
              </template>
              <template v-if="isZh">
                <span v-if="meta.isXD">② </span>千万不要误放进 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">OldSaves</code> 文件夹里，否则进游戏完全读不出来！
              </template>
              <template v-else>
                <span v-if="meta.isXD">② </span>Never place files into the <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">OldSaves</code> folder, or the game will not detect them!
              </template>
            </div>
            <div class="mt-2 pt-2 border-t border-[#ecd2d5]/70 flex items-center justify-between gap-2 flex-wrap">
              <span>{{ isZh ? '国服 / 国际服地图不互通？可用「地图签名互转」转换。' : 'Map edition mismatch (XD / Global)? Convert its signature.' }}</span>
              <button
                type="button"
                class="font-bold text-[#739CBF] hover:underline cursor-pointer"
                @click="setGuideSubTab('converter')"
              >
                {{ isZh ? '前往地图签名互转 →' : 'Open Map Converter →' }}
              </button>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>

    <!-- 底部返回与分享区 -->
    <div v-if="state.history.length > 1" class="flex items-center gap-2.5">
      <Button
        variant="outline"
        class="flex-1 bg-white border-[#EADFD9] text-[#4A3F3D] hover:bg-[#F9D6DB]/40 text-xs font-semibold h-10 gap-1.5"
        @click="goBack"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span>{{ isZh ? '上一步' : 'Back' }}</span>
      </Button>
      <Button
        variant="outline"
        class="bg-transparent border-[#EADFD9] text-[#8E807C] hover:text-[#4A3F3D] hover:bg-[#F9D6DB]/40 text-xs font-semibold h-10 px-4 gap-1.5"
        @click="resetWizard"
      >
        <Home class="w-3.5 h-3.5" />
        <span>{{ isZh ? '重新选择' : 'Restart' }}</span>
      </Button>
    </div>

    <Card class="bg-white border-[#EADFD9]">
      <CardContent class="p-3.5 flex items-center justify-between gap-3">
        <div class="text-xs text-[#8E807C]">
          <strong class="block text-[#4A3F3D] text-[12.5px] font-semibold">
            {{ isZh ? '群友也在问怎么装存档？' : 'Need to share this tutorial?' }}
          </strong>
          <span>{{ isZh ? '复制当前路线的纯文字教程直接发群里' : 'Copy concise text guide to share with others' }}</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          class="bg-[#F9D6DB]/60 hover:bg-[#F9D6DB] text-[#4A3F3D] border border-[#EADFD9] text-xs font-semibold shrink-0 gap-1.5"
          @click="copySummaryText"
        >
          <Copy class="w-3.5 h-3.5" />
          <span>{{ isZh ? '复制文字教程' : 'Copy Guide' }}</span>
        </Button>
      </CardContent>
    </Card>

    <!-- 常见排查弹窗 -->
    <Teleport to="body">
      <div
        v-if="troubleshootOpen"
        class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
        @click.self="troubleshootOpen = false"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl border border-[#EADFD9] shadow-2xl max-w-lg w-full max-h-[84vh] flex flex-col overflow-hidden text-[#4A3F3D]">
          <div class="px-4 py-3.5 border-b border-[#EADFD9] flex items-center justify-between">
            <span class="font-bold text-sm text-[#4A3F3D]">
              {{ isZh ? '常见报错与疑难排查' : 'Frequently Asked Questions & Troubleshooting' }}
            </span>
            <button
              type="button"
              class="p-1 text-[#8E807C] hover:text-[#4A3F3D] cursor-pointer"
              :aria-label="isZh ? '关闭' : 'Close'"
              @click="troubleshootOpen = false"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-4 overflow-y-auto flex flex-col gap-3 text-xs text-[#5E504D] leading-relaxed">
            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#4A3F3D] mb-1">
                {{ isZh ? '1. 找不到一串数字的心动ID文件夹？（或国际版没有数字文件夹？）' : '1. Can\'t find the numeric XD ID folder? (Or no numeric folder in Global edition?)' }}
              </div>
              <template v-if="isZh">
                • <strong class="text-[#3f6d57]">心动版</strong>：必须先上游戏登录账号，在存档界面把云存档<strong class="text-[#4A3F3D]">下载到本地</strong>（或新建一个本地角色/地图），才会生成数字 ID 文件夹。<br />
                • <strong class="text-[#739CBF]">国际版</strong>：本身就<strong class="text-[#4A3F3D]">没有数字 ID 文件夹</strong>！点进游戏目录后直接就是 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> 和 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds</code>。
              </template>
              <template v-else>
                • <strong class="text-[#3f6d57]">XD Edition (TapTap)</strong>: You must launch the game, log into your account, and in the save interface, <strong class="text-[#4A3F3D]">download your cloud save to local</strong> (or create a new local character/world) to generate the numeric ID folder.<br />
                • <strong class="text-[#739CBF]">Global Edition</strong>: By design, it <strong class="text-[#4A3F3D]">DOES NOT have a numeric ID folder</strong>! Open the game folder and you will directly see <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players</code> and <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds</code>.
              </template>
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#9a4f56] mb-1">
                {{ isZh ? '2. 覆盖补丁后打开游戏闪退 / 黑屏？' : '2. Game crashes or black screen after replacing patch files?' }}
              </div>
              <template v-if="isZh">
                100% 是<strong class="text-[#4A3F3D]">补丁版本与当前游戏版本号不一致</strong>（例如游戏更新了但补丁还是老版本）。请确认补丁适配的最新版本号，或卸载重装游戏恢复原文件。
              </template>
              <template v-else>
                100% caused by <strong class="text-[#4A3F3D]">a version mismatch between the patch and the game</strong> (e.g., game was updated but the patch is for an older version). Please verify the game version supported by the patch, or reinstall the game to restore clean files.
              </template>
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#739CBF] mb-1">
                {{ isZh ? '3. 放了存档但进游戏看不到？' : '3. Placed save files but cannot see them in-game?' }}
              </div>
              <template v-if="isZh">
                检查三点：① 没有误放进 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">OldSaves</code> 文件夹；② 地图（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code>）必须放 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds/world</code>，人物（<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>）必须放 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players/player</code>；③ 彻底划掉游戏后台再重进。
              </template>
              <template v-else>
                Check three points: ① Never place files in the <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">OldSaves</code> folder; ② Worlds (<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code>) must go into <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Worlds/world</code>, Characters (<code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code>) into <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Players/player</code>; ③ Completely swipe away the game from recent apps and restart it.
              </template>
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#8a6526] mb-1">
                {{ isZh ? '4. 数据线连上电脑，Android/data 里是空的？' : '4. Connected phone to PC via USB, but Android/data is empty?' }}
              </div>
              <template v-if="isZh">
                安卓 11 起系统会挡住电脑对 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code> 的访问，看到空文件夹是正常的。把文件先复制到手机 <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Download</code> 文件夹，再用手机上的文件管理器移进游戏目录；文件管理器进不去 data 的话，按权限检测那一步用 Shizuku 授权。
              </template>
              <template v-else>
                Since Android 11, the OS blocks computer access to <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Android/data</code>, so seeing an empty folder is normal. Copy files into your phone's <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">Download</code> folder first, then use a phone file manager (like MT Manager) to move them into the game folder. If data is inaccessible, grant permission via Shizuku.
              </template>
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#5d5a86] mb-1">
                {{ isZh ? '5. iPhone 连电脑后，访达 / iTunes 里没有泰拉瑞亚？' : '5. Connected iPhone to PC, but Terraria doesn\'t show in Finder / iTunes?' }}
              </div>
              <template v-if="isZh">
                先解锁手机并在弹窗里点<strong class="text-[#4A3F3D]">信任</strong>；macOS 在访达里选设备后切到<strong class="text-[#4A3F3D]">文件</strong>标签，Windows 需要装 iTunes 或「Apple 设备」App 并打开<strong class="text-[#4A3F3D]">文件共享</strong>。列表里只显示支持文档管理的 App。
              </template>
              <template v-else>
                Unlock your iPhone and tap <strong class="text-[#4A3F3D]">Trust</strong> on the prompt. On macOS, select your device in Finder and click the <strong class="text-[#4A3F3D]">Files</strong> tab. On Windows, install iTunes or Apple Devices app and open <strong class="text-[#4A3F3D]">File Sharing</strong>. Only apps supporting document storage will be listed.
              </template>
            </div>

            <div class="p-3 rounded-lg bg-[#FFF7F2] border border-[#EADFD9]">
              <div class="font-bold text-[#5d5a86] mb-1">
                {{ isZh ? '6. 如何通过后缀区分存档文件？' : '6. How to identify save files by extension?' }}
              </div>
              • <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.wld</code> = {{ isZh ? '地图存档（放 Worlds / world）' : 'World save (place in Worlds / world)' }}<br />
              • <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.plr</code> = {{ isZh ? '人物存档（放 Players / player）' : 'Character save (place in Players / player)' }}<br />
              • <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">.bak / .bak2</code> = {{ isZh ? '自动备份（删掉 .bak 后缀即可当正式存档）' : 'Automatic backups (delete .bak extension to use as a live save)' }}<br />
              • <code class="px-1 py-0.5 bg-white rounded border border-[#EADFD9] text-[11px]">global-metadata.dat</code> = {{ isZh ? '游戏底层补丁（仅安卓可用）' : 'Core engine patch (Android only)' }}
            </div>
          </div>

          <div class="px-4 py-3 border-t border-[#EADFD9]">
            <Button
              class="w-full h-9 bg-[#739CBF] hover:bg-[#5F87A8] text-white text-xs font-semibold"
              @click="troubleshootOpen = false"
            >
              {{ isZh ? '我知道了，返回教程' : 'Got it, back to guide' }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
