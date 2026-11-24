using System.IO.Compression;
using System.Text;

namespace Gamedump;

/// <summary>
/// 最小 PNG 编码器（RGBA8，无过滤）。只依赖 DeflateStream，不引第三方包。
/// </summary>
public static class PngWriter
{
    public static byte[] Encode(int width, int height, byte[] rgba)
    {
        using var ms = new MemoryStream();
        ms.Write(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }); // PNG 签名
        WriteChunk(ms, 0x49484452, Ihdr(width, height));
        WriteChunk(ms, 0x49444154, IdatZlib(width, height, rgba));
        WriteChunk(ms, 0x49454E44, Array.Empty<byte>());
        return ms.ToArray();
    }

    public static void Save(string path, int width, int height, byte[] rgba)
        => File.WriteAllBytes(path, Encode(width, height, rgba));

    private static byte[] Ihdr(int w, int h)
    {
        var b = new byte[13];
        b[0] = (byte)(w >> 24); b[1] = (byte)(w >> 16); b[2] = (byte)(w >> 8); b[3] = (byte)w;
        b[4] = (byte)(h >> 24); b[5] = (byte)(h >> 16); b[6] = (byte)(h >> 8); b[7] = (byte)h;
        b[8] = 8;   // bit depth
        b[9] = 6;   // color type RGBA
        return b;
    }

    private static byte[] IdatZlib(int w, int h, byte[] rgba)
    {
        // 每行加 filter 字节 0（None）
        int stride = w * 4;
        var raw = new byte[(stride + 1) * h];
        for (int y = 0; y < h; y++)
        {
            raw[y * (stride + 1)] = 0;
            Buffer.BlockCopy(rgba, y * stride, raw, y * (stride + 1) + 1, stride);
        }

        var outMs = new MemoryStream();
        outMs.WriteByte(0x78); // zlib header
        outMs.WriteByte(0x01);

        using (var deflate = new DeflateStream(outMs, CompressionLevel.Fastest, leaveOpen: true))
            deflate.Write(raw, 0, raw.Length);

        uint adler = Adler32(raw);
        outMs.WriteByte((byte)(adler >> 24));
        outMs.WriteByte((byte)(adler >> 16));
        outMs.WriteByte((byte)(adler >> 8));
        outMs.WriteByte((byte)adler);
        return outMs.ToArray();
    }

    private static uint Adler32(byte[] data)
    {
        uint a = 1, b = 0;
        foreach (var t in data)
        {
            a = (a + t) % 65521;
            b = (b + a) % 65521;
        }
        return (b << 16) | a;
    }

    private static void WriteChunk(Stream s, uint type, byte[] data)
    {
        var len = BitConverter.GetBytes((uint)data.Length);
        if (BitConverter.IsLittleEndian) Array.Reverse(len);
        s.Write(len);

        var body = new byte[data.Length + 4];
        body[0] = (byte)(type >> 24);
        body[1] = (byte)(type >> 16);
        body[2] = (byte)(type >> 8);
        body[3] = (byte)type;
        data.CopyTo(body, 4);
        s.Write(body);

        var crc = BitConverter.GetBytes(Crc32(body));
        if (BitConverter.IsLittleEndian) Array.Reverse(crc);
        s.Write(crc);
    }

    private static uint Crc32(byte[] data)
    {
        uint crc = 0xFFFFFFFF;
        foreach (var t in data)
        {
            crc ^= t;
            for (int k = 0; k < 8; k++)
                crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320 : crc >> 1;
        }
        return crc ^ 0xFFFFFFFF;
    }
}
