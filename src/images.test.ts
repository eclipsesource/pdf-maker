import { describe, expect, it } from 'vitest';

import { readImages } from './images.ts';
import { mkData } from './test/test-utils.ts';

describe('readImages', () => {
  it('returns an empty array for missing images definition', () => {
    const images = readImages({});

    expect(images).toEqual([]);
  });

  it('returns images array', () => {
    const imagesDef = {
      foo: { data: mkData('Foo') },
      bar: { data: mkData('Bar'), format: 'jpeg' },
      baz: { data: mkData('Baz'), format: 'png' },
    };

    const images = readImages(imagesDef);

    expect(images).toEqual([
      { name: 'foo', data: mkData('Foo'), format: 'jpeg' },
      { name: 'bar', data: mkData('Bar'), format: 'jpeg' },
      { name: 'baz', data: mkData('Baz'), format: 'png' },
    ]);
  });

  it('throws on invalid type', () => {
    const fn = () => readImages(23);

    expect(fn).toThrow(new TypeError('Expected object, got: 23'));
  });

  it('throws on invalid image definition', () => {
    const fn = () => readImages({ foo: 23 });

    expect(fn).toThrow(new TypeError('Invalid value for "foo": Expected object, got: 23'));
  });

  it('throws on invalid image data', () => {
    const fn = () => readImages({ foo: { data: 23 } });

    expect(fn).toThrow(new TypeError('Invalid value for "foo/data": Expected Uint8Array, got: 23'));
  });
});
