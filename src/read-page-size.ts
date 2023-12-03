import { paperSizes } from './api/sizes.js';
import { parseLength, Size } from './box.js';
import { isObject, readFrom, required, typeError } from './types.js';

export function readPageSize(def?: unknown): Size {
  if (typeof def === 'string') {
    const size = paperSizes[def as keyof typeof paperSizes];
    if (!size) throw typeError('valid paper size', def);
    const { width, height } = size;
    return { width, height };
  }
  if (isObject(def)) {
    const width = readFrom(def, 'width', required(parseLength));
    const height = readFrom(def, 'height', required(parseLength));
    if (width <= 0) throw typeError('positive width', width);
    if (height <= 0) throw typeError('positive height', height);
    return { width, height };
  }
  throw typeError('valid page size', def);
}

export function parseOrientation(def?: unknown): 'portrait' | 'landscape' {
  if (def === 'portrait' || def === 'landscape') return def;
  throw typeError("'portrait' or 'landscape'", def);
}

export function applyOrientation(size: Size, orientation?: 'portrait' | 'landscape'): Size {
  const { width, height } = size;
  if (orientation === 'portrait') {
    return { width: Math.min(width, height), height: Math.max(width, height) };
  }
  if (orientation === 'landscape') {
    return { width: Math.max(width, height), height: Math.min(width, height) };
  }
  return size;
}
