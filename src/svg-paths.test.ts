import { describe, expect, it } from 'vitest';

import { parseSvgPath, svgPathToPdfOps, tokenizeSvgPath } from './svg-paths.js';

describe('svg-paths', () => {
  describe('tokenize', () => {
    it('returns empty list of tokens', () => {
      expect(tokenizeSvgPath('')).toEqual([]);
      expect(tokenizeSvgPath(' ')).toEqual([]);
      expect(tokenizeSvgPath(' , , \t  , \n , ')).toEqual([]);
    });

    it('returns commands and parameters', () => {
      const tokens = tokenizeSvgPath('M 1 2 3');

      expect(tokens).toEqual([
        { start: 0, op: 'M' },
        { start: 2, value: 1 },
        { start: 4, value: 2 },
        { start: 6, value: 3 },
      ]);
    });

    it('handles surrounding whitespace', () => {
      expect(tokenizeSvgPath(' M 1 2 ')).toEqual([
        { start: 1, op: 'M' },
        { start: 3, value: 1 },
        { start: 5, value: 2 },
      ]);
      expect(tokenizeSvgPath(' , M \n 1 \t 2 ')).toEqual([
        { start: 3, op: 'M' },
        { start: 7, value: 1 },
        { start: 11, value: 2 },
      ]);
    });

    it('handles dense notation', () => {
      const tokens = tokenizeSvgPath('M.1.2L-3+4');

      expect(tokens).toEqual([
        { start: 0, op: 'M' },
        { start: 1, value: 0.1 },
        { start: 3, value: 0.2 },
        { start: 5, op: 'L' },
        { start: 6, value: -3 },
        { start: 8, value: 4 },
      ]);
    });

    it('throws for invalid commands', () => {
      expect(() => tokenizeSvgPath('M 1 x 2')).toThrowError(
        "Unexpected character: 'x' at position 4",
      );
      expect(() => tokenizeSvgPath('M1?2')).toThrowError("Unexpected character: '?' at position 2");
    });
  });

  describe('parseSvgPath', () => {
    it('returns empty list of commands', () => {
      expect(parseSvgPath('')).toEqual([]);
      expect(parseSvgPath(' ')).toEqual([]);
      expect(parseSvgPath(' , , \t  , \n , ')).toEqual([]);
    });

    it('returns commands for M', () => {
      const commands = parseSvgPath('M 1 2 3 4 5 6');

      expect(commands).toEqual([
        { op: 'M', params: [1, 2] },
        { op: 'L', params: [3, 4] },
        { op: 'L', params: [5, 6] },
      ]);
    });

    it('returns commands for m', () => {
      const commands = parseSvgPath('m 1 2 3 4 5 6');

      expect(commands).toEqual([
        { op: 'm', params: [1, 2] },
        { op: 'l', params: [3, 4] },
        { op: 'l', params: [5, 6] },
      ]);
    });

    it('returns commands for C', () => {
      const commands = parseSvgPath('C 1 2 3 4 5 6 7 8 9 10 11 12');

      expect(commands).toEqual([
        { op: 'C', params: [1, 2, 3, 4, 5, 6] },
        { op: 'C', params: [7, 8, 9, 10, 11, 12] },
      ]);
    });

    it('returns commands for c', () => {
      const commands = parseSvgPath('c 1 2 3 4 5 6 7 8 9 10 11 12');

      expect(commands).toEqual([
        { op: 'c', params: [1, 2, 3, 4, 5, 6] },
        { op: 'c', params: [7, 8, 9, 10, 11, 12] },
      ]);
    });

    it('returns commands for Z and z', () => {
      expect(parseSvgPath('Z')).toEqual([{ op: 'Z' }]);
      expect(parseSvgPath('z')).toEqual([{ op: 'z' }]);
    });

    it('returns commands for a sequence of ops', () => {
      const commands = parseSvgPath('M 1 2 L 3 4 S 5 6 7 8 Z');

      expect(commands).toEqual([
        { op: 'M', params: [1, 2] },
        { op: 'L', params: [3, 4] },
        { op: 'S', params: [5, 6, 7, 8] },
        { op: 'Z' },
      ]);
    });

    it('throws for unexpected parameters', () => {
      expect(() => parseSvgPath('M 1 2 3')).toThrowError('Expected parameter at end');
      expect(() => parseSvgPath('M 1 2 3 L 4 5')).toThrowError('Expected parameter at position 8');
    });
  });

  describe('svgPathToPdfOps', () => {
    const pdfOps = (path: string) => svgPathToPdfOps(parseSvgPath(path)).map(String);

    it('creates ops for M', () => {
      expect(pdfOps('M 1 2')).toEqual(['1 2 m']);
    });

    it('creates ops for m', () => {
      expect(pdfOps('m 1 2')).toEqual(['1 2 m']);
      expect(pdfOps('M 1 2 m 3 4')).toEqual(['1 2 m', '4 6 m']);
    });

    it('creates ops for L', () => {
      expect(pdfOps('L 1 2')).toEqual(['1 2 l']);
    });

    it('creates ops for l', () => {
      expect(pdfOps('l 1 2')).toEqual(['1 2 l']);
      expect(pdfOps('M 1 2 l 3 4')).toEqual(['1 2 m', '4 6 l']);
    });

    it('creates ops for H', () => {
      expect(pdfOps('H 1')).toEqual(['1 0 l']);
      expect(pdfOps('M 1 2 H 3')).toEqual(['1 2 m', '3 2 l']);
    });

    it('creates ops for h', () => {
      expect(pdfOps('h 1')).toEqual(['1 0 l']);
      expect(pdfOps('M 1 2 h 3')).toEqual(['1 2 m', '4 2 l']);
    });

    it('creates ops for V', () => {
      expect(pdfOps('V 1')).toEqual(['0 1 l']);
      expect(pdfOps('M 1 2 V 3')).toEqual(['1 2 m', '1 3 l']);
    });

    it('creates ops for v', () => {
      expect(pdfOps('v 1')).toEqual(['0 1 l']);
      expect(pdfOps('M 1 2 v 3')).toEqual(['1 2 m', '1 5 l']);
    });

    it('creates ops for C', () => {
      expect(pdfOps('C 1 2 3 4 5 6')).toEqual(['1 2 3 4 5 6 c']);
    });

    it('creates ops for c', () => {
      expect(pdfOps('c 1 2 3 4 5 6')).toEqual(['1 2 3 4 5 6 c']);
      expect(pdfOps('M 1 2 c 3 4 5 6 7 8')).toEqual(['1 2 m', '4 6 6 8 8 10 c']);
      expect(pdfOps('C 1 2 3 4 5 6 c 7 8 9 10 11 12')).toEqual([
        '1 2 3 4 5 6 c',
        '12 14 14 16 16 18 c',
      ]);
    });

    it('creates ops for S', () => {
      expect(pdfOps('S 1 2 3 4')).toEqual(['0 0 1 2 3 4 c']);
      expect(pdfOps('M 1 2 S 3 4 5 6')).toEqual(['1 2 m', '1 2 3 4 5 6 c']);
      expect(pdfOps('S 1 2 3 4 S 5 6 7 8')).toEqual(['0 0 1 2 3 4 c', '5 6 5 6 7 8 c']);
    });

    it('creates ops for s', () => {
      expect(pdfOps('s 1 2 3 4')).toEqual(['0 0 1 2 3 4 c']);
      expect(pdfOps('M 1 2 s 3 4 5 6')).toEqual(['1 2 m', '1 2 4 6 6 8 c']);
      expect(pdfOps('S 1 2 3 4 s 5 6 7 8')).toEqual(['0 0 1 2 3 4 c', '5 6 8 10 10 12 c']);
    });

    it('creates ops for Q', () => {
      expect(pdfOps('Q 1 2 3 4')).toEqual(['1 2 3 4 v']);
    });

    it('creates ops for q', () => {
      expect(pdfOps('q 1 2 3 4')).toEqual(['1 2 3 4 v']);
      expect(pdfOps('M 1 2 q 3 4 5 6')).toEqual(['1 2 m', '4 6 6 8 v']);
      expect(pdfOps('Q 1 2 3 4 q 5 6 7 8')).toEqual(['1 2 3 4 v', '8 10 10 12 v']);
    });

    it('creates ops for T', () => {
      expect(pdfOps('T 1 2')).toEqual(['0 0 1 2 v']);
      expect(pdfOps('M 1 2 T 3 4')).toEqual(['1 2 m', '1 2 3 4 v']);
      expect(pdfOps('T 1 2 T 3 4')).toEqual(['0 0 1 2 v', '2 4 3 4 v']);
    });

    it('creates ops for t', () => {
      expect(pdfOps('t 1 2')).toEqual(['0 0 1 2 v']);
      expect(pdfOps('M 1 2 t 3 4')).toEqual(['1 2 m', '1 2 4 6 v']);
      expect(pdfOps('T 1 2 t 3 4')).toEqual(['0 0 1 2 v', '2 4 4 6 v']);
    });

    it('creates ops for A', () => {
      expect(pdfOps('A 1 2 0 0 1 3 4').map((s) => s.replace(/\.\d+/g, ''))).toEqual([
        '0 -1 1 -2 2 -1 c',
        '3 0 3 2 3 4 c',
      ]);
    });

    it('creates ops for a', () => {
      expect(pdfOps('a 1 2 0 0 1 3 4').map((s) => s.replace(/\.\d+/g, ''))).toEqual([
        '0 -1 1 -2 2 -1 c',
        '3 0 3 2 3 4 c',
      ]);
      expect(pdfOps('M 1 2 a 3 4 0 0 1 5 6').map((s) => s.replace(/\.\d+/g, ''))).toEqual([
        '1 2 m',
        '2 0 4 0 5 1 c',
        '7 3 7 6 6 8 c',
      ]);
    });

    it('creates ops for Z', () => {
      expect(pdfOps('Z')).toEqual(['h']);
    });

    it('creates ops for z', () => {
      expect(pdfOps('z')).toEqual(['h']);
    });
  });
});
