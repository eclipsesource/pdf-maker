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

export function multiplyMatrices(matrix1: number[], matrix2: number[]): number[] {
  const result = [];
  const [a, b, c, d, e, f] = matrix1;
  const [g, h, i, j, k, l] = matrix2;

  result[0] = a * g + c * h;
  result[1] = b * g + d * h;
  result[2] = a * i + c * j;
  result[3] = b * i + d * j;
  result[4] = a * k + c * l + e;
  result[5] = b * k + d * l + f;

  return result;
}

export function round(n: number, precision = 6): number {
  const factor = Math.pow(10, precision);
  return Math.round(n * factor) / factor;
}
