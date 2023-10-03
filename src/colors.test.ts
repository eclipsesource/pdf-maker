import { describe, expect, it } from '@jest/globals';

import { parseColor } from './colors.js';

const { closeTo } = expect;

describe('color', () => {
  describe('parseColor', () => {
    it('supports html color', () => {
      expect(parseColor('#ffffff')).toEqual({ type: 'RGB', red: 1, green: 1, blue: 1 });
      expect(parseColor('#000000')).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
      expect(parseColor('#0080ff')).toEqual({ type: 'RGB', red: 0, green: closeTo(0.5), blue: 1 });
    });

    it('supports named color', () => {
      expect(parseColor('white')).toEqual({ type: 'RGB', red: 1, green: 1, blue: 1 });
      expect(parseColor('black')).toEqual({ type: 'RGB', red: 0, green: 0, blue: 0 });
      expect(parseColor('red')).toEqual({ type: 'RGB', red: 1, green: 0, blue: 0 });
      expect(parseColor('green')).toEqual({ type: 'RGB', red: 0, green: 0.5, blue: 0 });
      expect(parseColor('blue')).toEqual({ type: 'RGB', red: 0, green: 0, blue: 1 });
    });

    it('throws on unsupported named color', () => {
      expect(() => parseColor('' as any)).toThrowError("Expected valid color name, got: ''");
      expect(() => parseColor('salmon' as any)).toThrowError(
        "Expected valid color name, got: 'salmon'"
      );
    });

    it('throws on invalid color type', () => {
      expect(() => parseColor({} as any)).toThrowError('Expected valid color, got: {}');
      expect(() => parseColor(23 as any)).toThrowError('Expected valid color, got: 23');
    });
  });
});
