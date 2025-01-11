import type { PDFArray, PDFStream } from 'pdf-lib';
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { renderDocument } from './render-document.ts';

describe('renderDocument', () => {
  it('renders all info properties', async () => {
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

    const pdfData = await renderDocument(def, []);

    const pdfDoc = await PDFDocument.load(pdfData, { updateMetadata: false });
    const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info) as PDFDict;
    const getInfo = (name: string) => infoDict.get(PDFName.of(name));
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

  it('generates file ID', async () => {
    const def = { content: [] };

    const pdfData = await renderDocument(def, []);

    const pdfDoc = await PDFDocument.load(pdfData, { updateMetadata: false });
    const fileId = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.ID) as PDFArray;
    expect(fileId.size()).toBe(2);
    expect(fileId.get(0).toString()).toMatch(/^<[0-9A-F]{64}>$/);
    expect(fileId.get(1).toString()).toMatch(/^<[0-9A-F]{64}>$/);
  });

  it('renders custom data', async () => {
    const def = {
      content: [],
      customData: {
        XXFoo: 'Foo',
        XXBar: Uint8Array.of(1, 2, 3),
      },
    };

    const pdfData = await renderDocument(def, []);

    const pdfDoc = await PDFDocument.load(pdfData, { updateMetadata: false });
    const lookup = (name: string) => pdfDoc.catalog.lookup(PDFName.of(name)) as PDFStream;
    expect(lookup('XXFoo').getContentsString()).toBe('Foo');
    expect(lookup('XXBar').getContents()).toEqual(Uint8Array.of(1, 2, 3));
  });

  it('calls custom render hook', async () => {
    const def = {
      content: [],
      onRenderDocument: (pdfDoc: PDFDocument) => {
        pdfDoc.setTitle('Test Title');
      },
    };

    const pdfData = await renderDocument(def, []);

    const pdfDoc = await PDFDocument.load(pdfData, { updateMetadata: false });
    const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info) as PDFDict;
    const getInfo = (name: string) => infoDict.get(PDFName.of(name));
    expect(getInfo('Title')).toEqual(PDFHexString.fromText('Test Title'));
  });
});
