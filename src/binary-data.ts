import { decodeFromBase64DataUri } from 'pdf-lib';

import { typeError } from './types.js';

export function parseBinaryData(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof input === 'string') return decodeFromBase64DataUri(input);
  throw typeError('Uint8Array, ArrayBuffer, or base64-encoded string', input);
}
