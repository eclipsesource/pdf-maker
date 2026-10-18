import { describe, expect, it } from 'vitest';

import { findLineBreaks, getLineBreakClass } from './line-break.ts';

describe('line-break', () => {
  describe('getLineBreakClass', () => {
    it('returns class for special characters', () => {
      expect(classes('\n \t\u200b\u2060\u00a0\u2011-\u00ad\u2013\u2014')).toEqual([
        'BK',
        'SP',
        'SP',
        'ZW',
        'WJ',
        'GL',
        'GL',
        'HY',
        'BA',
        'BA',
        'B2',
      ]);
    });

    it('returns NU for digits and AL for other characters', () => {
      expect(classes('a1\u00c4\u4e2d')).toEqual(['AL', 'NU', 'AL', 'AL']);
    });
  });

  describe('findLineBreaks', () => {
    it('returns no breaks for empty text and single words', () => {
      expect(breaks('')).toEqual([]);
      expect(breaks('foo')).toEqual([]);
    });

    it('allows breaks after spaces', () => {
      expect(breaks('foo bar  baz')).toEqual([
        [4, 'allowed'],
        [9, 'allowed'],
      ]);
    });

    it('requires breaks after newlines', () => {
      expect(breaks('foo\nbar')).toEqual([[4, 'mandatory']]);
    });

    it('allows breaks after hyphens and dashes', () => {
      expect(breaks('a-b\u2013c\u2014d')).toEqual([
        [2, 'allowed'],
        [4, 'allowed'],
        [6, 'allowed'],
      ]);
    });

    it('does not allow breaks before hyphens', () => {
      expect(breaks('a--b')).toEqual([[3, 'allowed']]);
    });

    it('does not allow break after word-initial hyphen', () => {
      expect(breaks('-a')).toEqual([]);
      expect(breaks('a -b')).toEqual([[2, 'allowed']]);
    });

    it('does not allow break between hyphen and digit', () => {
      expect(breaks('a-1')).toEqual([]);
    });

    it('does not allow break between em dashes', () => {
      expect(breaks('a\u2014\u2014b')).toEqual([[3, 'allowed']]);
    });

    it('allows break after soft hyphen and zero-width space', () => {
      expect(breaks('a\u00adb\u200bc')).toEqual([
        [2, 'allowed'],
        [4, 'allowed'],
      ]);
    });

    it('allows break after zero-width space followed by spaces', () => {
      expect(breaks('a\u200b b')).toEqual([[3, 'allowed']]);
    });

    it('does not allow breaks around no-break characters', () => {
      expect(breaks('a\u00a0b\u2011c\u2060d')).toEqual([]);
    });

    it('allows break before no-break space after space or hyphen', () => {
      expect(breaks('a \u00a0b')).toEqual([[2, 'allowed']]);
      expect(breaks('a-\u00a0b')).toEqual([[2, 'allowed']]);
    });
  });
});

function classes(text: string) {
  return [...text].map((char) => getLineBreakClass(char.codePointAt(0)!));
}

function breaks(text: string) {
  return [...findLineBreaks(text)];
}
