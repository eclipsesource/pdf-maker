import { Obj } from './types.js';

export function printValue(value: unknown, refs?: unknown[]) {
  if (typeof value === 'string') return `'${value}'`;
  if (Array.isArray(value)) return printArray(value, refs);
  if (value instanceof Date) return `Date ${value.toISOString()}`;
  if (value instanceof Function) {
    return value.name ? `function ${value.name}` : 'anonymous function';
  }
  if (value instanceof ArrayBuffer) return `ArrayBuffer ${printArray([...new Uint8Array(value)])}`;
  if (ArrayBuffer.isView(value)) {
    return `${value.constructor.name} ${printArray([...new Uint8Array(value.buffer)])}`;
  }
  const str = `${value}`;
  if (str === '[object Object]') return printObject(value as Obj, refs);
  return str;
}

function printArray(array: unknown[], refs?: unknown[]): string {
  if (refs?.includes(array)) return 'recursive ref';
  const maxElements = 8;
  const content = array
    .slice(0, maxElements)
    .map((v) => printValue(v, [...(refs ?? []), array]))
    .join(', ');
  const tail = array.length > maxElements ? ', …' : '';
  return `[${content}${tail}]`;
}

function printObject(object: Obj, refs?: unknown[]): string {
  if (refs?.includes(object)) return 'recursive ref';
  const maxEntries = 8;
  const entries = Object.entries(object);
  const tail = entries.length > maxEntries ? ', …' : '';
  const main = entries
    .slice(0, maxEntries)
    .map(([key, value]) => `${key}: ${printValue(value, [...(refs ?? []), object])}`)
    .join(', ');
  return `{${main}${tail}}`;
}
