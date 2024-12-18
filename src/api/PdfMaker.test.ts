import { before } from 'node:test';

import { describe, expect, it } from 'vitest';

import { PdfMaker } from './PdfMaker.ts';

describe('makePdf', () => {
  let pdfMaker: PdfMaker;

  before(() => {
    pdfMaker = new PdfMaker();
  });

  it('creates data that starts with a PDF 1.7 header', async () => {
    const pdf = await pdfMaker.makePdf({ content: [{}] });

    const string = Buffer.from(pdf.buffer).toString();
    expect(string).toMatch(/^%PDF-1.7\n/);
  });

  it('creates data that ends with a single newline', async () => {
    const pdf = await pdfMaker.makePdf({ content: [{}] });

    const string = Buffer.from(pdf.buffer).toString();
    expect(string).toMatch(/[^\n]\n$/);
  });

  it('includes a trailer ID in the document', async () => {
    const pdf = await pdfMaker.makePdf({ content: [{}] });

    const string = Buffer.from(pdf.buffer).toString();
    expect(string).toMatch(/\/ID \[ <[0-9A-F]{64}> <[0-9A-F]{64}> \]/);
  });
});
