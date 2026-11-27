export type GuideLang = 'zh' | 'en';
export type GuideStepId =
  | 'start'
  | 'select_os'
  | 'select_goal'
  | 'pc_goal'
  | 'pc_final'
  | 'android_prep'
  | 'android_check_perm'
  | 'shizuku_guide'
  | 'android_final'
  | 'ios_final';

export type PlatformType = 'mobile' | 'pc' | null;
export type OsType = 'android' | 'ios' | null;
export type EditionChoice = 'xd' | 'normal' | null;
export type GoalType = 'save' | 'patch' | 'editor' | 'mod' | null;

export interface WizardState {
  history: GuideStepId[];
  platform: PlatformType;
  os: OsType;
  edition: EditionChoice;
  goal: GoalType;
  hasDataPerm: boolean | null;
}

export interface EditionMeta {
  isXD: boolean;
  name: string;
  androidPkg: string;
  worldDir: string;
  playerDir: string;
}

export const STEP_PROGRESS: Record<GuideStepId, number> = {
  start: 15,
  select_os: 30,
  select_goal: 45,
  pc_goal: 45,
  android_prep: 56,
  android_check_perm: 66,
  shizuku_guide: 82,
  pc_final: 100,
  android_final: 100,
  ios_final: 100,
};

export function getEditionMeta(edition: EditionChoice, lang: GuideLang): EditionMeta {
  const isXD = edition === 'xd';
  return {
    isXD,
    name: lang === 'zh' ? (isXD ? '心动版' : '国际版') : isXD ? 'XD Edition' : 'Global Edition',
    androidPkg: isXD ? 'com.xd.terraria' : 'com.and.games505.TerrariaPaid',
    worldDir: isXD ? 'world' : 'Worlds',
    playerDir: isXD ? 'player' : 'Players',
  };
}

export function getStepCrumbLabel(stepId: GuideStepId, state: WizardState, lang: GuideLang): string {
  const isZh = lang === 'zh';
  if (stepId === 'start' && state.platform) {
    if (state.platform === 'pc') return isZh ? '电脑Steam版' : 'PC Steam';
    return state.edition === 'xd'
      ? isZh ? '手机心动版' : 'Mobile (XD)'
      : isZh ? '手机国际版' : 'Mobile (Global)';
  }
  if (stepId === 'select_os' && state.os) {
    return state.os === 'android' ? (isZh ? '安卓/鸿蒙' : 'Android') : isZh ? '苹果iOS' : 'iOS';
  }
  if ((stepId === 'select_goal' || stepId === 'pc_goal') && state.goal) {
    const goalLabels: Record<Exclude<GoalType, null>, string> = isZh
      ? { save: '导存档', patch: '装补丁', editor: '修改器', mod: '装MOD' }
      : { save: 'Saves', patch: 'Patch', editor: 'Editor', mod: 'Mods' };
    return goalLabels[state.goal];
  }
  const baseLabels: Record<GuideStepId, string> = isZh
    ? {
        start: '平台',
        select_os: '系统',
        select_goal: '目的',
        pc_goal: '目的',
        pc_final: '最终步骤',
        android_prep: '准备工作',
        android_check_perm: '权限检测',
        shizuku_guide: 'Shizuku 授权',
        android_final: '最终步骤',
        ios_final: '苹果步骤',
      }
    : {
        start: 'Platform',
        select_os: 'OS',
        select_goal: 'Goal',
        pc_goal: 'Goal',
        pc_final: 'Finish',
        android_prep: 'Prep',
        android_check_perm: 'Permission',
        shizuku_guide: 'Shizuku',
        android_final: 'Finish',
        ios_final: 'iOS Guide',
      };
  return baseLabels[stepId];
}

