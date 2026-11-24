using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.RegularExpressions;
using System.Text.Json;

namespace Gamedump;

public static class Program
{
    public static int Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("""
                用法:
                  gamedump textures <游戏目录> <输出目录>     解码贴图 XNB -> PNG（按 dump 契约分目录）
                  gamedump names    <游戏目录> <输出目录>     从 Terraria.exe 元数据提取 id->内部名 + 本地化名称
                示例:
                  gamedump textures "<TerrariaPath>" dump
                """);
            return 1;
        }

        try
        {
            switch (args[0])
            {
                case "textures": CmdTextures(args[1], args[2], args.Length > 3 ? args[3] : null); break;
                case "names": CmdNames(args[1], args[2]); break;
                default: Console.WriteLine($"未知命令 {args[0]}"); return 1;
            }
            return 0;
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("失败: " + e.Message);
            Console.Error.WriteLine(e);
            return 2;
        }
    }

    /* ------------------------------------------------------------------ */
    /* textures                                                            */
    /* ------------------------------------------------------------------ */

    private static readonly (Regex re, string dir)[] Rules =
    {
        (new Regex("^Item_(\\d+)$"), "items"),
        (new Regex("^Armor_Head_(\\d+)$"), "avatar"),
        (new Regex("^Armor_Legs_(\\d+)$"), "avatar"),
        (new Regex("^Armor_(\\d+)$"), "avatar"),
        (new Regex("^Acc_[A-Za-z]+_(\\d+)$"), "avatar"),
        (new Regex("^Wings_(\\d+)$"), "avatar"),
        (new Regex("^Player_HairAlt_(\\d+)$"), "hair"),
        (new Regex("^Player_Hair_(\\d+)$"), "hair"),
        (new Regex("^Player_(\\d+)_(\\d+)$"), "avatar"),
        (new Regex("^Buff_(\\d+)$"), "buffs"),
    };

    private static void CmdTextures(string gameDir, string outDir, string nameFilter)
    {
        var images = Path.Combine(gameDir, "Content", "Images");
        if (!Directory.Exists(images))
            throw new DirectoryNotFoundException($"找不到 {images}");

        foreach (var dir in new[] { "items", "avatar", "hair", "buffs" })
            Directory.CreateDirectory(Path.Combine(outDir, dir));

        int ok = 0, skipFormat = 0, skipOther = 0, fail = 0;
        var failures = new List<string>();

        // 躯干复合贴图在 Images/Armor/ 子目录（Images/Armor/Armor_{n}.xnb）。
        // 注意不要扫 Images/Accessories/：那里有同名 Acc_HandsOn_ 等“合成版”贴图，
        // 与顶层的手部条带贴图重名，会覆盖掉正确文件。
        var scanDirs = new[] { images, Path.Combine(images, "Armor") };
        foreach (var scanDir in scanDirs)
        {
            if (!Directory.Exists(scanDir)) continue;
            foreach (var file in Directory.EnumerateFiles(scanDir, "*.xnb", SearchOption.TopDirectoryOnly))
        {
            string name = Path.GetFileNameWithoutExtension(file);
            if (nameFilter != null && !name.Contains(nameFilter)) { skipOther++; continue; }
            string target = null;
            foreach (var (re, dir) in Rules)
            {
                if (re.IsMatch(name)) { target = dir; break; }
            }
            if (target == null) { skipOther++; continue; }

            try
            {
                var (w, h, rgba) = XnbDecoder.DecodeTexture(file);
                PngWriter.Save(Path.Combine(outDir, target, name + ".png"), w, h, rgba);
                ok++;
                if (ok % 1000 == 0) Console.WriteLine($"  {ok} 张...");
            }
            catch (NotSupportedException e)
            {
                skipFormat++;
                failures.Add($"{name}: {e.Message}");
            }
            catch (Exception e)
            {
                fail++;
                failures.Add($"{name}: {e.Message}");
            }
            }
        }

        Console.WriteLine($"完成: 成功 {ok}，跳过(格式) {skipFormat}，不相关 {skipOther}，失败 {fail}");
        foreach (var f in failures.Take(30))
            Console.WriteLine("  " + f);
        if (failures.Count > 30) Console.WriteLine($"  ... 共 {failures.Count} 条");
    }

    /* ------------------------------------------------------------------ */
    /* names: 纯元数据读取（System.Reflection.Metadata），不执行游戏代码     */
    /* ------------------------------------------------------------------ */

    private static void CmdNames(string gameDir, string outDir)
    {
        string exe = Path.Combine(gameDir, "Terraria.exe");
        using var stream = File.OpenRead(exe);
        using var pe = new PEReader(stream);
        var mr = pe.GetMetadataReader();

        // 1) id -> 内部名：ItemID 的 public const short 字段，常量值直接在元数据里
        var ids = new Dictionary<int, string>();
        foreach (var tdh in mr.TypeDefinitions)
        {
            var td = mr.GetTypeDefinition(tdh);
            if (mr.GetString(td.Namespace) != "Terraria.ID" || mr.GetString(td.Name) != "ItemID")
                continue;
            foreach (var fh in td.GetFields())
            {
                var fd = mr.GetFieldDefinition(fh);
                if ((fd.Attributes & FieldAttributes.Literal) == 0)
                    continue;
                string fieldName = mr.GetString(fd.Name);
                if (fieldName == "Count") // ItemID.Count 也是常量，但不是物品 id
                    continue;
                if (fd.GetDefaultValue().IsNil)
                    continue;
                var blob = mr.GetBlobBytes(mr.GetConstant(fd.GetDefaultValue()).Value);
                int v = blob.Length == 2 ? BitConverter.ToInt16(blob, 0) : BitConverter.ToInt32(blob, 0);
                if (v > 0 && !ids.ContainsKey(v)) ids[v] = fieldName;
            }
            break;
        }
        Console.WriteLine($"ItemID 常量: {ids.Count} 个");

        var buffIds = new Dictionary<int, string>();
        foreach (var tdh in mr.TypeDefinitions)
        {
            var td = mr.GetTypeDefinition(tdh);
            if (mr.GetString(td.Namespace) != "Terraria.ID" || mr.GetString(td.Name) != "BuffID")
                continue;
            foreach (var fh in td.GetFields())
            {
                var fd = mr.GetFieldDefinition(fh);
                if ((fd.Attributes & FieldAttributes.Literal) == 0)
                    continue;
                string fieldName = mr.GetString(fd.Name);
                if (fieldName == "Count")
                    continue;
                if (fd.GetDefaultValue().IsNil)
                    continue;
                var blob = mr.GetBlobBytes(mr.GetConstant(fd.GetDefaultValue()).Value);
                int v = blob.Length == 2 ? BitConverter.ToInt16(blob, 0) : BitConverter.ToInt32(blob, 0);
                if (v > 0 && !buffIds.ContainsKey(v)) buffIds[v] = fieldName;
            }
            break;
        }
        Console.WriteLine($"BuffID 常量: {buffIds.Count} 个");

        // 2) 本地化：manifest resource（与游戏运行时读取方式相同）
        int resourcesRva = pe.PEHeaders.CorHeader.ResourcesDirectory.RelativeVirtualAddress;
        int resourcesFileOffset = RvaToFileOffset(pe.PEHeaders, resourcesRva);
        var cultures = new Dictionary<string, Dictionary<string, string>>();
        var buffNames = new Dictionary<string, Dictionary<string, string>>();
        var buffDescs = new Dictionary<string, Dictionary<string, string>>();

        Console.WriteLine($"manifest resources: {mr.ManifestResources.Count}");
        foreach (var rh in mr.ManifestResources)
        {
            string rn = mr.GetString(mr.GetManifestResource(rh).Name);
            if (rn.Contains("Localization")) Console.WriteLine("  res: " + rn);
        }
        foreach (var rh in mr.ManifestResources)
        {
            var entry = mr.GetManifestResource(rh);
            // Implementation 为 nil 表示资源在当前文件里（单文件程序集的常见情况）
            if (!entry.Implementation.IsNil && entry.Implementation.Kind != HandleKind.AssemblyFile)
                continue;

            var m = Regex.Match(mr.GetString(entry.Name), @"Localization\.Content\.([A-Za-z\-]+)(?:\..+)?\.json$");
            if (!m.Success) continue;
            string culture = m.Groups[1].Value;
            if (culture is not ("en-US" or "zh-Hans")) continue;

            stream.Seek(resourcesFileOffset + entry.Offset, SeekOrigin.Begin);
            var buf = new byte[4];
            if (stream.Read(buf, 0, 4) != 4) continue;
            int len = BitConverter.ToInt32(buf, 0);
            var data = new byte[len];
            if (stream.Read(data, 0, len) != len) continue;

            using var doc = JsonDocument.Parse(data, new JsonDocumentOptions { AllowTrailingCommas = true });
            if (doc.RootElement.TryGetProperty("ItemName", out var section))
            {
                if (!cultures.TryGetValue(culture, out var map))
                    cultures[culture] = map = new Dictionary<string, string>();
                foreach (var p in section.EnumerateObject())
                    map[p.Name] = p.Value.GetString() ?? "";
                Console.WriteLine($"{culture}: ItemName {map.Count} 条");
            }
            if (doc.RootElement.TryGetProperty("BuffName", out var bnSection))
            {
                if (!buffNames.TryGetValue(culture, out var bmap))
                    buffNames[culture] = bmap = new Dictionary<string, string>();
                foreach (var p in bnSection.EnumerateObject())
                    bmap[p.Name] = p.Value.GetString() ?? "";
                Console.WriteLine($"{culture}: BuffName {bmap.Count} 条");
            }
            if (doc.RootElement.TryGetProperty("BuffDescription", out var bdSection))
            {
                if (!buffDescs.TryGetValue(culture, out var bdmap))
                    buffDescs[culture] = bdmap = new Dictionary<string, string>();
                foreach (var p in bdSection.EnumerateObject())
                    bdmap[p.Name] = p.Value.GetString() ?? "";
            }
        }

        // 3) 输出 items.json（导出 id、内部 key、官方中英文本地化名称）
        var rows = new List<object>();
        foreach (var (id, key) in ids.OrderBy(kv => kv.Key))
        {
            cultures.TryGetValue("zh-Hans", out var zh);
            cultures.TryGetValue("en-US", out var en);
            string name = null, enName = null;
            if (zh != null) zh.TryGetValue(key, out name);
            if (en != null) en.TryGetValue(key, out enName);
            rows.Add(new Dictionary<string, object?>
            {
                ["id"] = id,
                ["key"] = key,
                ["name"] = string.IsNullOrEmpty(name) ? KeyToName(key) : name,
                ["en"] = string.IsNullOrEmpty(enName) ? key : enName,
                ["cat"] = null,
                ["stack"] = null,
                ["rare"] = null,
                ["head"] = -1,
                ["body"] = -1,
                ["leg"] = -1,
                ["deprecated"] = null,
                ["acc"] = new Dictionary<string, int>(),
            });
        }

        var meta = new Dictionary<string, object?>
        {
            ["generatedAt"] = DateTime.Now.ToString("o"),
            ["gameVersion"] = ReadGameVersion(gameDir),
            ["itemCount"] = rows.Count,
            ["source"] = "gamedump（静态元数据：贴图+名称+内部名；稀有度/槽位需运行游戏代码）",
        };
        Directory.CreateDirectory(outDir);
        File.WriteAllText(Path.Combine(outDir, "items.json"), JsonSerializer.Serialize(rows, JsonOpt));
        File.WriteAllText(Path.Combine(outDir, "meta.json"), JsonSerializer.Serialize(meta, JsonOpt));
        Console.WriteLine($"输出 items.json {rows.Count} 条 -> {Path.Combine(outDir, "items.json")}");

        var buffRows = new List<object>();
        foreach (var (id, key) in buffIds.OrderBy(kv => kv.Key))
        {
            buffNames.TryGetValue("zh-Hans", out var zh);
            buffNames.TryGetValue("en-US", out var en);
            buffDescs.TryGetValue("zh-Hans", out var zhDesc);
            string name = null, enName = null, tip = null;
            if (zh != null) zh.TryGetValue(key, out name);
            if (en != null) en.TryGetValue(key, out enName);
            if (zhDesc != null) zhDesc.TryGetValue(key, out tip);
            buffRows.Add(new Dictionary<string, object?>
            {
                ["id"] = id,
                ["key"] = key,
                ["name"] = string.IsNullOrEmpty(name) ? KeyToName(key) : name,
                ["en"] = string.IsNullOrEmpty(enName) ? key : enName,
                ["tip"] = tip ?? "",
            });
        }
        File.WriteAllText(Path.Combine(outDir, "buffs.json"), JsonSerializer.Serialize(buffRows, JsonOpt));
        Console.WriteLine($"输出 buffs.json {buffRows.Count} 条 -> {Path.Combine(outDir, "buffs.json")}");
    }

    private static int RvaToFileOffset(PEHeaders headers, int rva)
    {
        foreach (var section in headers.SectionHeaders)
        {
            if (rva >= section.VirtualAddress && rva < section.VirtualAddress + section.SizeOfRawData)
                return section.PointerToRawData + (rva - section.VirtualAddress);
        }
        throw new InvalidDataException($"RVA {rva} 不在任何 section 里");
    }

    private static string ReadGameVersion(string gameDir)
    {
        var changelog = Path.Combine(gameDir, "changelog.txt");
        if (File.Exists(changelog))
        {
            var first = File.ReadLines(changelog).FirstOrDefault() ?? "";
            var m = Regex.Match(first, @"Version ([\d.]+)");
            if (m.Success) return m.Groups[1].Value;
        }
        return "unknown";
    }

    private static string KeyToName(string key)
        => string.IsNullOrEmpty(key) ? key : Regex.Replace(key, "(?<!^)([A-Z])", " $1");

    private static readonly JsonSerializerOptions JsonOpt = new()
    {
        WriteIndented = false,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };
}
