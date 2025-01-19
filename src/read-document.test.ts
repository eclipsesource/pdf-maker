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
});
