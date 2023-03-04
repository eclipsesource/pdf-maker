import { describe, expect, it } from '@jest/globals';

import { parseEdges, parseLength, subtractEdges } from '../src/box.js';

describe('box', () => {
  describe('subtractEdges', () => {
    it('returns the original box if edges are undefined', () => {
      const box = { x: 10, y: 20, width: 300, height: 400 };

      expect(subtractEdges(box, undefined)).toEqual(box);
    });

    it('subtracts all edges correctly', () => {
      const box = { x: 10, y: 20, width: 300, height: 400 };
      const edges = { left: 1, right: 2, top: 3, bottom: 4 };

      const inner = subtractEdges(box, edges);

      expect(inner).toEqual({ x: 11, y: 23, width: 297, height: 393 });
    });

    it('clamps width and height to zero', () => {
      const box = { x: 10, y: 20, width: 300, height: 400 };
      const edges = { left: 200, right: 200, top: 300, bottom: 300 };

      const inner = subtractEdges(box, edges);

      expect(inner).toEqual({ x: 210, y: 320, width: 0, height: 0 });
    });
  });

  describe('parseEdges', () => {
    it('supports number', () => {
      expect(parseEdges(0)).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(parseEdges(1)).toEqual({ left: 1, right: 1, top: 1, bottom: 1 });
    });

    it('supports string', () => {
      expect(parseEdges('0in')).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
      expect(parseEdges('1in')).toEqual({ left: 72, right: 72, top: 72, bottom: 72 });
    });

    it('supports empty margin', () => {
      expect(parseEdges({})).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    });

    it('supports x and y', () => {
      expect(parseEdges({ x: 2 })).toEqual({ left: 2, right: 2, top: 0, bottom: 0 });
      expect(parseEdges({ y: 3 })).toEqual({ left: 0, right: 0, top: 3, bottom: 3 });
      expect(parseEdges({ x: 2, y: 3 })).toEqual({ left: 2, right: 2, top: 3, bottom: 3 });
    });

    it('supports left, right, top, and bottom', () => {
      const margin = { left: 1, right: 2, top: 3, bottom: 4 };

      expect(parseEdges(margin)).toEqual(margin);
    });

    it('gives left and right precedence over x', () => {
      const margin = { x: 1, right: 2, left: 3 };

      expect(parseEdges(margin)).toEqual({ left: 3, right: 2, top: 0, bottom: 0 });
    });

    it('gives top and bottom precedence over y', () => {
      const margin = { y: 1, top: 2, bottom: 3 };

      expect(parseEdges(margin)).toEqual({ left: 0, right: 0, top: 2, bottom: 3 });
    });

    it('resolves units', () => {
      const margin = { x: '1in', y: 2 };

      expect(parseEdges(margin)).toEqual({ left: 72, right: 72, top: 2, bottom: 2 });
    });

    it('throws on invalid lengths', () => {
      expect(() => parseEdges('')).toThrowError("Expected number or length string, got: ''");
      expect(() => parseEdges(Infinity)).toThrowError(
        'Expected number or length string, got: Infinity'
      );
    });

    it('throws on invalid types', () => {
      expect(() => parseEdges('')).toThrowError("Expected number or length string, got: ''");
      expect(() => parseEdges(null)).toThrowError(
        'Expected number, length string, or object, got: null'
      );
      expect(() => parseEdges(true)).toThrowError(
        'Expected number, length string, or object, got: true'
      );
      expect(() => parseEdges(() => 23)).toThrowError(
        'Expected number, length string, or object, got: anonymous function'
      );
    });
  });

  describe('parseLength', () => {
    it('supports numbers', () => {
      expect(parseLength(0)).toEqual(0);
      expect(parseLength(-1)).toEqual(-1);
      expect(parseLength(10)).toEqual(10);
      expect(parseLength(0.1)).toEqual(0.1);
    });

    it('supports strings with unit pt', () => {
      expect(parseLength('0pt')).toEqual(0);
      expect(parseLength('-1pt')).toEqual(-1);
      expect(parseLength('10pt')).toEqual(10);
      expect(parseLength('0.1pt')).toEqual(0.1);
    });

    it('supports strings with unit in', () => {
      expect(parseLength('0in')).toEqual(0);
      expect(parseLength('1in')).toEqual(72);
    });

    it('supports strings with unit mm', () => {
      expect(parseLength('0mm')).toEqual(0);
      expect(parseLength('25.4mm')).toBeCloseTo(72);
    });

    it('supports strings with unit cm', () => {
      expect(parseLength('0cm')).toEqual(0);
      expect(parseLength('2.54cm')).toBeCloseTo(72);
    });

    it('throws on invalid strings', () => {
      expect(() => parseLength('')).toThrowError("Expected number or length string, got: ''");
      expect(() => parseLength('1')).toThrowError("Expected number or length string, got: '1'");
      expect(() => parseLength('1xy')).toThrowError("Expected number or length string, got: '1xy'");
    });

    it('throws on invalid numbers', () => {
      expect(() => parseLength(Infinity)).toThrowError(
        'Expected number or length string, got: Infinity'
      );
      expect(() => parseLength(NaN)).toThrowError('Expected number or length string, got: NaN');
    });

    it('throws on invalid types', () => {
      expect(() => parseLength(null)).toThrowError('Expected number or length string, got: null');
      expect(() => parseLength(true)).toThrowError('Expected number or length string, got: true');
      expect(() => parseLength(() => 23)).toThrowError(
        'Expected number or length string, got: anonymous function'
      );
    });
  });
});
