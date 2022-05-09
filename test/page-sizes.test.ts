import { describe, expect, it } from '@jest/globals';

import {
  applyOrientation,
  paperSizes,
  parseOrientation,
  parsePageSize,
} from '../src/page-sizes.js';

describe('page-sizes', () => {
  describe('parsePageSize', () => {
    it('supports known paper sizes', () => {
      expect(parsePageSize('A4')).toEqual(paperSizes.A4);
      expect(parsePageSize('2A0')).toEqual(paperSizes['2A0']);
    });

    it('throws on unsupported paper size', () => {
      expect(() => parsePageSize('foo')).toThrowError("Expected valid paper size, got: 'foo'");
      expect(() => parsePageSize('a4')).toThrowError("Expected valid paper size, got: 'a4'");
    });

    it('supports width and height', () => {
      expect(parsePageSize({ width: 23, height: 42 })).toEqual({ width: 23, height: 42 });
      expect(parsePageSize({ width: '23cm', height: '42cm' })).toEqual({
        width: (23 * 72) / 2.54,
        height: (42 * 72) / 2.54,
      });
    });

    it('throws on missing width or height', () => {
      expect(() => parsePageSize({ width: 23 })).toThrowError('Missing value for "height"');
      expect(() => parsePageSize({ height: 42 })).toThrowError('Missing value for "width"');
    });

    it('throws on zero or negative values for width or height', () => {
      expect(() => parsePageSize({ width: 0, height: 42 })).toThrowError(
        'Expected positive width, got: 0'
      );
      expect(() => parsePageSize({ width: -1, height: 42 })).toThrowError(
        'Expected positive width, got: -1'
      );
      expect(() => parsePageSize({ width: 23, height: 0 })).toThrowError(
        'Expected positive height, got: 0'
      );
      expect(() => parsePageSize({ width: 23, height: -1 })).toThrowError(
        'Expected positive height, got: -1'
      );
    });

    it('throws on invalid type', () => {
      expect(() => parsePageSize(23)).toThrowError('Expected valid page size, got: 23');
    });
  });

  describe('parseOrientation', () => {
    it('supports orientation identifiers', () => {
      expect(parseOrientation('portrait')).toEqual('portrait');
      expect(parseOrientation('landscape')).toEqual('landscape');
    });

    it('throws on unsupported orientation', () => {
      expect(() => parseOrientation('foo')).toThrowError(
        "Expected 'portrait' or 'landscape', got: 'foo'"
      );
    });

    it('throws on invalid type', () => {
      expect(() => parseOrientation(23)).toThrowError(
        "Expected 'portrait' or 'landscape', got: 23"
      );
      expect(() => parseOrientation(null)).toThrowError(
        "Expected 'portrait' or 'landscape', got: null"
      );
    });
  });

  describe('applyOrientation', () => {
    it('returns size adjusted to portrait orientation', () => {
      expect(applyOrientation({ width: 23, height: 42 }, 'portrait')).toEqual({
        width: 23,
        height: 42,
      });
      expect(applyOrientation({ width: 42, height: 23 }, 'portrait')).toEqual({
        width: 23,
        height: 42,
      });
    });

    it('returns size adjusted to landscape orientation', () => {
      expect(applyOrientation({ width: 23, height: 42 }, 'landscape')).toEqual({
        width: 42,
        height: 23,
      });
      expect(applyOrientation({ width: 42, height: 23 }, 'landscape')).toEqual({
        width: 42,
        height: 23,
      });
    });

    it('returns unmodified size if orientation is null', () => {
      expect(applyOrientation({ width: 23, height: 42 }, null)).toEqual({
        width: 23,
        height: 42,
      });
      expect(applyOrientation({ width: 42, height: 23 }, null)).toEqual({
        width: 42,
        height: 23,
      });
    });
  });
});
