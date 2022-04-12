import { describe, expect, it } from '@jest/globals';
import { PDFDict, PDFHexString, PDFName, PDFString } from 'pdf-lib';

import { createDocument, parseInfo } from '../src/document.js';

describe('document', () => {
  describe('parseInfo', () => {
    it('accepts empty object', () => {
      expect(parseInfo({})).toEqual({});
    });

    it('accepts standard attributes', () => {
      const input = {
        title: 'test-title',
        subject: 'test-subject',
        keywords: ['foo', 'bar'],
        author: 'test-author',
        creationDate: new Date(23),
        creator: 'test-creator',
        producer: 'test-producer',
      };

      expect(parseInfo(input)).toEqual(input);
    });

    it('accepts custom attributes', () => {
      const input = {
        title: 'test-title',
        foo: 'test-foo',
        bar: 'test-bar',
      };

      expect(parseInfo(input)).toEqual({
        title: 'test-title',
        custom: {
          foo: 'test-foo',
          bar: 'test-bar',
        },
      });
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

    it('checks custom attr', () => {
      expect(() => parseInfo({ custom: 23 })).toThrowError(
        'Invalid value for "custom": Expected string'
      );
    });
  });

  describe('createDocument', () => {
    it('renders all info attributes', async () => {
      const def = {
        info: {
          title: 'test-title',
          subject: 'test-subject',
          keywords: ['foo', 'bar'],
          author: 'test-author',
          creationDate: new Date(23),
          creator: 'test-creator',
          producer: 'test-producer',
          custom1: 'foo',
          custom2: 'bar',
        },
      };

      const doc = await createDocument(def);

      const infoDict = doc.context.lookup(doc.context.trailerInfo.Info) as PDFDict;
      const getInfo = (name) => infoDict.get(PDFName.of(name));
      expect(infoDict).toBeInstanceOf(PDFDict);
      expect(getInfo('Title')).toEqual(PDFHexString.fromText('test-title'));
      expect(getInfo('Subject')).toEqual(PDFHexString.fromText('test-subject'));
      expect(getInfo('Keywords')).toEqual(PDFHexString.fromText('foo bar'));
      expect(getInfo('Author')).toEqual(PDFHexString.fromText('test-author'));
      expect(getInfo('Producer')).toEqual(PDFHexString.fromText('test-producer'));
      expect(getInfo('Creator')).toEqual(PDFHexString.fromText('test-creator'));
      expect(getInfo('CreationDate')).toEqual(PDFString.fromDate(new Date(23)));
      expect(getInfo('custom1')).toEqual(PDFHexString.fromText('foo'));
      expect(getInfo('custom2')).toEqual(PDFHexString.fromText('bar'));
    });
  });
});
