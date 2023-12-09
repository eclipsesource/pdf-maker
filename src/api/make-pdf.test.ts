import crypto from 'node:crypto';

import { describe, expect, it } from '@jest/globals';

import { makePdf } from './make-pdf.js';

global.crypto ??= (crypto as any).webcrypto;

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

    it('includes a trailer ID in the document', async () => {
      const pdf = await makePdf({ content: [{}] });

      const string = Buffer.from(pdf.buffer).toString();
      expect(string).toMatch(/\/ID \[ <[0-9A-F]{64}> <[0-9A-F]{64}> \]/);
    });
  });
});
