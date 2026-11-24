import { AppError } from './errors';

/**
 * 跨平台二进制流读写器 (BinaryReader & BinaryWriter)
 * 专为 .NET 风格序列化（小端序、7-bit 变长前缀字符串）优化
 */

export class BinaryReader {
  private view: DataView;
  private bytes: Uint8Array;
  public pos: number = 0;

  constructor(buffer: Uint8Array | ArrayBuffer) {
    if (buffer instanceof Uint8Array) {
      this.bytes = buffer;
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
      this.bytes = new Uint8Array(buffer);
      this.view = new DataView(buffer);
    }
  }

  get length(): number {
    return this.bytes.length;
  }

  get remaining(): number {
    return this.bytes.length - this.pos;
  }

  isEOF(): boolean {
    return this.pos >= this.bytes.length;
  }

  private ensureAvailable(bytes: number) {
    if (bytes < 0 || this.pos + bytes > this.bytes.length) {
      throw new AppError('TRUNCATED', '存档数据不完整或已被截断', {
        suggestion: '请检查文件是否拷贝完整；若为旧版/非标存档，请确认未在传输中被损坏。',
        context: { offset: this.pos, needed: bytes, totalLength: this.bytes.length },
      });
    }
  }

  readInt8(): number {
    this.ensureAvailable(1);
    const val = this.view.getInt8(this.pos);
    this.pos += 1;
    return val;
  }

  readUInt8(): number {
    this.ensureAvailable(1);
    const val = this.view.getUint8(this.pos);
    this.pos += 1;
    return val;
  }

  readBoolean(): boolean {
    return this.readUInt8() !== 0;
  }

  readInt16(): number {
    this.ensureAvailable(2);
    const val = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return val;
  }

  readUInt16(): number {
    this.ensureAvailable(2);
    const val = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return val;
  }

  readInt32(): number {
    this.ensureAvailable(4);
    const val = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return val;
  }

  readUInt32(): number {
    this.ensureAvailable(4);
    const val = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return val;
  }

  readInt64(): bigint {
    this.ensureAvailable(8);
    const val = this.view.getBigInt64(this.pos, true);
    this.pos += 8;
    return val;
  }

  readUInt64(): bigint {
    this.ensureAvailable(8);
    const val = this.view.getBigUint64(this.pos, true);
    this.pos += 8;
    return val;
  }

  readFloat(): number {
    this.ensureAvailable(4);
    const val = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return val;
  }

  readDouble(): number {
    this.ensureAvailable(8);
    const val = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return val;
  }

  readBytes(count: number): Uint8Array {
    this.ensureAvailable(count);
    const slice = this.bytes.slice(this.pos, this.pos + count);
    this.pos += count;
    return slice;
  }

  readRGB(): { r: number; g: number; b: number } {
    return {
      r: this.readUInt8(),
      g: this.readUInt8(),
      b: this.readUInt8()
    };
  }

  /**
   * 读取 .NET 风格的 7-bit 变长编码整数
   */
  read7BitEncodedInt(): number {
    let count = 0;
    let shift = 0;
    while (shift < 35) {
      const b = this.readUInt8();
      count |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) {
        return count;
      }
      shift += 7;
    }
    throw new AppError('FILE_FORMAT', '损坏的变长整数编码', {
      suggestion: '文件可能不是合法的泰拉瑞亚存档，或解密后数据已损坏。',
      context: { offset: this.pos },
    });
  }

  /**
   * 读取 .NET 风格带 7-bit 长度前缀的 UTF-8 字符串
   */
  readString(): string {
    const len = this.read7BitEncodedInt();
    if (len < 0) {
      throw new AppError('FILE_FORMAT', '非法的字符串长度', {
        context: { offset: this.pos, len },
      });
    }
    if (len === 0) return "";
    const strBytes = this.readBytes(len);
    return new TextDecoder("utf-8").decode(strBytes);
  }

  remainingBytes(): Uint8Array {
    const slice = this.bytes.slice(this.pos);
    this.pos = this.bytes.length;
    return slice;
  }
}

export class BinaryWriter {
  private chunks: Uint8Array[] = [];
  private totalLength: number = 0;

  private append(chunk: Uint8Array) {
    this.chunks.push(chunk);
    this.totalLength += chunk.length;
  }

  writeInt8(val: number) {
    const buf = new Uint8Array(1);
    new DataView(buf.buffer).setInt8(0, val);
    this.append(buf);
  }

  writeUInt8(val: number) {
    const buf = new Uint8Array(1);
    buf[0] = val & 0xff;
    this.append(buf);
  }

  writeBoolean(val: boolean) {
    this.writeUInt8(val ? 1 : 0);
  }

  writeInt16(val: number) {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setInt16(0, val, true);
    this.append(buf);
  }

  writeUInt16(val: number) {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setUint16(0, val, true);
    this.append(buf);
  }

  writeInt32(val: number) {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, val, true);
    this.append(buf);
  }

  writeUInt32(val: number) {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, val, true);
    this.append(buf);
  }

  writeInt64(val: bigint | number) {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigInt64(0, BigInt(val), true);
    this.append(buf);
  }

  writeUInt64(val: bigint | number) {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigUint64(0, BigInt(val), true);
    this.append(buf);
  }

  writeFloat(val: number) {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setFloat32(0, val, true);
    this.append(buf);
  }

  writeDouble(val: number) {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setFloat64(0, val, true);
    this.append(buf);
  }

  writeBytes(data: Uint8Array) {
    this.append(data);
  }

  writeRGB(r: number | { r: number; g: number; b: number }, g?: number, b?: number) {
    if (typeof r === "object") {
      this.writeUInt8(r.r);
      this.writeUInt8(r.g);
      this.writeUInt8(r.b);
    } else {
      this.writeUInt8(r);
      this.writeUInt8(g ?? 0);
      this.writeUInt8(b ?? 0);
    }
  }

  write7BitEncodedInt(value: number) {
    let v = value >>> 0;
    while (v >= 0x80) {
      this.writeUInt8((v | 0x80) & 0xff);
      v >>>= 7;
    }
    this.writeUInt8(v & 0xff);
  }

  writeString(str: string) {
    const encoded = new TextEncoder().encode(str);
    this.write7BitEncodedInt(encoded.length);
    this.writeBytes(encoded);
  }

  toUint8Array(): Uint8Array {
    return this.getBuffer();
  }

  getBuffer(): Uint8Array {
    const result = new Uint8Array(this.totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}
