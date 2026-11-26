# 游戏资源与数据提取管线

本文档说明如何使用内置提取工具从泰拉瑞亚官方游戏本体直接提取贴图、本地化数据，并构建前端所需的雪碧图集与数据集。

---

## 1. 架构概览

```
泰拉瑞亚本体 (包含 Terraria.exe 与 Content/Images/)
        │
        ▼
tools/gamedump (.NET 8，零第三方依赖)
  ├─ textures：解码 XNB 格式贴图 (内置 LZX 解压) ──► dump/{items,avatar,hair}/*.png
  └─ names：读取 PE 元数据与内嵌多语言资源 ──► dump/items.json (ID、内部标识符、中英名称)
        │
        ▼
scripts/extract/build-from-dump.mjs (图集打包与数据聚合)
        │
        ▼
public/atlas/*.png + public/data/*.json + scripts/items-raw.json
        │
        ▼
scripts/process-pinyin.ts (生成拼音检索索引)
```

### 技术特点
1. **无损原图直解**：内置纯 C# 实现的 XNB (LZX) 解码器，无需安装 XNA 运行库或外部解包工具，直接批量解压为标准 PNG。
2. **官方本地化一致性**：通过 `System.Reflection.Metadata` 解析 `Terraria.exe` 的 PE 常量（`ItemID` 映射），并直接读取内嵌 Manifest 多语言资源（`Items.json`），保证所有物品的中英文命名与官方游戏完全一致。
3. **版本独立**：升级至新版本游戏时，只需指向新版游戏安装目录运行提取流程即可更新全套资产。

---

## 2. 提取与构建步骤

### 步骤一：从游戏导出原始资产
环境需求：.NET 8 SDK (`dotnet --version`)

```bash
cd tools/gamedump
dotnet run -- textures "<游戏安装目录>" ../../dump
dotnet run -- names    "<游戏安装目录>" ../../dump
```
- `textures`：解码并输出物品、护甲、饰品、纸娃娃部位和发型贴图至 `dump/` 目录；
- `names`：提取全部物品 ID、官方英文内部名及多语言显示名称。
- 注：`dump/` 包含解包产生的中间临时素材，已被 `.gitignore` 排除，无需入库。

### 步骤二：构建雪碧图与数据文件
环境需求：Node.js

```bash
# 构建全量数据与图集
node scripts/extract/build-from-dump.mjs --dump dump

# 或仅更新物品图集
node scripts/extract/build-from-dump.mjs --dump dump --only items
```
生成产物包括：
- `public/atlas/items-[0..4].png`（物品合图，32 列网格，单格 40x40）
- `public/atlas/armor.png`、`accessories.png`、`player_base.png`、`player_hairs.png`
- `public/data/armor-data.json`、`item-keys.json` 及 `scripts/items-raw.json`

### 步骤三：生成拼音搜索索引
```bash
npx tsx scripts/process-pinyin.ts
```
压缩生成前端轻量化的 `public/data/items.min.json` 与 `prefixes.min.json`。

### 步骤三（可选）：无头提取像素画材料库 (`materials.json`)
无需启动游戏，直接通过 32 位 PowerShell 反射 `Terraria.exe` 提取方块/墙壁地图色、涂漆变体与可恢复过滤标签（`falling`、`solid_top`、`special`、`unsafe_wall`）：

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/extract/dump-materials.ps1 -GameDir "<游戏安装目录>"
```

### 步骤四：递增版本号
运行 `npm version patch --no-git-tag-version` 更新 `package.json` 版本号；打包时会自动同步至页面显示版本与静态图集/数据的 `?v=` 缓存参数，确保浏览器与 Service Worker 及时拉取最新资产。

---

## 3. 规范与契约说明

### 目录结构契约 (`dump/`)
`build-from-dump.mjs` 依赖如下标准输入结构：
```
dump/
├── meta.json                      # 游戏版本与生成元信息
├── items.json                     # 物品基础属性列表 [{ id, key, name, en, ... }]
├── items/Item_{id}.png            # 物品单图 (Item_{id}.png)
├── avatar/Armor_Head_{id}.png     # 头部装备贴图
├── avatar/Armor_Legs_{id}.png     # 腿部装备贴图
├── avatar/Armor_{id}.png          # 复合躯干护甲贴图 (40x56 网格)
├── avatar/Acc_{type}_{id}.png     # 饰品贴图
├── avatar/Player_{v}_{part}.png   # 基础人物体型与部件
└── hair/Player_Hair_{id}.png      # 发型贴图 (取第 0 帧 40x56)
```

### 图集与排版规范
1. **物品网格标准**：单格尺寸 40x40 像素。≤40px 原图居中放置；>40px 等比缩进框内。纵向多帧动画贴图（如火把、药水等）自动截取第 1 帧。
2. **躯干复合帧规范**：躯干与服饰采用 40x56 复合切片。女性体型变体（4, 5, 6, 7, 9, 11）躯干帧依据游戏常量下移 2 像素。
3. **名称兜底表**：对于游戏中标记为不可获取或无本地化键名的特殊内部调试物品，由 `scripts/extract/name-overrides.json` 提供标准命名兜底。
