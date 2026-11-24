# 项目维护手册

开发与资源维护备忘。

---

## 1. 目录结构

```
src/
├── core/
│   ├── binary.ts          # 二进制读取/写入（小端序、7 位变长整数、字符串流）
│   ├── crypto.ts          # 存档 AES-128-CBC 加密/解密
│   └── plr.ts             # 角色存档解析与组装
├── store.ts               # 全局状态管理（配装、拖拽、修改标记）
├── utils/
│   ├── avatar.ts          # Canvas 角色外貌绘制（图层收集与渲染）
│   └── sprite.ts          # 物品与发型雪碧图坐标计算
└── components/
    ├── TopBar.vue         # 顶栏（新建、导入/导出）
    ├── CharacterAvatar.vue# 角色预览卡片
    ├── InventoryView.vue  # 背包/储物仓视图
    ├── EquipmentView.vue  # 装备/饰品/时装/染料视图
    ├── CharacterView.vue  # 生命/魔力、发型颜色、版本设置
    ├── BuffView.vue       # Buff 配置与持续时间修改
    ├── ResearchView.vue   # 旅途模式研究进度
    ├── SlotEditorPanel.vue# 物品槽位编辑与前缀/物品选择
    ├── AboutView.vue      # 关于页面
    └── BackupNoticeModal.vue # 备份说明弹窗
```

---

## 2. 存档加解密 (`src/core/crypto.ts`)

- 密钥：固定 16 字节 `[0x73, 0x66, 0x6B, 0x6C, 0x6A, 0x64, 0x66, 0x6A, 0x65, 0x69, 0x77, 0x6A, 0x66, 0x6B, 0x6C, 0x73]`。
- 头部格式：前 24 字节为明文。
  - 前 8 字节为魔数：国际版为 ASCII `relogic`，心动版为 `xindong`。
  - 后 16 字节为 AES 初始向量（IV）。
- 浏览器使用原生 Web Crypto API (`crypto.subtle`) 在本地处理。

---

## 3. 角色图层绘制顺序 (`src/utils/avatar.ts`)

从底到顶绘制顺序：
1. Layer 01: 尾巴 / 背部饰品
2. Layer 12: 躯干下层、后臂与后肩
3. Layer 13: 护腿 / 裤装
4. Layer 14: 鞋履饰品
5. Layer 17: 躯干护甲 / 衣服
6. Layer 18: 副手拿持饰品
7. Layer 19: 腰部饰品
8. Layer 20: 颈部饰品
9. Layer 21: 头部（皮肤、瞳孔、发型/压帽发型、头盔）
10. Layer 22: 面部饰品
11. Layer 25: 盾牌
12. Layer 28: 前肩甲与前臂
13. Layer 29: 主手佩戴饰品
14. Layer 32: 胸挂饰品

---

## 4. 染料着色公式

计算像素加权亮度，乘以染料 RGB：
```ts
lum = Math.min(1, ((r + g + b) / 3 / 255) * 1.6666666);
outR = lum * dyeR;
outG = lum * dyeG;
outB = lum * dyeB;
```

---

## 5. 静态图集规范

| 文件 | 尺寸 | 单格 | 说明 |
|---|---|---|---|
| `public/atlas/items-[0..4].png` | 1280x变长 | 40x40 | 物品图集，32 列，单张上限 1536 个物品 |
| `public/atlas/player_base.png` | 1280x168 | 40x56 | 基础体型与皮肤（12 种体型切片） |
| `public/atlas/player_hairs.png` | 640x变长 | 40x56 | 发型灰度图（16 列） |
| `public/atlas/player_hairs_alt.png` | 640x变长 | 40x56 | 压帽发型灰度图 |
| `public/atlas/hairs.png` | 640x变长 | 40x40 | 发型选择器预览图标 |
| `public/atlas/armor.png` | 1280x变长 | 40x56 | 头部、腿部、躯干与手臂装备切片 |
| `public/atlas/accessories.png` | 640x变长 | 40x56 | 可见饰品站立帧 |
| `public/atlas/buffs.png` | 640x640 | 32x32 | Buff 状态图标（20 列） |

---

## 6. 游戏版本升级提取流程

从游戏本体（包含 `Terraria.exe` 与 `Content/Images/`）更新资源：

```bash
# 1. 导出贴图与本地化数据
cd tools/gamedump
dotnet run -- textures "<游戏路径>" ../../dump
dotnet run -- names    "<游戏路径>" ../../dump

# 2. 构建图集与数据文件
cd ../..
node scripts/extract/build-from-dump.mjs --dump dump

# 3. 生成拼音索引
npx tsx scripts/process-pinyin.ts

# 4. 递增缓存版本号
# 修改 src/utils/sprite.ts 中的 ATLAS_VERSION
# 修改 src/utils/avatar.ts 中的 ASSET_VERSION
```

---

## 7. 开发注意细节

1. **体型与切片原点**：
   - 角色部件基准尺寸为 40x56 像素。
   - 躯干衣服贴图为 9 列 x 4 行（360x224）。男性躯干在 `(0,0)`，女性躯干下移至 `(0,2)`；前肩 `(0,1)` / 女 `(0,3)`，后肩 `(1,1)` / 女 `(1,3)`，前臂 `(2,0)`，后臂 `(2,2)`。
2. **头盔裁切**：
   - 普通头盔高度 52（裁切底部 4px），巫师帽等高顶款式高度 48（裁切底部 8px），避免下颌带入下一帧像素。
3. **机关箱贴图映射**：
   - 官方游戏没有为 62 个机关箱制作独立材质，运行时通过 `ItemID.Sets.TextureCopyLoad` 复用普通宝箱。构建脚本在 `scripts/extract/texture-copy-load.json` 中维护此映射。
4. **弹窗层级**：
   - 全屏弹窗必须使用 `<Teleport to="body">` 挂载，并使用 `z-[60]` 以上层级，避免被 `sticky` 侧边栏及背包高亮格子穿透。
5. **官方负面 Debuff 判定**：
   - 减益集合源自游戏引擎 `Terraria.Main.debuff`（`Main.cs:8860-8935`），官方共注册 76 个 Debuff ID。
   - `BuffView.vue` 中的减益分类筛选与一键清除功能严格遵循该官方列表，避免随意猜测或遗漏。
