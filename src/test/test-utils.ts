import type { PDFFont } from '@ralfstx/pdf-core';
import { PDFImage, PDFRef } from '@ralfstx/pdf-core';

import type { FontWeight } from '../api/text.ts';
import { weightToNumber } from '../fonts.ts';
import type { Frame } from '../frame.ts';
import type { Page } from '../page.ts';
import type { TextAttrs, TextSpan } from '../read/read-block.ts';
import { getGlyphRunText } from '../text.ts';

export function fakeFont(name: string, opts?: { style?: string; weight?: FontWeight }): PDFFont {
  const key = `${name}-${opts?.style ?? 'normal'}-${weightToNumber(opts?.weight ?? 'normal')}`;
  return fakePdfFont(key);
}

export function fakeImage(width: number, height: number): PDFImage {
  const data = createTestJpeg(width, height);
  return PDFImage.fromJpeg(data);
}

/**
 * Creates a minimal JPEG structure with the specified dimensions and
 * color components for testing header parsing. Note: This does not
 * include DHT (Huffman tables) or DQT (quantization tables), so it
 * cannot be decoded as an actual image.
 */
export function createTestJpeg(
  width: number,
  height: number,
  components: 1 | 3 | 4 = 3,
): Uint8Array {
  const bytes: number[] = [];

  // SOI (Start of Image)
  bytes.push(0xff, 0xd8);

  // APP0 (JFIF marker) - optional but common
  bytes.push(0xff, 0xe0); // APP0 marker
  bytes.push(0x00, 0x10); // Length (16 bytes)
  bytes.push(0x4a, 0x46, 0x49, 0x46, 0x00); // "JFIF\0"
  bytes.push(0x01, 0x01); // Version 1.1
  bytes.push(0x00); // Aspect ratio units (0 = no units)
  bytes.push(0x00, 0x01); // X density
  bytes.push(0x00, 0x01); // Y density
  bytes.push(0x00, 0x00); // Thumbnail dimensions

  // SOF0 (Start of Frame - Baseline DCT)
  bytes.push(0xff, 0xc0); // SOF0 marker
  const sofLength = 8 + components * 3;
  bytes.push((sofLength >> 8) & 0xff, sofLength & 0xff); // Length
  bytes.push(0x08); // Bits per component (8)
  bytes.push((height >> 8) & 0xff, height & 0xff); // Height
  bytes.push((width >> 8) & 0xff, width & 0xff); // Width
  bytes.push(components); // Number of components

  // Component specifications
  for (let i = 1; i <= components; i++) {
    bytes.push(i); // Component ID
    bytes.push(0x11); // Sampling factors (1x1)
    bytes.push(0x00); // Quantization table selector
  }

  // EOI (End of Image)
  bytes.push(0xff, 0xd9);

  return new Uint8Array(bytes);
}

/**
 * To ease calculations in tests, we use a fake font that always returns a width of
 * `fontSize * text.length`, so that at `fontSize = 10` a text with 5 chars will have
 * a length of `10 * 5 = 50`.
 * Likewise, the descent is set to amount to `0.2 * fontSize`.
 */
export function fakePdfFont(key: string): PDFFont {
  return {
    key,
    fontName: 'FakeFont:' + key,
    familyName: 'FakeFamily',
    style: 'normal',
    weight: 400,
    ascent: 800,
    descent: -200,
    lineGap: 0,
    shapeText: (text: string) =>
      [...text].map((c) => ({
        glyphId: c.charCodeAt(0),
        codePoints: [c.codePointAt(0)!],
        advance: 1000,
      })),
    register: () => PDFRef.of(23),
  };
}

export function extractTextRows(frame: Partial<Frame>) {
  const lines = [] as string[];
  frame.children?.forEach((child) => {
    extractTextRows(child).forEach((line) => lines.push(line));
  });
  frame.objects?.forEach((obj) => {
    if (obj.type === 'text') {
      obj.rows.forEach((row) => {
        lines.push(row.segments.map((s) => getGlyphRunText(s.glyphs)).join(', '));
      });
    }
  });
  return lines;
}

export function span(text: string, attrs?: TextAttrs): TextSpan {
  return { text, attrs: { fontSize: 10, ...attrs } };
}

export function range(n: number): number[] {
  return [...Array(n).keys()];
}

export function p(x: number, y: number) {
  return { x, y };
}

export function getContentStream(page: Page) {
  return page.pdfPage.contentStream.instructions
    .map((instruction) => {
      return [
        ...instruction.operands.map((operand) =>
          operand !== undefined
            ? 'key' in operand
              ? '/' + operand.key
              : operand.toString()
            : 'undefined',
        ),
        instruction.operator,
      ].join(' ');
    })
    .join('\n');
}

export function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
