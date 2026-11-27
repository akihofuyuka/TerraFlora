import { describe, expect, it } from 'vitest';
import { buildZipBlob } from '../zip';

describe('buildZipBlob', () => {
  it('creates a valid PKZIP archive with local header, central directory, and EOCD', async () => {
    const payload = new TextEncoder().encode('relogic_test_world');
    const blob = buildZipBlob([{ name: '测试地图_国际服.wld', data: payload }]);

    expect(blob.type).toBe('application/zip');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);

    // Local file header signature PK\x03\x04
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    // UTF-8 flag bit (0x0800)
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
    // Uncompressed size
    expect(view.getUint32(22, true)).toBe(payload.length);

    // End of central directory signature PK\x05\x06 at tail (no comment)
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 12, true)).toBe(1);
  });
});
