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
export type DesktopOs = 'windows' | 'macos' | 'linux';

export interface DeviceHint {
  platform: 'mobile' | 'pc';
  mobileOs: 'android' | 'ios' | null;
  desktopOs: DesktopOs;
}

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

export interface PcPathInfo {
  os: DesktopOs;
  label: string;
  path: string;
  shortcutZh: string;
  shortcutEn: string;
}

export interface QuickPathEntry {
  id: string;
  group: 'pc' | 'android' | 'ios';
  titleZh: string;
  titleEn: string;
  savePath: string;
  patchPath?: string;
  copyText?: string;
  copyLabelZh?: string;
  copyLabelEn?: string;
  tipZh: string;
  tipEn: string;
  matchDevice?: (hint: DeviceHint) => boolean;
}

export interface FaqItem {
  id: string;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
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

export function detectDeviceHint(): DeviceHint {
  if (typeof navigator === 'undefined') {
    return { platform: 'pc', mobileOs: null, desktopOs: 'windows' };
  }
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) {
    return { platform: 'mobile', mobileOs: 'android', desktopOs: 'windows' };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return { platform: 'mobile', mobileOs: 'ios', desktopOs: 'macos' };
  }
  if (/Mac OS X|Macintosh/i.test(ua)) {
    return { platform: 'pc', mobileOs: null, desktopOs: 'macos' };
  }
  if (/Linux/i.test(ua)) {
    return { platform: 'pc', mobileOs: null, desktopOs: 'linux' };
  }
  return { platform: 'pc', mobileOs: null, desktopOs: 'windows' };
}

export const PC_PATHS: PcPathInfo[] = [
  {
    os: 'windows',
    label: 'Windows',
    path: '%USERPROFILE%\\Documents\\My Games\\Terraria',
    shortcutZh: '按 Win + R，粘贴上方路径后回车即可直接打开',
    shortcutEn: 'Press Win + R, paste the path above, and press Enter',
  },
  {
    os: 'macos',
    label: 'macOS',
    path: '~/Library/Application Support/Terraria',
    shortcutZh: '访达按 ⌘⇧G（前往文件夹），需先显示隐藏文件',
    shortcutEn: 'Press ⌘⇧G in Finder -> Go to Folder (hidden by default)',
  },
  {
    os: 'linux',
    label: 'Linux',
    path: '~/.local/share/Terraria',
    shortcutZh: '文件管理器按 Ctrl + L 输入路径，需先显示隐藏文件',
    shortcutEn: 'Press Ctrl + L in your file manager (hidden by default)',
  },
];

