namespace Gamedump;

/// <summary>
/// Terraria（XNA 4）content XNB 解码：头部解析 -> LZX 解压（帧格式与 FNA 的
/// ContentManager 完全一致）-> 解析 Texture2D 对象 -> RGBA 字节。
/// </summary>
public static class XnbDecoder
{
    /// <summary>解码一个 .xnb，返回 RGBA8888 像素（预乘 alpha，与游戏内一致）。</summary>
    public static (int width, int height, byte[] rgba) DecodeTexture(string path)
    {
        var bytes = File.ReadAllBytes(path);
        if (bytes.Length < 14 || bytes[0] != 'X' || bytes[1] != 'N' || bytes[2] != 'B')
            throw new InvalidDataException($"{path}: 不是 XNB");

        byte version = bytes[4];
        byte flags = bytes[5];
        if (version != 5 && version != 4)
            throw new InvalidDataException($"{path}: XNB version {version} 不支持");

        int xnbLength = BitConverter.ToInt32(bytes, 6);
        byte[] body;
        if ((flags & 0x80) != 0)
        {
            int decompressedSize = BitConverter.ToInt32(bytes, 10);
            body = DecompressLzx(bytes, 14, decompressedSize, xnbLength - 14);
        }
        else
        {
            body = bytes[10..xnbLength];
        }

        return ParseTexture(body);
    }

    /// <summary>LZX 块帧格式：0xFF + BE16 输出块大小 + BE16 输入块大小，其余块为 BE16 输入大小（输出 0x8000）。</summary>
    private static byte[] DecompressLzx(byte[] src, int offset, int decompressedSize, int compressedSize)
    {
        var outMs = new MemoryStream(decompressedSize);
        var dec = new LzxDecoder(16);
        int pos = 0;

        using var input = new MemoryStream(src, false);
        while (pos < compressedSize)
        {
            input.Seek(offset + pos, SeekOrigin.Begin);
            int hi = input.ReadByte();
            int lo = input.ReadByte();
            if (hi < 0 || lo < 0) break;

            int blockSize = (hi << 8) | lo;
            int frameSize = 0x8000;
            if (hi == 0xFF)
            {
                // 0xFF 帧：FF + BE16 frameSize + BE16 blockSize
                int b2 = input.ReadByte();
                int b3 = input.ReadByte();
                int b4 = input.ReadByte();
                if (b2 < 0 || b3 < 0 || b4 < 0) break;
                frameSize = (lo << 8) | b2;
                blockSize = (b3 << 8) | b4;
                pos += 5;
            }
            else
            {
                pos += 2;
            }

            if (blockSize == 0 || frameSize == 0) break;
            input.Seek(offset + pos, SeekOrigin.Begin);
            // MonoGame 的 LzxDecoder 返回 0 表示成功（错误码语义），别把它当字节数
            dec.Decompress(input, blockSize, outMs, frameSize);
            pos += blockSize;
        }

        if (outMs.Length != decompressedSize)
            throw new InvalidDataException($"解压结果 {outMs.Length} != 期望 {decompressedSize}");
        return outMs.ToArray();
    }

    private static (int width, int height, byte[] rgba) ParseTexture(byte[] body)
    {
        using var ms = new MemoryStream(body);
        using var r = new BinaryReader(ms);

        int readerCount = Read7Bit(r);
        for (int i = 0; i < readerCount; i++)
        {
            _ = r.ReadString(); // "Microsoft.Xna.Framework.Content.Texture2DReader, ..."
            _ = r.ReadInt32();  // reader 版本号，XNA 写死 0（FNA 的 ContentTypeReaderManager 里有注释）
        }
        int shared = Read7Bit(r);
        int readerIndex = Read7Bit(r); // 根对象，1-based，必然指向 Texture2DReader
        _ = shared;

        int format = r.ReadInt32();
        int width = r.ReadInt32();
        int height = r.ReadInt32();
        int mipCount = r.ReadInt32();
        if (mipCount < 1) throw new InvalidDataException("无 mip");
        int dataSize = r.ReadInt32();
        var data = r.ReadBytes(dataSize);

        byte[] rgba = format switch
        {
            0 => FromColor(width, height, data),
            1 => FromBgr565(width, height, data),
            2 => FromBgra5551(width, height, data),
            3 => FromBgra4444(width, height, data),
            4 => throw new NotSupportedException("DXT1 贴图暂不支持（如需要再加）"),
            5 => throw new NotSupportedException("DXT3 贴图暂不支持"),
            6 => throw new NotSupportedException("DXT5 贴图暂不支持"),
            _ => throw new NotSupportedException($"SurfaceFormat {format} 不支持"),
        };
        return (width, height, rgba);
    }

    /// <summary>XNA SurfaceFormat.Color：内存字节序 R,G,B,A（预乘 alpha）。</summary>
    private static byte[] FromColor(int w, int h, byte[] data)
    {
        int need = w * h * 4;
        if (data.Length < need) throw new InvalidDataException($"Color 数据不足 {data.Length}/{need}");
        return data[..need];
    }

    private static byte[] FromBgr565(int w, int h, byte[] data)
    {
        var outp = new byte[w * h * 4];
        for (int i = 0, o = 0; i < w * h; i++, o += 4)
        {
            ushort v = BitConverter.ToUInt16(data, i * 2);
            int r = ((v >> 11) & 31) * 255 / 31;
            int g = ((v >> 5) & 63) * 255 / 63;
            int b = (v & 31) * 255 / 31;
            outp[o] = (byte)r; outp[o + 1] = (byte)g; outp[o + 2] = (byte)b; outp[o + 3] = 255;
        }
        return outp;
    }

    private static byte[] FromBgra5551(int w, int h, byte[] data)
    {
        var outp = new byte[w * h * 4];
        for (int i = 0, o = 0; i < w * h; i++, o += 4)
        {
            ushort v = BitConverter.ToUInt16(data, i * 2);
            int r = ((v >> 10) & 31) * 255 / 31;
            int g = ((v >> 5) & 31) * 255 / 31;
            int b = (v & 31) * 255 / 31;
            int a = (v >> 15) != 0 ? 255 : 0;
            outp[o] = (byte)r; outp[o + 1] = (byte)g; outp[o + 2] = (byte)b; outp[o + 3] = (byte)a;
        }
        return outp;
    }

    private static byte[] FromBgra4444(int w, int h, byte[] data)
    {
        var outp = new byte[w * h * 4];
        for (int i = 0, o = 0; i < w * h; i++, o += 4)
        {
            ushort v = BitConverter.ToUInt16(data, i * 2);
            int r = ((v >> 12) & 15) * 255 / 15;
            int g = ((v >> 8) & 15) * 255 / 15;
            int b = ((v >> 4) & 15) * 255 / 15;
            int a = (v & 15) * 255 / 15;
            outp[o] = (byte)r; outp[o + 1] = (byte)g; outp[o + 2] = (byte)b; outp[o + 3] = (byte)a;
        }
        return outp;
    }

    private static int Read7Bit(BinaryReader r)
    {
        int result = 0, shift = 0;
        while (true)
        {
            byte b = r.ReadByte();
            result |= (b & 0x7F) << shift;
            if ((b & 0x80) == 0) return result;
            shift += 7;
            if (shift > 35) throw new InvalidDataException("7bit int 异常");
        }
    }
}
