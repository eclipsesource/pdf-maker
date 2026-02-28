import { describe, expect, it } from 'vitest';

import { languageToOpenTypeTag } from './language-tags.gen.ts';

describe('languageToOpenTypeTag', () => {
  it('maps English to ENG', () => {
    expect(languageToOpenTypeTag('en')).toBe('ENG');
  });

  it('maps German to DEU', () => {
    expect(languageToOpenTypeTag('de')).toBe('DEU');
  });

  it('maps Arabic to ARA', () => {
    expect(languageToOpenTypeTag('ar')).toBe('ARA');
  });

  it('maps Urdu to URD', () => {
    expect(languageToOpenTypeTag('ur')).toBe('URD');
  });

  it('maps Chinese to ZHS', () => {
    expect(languageToOpenTypeTag('zh')).toBe('ZHS');
  });

  it('maps Norwegian (no) to NOR', () => {
    expect(languageToOpenTypeTag('no')).toBe('NOR');
  });

  it('maps Norwegian Bokmål (nb) to NOR', () => {
    expect(languageToOpenTypeTag('nb')).toBe('NOR');
  });

  it('maps Norwegian Nynorsk (nn) to NYN', () => {
    expect(languageToOpenTypeTag('nn')).toBe('NYN');
  });

  it('maps Quechua to QUZ', () => {
    expect(languageToOpenTypeTag('qu')).toBe('QUZ');
  });

  it('maps Malayalam to MAL', () => {
    expect(languageToOpenTypeTag('ml')).toBe('MAL');
  });

  it('maps Malay to MLY', () => {
    expect(languageToOpenTypeTag('ms')).toBe('MLY');
  });

  it('extracts primary subtag from BCP 47 tag', () => {
    expect(languageToOpenTypeTag('en-US')).toBe('ENG');
    expect(languageToOpenTypeTag('zh-Hans')).toBe('ZHS');
    expect(languageToOpenTypeTag('de-AT')).toBe('DEU');
  });

  it('is case-insensitive', () => {
    expect(languageToOpenTypeTag('EN')).toBe('ENG');
    expect(languageToOpenTypeTag('De')).toBe('DEU');
  });

  it('returns undefined for unknown languages', () => {
    expect(languageToOpenTypeTag('xx')).toBeUndefined();
  });
});
