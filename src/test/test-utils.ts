import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { PDFContext, PDFName, PDFRef } from 'pdf-lib';

import type { Font } from '../fonts.ts';
import { weightToNumber } from '../fonts.ts';
import type { Frame } from '../frame.ts';
import type { Image } from '../images.ts';
import type { Page } from '../page.ts';
import type { TextAttrs, TextSpan } from '../read-block.ts';

export function fakeFont(
  name: string,
  opts: Partial<Omit<Font, 'name'>> & { doc?: PDFDocument } = {},
): Font {
  const key = `${name}-${opts?.style ?? 'normal'}-${opts?.weight ?? 400}`;
  const font: Font = {
    key,
    name,
    style: opts?.style ?? 'normal',
    weight: weightToNumber(opts?.weight ?? 'normal'),
    data: opts.data ?? mkData(key),
    fkFont: fakeFkFont(key),
  };
  if (opts.doc) {
    const pdfFont = fakePdfFont(name, font.fkFont);
    (opts.doc as any).fonts.push(pdfFont);
    (opts.doc as any)._pdfmkr_registeredFonts ??= {};
    (opts.doc as any)._pdfmkr_registeredFonts[font.key] = pdfFont.ref;
  }
  return font;
}

export function fakeImage(name: string, width: number, height: number): Image {
  return {
    name,
    width,
    height,
    data: mkData(name),
  } as any;
}

export function fakePdfFont(name: string, fkFont: fontkit.Font): PDFFont {
  return {
    name,
    ref: PDFRef.of(name.split('').reduce((a, c) => a ^ c.charCodeAt(0), 0)),
    embedder: { font: fkFont },
    encodeText: (text: string) => text,
  } as any;
}

/**
 * To ease calculations in tests, we use a fake font that always returns a width of
 * `fontSize * text.length`, so that at `fontSize = 10` a text with 5 chars will have
 * a length of `10 * 5 = 50`.
 * Likewise, the descent is set to amount to `0.2 * fontSize`.
 */
export function fakeFkFont(name: string): fontkit.Font {
  return {
    name,
    unitsPerEm: 1000,
    maxY: 800,
    descent: -200,
    ascent: 800,
    bbox: { minY: -200, maxY: 800 },
    layout: (text: string) => ({
      glyphs: text.split('').map((c) => ({ advanceWidth: 1000, id: c.charCodeAt(0) })),
    }),
  } as any;
}

export function fakePDFDocument(): PDFDocument {
  const context = PDFContext.create();
  const catalog = context.obj({});
  const doc = { context, catalog, fonts: [], images: [] };
  return doc as any;
}

export function fakePDFPage(document?: PDFDocument): PDFPage {
  const doc = document ?? fakePDFDocument();
  const node = doc.context.obj({});
  const contentStream: any[] = [];
  let counter = 1;
  (node as any).newFontDictionary = (name: string) => PDFName.of(`${name}-${counter++}`);
  let xObjectCounter = 1;
  (node as any).newXObject = (tag: string, ref: PDFRef) =>
    PDFName.of(`${tag}-${ref.objectNumber}-${ref.generationNumber}-${xObjectCounter++}`);
  (node as any).newExtGState = (type: string) => PDFName.of(`${type}-${counter++}`);
  return {
    doc,
    ref: PDFRef.of(1),
    getContentStream: () => contentStream,
    node,
  } as unknown as PDFPage;
}

export function extractTextRows(frame: Partial<Frame>) {
  const lines = [] as string[];
  frame.children?.forEach((child) => {
    extractTextRows(child).forEach((line) => lines.push(line));
  });
  frame.objects?.forEach((obj) => {
    if (obj.type === 'text') {
      obj.rows.forEach((row) => {
        lines.push(row.segments.map((s) => s.text).join(', '));
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
  const contentStream = (page.pdfPage as any).getContentStream();
  return contentStream.map((o: any) => o.toString());
}

export function mkData(value: string) {
  return new Uint8Array(value.split('').map((c) => c.charCodeAt(0)));
}
