import { describe, expect, it } from 'vitest';

import { readColor } from './read-color.ts';

describe('readColor', () => {
  it('supports html color', () => {
    expect(readColor('#ffffff')).toEqual({ type: 'RGB', red: 1, green: 1, blue: 1 });
    expect(readColor('#000000')).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
    expect(readColor('#0080ff')).toEqual({
      type: 'RGB',
      red: 0,
      green: expect.closeTo(0.5),
      blue: 1,
    });
  });

  it('supports named color', () => {
    expect(readColor('white')).toEqual({ type: 'RGB', red: 1, green: 1, blue: 1 });
    expect(readColor('black')).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
    expect(readColor('red')).toEqual({ type: 'RGB', red: 1, green: 0, blue: 0 });
    expect(readColor('green')).toEqual({ type: 'RGB', red: 0, green: 0.5, blue: 0 });
    expect(readColor('blue')).toEqual({ type: 'RGB', red: 0, green: 0, blue: 1 });
  });

  it('throws on unsupported named color', () => {
    expect(() => readColor('' as any)).toThrowError("Expected valid color name, got: ''");
    expect(() => readColor('salmon' as any)).toThrowError(
      "Expected valid color name, got: 'salmon'",
    );
  });

  it('throws on invalid color type', () => {
    expect(() => readColor({} as any)).toThrowError('Expected valid color, got: {}');
    expect(() => readColor(23 as any)).toThrowError('Expected valid color, got: 23');
  });
});
