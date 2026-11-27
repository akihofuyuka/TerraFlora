<div align="center">

<img src="./public/logo.png" alt="TerraFlora Logo" width="88" height="88" />

# TerraFlora

纯本地运行的泰拉瑞亚角色存档（`.plr`）网页编辑器。

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-lightgrey.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-blue.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare_Pages-orange.svg)](https://terraflora-8cm.pages.dev/)

[在线访问](https://terraflora-8cm.pages.dev/) · [GitHub 仓库](https://github.com/akihofuyuka/TerraFlora) · [功能说明](#功能) · [存档路径](#默认存档路径) · [本地构建](#本地构建)

</div>

---

## 简介

TerraFlora 是一个直接在浏览器内运行的泰拉瑞亚角色存档工具。所有加解密与二进制读写均在本地内存中完成，存档文件不会上传至任何服务器。

在线站点：[https://terraflora-8cm.pages.dev/](https://terraflora-8cm.pages.dev/)

---

## 功能

- **本地解析与隐私**：依托浏览器原生 Web Crypto API（SubtleCrypto AES-128-CBC）在前端内存完成解密与保存，支持离线使用（PWA）。
- **版本与服务器适配**：
  - 支持官方国际版（Re-Logic 签名）与心动国服（Xindong 签名）互转。
  - **说明**：暂不支持心动国服专属物品的图标与纸娃娃外观预览，因为太麻烦了喵~
  - 支持 1.0 至 1.4.6 存档解析与跨版本转换导出。
  - 支持从零创建全新的空白角色（附带初始工具与基础数值）。
- **角色立绘预览**：基于 HTML5 Canvas 实时渲染角色全身像素外观，支持发型、发色、肤色、常服款式、头盔/躯干/护腿护甲、可见饰品及染料着色。
- **仓储与物品管理**：
  - 支持常用背包（0~49 格）、钱币、弹药栏以及四种扩展仓库（猪猪存钱罐、保险箱、护卫熔炉、虚空保险库）。
  - 支持物品拖拽、堆叠拆分、前缀修饰语修改及全物品拼音模糊检索。
- **配装与旅途模式**：
  - 支持 3 套独立装备配置（Loadouts）切换编辑。
  - 支持生命值、魔力值、游戏难度模式调整。
  - 支持旅途模式全图鉴研究解锁与敌人生成倍率调节。

---

## 默认存档路径

| 平台 | 默认路径 |
| :--- | :--- |
| **Windows** | `%USERPROFILE%\Documents\My Games\Terraria\Players` |
| **Android** | `Android/data/com.and.games505.TerrariaPaid/Players` |
| **iOS / iPadOS** | `文件 App > 我的 iPhone / iPad > Terraria > Players` |

---

## 本地构建

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打包生产版本
npm run build
```

---

## 致谢与参考

本项目的交互逻辑、数据结构与存档编解码参考了以下项目与社区文档：

- [Terrasavr](https://yal.cc/r/terrasavr/) — 网页端泰拉瑞亚角色编辑器（by YellowAfterlife）
- [TEdit](https://github.com/TEdit/Terraria-Map-Editor) — 开源泰拉瑞亚地图编辑器
- [Official Terraria Wiki](https://terraria.wiki.gg/) — 泰拉瑞亚官方 Wiki 社区文档
- 微信小程序：书呆子史莱姆的存档助手

---

## 开源协议

本项目由 **akihofuyuka** 开发，基于 **AGPL-3.0 License** 开源。

---

## 免责声明

本站为非官方玩家自制工具。页面中使用的《泰拉瑞亚》（Terraria）相关图标、贴图及数据版权均归原作者 [Re-Logic](https://re-logic.com/) 所有。
