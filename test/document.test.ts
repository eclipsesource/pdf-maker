import { describe, expect, it } from '@jest/globals';
import { PDFDict, PDFHexString, PDFName, PDFStream, PDFString } from 'pdf-lib';

import { createDocument } from '../src/document.js';

describe('document', () => {
  describe('createDocument', () => {
    it('renders all info attributes', async () => {
      const def = {
        content: [],
        info: {
          title: 'test-title',
          subject: 'test-subject',
          keywords: ['foo', 'bar'],
          author: 'test-author',
          creationDate: new Date(23),
          creator: 'test-creator',
          producer: 'test-producer',
          custom: {
            foo: 'foo-value',
            bar: 'bar-value',
          },
        },
      };

      const doc = await createDocument(def);

      const infoDict = doc.pdfDoc.context.lookup(doc.pdfDoc.context.trailerInfo.Info) as PDFDict;
      const getInfo = (name) => infoDict.get(PDFName.of(name));
      expect(infoDict).toBeInstanceOf(PDFDict);
      expect(getInfo('Title')).toEqual(PDFHexString.fromText('test-title'));
      expect(getInfo('Subject')).toEqual(PDFHexString.fromText('test-subject'));
      expect(getInfo('Keywords')).toEqual(PDFHexString.fromText('foo bar'));
      expect(getInfo('Author')).toEqual(PDFHexString.fromText('test-author'));
      expect(getInfo('Producer')).toEqual(PDFHexString.fromText('test-producer'));
      expect(getInfo('Creator')).toEqual(PDFHexString.fromText('test-creator'));
      expect(getInfo('CreationDate')).toEqual(PDFString.fromDate(new Date(23)));
      expect(getInfo('foo')).toEqual(PDFHexString.fromText('foo-value'));
      expect(getInfo('bar')).toEqual(PDFHexString.fromText('bar-value'));
    });

    it('renders custom data', async () => {
      const def = {
        content: [],
        customData: {
          XXFoo: 'Foo',
          XXBar: Uint8Array.of(1, 2, 3),
        },
      };

      const doc = await createDocument(def);

      const lookup = (name: string) => doc.pdfDoc.catalog.lookup(PDFName.of(name)) as PDFStream;
      expect(lookup('XXFoo').getContentsString()).toBe('Foo');
      expect(lookup('XXBar').getContents()).toEqual(Uint8Array.of(1, 2, 3));
    });
  });
});