export const QUICK_PATH_ENTRIES: QuickPathEntry[] = [
  {
    id: 'pc-win',
    group: 'pc',
    titleZh: 'Windows · Steam',
    titleEn: 'Windows · Steam',
    savePath: '%USERPROFILE%\\Documents\\My Games\\Terraria',
    copyText: '%USERPROFILE%\\Documents\\My Games\\Terraria',
    tipZh: 'Win + R 粘贴打开',
    tipEn: 'Press Win + R and paste',
    matchDevice: (h) => h.platform === 'pc' && h.desktopOs === 'windows',
  },
  {
    id: 'pc-mac',
    group: 'pc',
    titleZh: 'macOS · Steam',
    titleEn: 'macOS · Steam',
    savePath: '~/Library/Application Support/Terraria',
    copyText: '~/Library/Application Support/Terraria',
    tipZh: '访达按 ⌘⇧G 前往',
    tipEn: 'Finder -> ⌘⇧G',
    matchDevice: (h) => h.platform === 'pc' && h.desktopOs === 'macos',
  },
  {
    id: 'pc-linux',
    group: 'pc',
    titleZh: 'Linux · Steam',
    titleEn: 'Linux · Steam',
    savePath: '~/.local/share/Terraria',
    copyText: '~/.local/share/Terraria',
    tipZh: '文件管理器按 Ctrl + L',
    tipEn: 'File manager -> Ctrl + L',
    matchDevice: (h) => h.platform === 'pc' && h.desktopOs === 'linux',
  },
  {
    id: 'android-xd',
    group: 'android',
    titleZh: '安卓 · 心动版',
    titleEn: 'Android · XD',
    savePath: 'Android/data/com.xd.terraria/[数字ID]',
    patchPath: 'Android/data/com.xd.terraria/files/il2cpp/Metadata',
    copyText: 'com.xd.terraria',
    copyLabelZh: '复制包名',
    copyLabelEn: 'Copy pkg',
    tipZh: '云存档需先在游戏内下载到本地；安卓 11+ 用 MT + Shizuku',
    tipEn: 'Download cloud saves locally first; Android 11+ uses MT + Shizuku',
    matchDevice: (h) => h.platform === 'mobile' && h.mobileOs === 'android',
  },
  {
    id: 'android-global',
    group: 'android',
    titleZh: '安卓 · 国际版',
    titleEn: 'Android · Global',
    savePath: 'Android/data/com.and.games505.TerrariaPaid',
    patchPath: 'Android/data/com.and.games505.TerrariaPaid/files/il2cpp/Metadata',
    copyText: 'com.and.games505.TerrariaPaid',
    copyLabelZh: '复制包名',
    copyLabelEn: 'Copy pkg',
    tipZh: '安卓 11+ 网页编辑请先复制到 Download',
    tipEn: 'Copy to Download first when editing in Android 11+ browser',
    matchDevice: (h) => h.platform === 'mobile' && h.mobileOs === 'android',
  },
  {
    id: 'ios-xd',
    group: 'ios',
    titleZh: 'iOS · 心动版',
    titleEn: 'iOS · XD',
    savePath: '文件 App / 我的 iPhone / 泰拉瑞亚 / [数字ID]',
    tipZh: '勿放 OldSaves；云存档需先下载到本地',
    tipEn: 'Never put in OldSaves; download cloud saves first',
    matchDevice: (h) => h.platform === 'mobile' && h.mobileOs === 'ios',
  },
  {
    id: 'ios-global',
    group: 'ios',
    titleZh: 'iOS · 国际版',
    titleEn: 'iOS · Global',
    savePath: '文件 App / 我的 iPhone / Terraria',
    copyText: 'Terraria',
    tipZh: '勿放 OldSaves；电脑可用访达 / iTunes 文件共享',
    tipEn: 'Never put in OldSaves; or use Finder / iTunes File Sharing',
    matchDevice: (h) => h.platform === 'mobile' && h.mobileOs === 'ios',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'xd-id',
    titleZh: '找不到一串数字的心动 ID 文件夹？（或国际版没有数字文件夹？）',
    titleEn: "Can't find the numeric XD ID folder? (Or no numeric folder in Global edition?)",
    bodyZh: '• 心动版：必须先打开游戏登录账号，在存档列表把云存档「下载到本地」（或新建本地角色/地图），才会生成数字 ID 文件夹。\n• 国际版：本身没有数字 ID 文件夹，进入游戏目录后直接就是 Players 和 Worlds。',
    bodyEn: '• XD Edition: Launch the game, log in, and download a cloud save to local (or create a local save) to generate the numeric ID folder.\n• Global Edition: By design there is NO numeric ID folder; Players and Worlds are directly inside the package directory.',
  },
  {
    id: 'not-showing',
    titleZh: '放了存档但进游戏看不到？',
    titleEn: 'Placed save files but cannot see them in-game?',
    bodyZh: '检查三点：① 没有误放进 OldSaves；② .wld 必须放 Worlds，.plr 必须放 Players；③ 确保游戏退回主页面后再重新点进角色/世界列表。若是从国服/国际服跨端导入地图，需先在「地图存档」中互转签名。',
    bodyEn: 'Check 3 points: ① Never put files in OldSaves; ② .wld -> Worlds and .plr -> Players; ③ Return to the game main menu and re-enter the list. For XD/Global cross-edition worlds, convert the signature in World Tool first.',
  },
  {
    id: 'pc-usb-empty',
    titleZh: '数据线连上电脑，Android/data 里是空的？',
    titleEn: 'Connected phone to PC via USB, but Android/data is empty?',
    bodyZh: '安卓 11 起系统屏蔽了电脑对 Android/data 的访问，这是正常现象。先把文件复制到手机 Download 文件夹，再用手机上的 MT 管理器移进游戏目录；进不去 data 则在「分步向导」里按指引通过 Shizuku 授权。',
    bodyEn: 'Android 11+ blocks PC USB access to Android/data. Copy files to phone Download first, then use MT Manager (with Shizuku if needed) on the phone to move them.',
  },
  {
    id: 'ios-cable',
    titleZh: 'iPhone 连电脑后，访达 / iTunes 里没有泰拉瑞亚？',
    titleEn: "Connected iPhone to PC, but Terraria doesn't show in Finder / iTunes?",
    bodyZh: '先解锁手机并在弹窗里点「信任」；macOS 在访达选设备后切到「文件」标签，Windows 安装 iTunes 或「Apple 设备」App 并打开「文件共享」。',
    bodyEn: 'Unlock iPhone and tap Trust. On macOS open Finder -> Files tab; on Windows open iTunes / Apple Devices -> File Sharing.',
  },
  {
    id: 'patch-crash',
    titleZh: '覆盖补丁后打开游戏闪退 / 黑屏？',
    titleEn: 'Game crashes or black screen after replacing patch files?',
    bodyZh: '通常是补丁版本号与当前游戏版本号不一致（游戏更新后继续沿用了旧补丁）。请核对补丁适配的版本，或重新安装游戏恢复原文件。',
    bodyEn: 'Caused by a version mismatch between the patch and your game build. Verify the supported version or reinstall Terraria to restore clean files.',
  },
  {
    id: 'file-ext',
    titleZh: '如何通过文件后缀区分存档？',
    titleEn: 'How to identify save files by extension?',
    bodyZh: '• .wld = 地图存档（放 Worlds）\n• .plr = 角色存档（放 Players）\n• .bak / .bak2 = 自动备份（删掉 .bak 后缀即可当正式存档）\n• global-metadata.dat = 游戏底层补丁（仅安卓可用）',
    bodyEn: '• .wld = World save (Worlds)\n• .plr = Player save (Players)\n• .bak / .bak2 = Automatic backup (remove .bak suffix to restore)\n• global-metadata.dat = Core engine patch (Android only)',
  },
];

