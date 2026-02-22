import { describe, expect, it } from 'vitest';

import { detectScript, scriptToOpenTypeTag, segmentByScript } from './script-detection.ts';

describe('script-detection', () => {
  describe('detectScript', () => {
    it('returns Latin for ASCII letters', () => {
      expect(detectScript(0x41)).toBe('Latin'); // A
      expect(detectScript(0x5a)).toBe('Latin'); // Z
      expect(detectScript(0x61)).toBe('Latin'); // a
      expect(detectScript(0x7a)).toBe('Latin'); // z
    });

    it('returns Common for ASCII digits', () => {
      expect(detectScript(0x30)).toBe('Common'); // 0
      expect(detectScript(0x39)).toBe('Common'); // 9
    });

    it('returns Common for space and punctuation', () => {
      expect(detectScript(0x20)).toBe('Common'); // space
      expect(detectScript(0x2c)).toBe('Common'); // comma
      expect(detectScript(0x2e)).toBe('Common'); // period
      expect(detectScript(0x21)).toBe('Common'); // !
    });

    it('returns Latin for extended Latin characters', () => {
      expect(detectScript(0x00c0)).toBe('Latin'); // À
      expect(detectScript(0x00e9)).toBe('Latin'); // é
      expect(detectScript(0x017e)).toBe('Latin'); // ž
    });

    it('returns Inherited for combining diacritical marks', () => {
      expect(detectScript(0x0300)).toBe('Inherited'); // combining grave accent
      expect(detectScript(0x0301)).toBe('Inherited'); // combining acute accent
      expect(detectScript(0x036f)).toBe('Inherited'); // last in range
    });

    it('returns Greek for Greek characters', () => {
      expect(detectScript(0x0391)).toBe('Greek'); // Α (Alpha)
      expect(detectScript(0x03c9)).toBe('Greek'); // ω (omega)
    });

    it('returns Cyrillic for Cyrillic characters', () => {
      expect(detectScript(0x0410)).toBe('Cyrillic'); // А
      expect(detectScript(0x044f)).toBe('Cyrillic'); // я
    });

    it('returns Hebrew for Hebrew characters', () => {
      expect(detectScript(0x05d0)).toBe('Hebrew'); // א (alef)
    });

    it('returns Arabic for Arabic characters', () => {
      expect(detectScript(0x0627)).toBe('Arabic'); // ا (alif)
      expect(detectScript(0x0645)).toBe('Arabic'); // م (meem)
    });

    it('returns Devanagari for Devanagari characters', () => {
      expect(detectScript(0x0915)).toBe('Devanagari'); // क
      expect(detectScript(0x0928)).toBe('Devanagari'); // न
    });

    it('returns Thai for Thai characters', () => {
      expect(detectScript(0x0e01)).toBe('Thai'); // ก
    });

    it('returns Han for CJK ideographs', () => {
      expect(detectScript(0x4e2d)).toBe('Han'); // 中
      expect(detectScript(0x6587)).toBe('Han'); // 文
    });

    it('returns Hiragana for Hiragana characters', () => {
      expect(detectScript(0x3042)).toBe('Hiragana'); // あ
    });

    it('returns Katakana for Katakana characters', () => {
      expect(detectScript(0x30a2)).toBe('Katakana'); // ア
    });

    it('returns Hangul for Hangul syllables', () => {
      expect(detectScript(0xac00)).toBe('Hangul'); // 가
    });

    it('returns Han for CJK Extension B (supplementary plane)', () => {
      expect(detectScript(0x20000)).toBe('Han');
    });

    it('returns Common for unmapped code points', () => {
      expect(detectScript(0x10ffff)).toBe('Common');
    });
  });

  describe('segmentByScript', () => {
    it('returns empty array for empty string', () => {
      expect(segmentByScript('')).toEqual([]);
    });

    it('returns single run for pure Latin text', () => {
      expect(segmentByScript('Hello')).toEqual([{ text: 'Hello', script: 'Latin' }]);
    });

    it('returns single run for Latin text with spaces', () => {
      expect(segmentByScript('Hello world')).toEqual([{ text: 'Hello world', script: 'Latin' }]);
    });

    it('resolves all-Common text to Common', () => {
      expect(segmentByScript('123 456')).toEqual([{ text: '123 456', script: 'Common' }]);
    });

    it('splits Latin and Cyrillic', () => {
      expect(segmentByScript('Hello Мир')).toEqual([
        { text: 'Hello ', script: 'Latin' },
        { text: 'Мир', script: 'Cyrillic' },
      ]);
    });

    it('resolves leading Common to first concrete script', () => {
      expect(segmentByScript('(Мир)')).toEqual([{ text: '(Мир)', script: 'Cyrillic' }]);
    });

    it('resolves trailing punctuation to preceding script', () => {
      expect(segmentByScript('Hello, Мир!')).toEqual([
        { text: 'Hello, ', script: 'Latin' },
        { text: 'Мир!', script: 'Cyrillic' },
      ]);
    });

    it('splits Latin and CJK', () => {
      expect(segmentByScript('abc中文def')).toEqual([
        { text: 'abc', script: 'Latin' },
        { text: '中文', script: 'Han' },
        { text: 'def', script: 'Latin' },
      ]);
    });

    it('handles Arabic text', () => {
      expect(segmentByScript('مرحبا')).toEqual([{ text: 'مرحبا', script: 'Arabic' }]);
    });

    it('handles Devanagari text', () => {
      expect(segmentByScript('नमस्ते')).toEqual([{ text: 'नमस्ते', script: 'Devanagari' }]);
    });

    it('keeps combining marks with base character', () => {
      // e + combining acute accent -> both Latin
      expect(segmentByScript('e\u0301')).toEqual([{ text: 'e\u0301', script: 'Latin' }]);
    });

    it('resolves combining marks to preceding script', () => {
      // Arabic letter + combining mark -> both Arabic
      expect(segmentByScript('\u0627\u0300')).toEqual([{ text: '\u0627\u0300', script: 'Arabic' }]);
    });

    it('handles three different scripts', () => {
      expect(segmentByScript('Hello Мир 中文')).toEqual([
        { text: 'Hello ', script: 'Latin' },
        { text: 'Мир ', script: 'Cyrillic' },
        { text: '中文', script: 'Han' },
      ]);
    });

    it('handles supplementary plane characters', () => {
      // CJK Extension B character (U+20000)
      expect(segmentByScript('\u{20000}')).toEqual([{ text: '\u{20000}', script: 'Han' }]);
    });
  });

  describe('scriptToOpenTypeTag', () => {
    it('maps Latin to latn', () => {
      expect(scriptToOpenTypeTag('Latin')).toBe('latn');
    });

    it('maps Cyrillic to cyrl', () => {
      expect(scriptToOpenTypeTag('Cyrillic')).toBe('cyrl');
    });

    it('maps Arabic to arab', () => {
      expect(scriptToOpenTypeTag('Arabic')).toBe('arab');
    });

    it('maps Devanagari to dev2', () => {
      expect(scriptToOpenTypeTag('Devanagari')).toBe('dev2');
    });

    it('maps Han to hani', () => {
      expect(scriptToOpenTypeTag('Han')).toBe('hani');
    });

    it('maps Hiragana to kana', () => {
      expect(scriptToOpenTypeTag('Hiragana')).toBe('kana');
    });

    it('maps Katakana to kana', () => {
      expect(scriptToOpenTypeTag('Katakana')).toBe('kana');
    });

    it('returns DFLT for Common', () => {
      expect(scriptToOpenTypeTag('Common')).toBe('DFLT');
    });

    it('returns DFLT for unknown scripts', () => {
      expect(scriptToOpenTypeTag('Unknown')).toBe('DFLT');
    });
  });
});
