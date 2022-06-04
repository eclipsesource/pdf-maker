import { printValue } from './print-value.js';

export type Obj = Record<string, unknown>;

export type TypeDef<T> = (input: unknown) => T;

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

/**
 * Reads a property value from an object and applies a type definition to it.
 *
 * @param object The base object to read a property from.
 * @param name The name of the property to read.
 * @param type The type definition to apply to the value.
 * @returns The value, possibly modified by the type definition.
 */
export function readFrom<T = unknown>(object: Obj, name: string, type?: TypeDef<T>): T {
  return readAs(object[name], name, type);
}

/**
 * Applies a type definition to a given value.
 *
 * @param value The value to apply the type definition to.
 * @param name The name of the property this value belongs to, used in error messages.
 * @param type The type definition to apply to the value.
 * @returns The value, possibly modified by the type definition.
 */
export function readAs<T = unknown>(value: unknown, name: string, type?: TypeDef<T>): T {
  try {
    return asType(value, type);
  } catch (error) {
    if (error.message === 'Missing value') {
      throw new TypeError(`Missing value for "${name}"`);
    }
    if (error.message?.startsWith('Invalid value for "')) {
      const tail = error.message.replace(/^Invalid value for "/, '');
      throw new TypeError(`Invalid value for "${name}/${tail}`);
    }
    throw new TypeError(`Invalid value for "${name}": ${error.message}`);
  }
}

export const types = {
  boolean: () => readBoolean,
  date: () => readDate,
  string: (options?: StringOptions) => (value: unknown) => readString(value, options),
  number: (options?: NumberOptions) => (value: unknown) => readNumber(value, options),
  array:
    <T>(items?: TypeDef<T>, options?: ArrayOptions) =>
    (value: unknown) =>
      readArray(value, items, options),
  object:
    <T extends Record<string, TypeDef<unknown>>>(properties?: T, options?: ObjectOptions) =>
    (value: unknown) =>
      readObject(value, properties, options),
};

export function optional<T = unknown>(type?: TypeDef<T>): TypeDef<T | undefined> {
  return (value: unknown) => {
    if (value === undefined) return undefined;
    return type ? asType(value, type) : (value as T);
  };
}

export function required<T = unknown>(type?: TypeDef<T>): TypeDef<T> {
  return (value: unknown) => {
    if (value === undefined) throw new TypeError(`Missing value`);
    return type ? asType(value, type) : (value as T);
  };
}

export function dynamic<T = unknown>(
  type: TypeDef<T>,
  name?: string
): TypeDef<(...args: unknown[]) => T> {
  return (value: unknown) => {
    if (typeof value !== 'function') {
      const result = asType(value, type);
      return () => result;
    }
    const subject = name ? `Supplied function for "${name}"` : 'Supplied function';
    return (...args) => {
      const result = saveCall(value as (...params: unknown[]) => unknown, args, subject);
      try {
        return asType(result, type);
      } catch (error) {
        throw new Error(`${subject} returned invalid value: ${error.message}`);
      }
    };
  };
}

function saveCall(fn: (...params: unknown[]) => unknown, args: unknown[], subject) {
  try {
    return fn(...args);
  } catch (error) {
    throw new Error(`${subject} threw: ${error.stack ?? error.message ?? error}`);
  }
}

function asType<T = unknown>(value: unknown, type?: TypeDef<T>): T {
  if (type == null) return value as T;
  if (typeof type === 'function') return type(value);
  throw new Error(`Invalid type definition: ${printValue(type)}`);
}

export function readBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  throw typeError('boolean', value);
}

type StringOptions = {
  pattern?: RegExp;
  enum?: string[];
};

export function readString(value: unknown, options?: StringOptions) {
  if (typeof value !== 'string') throw typeError('string', value);
  if (options?.enum && !options.enum.includes(value)) {
    throw typeError(`one of (${options.enum.map((s) => `'${s}'`).join(', ')})`, value);
  }
  if (options?.pattern && !options.pattern.test(value)) {
    throw typeError(`string matching pattern ${options.pattern}`, value);
  }
  return value;
}

type NumberOptions = {
  minimum?: number;
  maximum?: number;
};

export function readNumber(input: unknown, options?: NumberOptions) {
  if (!Number.isFinite(input)) throw typeError('number', input);
  const num = input as number;
  if (options?.minimum != null && !(num >= options.minimum)) {
    throw typeError(`number >= ${options.minimum}`, input);
  }
  if (options?.maximum != null && !(num <= options.maximum)) {
    throw typeError(`number <= ${options.maximum}`, input);
  }
  return num;
}

export function readDate(value: unknown): Date {
  if (value instanceof Date) return value as Date;
  throw typeError('Date', value);
}

type ArrayOptions = {
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};

export function readArray<T = unknown>(
  input: unknown,
  items?: TypeDef<T>,
  options?: ArrayOptions
): T[] {
  if (!Array.isArray(input)) throw typeError('array', input);
  if (options?.minItems != null && input.length < options.minItems) {
    throw typeError(`array with minimum length ${options.minItems}`, input);
  }
  if (options?.maxItems != null && input.length > options.maxItems) {
    throw typeError(`array with maximum length ${options.maxItems}`, input);
  }
  if (options?.uniqueItems === true && !isUniq(input)) {
    throw typeError(`array with unique items`, input);
  }
  return items ? mapItems(input, items) : (input as T[]);
}

function isUniq(array: unknown[]) {
  return array.every((v, i, a) => a.indexOf(v) === i);
}

function mapItems<T>(array: unknown[], type: TypeDef<T>): T[] {
  return array.map((item, idx) => readAs(item, idx.toString(), type));
}

type ObjectOptions = {
  minProperties?: number;
  maxProperties?: number;
};

type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

export function readObject<T extends Record<string, TypeDef<unknown>>>(
  input: unknown,
  properties?: T,
  options?: ObjectOptions
): Partial<{ [P in keyof T]: ReturnType<T[P]> }> {
  if (!isObject(input)) throw typeError('object', input);
  if (options?.minProperties != null && Object.keys(input).length < options.minProperties) {
    throw typeError(`object with min. ${options.minProperties} properties`, input);
  }
  if (options?.maxProperties != null && Object.keys(input).length > options.maxProperties) {
    throw typeError(`object with max. ${options.maxProperties} properties`, input);
  }
  return properties ? mapObject(input, properties) : (input as any);
}

function mapObject(obj: Obj, properties: Record<string, TypeDef<unknown>>) {
  return pickDefined(
    Object.fromEntries(
      Object.entries(properties).map(([key, type]) => {
        return [key, readFrom(obj, key, type)];
      })
    )
  );
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