export function getEditionMeta(edition: EditionChoice, lang: GuideLang): EditionMeta {
  const isXD = edition === 'xd';
  return {
    isXD,
    name: lang === 'zh' ? (isXD ? '心动版' : '国际版') : isXD ? 'XD Edition' : 'Global Edition',
    androidPkg: isXD ? 'com.xd.terraria' : 'com.and.games505.TerrariaPaid',
    worldDir: 'Worlds',
    playerDir: 'Players',
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
          toast: 'Copied route guide — ready to share or paste to AI',
        };
      }
      if (state.goal === 'editor') {
        return {
          text: '【Terraria PC Steam Save Editor Guide】\n1. Save folder: Documents / My Games / Terraria (Characters in Players, Worlds in Worlds).\n2. Edit characters: Open TerraFlora / Terrasavr in browser, load .plr, edit and save to overwrite Players folder.\n3. Edit worlds: Open desktop TEdit, load .wld, edit and save (always backup original files first).',
          toast: 'Copied route guide — ready to share or paste to AI',
        };
      }
      return {
        text: '【Terraria PC Steam Import/Export Saves Guide】\n1. Stay on the game main menu and open save path:\nWindows: %USERPROFILE%\\Documents\\My Games\\Terraria\nmacOS: ⌘⇧G to ~/Library/Application Support/Terraria\nLinux: ~/.local/share/Terraria\n2. Worlds (.wld) go into Worlds; Characters (.plr) go into Players. Re-enter the list from the main menu.\n3. To export, copy files directly to share. Files ending in .bak are auto-backups (delete .bak to restore). Temporarily disable Steam Cloud if files get overwritten.',
        toast: 'Copied route guide — ready to share or paste to AI',
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
          toast: 'Copied route guide — ready to share or paste to AI',
        };
      }
      if (state.goal === 'editor') {
        return {
          text: `【Apple iOS ${meta.name} Terraria Save Editor Guide】\n1. Open Safari and go to TerraFlora or Terrasavr (free & no install).\n2. Load your .plr file: ${iosPlayers}.\n3. Edit items/stats, save/export to download, move file back into Players to overwrite, and open the list from the main menu (backup first!).\n(App Store editors may have limited features)`,
          toast: 'Copied route guide — ready to share or paste to AI',
        };
      }
      return {
        text: `【Apple iOS ${meta.name} Terraria Save Guide】\n1. Download save file (.wld map / .plr character) -> Share sheet -> Save to "Files".\n2. Path: ${iosDirText} (Never put into OldSaves).\n3. Worlds in Worlds, characters in Players. Return to the main menu and re-enter the list.\n(If saves on PC: USB cable to iPhone, Finder or iTunes -> File Sharing -> Terraria, drag into Worlds / Players)`,
        toast: 'Copied route guide — ready to share or paste to AI',
      };
    }

    if (state.goal === 'patch') {
      return {
        text: `【Android / HarmonyOS ${meta.name} Patch Guide】\n1. Install file manager: MT Manager (mt2.cn) or ZArchiver. Download patch file to phone.\n2. Open MT Manager, go to Android -> data -> ${meta.androidPkg} -> files -> il2cpp -> Metadata. (If data is inaccessible, authorize MT Manager via Shizuku at shizuku.rikka.app).\n3. Copy/Move patch file into Metadata, select "Replace" existing file.`,
        toast: 'Copied route guide — ready to share or paste to AI',
      };
    }
    if (state.goal === 'editor') {
      const saveSubPath = meta.isXD ? '[Numeric XD ID] -> Worlds or Players' : 'Worlds or Players';
      return {
        text: `【Android / HarmonyOS ${meta.name} Save Editor Guide】\n1. Install MT Manager (mt2.cn) and Save Editor app (or use TerraFlora in browser). (On Android 11+, install and pair Shizuku via shizuku.rikka.app).\n2. Open editor, load save: Android -> data -> ${meta.androidPkg} -> ${saveSubPath}.\n3. Edit and tap Save, then open the list from the game main menu (always backup first!).`,
        toast: 'Copied route guide — ready to share or paste to AI',
      };
    }
    const idLayerEn = meta.isXD ? ' -> [Numeric XD ID]' : '';
    return {
      text: `【Android / HarmonyOS ${meta.name} Save Guide】\n1. Install file manager: MT Manager (mt2.cn) or ZArchiver. Download save to phone.\n2. Open MT Manager, go to Android -> data -> ${meta.androidPkg}${idLayerEn} (contains ${meta.worldDir} and ${meta.playerDir}). (If data is blocked, authorize via Shizuku at shizuku.rikka.app).\n3. Put worlds (.wld) into ${meta.worldDir}, characters (.plr) into ${meta.playerDir}. Files with .bak can be renamed by removing .bak to restore. Return to the main menu and re-enter the list.`,
      toast: 'Copied route guide — ready to share or paste to AI',
    };
  }

  if (state.platform === 'pc') {
    if (state.goal === 'mod') {
      return {
        text: '【电脑 Steam 版 泰拉瑞亚安装 MOD 教程】\n1. Steam 商店搜索并安装免费的 tModLoader。\n2. 创意工坊订阅需要的 MOD，等待下载完成。\n3. 从游戏库启动 tModLoader（不要启动原版），在 MOD 管理里启用并重新加载。\n（联机时双方 MOD 列表需一致，更新后闪退先检查版本对应）',
        toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
      };
    }
    if (state.goal === 'editor') {
      return {
        text: '【电脑 Steam 版 泰拉瑞亚修改存档教程】\n1. 存档目录：文档 / My Games / Terraria，人物在 Players，地图在 Worlds。\n2. 改人物：用本站 TerraFlora（或 Terrasavr）加载 Players 里的 .plr，改完导出覆盖回原文件。\n3. 改地图：用桌面版 TEdit 打开 .wld 编辑后保存，回到游戏主页面点进列表即可（改前先备份原文件）。',
        toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
      };
    }
    return {
      text: '【电脑 Steam 版 泰拉瑞亚导入/导出存档教程】\n1. 先退回游戏主页面，按系统打开存档目录：Windows 输入 %USERPROFILE%\\Documents\\My Games\\Terraria；macOS 按 ⌘⇧G 前往 ~/Library/Application Support/Terraria；Linux 按 Ctrl+L 输入 ~/.local/share/Terraria。\n2. 地图(.wld)放进 Worlds，人物(.plr)放进 Players，在游戏主页面点进列表即可看到。\n3. 导出时直接从这两个文件夹复制文件发给好友；带 .bak 的是自动备份，删掉后缀可当正式存档。若开了 Steam 云存档导致替换失效，可先关闭云存档。',
      toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
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
        text: `【苹果(iOS) ${meta.name} 泰拉瑞亚说明】\n苹果系统采用应用沙盒机制，无法访问 il2cpp/Metadata 等安装包内部目录，不支持底层补丁。\n替代方案：① 直接导入全物品地图/人物存档（.wld / .plr）；② 用 Safari 打开本站 TerraFlora 或 Terrasavr 修改角色背包。`,
        toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
      };
    }
    if (state.goal === 'editor') {
      return {
        text: `【苹果(iOS) ${meta.name} 泰拉瑞亚修改存档教程】\n1. 用 Safari 打开本站 TerraFlora 或网页版 Terrasavr（免费免安装）。\n2. 选择加载 .plr 人物文件：${iosPlayers}。\n3. 改完导出下载，覆盖回 Players，回到游戏主页面点进列表即可（改前先复制备份）。`,
        toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
      };
    }
    return {
      text: `【苹果(iOS) ${meta.name} 泰拉瑞亚存档教程】\n1. 把存档下载到手机(.wld 地图 / .plr 人物) -> 分享 -> 存储到“文件”。\n2. 路径：${iosDirText}（切勿放进 OldSaves）。\n3. 地图放 Worlds，人物放 Players，回到游戏主页面点进列表即可。\n（存档在电脑上：数据线连 iPhone，访达或 iTunes -> 文件共享 -> 选泰拉瑞亚，直接拖进 Worlds / Players）`,
      toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
    };
  }

  if (state.goal === 'patch') {
    return {
      text: `【安卓/鸿蒙 ${meta.name} 泰拉瑞亚安装补丁教程】\n1. 装文件管理器：首选 MT 管理器（官网 mt2.cn），ZArchiver 也行；把补丁文件下载到手机。\n2. 打开 MT 进 Android -> data -> ${meta.androidPkg} -> files -> il2cpp -> Metadata；data 打不开说明没权限，按官方文档装好 Shizuku 并授权 MT（shizuku.rikka.app）。\n3. 把补丁复制/移动过去，选择“替换”原文件。`,
      toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
    };
  }
  if (state.goal === 'editor') {
    const saveSubPath = meta.isXD ? '一串数字的心动ID -> Worlds 或 Players' : 'Worlds 或 Players';
    return {
      text: `【安卓/鸿蒙 ${meta.name} 泰拉瑞亚存档编辑器教程】\n1. 装 MT 管理器（官网 mt2.cn）和存档编辑器（也可用本站 TerraFlora 在浏览器改人物）；安卓 11+ 需装好 Shizuku 并授权（shizuku.rikka.app）。\n2. 存档路径：Android -> data -> ${meta.androidPkg} -> ${saveSubPath}。\n3. 改完保存后回到游戏主页面点进列表即可生效（改前先备份原存档）。`,
      toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
    };
  }

  const idLayer = meta.isXD ? ' -> 一串数字的心动ID' : '';
  return {
    text: `【安卓/鸿蒙 ${meta.name} 泰拉瑞亚存档教程】\n1. 装文件管理器：首选 MT 管理器（官网 mt2.cn）或 ZArchiver；把存档下载到手机。\n2. 打开 MT 进 Android -> data -> ${meta.androidPkg}${idLayer}，里面就是 ${meta.worldDir} 和 ${meta.playerDir}；data 打不开需先用 Shizuku 授权（shizuku.rikka.app）。\n3. 地图(.wld) 放进 ${meta.worldDir}，人物(.plr) 放进 ${meta.playerDir}；带 .bak 的删掉后缀可当正式存档，回到游戏主页面点进列表即可。`,
    toast: '已复制当前路线文字教程，可直接发群或粘贴给 AI 提问',
  };
}

