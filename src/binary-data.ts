import { typeError } from './types.ts';

export function readBinaryData(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input;
  throw typeError('Uint8Array', input);
}
