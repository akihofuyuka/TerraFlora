param(
    [Parameter(Mandatory = $true)]
    [string]$GameDir,
    [string]$OutFile = (Join-Path (Resolve-Path "$PSScriptRoot\..\..").Path "public\data\materials.json")
)

if ([IntPtr]::Size -ne 4) {
    $ps32 = Join-Path $env:SystemRoot "SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
    & $ps32 -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -GameDir $GameDir -OutFile $OutFile
    exit $LASTEXITCODE
}

$ErrorActionPreference = "Stop"

$csharp = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;

public static class MaterialExtractor
{
    private static Assembly _asm;
    private static string _gameDir;

    public static string Run(string gameDir)
    {
        string prevCwd = Environment.CurrentDirectory;
        _gameDir = gameDir;
        Environment.CurrentDirectory = gameDir;
        try
        {
            _asm = Assembly.LoadFrom(Path.Combine(gameDir, "Terraria.exe"));
            AppDomain.CurrentDomain.AssemblyResolve += ResolveTerrariaAssembly;

        _asm.GetType("Terraria.Program").GetField("SavePath").SetValue(null, Path.GetTempPath());

        var mainType = _asm.GetType("Terraria.Main");
        RuntimeHelpers.RunClassConstructor(mainType.TypeHandle);

        var randType = _asm.GetType("Terraria.Utilities.UnifiedRandom");
        mainType.GetField("rand", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            .SetValue(null, Activator.CreateInstance(randType));

        mainType.GetMethod("Initialize_TileAndNPCData1", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            .Invoke(null, null);
        mainType.GetMethod("Initialize_TileAndNPCData2", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            .Invoke(null, null);

        var lmType = _asm.GetType("Terraria.Localization.LanguageManager");
        var lm = lmType.GetField("Instance", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        lmType.GetMethod("SetLanguage", new[] { typeof(string) }).Invoke(lm, new object[] { "zh-Hans" });

        var langType = _asm.GetType("Terraria.Lang");
        langType.GetMethod("InitializeLegacyLocalization", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            .Invoke(null, null);

        var mapHelperType = _asm.GetType("Terraria.Map.MapHelper");
        mapHelperType.GetMethod("Initialize", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            .Invoke(null, null);
        langType.GetMethod("BuildMapAtlas", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)
            .Invoke(null, null);

        var versionNumber = (string)mainType.GetField("versionNumber", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileSolid = (bool[])mainType.GetField("tileSolid", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileSolidTop = (bool[])mainType.GetField("tileSolidTop", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileFrameImportant = (bool[])mainType.GetField("tileFrameImportant", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileMoss = (bool[])mainType.GetField("tileMoss", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);

        var tileIdType = _asm.GetType("Terraria.ID.TileID");
        var tileSetsType = _asm.GetType("Terraria.ID.TileID+Sets");
        var wallIdType = _asm.GetType("Terraria.ID.WallID");
        var itemIdType = _asm.GetType("Terraria.ID.ItemID");
        var paintIdType = _asm.GetType("Terraria.ID.PaintID");

        int tileCount = Convert.ToInt32(tileIdType.GetField("Count").GetValue(null));
        int wallCount = Convert.ToInt32(wallIdType.GetField("Count").GetValue(null));
        int itemCount = Convert.ToInt32(itemIdType.GetField("Count").GetValue(null));

        var falling = (bool[])tileSetsType.GetField("Falling").GetValue(null);
        var boulders = (bool[])tileSetsType.GetField("Boulders").GetValue(null);
        var platforms = (bool[])tileSetsType.GetField("Platforms").GetValue(null);

        var colorLookup = (Array)mapHelperType.GetField("colorLookup", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileLookup = (ushort[])mapHelperType.GetField("tileLookup", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var wallLookup = (ushort[])mapHelperType.GetField("wallLookup", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileOptionCounts = (int[])mapHelperType.GetField("tileOptionCounts", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static).GetValue(null);
        var tileToLookupMethod = mapHelperType.GetMethod("TileToLookup", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);

        var colorType = colorLookup.GetType().GetElementType();
        var propR = colorType.GetProperty("R");
        var propG = colorType.GetProperty("G");
        var propB = colorType.GetProperty("B");
        var propA = colorType.GetProperty("A");

        var worldGenType = _asm.GetType("Terraria.WorldGen");
        var paintColorMethod = worldGenType.GetMethod("paintColor", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);
        var paintColors = new byte[32][];
        for (int p = 0; p < 32; p++)
        {
            object c = paintColorMethod.Invoke(null, new object[] { p });
            paintColors[p] = new[]
            {
                (byte)propR.GetValue(c, null),
                (byte)propG.GetValue(c, null),
                (byte)propB.GetValue(c, null),
                (byte)propA.GetValue(c, null),
            };
        }

        byte[][] tileColors = new byte[tileLookup.Length][];
        for (int i = 0; i < tileLookup.Length; i++)
        {
            object c = colorLookup.GetValue(tileLookup[i]);
            tileColors[i] = new[]
            {
                (byte)propR.GetValue(c, null),
                (byte)propG.GetValue(c, null),
                (byte)propB.GetValue(c, null),
                (byte)propA.GetValue(c, null),
            };
        }

        byte[][] wallColors = new byte[wallLookup.Length][];
        for (int i = 0; i < wallLookup.Length; i++)
        {
            object c = colorLookup.GetValue(wallLookup[i]);
            wallColors[i] = new[]
            {
                (byte)propR.GetValue(c, null),
                (byte)propG.GetValue(c, null),
                (byte)propB.GetValue(c, null),
                (byte)propA.GetValue(c, null),
            };
        }

        // 从 Item.SetDefaults 建立方块/墙壁与最优可放置物品的映射（优先可消耗常规建筑材料）
        var itemType = _asm.GetType("Terraria.Item");
        MethodInfo setDefaults = null;
        int setDefaultsArgCount = 1;
        foreach (var m in itemType.GetMethods(BindingFlags.Public | BindingFlags.Instance))
        {
            if (m.Name != "SetDefaults") continue;
            var ps = m.GetParameters();
            if (ps.Length >= 1 && ps[0].ParameterType == typeof(int))
            {
                bool restOptional = true;
                for (int k = 1; k < ps.Length; k++)
                {
                    if (!ps[k].IsOptional) { restOptional = false; break; }
                }
                if (restOptional && (setDefaults == null || ps.Length < setDefaultsArgCount))
                {
                    setDefaults = m;
                    setDefaultsArgCount = ps.Length;
                }
            }
        }
        if (setDefaults == null) throw new MissingMethodException("Terraria.Item.SetDefaults(int, ...)");
        var setDefaultsArgs = new object[setDefaultsArgCount];
        for (int k = 1; k < setDefaultsArgCount; k++) setDefaultsArgs[k] = Type.Missing;
        var fCreateTile = itemType.GetField("createTile");
        var fCreateWall = itemType.GetField("createWall");
        var fPlaceStyle = itemType.GetField("placeStyle");
        var fConsumable = itemType.GetField("consumable");
        var fMaxStack = itemType.GetField("maxStack");
        var fTileWand = itemType.GetField("tileWand");
        var fPick = itemType.GetField("pick");
        var fAxe = itemType.GetField("axe");
        var fHammer = itemType.GetField("hammer");
        var fDamage = itemType.GetField("damage");
        var fAccessory = itemType.GetField("accessory");
        var fAmmo = itemType.GetField("ammo");
        var fUseAmmo = itemType.GetField("useAmmo");
        var fUseStyle = itemType.GetField("useStyle");

        var tileBestItem = new int[tileCount];
        var tileBestPri = new int[tileCount];
        var wallBestItem = new int[wallCount];
        var wallBestPri = new int[wallCount];
        for (int i = 0; i < tileCount; i++) tileBestPri[i] = int.MinValue;
        for (int i = 0; i < wallCount; i++) wallBestPri[i] = int.MinValue;

        for (int id = 1; id < itemCount; id++)
        {
            object it = Activator.CreateInstance(itemType);
            setDefaultsArgs[0] = id;
            try { setDefaults.Invoke(it, setDefaultsArgs); } catch { continue; }
            int ct = (int)fCreateTile.GetValue(it);
            int cw = (int)fCreateWall.GetValue(it);
            if ((ct < 0 || ct >= tileCount) && (cw <= 0 || cw >= wallCount)) continue;

            int pri = 0;
            if (!(bool)fConsumable.GetValue(it)) pri -= 1000;
            if ((int)fMaxStack.GetValue(it) <= 1) pri -= 250;
            if ((int)fTileWand.GetValue(it) >= 0) pri -= 500;
            if ((int)fPick.GetValue(it) > 0 || (int)fAxe.GetValue(it) > 0 || (int)fHammer.GetValue(it) > 0) pri -= 500;
            if ((int)fDamage.GetValue(it) > 0) pri -= 250;
            if ((bool)fAccessory.GetValue(it)) pri -= 250;
            if ((int)fAmmo.GetValue(it) > 0 || (int)fUseAmmo.GetValue(it) > 0) pri -= 250;
            if ((int)fUseStyle.GetValue(it) <= 0) pri -= 100;
            if ((int)fPlaceStyle.GetValue(it) != 0) pri -= 10;

            if (ct >= 0 && ct < tileCount)
            {
                if (tileBestItem[ct] == 0 || pri > tileBestPri[ct] || (pri == tileBestPri[ct] && id < tileBestItem[ct]))
                {
                    tileBestItem[ct] = id;
                    tileBestPri[ct] = pri;
                }
            }
            if (cw > 0 && cw < wallCount)
            {
                if (wallBestItem[cw] == 0 || pri > wallBestPri[cw] || (pri == wallBestPri[cw] && id < wallBestItem[cw]))
                {
                    wallBestItem[cw] = id;
                    wallBestPri[cw] = pri;
                }
            }
        }

        // 基于游戏原生属性筛选：排除非独立完整方块（流体块、虚化块、尖刺、草皮种子转换等）
        var permanentSkipTiles = ResolveIdSet(tileIdType, new[] {
            "Bubble", "ShimmerBlock", "WaterBlock", "InactiveStoneBlock",
            "Spikes", "WoodenSpikes", "DamagingSpikeBlock", "Torches", "Trees",
            "Grass", "CorruptGrass", "JungleGrass", "HallowedGrass", "CrimsonGrass",
            "AshGrass", "CorruptJungleGrass", "CrimsonJungleGrass", "MushroomGrass",
            "GolfGrass", "GolfGrassHallowed", "MetalBars"
        });
        if (tileMoss != null)
        {
            for (int t = 0; t < tileMoss.Length; t++)
            {
                if (tileMoss[t]) permanentSkipTiles.Add(t);
            }
        }

        // 可通过前端「扩展档位」调回的动态/特殊效果方块
        var specialTiles = ResolveIdSet(tileIdType, new[] {
            "RainbowBrick", "KryptonMossBlock", "RainbowMossBlock", "ArgonMossBlock",
            "LavaMossBlock", "VioletMossBlock", "XenonMossBlock", "EchoBlock", "AntiPortalBlock"
        });

        // 从 WallID 常量反射识别不安全天然墙（命名含 Unsafe）
        var unsafeWalls = new HashSet<int>();
        foreach (var f in wallIdType.GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (f.IsLiteral && f.Name.IndexOf("Unsafe", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                unsafeWalls.Add(Convert.ToInt32(f.GetValue(null)));
            }
        }

        var getMapObjectName = langType.GetMethod("GetMapObjectName", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);
        var getItemNameValue = langType.GetMethod("GetItemNameValue", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static);

        // 漆名取自 PaintID 与 ItemID 的同名常量本地化名称
        var itemIdsByField = new Dictionary<string, int>();
        foreach (var f in itemIdType.GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (f.IsLiteral) itemIdsByField[f.Name] = Convert.ToInt32(f.GetValue(null));
        }
        var paintNames = new SortedDictionary<int, string>();
        int illuminantPaintId = Convert.ToInt32(paintIdType.GetField("IlluminantPaint").GetValue(null));
        foreach (var f in paintIdType.GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (!f.IsLiteral) continue;
            int pid = Convert.ToInt32(f.GetValue(null));
            if (pid <= 0 || pid == illuminantPaintId) continue;
            int iid;
            if (!itemIdsByField.TryGetValue(f.Name, out iid)) continue;
            string pname = (string)getItemNameValue.Invoke(null, new object[] { iid }) ?? "";
            if (pname.Length > 0) paintNames[pid] = pname;
        }

        var sb = new StringBuilder(262144);
        sb.Append("{\"version\":1");
        sb.Append(",\"generated_at\":\"").Append(EscapeJson(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"))).Append("\"");
        sb.Append(",\"game_version\":\"").Append(EscapeJson(versionNumber ?? "")).Append("\"");
        sb.Append(",\"paint_names\":{");
        bool firstP = true;
        foreach (var kv in paintNames)
        {
            if (!firstP) sb.Append(',');
            firstP = false;
            sb.Append('"').Append(kv.Key).Append("\":\"").Append(EscapeJson(kv.Value)).Append('"');
        }
        sb.Append("},\"materials\":[");

        bool firstMat = true;
        for (int type = 0; type < tileColors.Length && type < tileSolid.Length; type++)
        {
            if (!tileSolid[type]) continue;
            bool isPlatform = type < platforms.Length && platforms[type];
            // tileFrameImportant 过滤多帧家具、门、闸门、陷阱、巨石、种植盆等非普通建材（平台保留到 solid_top 扩展档）
            if (type < tileFrameImportant.Length && tileFrameImportant[type] && !isPlatform) continue;
            if (type < boulders.Length && boulders[type]) continue;
            if (permanentSkipTiles.Contains(type)) continue;
            int itemId = type < tileBestItem.Length ? tileBestItem[type] : 0;
            if (itemId <= 0) continue;

            var tags = new List<string>();
            if (type < tileSolidTop.Length && tileSolidTop[type]) tags.Add("solid_top");
            if (type < falling.Length && falling[type]) tags.Add("falling");
            if (specialTiles.Contains(type)) tags.Add("special");

            int lookup = -1;
            if (tileOptionCounts == null || (type < tileOptionCounts.Length && tileOptionCounts[type] > 0))
            {
                try { lookup = Convert.ToInt32(tileToLookupMethod.Invoke(null, new object[] { type, 0 })); } catch { lookup = -1; }
            }
            string name = ResolveName(getMapObjectName, getItemNameValue, itemId, lookup);

            byte[] baseC = tileColors[type];
            AppendMaterial(sb, ref firstMat, "tile", type, name, itemId, baseC, tags, p => ApplyPaint(baseC, paintColors[p], p, false), illuminantPaintId);
        }

        for (int type = 1; type < wallColors.Length; type++)
        {
            int itemId = type < wallBestItem.Length ? wallBestItem[type] : 0;
            if (itemId <= 0) continue;

            var tags = new List<string>();
            if (unsafeWalls.Contains(type)) tags.Add("unsafe_wall");

            int lookup = -1;
            try { if (type < wallLookup.Length) lookup = colorLookup.Length + wallLookup[type]; } catch { lookup = -1; }
            string name = ResolveName(getMapObjectName, getItemNameValue, itemId, lookup);

            byte[] baseC = wallColors[type];
            AppendMaterial(sb, ref firstMat, "wall", type, name, itemId, baseC, tags, p => ApplyPaint(baseC, paintColors[p], p, true), illuminantPaintId);
        }

        sb.Append("]}");
        return sb.ToString();
        }
        finally
        {
            Environment.CurrentDirectory = prevCwd;
        }
    }

    private static string ResolveName(MethodInfo getMapObjectName, MethodInfo getItemNameValue, int itemId, int lookup)
    {
        string name = "";
        if (lookup >= 0)
        {
            try { name = (string)getMapObjectName.Invoke(null, new object[] { lookup }) ?? ""; } catch { name = ""; }
        }
        if (string.IsNullOrEmpty(name))
        {
            try { name = (string)getItemNameValue.Invoke(null, new object[] { itemId }) ?? ""; } catch { name = ""; }
        }
        return name;
    }

    private static void AppendMaterial(
        StringBuilder sb,
        ref bool firstMat,
        string kind,
        int id,
        string name,
        int itemId,
        byte[] baseColor,
        List<string> tags,
        Func<int, byte[]> colorAtPaint,
        int illuminantPaintId)
    {
        if (baseColor[3] != 255) return;
        if (!firstMat) sb.Append(',');
        firstMat = false;
        sb.Append("{\"kind\":\"").Append(kind).Append('"');
        sb.Append(",\"id\":").Append(id);
        sb.Append(",\"name\":\"").Append(EscapeJson(name)).Append('"');
        sb.Append(",\"item_id\":").Append(itemId);
        sb.Append(",\"color\":\"").Append(ToHex(baseColor)).Append('"');
        if (tags.Count > 0)
        {
            sb.Append(",\"tags\":[");
            for (int i = 0; i < tags.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append('"').Append(tags[i]).Append('"');
            }
            sb.Append(']');
        }
        sb.Append(",\"paint_colors\":{");
        bool firstPaint = true;
        for (int p = 1; p < 32; p++)
        {
            if (p == illuminantPaintId) continue;
            byte[] c = colorAtPaint(p);
            if (c[3] != 255) continue;
            if (!firstPaint) sb.Append(',');
            firstPaint = false;
            sb.Append('"').Append(p).Append("\":\"").Append(ToHex(c)).Append('"');
        }
        sb.Append("}}");
    }

    // 泰拉瑞亚地图油漆着色公式（常规漆按原色最大亮度通道缩放，29 暗影漆乘 0.3，30 反色漆取补色）
    private static byte[] ApplyPaint(byte[] baseColor, byte[] paintColor, int paint, bool isWall)
    {
        byte r = baseColor[0], g = baseColor[1], b = baseColor[2], a = baseColor[3];
        if (paint == 0) return new[] { r, g, b, a };
        if (paint == 29)
        {
            float n1 = r / 255f, n2 = g / 255f, n3 = b / 255f;
            if (n2 > n1) { float t = n1; n1 = n2; n2 = t; }
            if (n3 > n1) { float t = n1; n1 = n3; n3 = t; }
            float f = n3 * 0.3f;
            return new[] { (byte)(paintColor[0] * f), (byte)(paintColor[1] * f), (byte)(paintColor[2] * f), a };
        }
        if (paint == 30)
        {
            return isWall
                ? new[] { (byte)((255 - r) / 2), (byte)((255 - g) / 2), (byte)((255 - b) / 2), a }
                : new[] { (byte)(255 - r), (byte)(255 - g), (byte)(255 - b), a };
        }
        float maxC = Math.Max(r / 255f, Math.Max(g / 255f, b / 255f));
        return new[] { (byte)(paintColor[0] * maxC), (byte)(paintColor[1] * maxC), (byte)(paintColor[2] * maxC), a };
    }

    private static string ToHex(byte[] c)
    {
        return string.Format("#{0:X2}{1:X2}{2:X2}", c[0], c[1], c[2]);
    }

    private static HashSet<int> ResolveIdSet(Type idType, string[] names)
    {
        var set = new HashSet<int>();
        foreach (string n in names)
        {
            var f = idType.GetField(n, BindingFlags.Public | BindingFlags.Static);
            if (f != null) set.Add(Convert.ToInt32(f.GetValue(null)));
        }
        return set;
    }

    private static string EscapeJson(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (char c in s)
        {
            if (c == '"') sb.Append("\\\"");
            else if (c == '\\') sb.Append("\\\\");
            else if (c == '\b') sb.Append("\\b");
            else if (c == '\f') sb.Append("\\f");
            else if (c == '\n') sb.Append("\\n");
            else if (c == '\r') sb.Append("\\r");
            else if (c == '\t') sb.Append("\\t");
            else sb.Append(c);
        }
        return sb.ToString();
    }

    private static Assembly ResolveTerrariaAssembly(object sender, ResolveEventArgs args)
    {
        string shortName = args.Name.Split(',')[0];
        if (shortName.EndsWith(".resources", StringComparison.OrdinalIgnoreCase)) return null;
        foreach (string rn in _asm.GetManifestResourceNames())
        {
            if (rn.EndsWith(shortName + ".dll", StringComparison.OrdinalIgnoreCase))
            {
                using (var st = _asm.GetManifestResourceStream(rn))
                {
                    byte[] buf = new byte[st.Length];
                    st.Read(buf, 0, buf.Length);
                    return Assembly.Load(buf);
                }
            }
        }
        string cand = Path.Combine(_gameDir, shortName + ".dll");
        return File.Exists(cand) ? Assembly.LoadFrom(cand) : null;
    }
}
'@

$OutFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutFile)
Add-Type -TypeDefinition $csharp -Language CSharp
$json = [MaterialExtractor]::Run($GameDir)

$outDir = Split-Path -Parent $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
[System.IO.File]::WriteAllText($OutFile, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Exported materials.json to $OutFile ($($json.Length) chars)"
