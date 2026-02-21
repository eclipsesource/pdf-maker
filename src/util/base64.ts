const base64Lookup = createBase64LookupTable();

/**
 * Decodes a Base64 encoded string into a Uint8Array.
 *
 * @param base64 - The Base64 encoded string.
 * @returns The decoded bytes as a Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  if (base64.length % 4 !== 0) {
    throw new Error('Invalid base64 string: length must be a multiple of 4');
  }

  const len = base64.length;
  const padding = base64[len - 1] === '=' ? (base64[len - 2] === '=' ? 2 : 1) : 0;
  const bufferLength = (len * 3) / 4 - padding;
  const bytes = new Uint8Array(bufferLength);

  let byteIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup(base64, i);
    const encoded2 = lookup(base64, i + 1);
    const encoded3 = lookup(base64, i + 2);
    const encoded4 = lookup(base64, i + 3);

    bytes[byteIndex++] = (encoded1 << 2) | (encoded2 >> 4);
    if (base64[i + 2] !== '=') bytes[byteIndex++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (base64[i + 3] !== '=') bytes[byteIndex++] = ((encoded3 & 3) << 6) | encoded4;
  }

  return bytes;
}

function lookup(string: string, pos: number): number {
  const code = string.charCodeAt(pos);
  if (code === 61) return 0; // '=' padding character
  if (code < base64Lookup.length) {
    const value = base64Lookup[code];
    if (value !== 255) {
      return value;
    }
  }
  throw new Error(`Invalid Base64 character '${string[pos]}' at position ${pos}`);
}

function createBase64LookupTable(): Uint8Array {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  // 255 indicates that code does not represent a valid base64 character
  const table = new Uint8Array(256).fill(255);
  for (let i = 0; i < base64Chars.length; i++) {
    table[base64Chars.charCodeAt(i)] = i;
  }
  return table;
}
