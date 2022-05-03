export type Obj = Record<string, unknown>;

/**
 * Returns a copy of an object with all undefined values removed.
 *
 * @param obj The input object.
 * @returns A copy of the input object with all undefined values removed.
 */
export function pickDefined<T extends Obj>(obj: T): Partial<T> {
  const result = {} as T;
  for (const key in obj) {
    if (typeof obj[key] !== 'undefined') {
      result[key] = obj[key];
    }
  }
  return result;
}

export function getFrom<T = unknown>(object: Obj, name: string, fn?: (value: unknown) => T): T {
  return check(object[name], name, fn);
}

export function check<T = unknown>(value: unknown, name: string, fn?: (value: unknown) => T): T {
  try {
    return fn?.(value) ?? (value as T);
  } catch (error) {
    if (error.message === 'Missing value') {
      throw new TypeError(`Missing value for "${name}"`);
    }
    if (error.message?.startsWith('Invalid value for "')) {
      const tail = error.message.replace(/^Invalid value for "/, '');
      const glue = tail.startsWith('[') ? '' : '.';
      throw new TypeError(`Invalid value for "${name}${glue}${tail}`);
    }
    throw new TypeError(`Invalid value for "${name}": ${error.message}`);
  }
}

export function optional<T>(fn?: (value: unknown) => T): (value: unknown) => T {
  return (value: unknown) => {
    if (value === undefined) return undefined;
    return fn ? fn(value) : (value as T);
  };
}

export function required<T = unknown>(fn?: (value: unknown) => T): (value: unknown) => T {
  return (value: unknown) => {
    if (value === undefined) throw new TypeError(`Missing value`);
    return fn ? fn(value) : (value as T);
  };
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  throw typeError('boolean', value);
}

export function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  throw typeError('string', value);
}

export function asNumber(value: unknown): number {
  if (Number.isFinite(value)) return value as number;
  throw typeError('number', value);
}

export function asNonNegNumber(value: unknown): number {
  if (asNumber(value) >= 0) return value as number;
  throw typeError('non-negative number', value);
}

export function asDate(value: unknown): Date {
  if (value instanceof Date) return value as Date;
  throw typeError('Date', value);
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  throw typeError('array', value);
}

export function asObject(value: unknown): Obj {
  if (isObject(value)) return value as Obj;
  throw typeError('object', value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.toString() === '[object Object]'
  );
}

export function typeError(expected: string, value: unknown) {
  return new TypeError(`Expected ${expected}, got: ${printValue(value)}`);
}

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
  if (str === '[object Object]') return printObject(value, refs);
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

function printObject(object: unknown, refs?: unknown[]): string {
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
