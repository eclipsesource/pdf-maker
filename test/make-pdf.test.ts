import { describe, expect, it } from '@jest/globals';

import { makePdf } from '../src/make-pdf.js';

describe('make-pdf', () => {
  describe('makePdf', () => {
    it('creates data that starts with a PDF 1.7 header', async () => {
      const pdf = await makePdf({ content: [{}] });

      const string = Buffer.from(pdf.buffer).toString();
      expect(string).toMatch(/^%PDF-1.7\n/);
    });

    it('creates data that ends with a single newline', async () => {
      const pdf = await makePdf({ content: [{}] });

      const string = Buffer.from(pdf.buffer).toString();
      expect(string).toMatch(/[^\n]\n$/);
    });
  });
});
