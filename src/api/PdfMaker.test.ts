import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { PdfMaker } from './PdfMaker.ts';

describe('makePdf', () => {
  let pdfMaker: PdfMaker;

  beforeEach(async () => {
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
});