export function buildSummaryText(state: WizardState, lang: GuideLang): { text: string; toast: string } {
  const meta = getEditionMeta(state.edition, lang);

  if (lang === 'en') {
    if (state.platform === 'pc') {
      if (state.goal === 'mod') {
        return {
          text: '【Terraria PC Steam Mod Setup Guide】\n1. Search for and install free tModLoader on Steam.\n2. Subscribe to desired mods in Steam Workshop and wait for download.\n3. Launch tModLoader from Steam library, go to Manage Mods, enable them and click Reload Mods.\n(Multiplayer requires matching mod lists; check version compatibility if crashing)',
          toast: 'Copied PC guide! Ready to paste and share.',
        };
      }
      if (state.goal === 'editor') {
        return {
          text: '【Terraria PC Steam Save Editor Guide】\n1. Save folder: Documents / My Games / Terraria (Characters in Players, Worlds in Worlds).\n2. Edit characters: Open TerraFlora / Terrasavr in browser, load .plr, edit and save to overwrite Players folder.\n3. Edit worlds: Open desktop TEdit, load .wld, edit and save (always backup original files first).',
          toast: 'Copied PC guide! Ready to paste and share.',
        };
      }
      return {
        text: '【Terraria PC Steam Import/Export Saves Guide】\n1. Exit Terraria completely. Open save path:\nWindows: %USERPROFILE%\\Documents\\My Games\\Terraria\nmacOS: ⌘⇧G to ~/Library/Application Support/Terraria\nLinux: ~/.local/share/Terraria\n2. Worlds (.wld) go into Worlds; Characters (.plr) go into Players. Relaunch game to play.\n3. To export, copy files directly to share. Files ending in .bak are auto-backups (delete .bak to restore). Temporarily disable Steam Cloud if files get overwritten.',
        toast: 'Copied PC guide! Ready to paste and share.',
      };
    }

    if (state.os === 'ios') {
      const iosDirText = meta.isXD
        ? 'Browse -> On My iPhone -> Terraria -> [Numeric XD ID]'
        : 'Browse -> On My iPhone -> Terraria';
      const iosPlayers = meta.isXD
        ? 'On My iPhone / Terraria / [Numeric XD ID] / Players'
        : 'On My iPhone / Terraria / Players';

      if (state.goal === 'patch') {
        return {
          text: `【Apple iOS ${meta.name} Terraria Notice】\niOS sandbox prevents access to internal app code directories (no il2cpp/Metadata). Core game patches cannot be installed.\nAlternatives: ① Directly import all-item world/character saves (.wld / .plr); ② Open TerraFlora or Terrasavr in Safari to modify character inventory.`,
          toast: 'Copied guide! Ready to paste and share.',
        };
      }
      if (state.goal === 'editor') {
        return {
          text: `【Apple iOS ${meta.name} Terraria Save Editor Guide】\n1. Open Safari and go to TerraFlora or Terrasavr (free & no install).\n2. Load your .plr file: ${iosPlayers}.\n3. Edit items/stats, save/export to download, move file back into Players to overwrite, and force-restart the game (backup first!).\n(App Store editors may have limited features)`,
          toast: 'Copied guide! Ready to paste and share.',
        };
      }
      return {
        text: `【Apple iOS ${meta.name} Terraria Save Guide】\n1. Download save file (.wld map / .plr character) -> Share sheet -> Save to "Files".\n2. Path: ${iosDirText} (Never put into OldSaves).\n3. Worlds in Worlds, characters in Players. Force close and restart the game.\n(If saves on PC: USB cable to iPhone, Finder or iTunes -> File Sharing -> Terraria, drag into Worlds / Players)`,
        toast: 'Copied guide! Ready to paste and share.',
      };
    }

    if (state.goal === 'patch') {
      return {
        text: `【Android / HarmonyOS ${meta.name} Patch Guide】\n1. Install file manager: MT Manager (mt2.cn) or ZArchiver. Download patch file to phone.\n2. Open MT Manager, go to Android -> data -> ${meta.androidPkg} -> files -> il2cpp -> Metadata. (If data is inaccessible, authorize MT Manager via Shizuku at shizuku.rikka.app).\n3. Copy/Move patch file into Metadata, select "Replace" existing file.`,
        toast: 'Copied guide! Ready to paste and share.',
      };
    }
    if (state.goal === 'editor') {
      const saveSubPath = meta.isXD ? '[Numeric XD ID] -> world or player' : 'Worlds or Players';
      return {
        text: `【Android / HarmonyOS ${meta.name} Save Editor Guide】\n1. Install MT Manager (mt2.cn) and Save Editor app (or use TerraFlora in browser). (On Android 11+, install and pair Shizuku via shizuku.rikka.app).\n2. Open editor, load save: Android -> data -> ${meta.androidPkg} -> ${saveSubPath}.\n3. Edit and tap Save, restart game to take effect (always backup first!).`,
        toast: 'Copied guide! Ready to paste and share.',
      };
    }
    const idLayerEn = meta.isXD ? ' -> [Numeric XD ID]' : '';
    return {
      text: `【Android / HarmonyOS ${meta.name} Save Guide】\n1. Install file manager: MT Manager (mt2.cn) or ZArchiver. Download save to phone.\n2. Open MT Manager, go to Android -> data -> ${meta.androidPkg}${idLayerEn} (contains ${meta.worldDir} and ${meta.playerDir}). (If data is blocked, authorize via Shizuku at shizuku.rikka.app).\n3. Put worlds (.wld) into ${meta.worldDir}, characters (.plr) into ${meta.playerDir}. Files with .bak can be renamed by removing .bak to restore. Force restart game.`,
      toast: 'Copied guide! Ready to paste and share.',
    };
  }

  if (state.platform === 'pc') {
    if (state.goal === 'mod') {
      return {
        text: '【电脑 Steam 版 泰拉瑞亚安装 MOD 教程】\n1. Steam 商店搜索并安装免费的 tModLoader。\n2. 创意工坊订阅需要的 MOD，等待下载完成。\n3. 从游戏库启动 tModLoader（不要启动原版），在 MOD 管理里启用并重新加载。\n（联机时双方 MOD 列表需一致，更新后闪退先检查版本对应）',
        toast: '已复制电脑版精简教程，快去群里粘贴吧！',
      };
    }
    if (state.goal === 'editor') {
      return {
        text: '【电脑 Steam 版 泰拉瑞亚修改存档教程】\n1. 存档目录：文档 / My Games / Terraria，人物在 Players，地图在 Worlds。\n2. 改人物：用本站 TerraFlora（或 Terrasavr）加载 Players 里的 .plr，改完导出覆盖回原文件。\n3. 改地图：用桌面版 TEdit 打开 .wld 编辑后保存，重进游戏即可（改前先备份原文件）。',
        toast: '已复制电脑版精简教程，快去群里粘贴吧！',
      };
    }
    return {
      text: '【电脑 Steam 版 泰拉瑞亚导入/导出存档教程】\n1. 完全退出游戏，按系统打开存档目录：Windows 输入 %USERPROFILE%\\Documents\\My Games\\Terraria；macOS 按 ⌘⇧G 前往 ~/Library/Application Support/Terraria；Linux 按 Ctrl+L 输入 ~/.local/share/Terraria。\n2. 地图(.wld)放进 Worlds，人物(.plr)放进 Players，重新启动游戏即可看到。\n3. 导出时直接从这两个文件夹复制文件发给好友；带 .bak 的是自动备份，删掉后缀可当正式存档。若开了 Steam 云存档导致替换失效，可先关闭云存档。',
      toast: '已复制电脑版精简教程，快去群里粘贴吧！',
    };
  }

  if (state.os === 'ios') {
    const iosDirText = meta.isXD
      ? '浏览 -> 我的 iPhone -> 泰拉瑞亚 -> 一串数字的心动ID'
      : '浏览 -> 我的 iPhone -> Terraria';
    const iosPlayers = meta.isXD
      ? '我的 iPhone / 泰拉瑞亚 / 一串数字的心动ID / Players'
      : '我的 iPhone / Terraria / Players';

    if (state.goal === 'patch') {
      return {
        text: `【苹果(iOS) ${meta.name} 泰拉瑞亚说明】\n苹果的应用是沙盒机制，进不到安卓那种 il2cpp/Metadata 目录，装不了底层补丁。\n替代方案：① 直接导入全物品地图/人物存档（.wld / .plr）；② 用 Safari 打开本站 TerraFlora 或 Terrasavr 往背包塞物品。`,
        toast: '已复制当前路线精简教程，快去群里粘贴吧！',
      };
    }
    if (state.goal === 'editor') {
      return {
        text: `【苹果(iOS) ${meta.name} 泰拉瑞亚修改存档教程】\n1. 用 Safari 打开本站 TerraFlora 或网页版 Terrasavr（免费免下载）。\n2. 选择加载 .plr 人物文件：${iosPlayers}。\n3. 改完导出下载，覆盖回 Players，划掉游戏后台重进（改前先复制一份备份）。\n（App Store 里的编辑器是阉割版，功能不一定齐全）`,
        toast: '已复制当前路线精简教程，快去群里粘贴吧！',
      };
    }
    return {
      text: `【苹果(iOS) ${meta.name} 泰拉瑞亚存档教程】\n1. 把存档下载到手机(.wld 地图 / .plr 人物) -> 分享 -> 存储到“文件”。\n2. 路径：${iosDirText}（切勿放进 OldSaves）。\n3. 地图放 Worlds，人物放 Players，划掉游戏后台重进。\n（存档在电脑上：数据线连 iPhone，访达或 iTunes -> 文件共享 -> 选泰拉瑞亚，直接拖进 Worlds / Players）`,
      toast: '已复制当前路线精简教程，快去群里粘贴吧！',
    };
  }

  if (state.goal === 'patch') {
    return {
      text: `【安卓/鸿蒙 ${meta.name} 泰拉瑞亚安装补丁教程】\n1. 装文件管理器：首选 MT 管理器（官网 mt2.cn），ZArchiver 也行；把补丁文件下载到手机（群文件、网盘、浏览器都行）。\n2. 打开 MT 进 Android -> data -> ${meta.androidPkg} -> files -> il2cpp -> Metadata；data 打不开说明没权限，按官方文档装好 Shizuku 并授权 MT（shizuku.rikka.app）。\n3. 把补丁复制/移动过去，选择“替换”原文件。`,
      toast: '已复制当前路线精简教程，快去群里粘贴吧！',
    };
  }
  if (state.goal === 'editor') {
    const saveSubPath = meta.isXD ? '一串数字的心动ID -> world 或 player' : 'Worlds 或 Players';
    return {
      text: `【安卓/鸿蒙 ${meta.name} 泰拉瑞亚存档编辑器教程】\n1. 装 MT 管理器（官网 mt2.cn）和存档编辑器（也可用本站 TerraFlora 在浏览器改人物）；高版本安卓还要装 Shizuku，按官方文档 shizuku.rikka.app 安装配对。\n2. 打开编辑器加载存档：Android -> data -> ${meta.androidPkg} -> ${saveSubPath}。\n3. 改完点保存，重启游戏生效（改前先备份原存档）。`,
      toast: '已复制当前路线精简教程，快去群里粘贴吧！',
    };
  }

  const idLayer = meta.isXD ? ' -> 一串数字的心动ID' : '';
  return {
    text: `【安卓/鸿蒙 ${meta.name} 泰拉瑞亚存档教程】\n1. 装文件管理器：首选 MT 管理器（官网 mt2.cn），ZArchiver 也行；把存档下载到手机（群文件、网盘、浏览器都行）。\n2. 打开 MT 进 Android -> data -> ${meta.androidPkg}${idLayer}，里面就是 ${meta.worldDir} 和 ${meta.playerDir}；data 打不开说明没权限，按官方文档装好 Shizuku 并授权 MT（shizuku.rikka.app）。\n3. 地图(.wld) 放进 ${meta.worldDir}，人物(.plr) 放进 ${meta.playerDir}；带 .bak 的删掉后缀可当正式存档，改完划掉游戏后台重进。`,
    toast: '已复制当前路线精简教程，快去群里粘贴吧！',
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback to execCommand below
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