export function buildAllPlatformGuideText(lang: GuideLang): { text: string; toast: string } {
  if (lang === 'en') {
    return {
      text: [
        '【Terraria Full-Platform Save & Patch Reference】',
        '',
        '## Universal Rules',
        '- World saves (.wld) -> Worlds | Character saves (.plr) -> Players | Auto-backups (.bak / .bak2) -> drop .bak to restore.',
        '- Refreshing saves: Stay on the game main menu when copying/overwriting files, then open the character/world list from the main menu (no need to force-close Terraria).',
        '- Cross-edition worlds: XD and Global .wld signatures differ (`xindong` vs `relogic`); convert signatures in TerraFlora World Tool if worlds fail to show up.',
        '',
        '## PC Steam',
        '- Windows: %USERPROFILE%\\Documents\\My Games\\Terraria (Win + R to open)',
        '- macOS: ~/Library/Application Support/Terraria (Finder -> ⌘⇧G)',
        '- Linux: ~/.local/share/Terraria (File Manager -> Ctrl + L)',
        '- Disable Steam Cloud temporarily if replaced saves get overwritten; mods run via tModLoader.',
        '',
        '## Android / HarmonyOS',
        '- XD Edition Saves: Android/data/com.xd.terraria/[Numeric XD ID] (Worlds / Players)',
        '- Global Edition Saves: Android/data/com.and.games505.TerrariaPaid (Worlds / Players, NO numeric ID folder)',
        '- Core Patches (global-metadata.dat): Android/data/<package>/files/il2cpp/Metadata (NO numeric ID folder on either edition; restart game after replacing)',
        '- Android 11+ access: Use MT Manager (mt2.cn) + Shizuku (shizuku.rikka.app); for browser editing, copy .plr/.wld to Download first.',
        '- XD Edition cloud saves must be downloaded locally in-game before the numeric ID folder appears.',
        '',
        '## Apple iOS / iPadOS',
        '- XD Edition: Files App -> On My iPhone -> 泰拉瑞亚 -> [Numeric XD ID] -> Worlds / Players',
        '- Global Edition: Files App -> On My iPhone -> Terraria -> Worlds / Players',
        '- Never place saves inside OldSaves. iOS sandbox blocks core binary patches (use .wld/.plr or web editors instead).',
        '- PC USB transfer: Finder (macOS) or iTunes / Apple Devices (Windows) -> File Sharing -> Terraria.',
      ].join('\n'),
      toast: 'Copied full text guide — ready to share or paste to AI',
    };
  }

  return {
    text: [
      '【泰拉瑞亚全平台存档与补丁图文速查教程】',
      '',
      '## 通用规则',
      '- 目录规范：无论电脑、手机、心动版还是国际版，地图(.wld)一律放进 Worlds，人物(.plr)一律放进 Players。',
      '- 备份恢复：带 .bak / .bak2 的为自动备份，删掉 .bak 后缀即可当正式存档使用。',
      '- 刷新生效：导入或覆盖存档前，确保游戏处于主页面（勿停在角色/世界列表里），完成后从主页面点进列表即可刷新，无需划掉后台或退出游戏。',
      '- 双服互通：国服(xindong)与国际服(relogic)地图签名不通用，可用 TerraFlora「地图存档」互转。',
      '',
      '## 电脑 Steam 版',
      '- Windows：%USERPROFILE%\\Documents\\My Games\\Terraria（Win + R 粘贴回车打开）',
      '- macOS：~/Library/Application Support/Terraria（访达按 ⌘⇧G 前往）',
      '- Linux：~/.local/share/Terraria（文件管理器按 Ctrl + L 输入）',
      '- 若替换后被还原，先关闭游戏属性里的 Steam 云存档；MOD 需安装并启动 Steam 免费工具 tModLoader。',
      '',
      '## 安卓 / 鸿蒙',
      '- 心动版存档：Android/data/com.xd.terraria/[数字账号ID]（内含 Worlds / Players；须先上游戏把云存档下载到本地才会生成数字文件夹）',
      '- 国际版存档：Android/data/com.and.games505.TerrariaPaid（无数字 ID 文件夹，进去直接是 Worlds / Players）',
      '- 底层补丁（global-metadata.dat）：Android/data/<对应包名>/files/il2cpp/Metadata（两版本均不含数字 ID，替换后需重启游戏）',
      '- 安卓 11+ 无权访问 Android/data：安装 MT 管理器（mt2.cn）并用 Shizuku（shizuku.rikka.app）授权；用浏览器工具编辑存档时先复制到手机 Download 文件夹。',
      '',
      '## 苹果 iOS / iPadOS',
      '- 心动版：文件 App -> 我的 iPhone -> 泰拉瑞亚 -> [数字账号ID] -> Worlds / Players',
      '- 国际版：文件 App -> 我的 iPhone -> Terraria -> Worlds / Players',
      '- 切勿放进 OldSaves 文件夹；受系统沙盒限制，iOS 不支持替换底层补丁（可直接导入全物品存档或用网页版修改人物）。',
      '- 电脑传文件：数据线连电脑后通过访达(macOS)或 iTunes / Apple 设备(Windows) 的「文件共享」拖入。',
    ].join('\n'),
    toast: '已复制完整文字教程，可直接发群或粘贴给 AI 提问',
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
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
