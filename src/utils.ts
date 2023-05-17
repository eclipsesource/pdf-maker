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
export function omit<T extends Record<string, unknown>>(
  obj: T,
  ...keys: string[]
): Omit<T, (typeof keys)[number]> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
