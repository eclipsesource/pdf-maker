export type PngInfo = {
  /**
   * Image width in pixel.
   */
  width: number;
  /**
   * Image height in pixel.
   */
  height: number;
  /**
   * Bit depth per channel.
   */
  bitDepth: number;
  /**
   * Color space.
   */
  colorSpace: 'grayscale' | 'rgb';
  /**
   * True if the image has an alpha channel.
   */
  hasAlpha: boolean;
  /**
   * True if the image has indexed colors.
   */
  isIndexed: boolean;
  /**
   * True if the image is interlaced.
   */
  isInterlaced: boolean;
};

export function isPng(data: Uint8Array) {
  // check PNG signature
  return hasBytes(data, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

/**
 * Analyzes PNG data. Requires only the first 32 bytes of the file.
 * @param data PNG data
 * @returns PNG info
 */
export function readPngInfo(data: Uint8Array): PngInfo {
  if (!isPng(data)) {
    throw new Error('Invalid PNG data');
  }
  // read IHDR chunk
  if (data[12] !== 0x49 || data[13] !== 0x48 || data[14] !== 0x44 || data[15] !== 0x52) {
    throw new Error('Invalid PNG data');
  }
  if (data.length < 33) {
    throw new Error('Invalid PNG data');
  }
  const width = readUint32BE(data, 16);
  const height = readUint32BE(data, 20);
  const bitDepth = data[24];
  const colorType = data[25];
  const interlacing = data[28];
  return {
    width,
    height,
    bitDepth,
    colorSpace: getColorSpace(colorType),
    hasAlpha: colorType === 4 || colorType === 6,
    isIndexed: colorType === 3,
    isInterlaced: interlacing === 1,
  };
}

// 0: grayscale
// 2: RGB
// 3: RGB indexed
// 4: grayscale with alpha channel
// 6: RGB with alpha channel
function getColorSpace(value: number): 'rgb' | 'grayscale' {
  if (value === 0 || value === 4) return 'grayscale';
  if (value === 2 || value === 3 || value === 6) return 'rgb';
  throw new Error('Invalid color space');
}

function readUint32BE(data: Uint8Array, offset: number) {
  return (
    (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]
  );
}

function hasBytes(data: Uint8Array, offset: number, bytes: number[]) {
  for (let i = 0; i < bytes.length; i++) {
    if (data[offset + i] !== bytes[i]) return false;
  }
  return true;
}
