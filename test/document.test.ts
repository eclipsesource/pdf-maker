import { describe, expect, it } from '@jest/globals';

import { parseInfo } from '../src/document.js';

describe('document', () => {
  describe('parseInfo', () => {
    it('accepts empty object', () => {
      expect(parseInfo({})).toEqual({});
    });

    it('accepts all attributes', () => {
      const input = {
        title: 'foo',
        subject: 'foo',
        keywords: ['foo', 'bar'],
        author: 'foo',
        creationDate: new Date(23),
        creator: 'foo',
        producer: 'foo',
      };

      expect(parseInfo(input)).toEqual(input);
    });

    it('checks title', () => {
      expect(() => parseInfo({ title: 23 })).toThrowError(
        'Invalid value for "title": Expected string'
      );
    });

    it('checks subject', () => {
      expect(() => parseInfo({ subject: 23 })).toThrowError(
        'Invalid value for "subject": Expected string'
      );
    });

    it('checks keywords', () => {
      expect(() => parseInfo({ keywords: 23 })).toThrowError(
        'Invalid value for "keywords": Expected array'
      );
      expect(() => parseInfo({ keywords: [23] })).toThrowError(
        'Invalid value for "keywords": Invalid value for "element 1": Expected string, got: 23'
      );
    });

    it('checks author', () => {
      expect(() => parseInfo({ author: 23 })).toThrowError(
        'Invalid value for "author": Expected string'
      );
    });

    it('checks creationDate', () => {
      expect(() => parseInfo({ creationDate: 23 })).toThrowError(
        'Invalid value for "creationDate": Expected Date'
      );
    });

    it('checks creator', () => {
      expect(() => parseInfo({ creator: 23 })).toThrowError(
        'Invalid value for "creator": Expected string'
      );
    });

    it('checks producer', () => {
      expect(() => parseInfo({ producer: 23 })).toThrowError(
        'Invalid value for "producer": Expected string'
      );
    });
  });
});
