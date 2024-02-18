import { beforeEach, describe, expect, it } from '@jest/globals';

import { PageInfo, readDocumentDefinition } from './read-document.js';

describe('read-document', () => {
  describe('readDocumentDefinition', () => {
    let input: any;

    beforeEach(() => {
      input = { content: [] };
    });

    it('accepts object with empty content', () => {
      expect(readDocumentDefinition(input)).toEqual({ content: [] });
    });

    it('accepts standard info attributes', () => {
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

    it('accepts custom info attributes', () => {
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
        expect(() => readDocumentDefinition({ ...input, info: { [name]: 23 } })).toThrowError(
          `Invalid value for "info/${name}": Expected string`,
        );
      });
    });

    it('checks info/keywords', () => {
      expect(() => readDocumentDefinition({ ...input, info: { keywords: 23 } })).toThrowError(
        'Invalid value for "info/keywords": Expected array',
      );
      expect(() => readDocumentDefinition({ ...input, info: { keywords: [23] } })).toThrowError(
        'Invalid value for "info/keywords/0": Expected string, got: 23',
      );
    });

    it('checks info/creationDate', () => {
      expect(() => readDocumentDefinition({ ...input, info: { creationDate: 23 } })).toThrowError(
        'Invalid value for "info/creationDate": Expected Date',
      );
    });

    it('checks margin', () => {
      const margin = 'foo';

      expect(() => readDocumentDefinition({ ...input, margin })).toThrowError(
        'Invalid value for "margin":',
      );
    });

    it('checks defaultStyle', () => {
      const defaultStyle = { fontSize: -1 };

      expect(() => readDocumentDefinition({ ...input, defaultStyle })).toThrowError(
        'Invalid value for "defaultStyle/fontSize":',
      );
    });

    it('checks content', () => {
      const content = 'foo';

      expect(() => readDocumentDefinition({ ...input, content })).toThrowError(
        'Invalid value for "content":',
      );
    });

    it('checks content blocks', () => {
      const content = [{ text: 'foo' }, { text: 23 }];

      expect(() => readDocumentDefinition({ ...input, content })).toThrowError(
        'Invalid value for "content/1/text": Expected string',
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

      expect(() => readDocumentDefinition({ ...input, customData })).toThrowError(
        'Invalid value for "customData/bar": Expected string or Uint8Array, got: 23',
      );
    });
  });
});
