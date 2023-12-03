import { describe, expect, it } from '@jest/globals';

import { paperSizes } from './api/sizes.js';
import { applyOrientation, parseOrientation, readPageSize } from './read-page-size.js';

describe('read-page-sizes', () => {
  describe('readPageSize', () => {
    it('supports known paper sizes', () => {
      expect(readPageSize('A4')).toEqual(paperSizes.A4);
      expect(readPageSize('2A0')).toEqual(paperSizes['2A0']);
    });

    it('throws on unsupported paper size', () => {
      expect(() => readPageSize('foo')).toThrowError("Expected valid paper size, got: 'foo'");
      expect(() => readPageSize('a4')).toThrowError("Expected valid paper size, got: 'a4'");
    });

    it('supports width and height', () => {
      expect(readPageSize({ width: 23, height: 42 })).toEqual({ width: 23, height: 42 });
      expect(readPageSize({ width: '23cm', height: '42cm' })).toEqual({
        width: (23 * 72) / 2.54,
        height: (42 * 72) / 2.54,
      });
    });

    it('throws on missing width or height', () => {
      expect(() => readPageSize({ width: 23 })).toThrowError('Missing value for "height"');
      expect(() => readPageSize({ height: 42 })).toThrowError('Missing value for "width"');
    });

    it('throws on zero or negative values for width or height', () => {
      expect(() => readPageSize({ width: 0, height: 42 })).toThrowError(
        'Expected positive width, got: 0'
      );
      expect(() => readPageSize({ width: -1, height: 42 })).toThrowError(
        'Expected positive width, got: -1'
      );
      expect(() => readPageSize({ width: 23, height: 0 })).toThrowError(
        'Expected positive height, got: 0'
      );
      expect(() => readPageSize({ width: 23, height: -1 })).toThrowError(
        'Expected positive height, got: -1'
      );
    });

    it('throws on invalid type', () => {
      expect(() => readPageSize(23)).toThrowError('Expected valid page size, got: 23');
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

    it('returns unmodified size if orientation is undefined', () => {
      expect(applyOrientation({ width: 23, height: 42 }, undefined)).toEqual({
        width: 23,
        height: 42,
      });
      expect(applyOrientation({ width: 42, height: 23 }, undefined)).toEqual({
        width: 42,
        height: 23,
      });
    });
  });
});
