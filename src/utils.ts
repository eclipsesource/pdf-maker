/**
 * Returns a copy of the given array with all falsy values (i.e.
 * `false`, `null`, `undefined`, `""`, `0`, and `NaN`) removed.
 */
export function compact<T>(array: T[]) {
  return array.filter(Boolean) as Exclude<T, null | undefined | false>[];
}

/**
 * Returns a copy of the given object with the given keys removed.
 */
export function omit(obj: Record<string, unknown>, ...keys: string[]) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
