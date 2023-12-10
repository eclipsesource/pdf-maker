export type JpegInfo = {
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
  colorSpace: 'grayscale' | 'rgb' | 'cmyk';
};

/**
 * Determines if the given data is the beginning of a JPEG file.
 */
export function isJpeg(data: Uint8Array) {
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

/**
 * Analyzes JPEG data and returns info on the file.
 */
export function readJpegInfo(data: Uint8Array): JpegInfo {
  if (!isJpeg(data)) {
    throw new Error('Invalid JPEG data');
  }
  let pos = 0;
  const len = data.length;
  let info: JpegInfo | undefined;
  while (pos < len - 1) {
    if (data[pos++] !== 0xff) {
      continue;
    }
    const type = data[pos++];
    if (type === 0x00) {
      // padding byte
      continue;
    }
    if (type >= 0xd0 && type <= 0xd9) {
      // these types have no body
      continue;
    }
    const length = readUint16BE(data, pos);
    pos += 2;

    // Frame header types: 0xc0 .. 0xcf except 0xc4, 0xc8, 0xcc
    if (type >= 0xc0 && type <= 0xcf && type !== 0xc4 && type !== 0xc8 && type !== 0xcc) {
      const bitDepth = data[pos];
      const height = readUint16BE(data, pos + 1);
      const width = readUint16BE(data, pos + 3);
      const colorSpace = getColorSpace(data[pos + 5]);
      info = { width, height, bitDepth, colorSpace };
    }

    pos += length - 2;
  }

  if (!info) {
    throw new Error('Invalid JPEG data');
  }

  return info;
}

function getColorSpace(colorSpace: number): 'rgb' | 'grayscale' | 'cmyk' {
  if (colorSpace === 1) return 'grayscale';
  if (colorSpace === 3) return 'rgb';
  if (colorSpace === 4) return 'cmyk'; // Adobe extension
  throw new Error('Invalid color space');
}

function readUint16BE(buffer: Uint8Array, offset: number) {
  return (buffer[offset] << 8) | buffer[offset + 1];
}
