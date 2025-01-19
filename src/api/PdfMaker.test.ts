import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { before } from 'node:test';

import { describe, expect, it, vi } from 'vitest';

import { image, text } from './layout.ts';
import { PdfMaker } from './PdfMaker.ts';

describe('makePdf', () => {
  let pdfMaker: PdfMaker;

  before(async () => {
    pdfMaker = new PdfMaker();
    pdfMaker.setResourceRoot(join(__dirname, '../test/resources'));
    const fontData = await readFile(
      join(__dirname, '../test/resources/fonts/roboto/Roboto-Regular.ttf'),
    );
    pdfMaker.registerFont(fontData);
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

  it('creates consistent results across runs', async () => {
    // ensure same timestamps in generated PDF
    vi.useFakeTimers();
    // include fonts and images to ensure they can be reused
    const content = [text('Test'), image('file:/torus.png')];

    const pdf1 = await pdfMaker.makePdf({ content });
    const pdf2 = await pdfMaker.makePdf({ content });

    const pdfStr1 = Buffer.from(pdf1.buffer).toString();
    const pdfStr2 = Buffer.from(pdf2.buffer).toString();
    expect(pdfStr1).toEqual(pdfStr2);
  });
});
