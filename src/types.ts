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

export function pick<T = unknown>(object: Obj, name: string, fn?: (value: unknown) => T): T {
  return check?.(object[name], name, fn) ?? (object[name] as T);
}

export function check<T = unknown>(value: unknown, name: string, fn?: (value: unknown) => T): T {
  try {
    return fn?.(value) ?? (value as T);
  } catch (error) {
    const message =
      error.message === 'Missing value'
        ? `Missing value for "${name}"`
        : `Invalid value for "${name}": ${error.message}`;
    throw new TypeError(message);
  }
}

export function optional<T>(fn: (value: unknown) => T): (value: unknown) => T {
  return (value: unknown) => {
    if (value === undefined) return undefined;
    return fn(value);
  };
}

export function required<T = unknown>(fn?: (value: unknown) => T): (value: unknown) => T {
  return (value: unknown) => {
    if (value === undefined) throw new TypeError(`Missing value`);
    return fn ? fn(value) : (value as T);
  };
}

export function asBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw expected('boolean', value);
  return value;
}

export function asString(value: unknown): string {
  if (typeof value !== 'string') throw expected('string', value);
  return value;
}

export function asNumber(value: unknown): number {
  if (!Number.isFinite(value)) throw expected('number', value);
  return value as number;
}

export function asNonNegNumber(value: unknown): number {
  if (asNumber(value) < 0) throw expected('non-negative number', value);
  return value as number;
}

export function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw expected('array', value);
  return value;
}

export function asObject(value: unknown): Obj {
  if (typeof value !== 'object' || Array.isArray(value)) throw expected('object', value);
  return value as Obj;
}

function expected(expected: string, value: unknown) {
  return new TypeError(`Expected ${expected}, got: ${value}`);
}
