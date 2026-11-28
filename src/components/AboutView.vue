<script setup lang="ts">
import { getItemSpriteStyle } from '@/utils/sprite';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-vue-next';

const appVersion = __APP_VERSION__;
</script>

<template>
  <div class="flex flex-col gap-3.5 max-w-xl w-full mx-auto select-none">
    <Card class="bg-white border-[#EADFD9] shadow-sm">
      <CardContent class="p-5 md:p-6 flex flex-col gap-4">
        <!-- 顶部品牌区 -->
        <div class="flex flex-col items-center text-center gap-2">
          <div class="w-14 h-14 rounded-2xl bg-[#FFF7F2] border border-[#EADFD9] flex items-center justify-center shadow-xs">
            <img src="/logo.png" alt="TerraFlora Logo" class="w-10 h-10 object-contain drop-shadow-xs" />
          </div>

          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-[#4A3F3D] tracking-tight">TerraFlora</h2>
            <span class="text-[11px] font-mono text-[#8E807C] px-1.5 py-0.5 rounded bg-[#FFF7F2] border border-[#EADFD9]">
              v{{ appVersion }}
            </span>
          </div>

          <p class="text-xs text-[#8E807C] max-w-md leading-relaxed">
            纯本地运行的《泰拉瑞亚》玩家工具箱，集成角色存档编辑、地图存档工具与像素画方块/墙壁选色，所有解析与计算均在浏览器本地完成。
          </p>
        </div>

        <!-- 核心信息列表 (浅樱底色圆角卡片，细分割线分行，泰拉瑞亚小图标) -->
        <div class="w-full bg-[#FFF7F2] border border-[#EADFD9] rounded-xl flex flex-col text-xs text-[#4A3F3D] divide-y divide-[#EADFD9]/70 overflow-hidden shadow-2xs">
          <!-- 1. 作者与协议 -->
          <div class="p-3 sm:p-3.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div class="flex items-center gap-2 min-w-0">
              <span class="shrink-0" :style="{ ...getItemSpriteStyle(149, 16), imageRendering: 'pixelated' }"></span>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[#8E807C]">作者</span>
                <span
                  class="px-1.5 py-0.2 rounded text-xs font-bold transition-colors"
                  style="background-color: color-mix(in srgb, var(--akihofuyuka-badge-tone) 18%, transparent); color: #4A3F3D; border: 1px solid color-mix(in srgb, var(--akihofuyuka-badge-tone) 45%, transparent);"
                >
                  akihofuyuka
                </span>
                <span class="text-[#8E807C]">·</span>
                <span class="text-[#4A3F3D] font-medium">AGPL-3.0 开源协议</span>
              </div>
            </div>

            <a
              href="https://github.com/akihofuyuka/TerraFlora"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EADFD9] bg-white text-xs font-semibold text-[#739CBF] hover:bg-[#F9D6DB]/50 transition-colors shadow-2xs shrink-0 cursor-pointer ml-auto sm:ml-0"
            >
              <span>GitHub 仓库</span>
              <ExternalLink class="w-3 h-3 text-[#739CBF]" />
            </a>
          </div>

          <!-- 2. 灵感与致谢 -->
          <div class="p-3 sm:p-3.5 flex items-start gap-2 leading-relaxed">
            <span class="shrink-0 mt-0.5" :style="{ ...getItemSpriteStyle(5011, 16), imageRendering: 'pixelated' }"></span>
            <div class="flex-1 min-w-0">
              <span class="font-bold text-[#4A3F3D]">灵感与致谢：</span>
              <span class="text-[#8E807C]">
                界面交互与存档解析参考了 Terrasavr、TEdit、微信小程序：书呆子史莱姆的存档助手 及 Terraria Wiki 社区文档，特此致谢。
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 底部免责声明 (卡片外底部，小号浅灰可可色文字居中) -->
    <p class="text-[11px] text-[#8E807C] text-center leading-relaxed px-4">
      本站为非官方玩家自制工具，页面中使用的《泰拉瑞亚》（Terraria）相关图标、贴图及游戏数据版权均归 Re-Logic 所有。
    </p>
  </div>
</template>
