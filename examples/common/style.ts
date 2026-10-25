// Shared fonts, styles, and page setup to keep the examples consistent.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BoxLengths, Color, PageInfo, TextBlock, TextProps } from '../../src/index.ts';
import { columns, PdfMaker, text } from '../../src/index.ts';

export const exampleDir = fileURLToPath(new URL('..', import.meta.url));

export const colors = {
  muted: '#666666',
  rule: '#dddddd',
  link: '#1f4e8c',
  accent: '#a0302a',
} satisfies Record<string, Color>;

const pageMarginX = '25mm';

export const pageMargin: BoxLengths = { x: pageMarginX, y: '1cm' };

// Body text is set in EB Garamond. The line height is a factor of the font's natural line
// height (1.3 for EB Garamond), not of the font size as in CSS.
export const bodyStyle: TextProps = {
  fontFamily: 'EB Garamond',
  fontSize: 11.5,
  lineHeight: 1.05,
};

// Headings and captions are set in a semibold sans-serif, labels in a regular one whose
// stroke weight matches the body text
export const headingStyle: TextProps = { fontFamily: 'Source Sans 3', fontWeight: 600 };
export const labelStyle: TextProps = { fontFamily: 'Source Sans 3', fontSize: 9 };
export const captionStyle: TextProps = { ...labelStyle, fontWeight: 600 };

// Table column headers in semibold small caps, which need some extra letter spacing
export const columnHeaderStyle: TextProps = {
  ...captionStyle,
  letterSpacing: 0.6,
  fontFeatureSettings: { smcp: true, c2sc: true },
  // Workaround: the shaper applies `liga` before `smcp`, which turns "ff" into a ligature
  // that has no small caps form. Remove once @ralfstx/opentype applies lookups in order.
  fontVariantLigatures: 'none',
};

// Running headers in small caps, which need some extra letter spacing
export const headerStyle: TextProps = {
  fontSize: 9,
  color: colors.muted,
  letterSpacing: 0.6,
  fontFeatureSettings: { smcp: true, c2sc: true },
};

// Page numbers in old-style figures that blend in with the text
export const footerStyle: TextProps = {
  fontSize: 9,
  color: colors.muted,
  fontFeatureSettings: { onum: true },
};

type TextBlockProps = Omit<TextBlock, 'text'>;

export const title = (content: string, props?: TextBlockProps) =>
  text(content, { ...headingStyle, fontSize: 22, margin: { bottom: 8 }, ...props });

export const heading = (content: string, props?: TextBlockProps) =>
  text(content, {
    ...headingStyle,
    fontSize: 14,
    margin: { top: 14, bottom: 3 },
    breakAfter: 'avoid',
    ...props,
  });

export const label = (content: string, props?: TextBlockProps) =>
  text(content, { ...labelStyle, ...props });

export const caption = (content: string, props?: TextBlockProps) =>
  text(content, { ...captionStyle, ...props });

export const columnHeader = (content: string, props?: TextBlockProps) =>
  text(content, { ...columnHeaderStyle, ...props });

export const pageHeader = (name: string) =>
  columns([text('PDF Maker'), text(name, { textAlign: 'right', width: 'auto' })], {
    ...headerStyle,
    margin: { x: pageMarginX, top: '1cm' },
  });

export const pageFooter = ({ pageNumber, pageCount }: PageInfo) =>
  text(`${pageNumber} / ${pageCount ?? 0}`, {
    ...footerStyle,
    textAlign: 'right',
    margin: { x: pageMarginX, bottom: '1cm' },
  });

const fontFiles = [
  'EBGaramond-Regular.ttf',
  'EBGaramond-Italic.ttf',
  'EBGaramond-Bold.ttf',
  'SourceSans3-Regular.ttf',
  'SourceSans3-Semibold.ttf',
];

export async function createPdfMaker(): Promise<PdfMaker> {
  const pdfMaker = new PdfMaker();
  for (const file of fontFiles) {
    pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts', file)));
  }
  return pdfMaker;
}

export async function writePdf(name: string, pdf: Uint8Array): Promise<void> {
  const outDir = join(exampleDir, 'out');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${name}.pdf`);
  await writeFile(outFile, pdf);
  console.log(`PDF written to ${outFile}`);
}
