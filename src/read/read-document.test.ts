import { beforeEach, describe, expect, it } from 'vitest';

import type { PageInfo } from './read-document.ts';
import { readDocumentDefinition } from './read-document.ts';

describe('readDocumentDefinition', () => {
  let input: any;

  beforeEach(() => {
    input = { content: [] };
  });

  it('accepts object with empty content', () => {
    expect(readDocumentDefinition(input)).toEqual({ content: [] });
  });

  it('accepts standard info properties', () => {
    input.info = {
      title: 'test-title',
      subject: 'test-subject',
      keywords: ['foo', 'bar'],
      author: 'test-author',
      creationDate: new Date(23),
      creator: 'test-creator',
      producer: 'test-producer',
    };

    const def = readDocumentDefinition(input);

    expect(def.info).toEqual(input.info);
  });

  it('accepts custom info properties', () => {
    input.info = {
      title: 'test-title',
      foo: 'test-foo',
      bar: 'test-bar',
    };

    const def = readDocumentDefinition(input);

    expect(def.info).toEqual({
      title: 'test-title',
      custom: { foo: 'test-foo', bar: 'test-bar' },
    });
  });

  ['title', 'subject', 'author', 'creator', 'producer', 'custom'].forEach((name) => {
    it(`checks info/${name}`, () => {
      expect(() => readDocumentDefinition({ ...input, info: { [name]: 23 } })).toThrow(
        new TypeError(`Invalid value for "info/${name}": Expected string, got: 23`),
      );
    });
  });

  it('checks info/keywords', () => {
    expect(() => readDocumentDefinition({ ...input, info: { keywords: 23 } })).toThrow(
      new TypeError('Invalid value for "info/keywords": Expected array, got: 23'),
    );
    expect(() => readDocumentDefinition({ ...input, info: { keywords: [23] } })).toThrow(
      new TypeError('Invalid value for "info/keywords/0": Expected string, got: 23'),
    );
  });

  it('checks info/creationDate', () => {
    expect(() => readDocumentDefinition({ ...input, info: { creationDate: 23 } })).toThrow(
      new TypeError('Invalid value for "info/creationDate": Expected Date, got: 23'),
    );
  });

  it('checks margin', () => {
    const margin = 'foo';

    expect(() => readDocumentDefinition({ ...input, margin })).toThrow(
      new TypeError('Invalid value for "margin": Expected number or length string, got: \'foo\''),
    );
  });

  it('checks defaultStyle', () => {
    const defaultStyle = { fontSize: -1 };

    expect(() => readDocumentDefinition({ ...input, defaultStyle })).toThrow(
      new TypeError('Invalid value for "defaultStyle/fontSize": Expected number >= 0, got: -1'),
    );
  });

  it('checks content', () => {
    const content = 'foo';

    expect(() => readDocumentDefinition({ ...input, content })).toThrow(
      new TypeError('Invalid value for "content": Expected array, got: \'foo\''),
    );
  });

  it('checks content blocks', () => {
    const content = [{ text: 'foo' }, { text: 23 }];

    expect(() => readDocumentDefinition({ ...input, content })).toThrow(
      new TypeError(
        'Invalid value for "content/1/text": Expected string, object with text property, or array of text, got: 23',
      ),
    );
  });

  it(`includes defaultStyle in content`, () => {
    const defaultStyle = { fontSize: 23 };
    const content = [{ text: 'foo' }];

    const def = readDocumentDefinition({ ...input, defaultStyle, content });

    expect(def.content).toEqual([
      {
        text: [{ text: 'foo', attrs: { fontSize: 23 } }],
      },
    ]);
  });

  it(`includes onRenderDocument hook`, () => {
    const onRenderDocument = () => {};
    const def = readDocumentDefinition({ ...input, onRenderDocument });

    expect(def.onRenderDocument).toBe(onRenderDocument);
  });

  (['header', 'footer'] as const).forEach((name) => {
    it(`supports dynamic ${name}`, () => {
      const defaultStyle = { fontSize: 23 };
      const fn = ({ pageNumber }: PageInfo) => ({ text: `Page ${pageNumber}` });

      const def = readDocumentDefinition({ ...input, defaultStyle, [name]: fn });

      expect(def[name]?.({ pageNumber: 1, pageCount: 2 } as PageInfo)).toEqual({
        text: [{ text: 'Page 1', attrs: { fontSize: 23 } }],
      });
    });
  });

  it('accepts customData', () => {
    const customData = { foo: 'abc', bar: Uint8Array.of(1, 2, 3) };

    const def = readDocumentDefinition({ ...input, customData });

    expect(def.customData).toEqual(def.customData);
  });

  it('checks customData', () => {
    const customData = { foo: 'abc', bar: 23 };

    expect(() => readDocumentDefinition({ ...input, customData })).toThrow(
      new TypeError('Invalid value for "customData/bar": Expected string or Uint8Array, got: 23'),
    );
  });

  it('accepts language', () => {
    const def = readDocumentDefinition({ ...input, language: 'de' });

    expect(def.language).toBe('de');
  });

  it('flows language into defaultStyle', () => {
    const content = [{ text: 'foo' }];
    const def = readDocumentDefinition({ ...input, language: 'de', content });

    expect(def.content).toEqual([{ text: [{ text: 'foo', attrs: { language: 'de' } }] }]);
  });

  it('does not override language in defaultStyle', () => {
    const content = [{ text: 'foo' }];
    const defaultStyle = { language: 'fr' };
    const def = readDocumentDefinition({ ...input, language: 'de', defaultStyle, content });

    expect(def.content).toEqual([{ text: [{ text: 'foo', attrs: { language: 'fr' } }] }]);
  });

  it('checks language type', () => {
    expect(() => readDocumentDefinition({ ...input, language: 23 })).toThrow(
      new TypeError('Invalid value for "language": Expected string, got: 23'),
    );
  });

  it('rejects invalid language format', () => {
    expect(() => readDocumentDefinition({ ...input, language: '123' })).toThrow(
      new TypeError(
        'Invalid value for "language": Expected string matching pattern /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/, got: \'123\'',
      ),
    );
  });

  describe('outputIntents', () => {
    it('accepts valid output intent', () => {
      const iccProfile = mkIccProfile('RGB ');
      const outputIntents = [
        {
          subtype: 'GTS_PDFA1',
          outputConditionIdentifier: 'sRGB IEC61966-2.1',
          iccProfile,
          outputCondition: 'sRGB',
          registryName: 'http://www.color.org',
          info: 'sRGB IEC61966-2.1',
        },
      ];

      const def = readDocumentDefinition({ ...input, outputIntents });

      expect(def.outputIntents).toEqual(outputIntents);
    });

    it('accepts output intent with only required fields', () => {
      const iccProfile = mkIccProfile('RGB ');
      const outputIntents = [
        { subtype: 'GTS_PDFA1', outputConditionIdentifier: 'sRGB', iccProfile },
      ];

      const def = readDocumentDefinition({ ...input, outputIntents });

      expect(def.outputIntents).toEqual(outputIntents);
    });

    it('checks subtype is required', () => {
      const outputIntents = [{ outputConditionIdentifier: 'sRGB', iccProfile: mkIccProfile() }];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Missing value for "subtype"/,
      );
    });

    it('checks outputConditionIdentifier is required', () => {
      const outputIntents = [{ subtype: 'GTS_PDFA1', iccProfile: mkIccProfile() }];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Missing value for "outputConditionIdentifier"/,
      );
    });

    it('checks iccProfile is required', () => {
      const outputIntents = [{ subtype: 'GTS_PDFA1', outputConditionIdentifier: 'sRGB' }];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Missing value for "iccProfile"/,
      );
    });

    it('rejects non-Uint8Array iccProfile', () => {
      const outputIntents = [
        { subtype: 'GTS_PDFA1', outputConditionIdentifier: 'sRGB', iccProfile: 'not-bytes' },
      ];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Invalid value for "outputIntents\/0\/iccProfile": Expected Uint8Array/,
      );
    });

    it('rejects ICC profile that is too short', () => {
      const outputIntents = [
        {
          subtype: 'GTS_PDFA1',
          outputConditionIdentifier: 'sRGB',
          iccProfile: new Uint8Array(10),
        },
      ];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Invalid value for "outputIntents\/0\/iccProfile": ICC profile is too short/,
      );
    });

    it('rejects ICC profile with invalid signature', () => {
      const iccProfile = new Uint8Array(128);
      const outputIntents = [
        { subtype: 'GTS_PDFA1', outputConditionIdentifier: 'sRGB', iccProfile },
      ];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Invalid value for "outputIntents\/0\/iccProfile": Invalid ICC profile: expected signature 'acsp'/,
      );
    });

    it('rejects ICC profile with unsupported color space', () => {
      const iccProfile = mkIccProfile('Lab ');
      const outputIntents = [
        { subtype: 'GTS_PDFA1', outputConditionIdentifier: 'sRGB', iccProfile },
      ];

      expect(() => readDocumentDefinition({ ...input, outputIntents })).toThrow(
        /Invalid value for "outputIntents\/0\/iccProfile": Unsupported ICC profile color space 'Lab'/,
      );
    });
  });
});

function mkIccProfile(colorSpace = 'RGB '): Uint8Array {
  const data = new Uint8Array(128);
  // color space signature at offset 16
  data[16] = colorSpace.charCodeAt(0);
  data[17] = colorSpace.charCodeAt(1);
  data[18] = colorSpace.charCodeAt(2);
  data[19] = colorSpace.charCodeAt(3);
  // 'acsp' signature at offset 36
  data[36] = 0x61; // a
  data[37] = 0x63; // c
  data[38] = 0x73; // s
  data[39] = 0x70; // p
  return data;
}
