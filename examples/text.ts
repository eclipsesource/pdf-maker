import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Block } from '../src/index.ts';
import { columns, PdfMaker, rect, rows, span, text } from '../src/index.ts';

const exampleDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(exampleDir, 'out');

// A narrow box with a thin border to make the line width visible
const narrowBox = (content: Block[]) =>
  rows(content, {
    width: 140,
    padding: 5,
    margin: { right: 15 },
    graphics: ({ width, height }) => [rect(0, 0, width, height, { lineColor: '#cccccc' })],
  });

const document = {
  defaultStyle: {
    fontSize: 14,
  },
  content: [
    // Text blocks have a "text" property that can be a string ...
    text('Text', {
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    }),
    // ... or an array of strings and text spans.
    text(
      [
        'Text objects can be used to apply individual styles, like ',
        span('font size', { fontSize: 18 }),
        ', ',
        span('font weight', { fontWeight: 'bold' }),
        ', ',
        span('font style', { fontStyle: 'italic' }),
        ', ',
        span('text color', { color: 'red' }),
        ' and ',
        span('letter spacing', { letterSpacing: 2.5 }),
        ' to parts of the text. ',
      ],
      { margin: { y: 10 } },
    ),
    // Spans can also be used to embed links in a text block
    text(
      ['A link: ', span('https://example.com', { link: 'https://example.com', color: 'blue' })],
      { margin: { y: 10 } },
    ),
    // Spans can also be applied within a link
    text(
      [
        span('This', { fontWeight: 'bold' }),
        ' is another ',
        span('link', { fontStyle: 'italic' }),
        ' to example.com.',
      ],
      { link: 'https://example.com', margin: { y: 10 } },
    ),
    text(
      [
        'Superscript and subscript: ',
        'H',
        span('₂', { rise: -3 }),
        'O  10',
        span('⁻³', { rise: 3 }),
        '.',
      ],
      { margin: { y: 10 } },
    ),
    // Line breaks
    text('Lines break between words and after hyphens. Explicit line\nbreaks are\nsupported.', {
      margin: { y: 10 },
    }),
    // Special characters control line breaks within words
    columns(
      [
        // Lines break after hyphens and dashes
        narrowBox([text('A state-of-the-art, well-known, and time-tested approach.')]),
        // Soft hyphens (U+00AD) mark where words may be hyphenated
        narrowBox([text('Donau\u00addampf\u00adschiff\u00adfahrts\u00adgesellschaft')]),
        // Zero-width spaces (U+200B) allow breaks, no-break spaces (U+00A0) prevent them
        narrowBox([
          text('https://example.com/\u200bvery/\u200blong/\u200bpath'),
          text('Delivered within 10\u00a0days.', { margin: { top: 5 } }),
        ]),
      ],
      { fontSize: 12, margin: { y: 10 } },
    ),
    // Text alignment
    rows(
      [
        text('Text can be left-aligned …', { textAlign: 'left' }),
        text('centered,', { textAlign: 'center' }),
        text('… or right-aligned', { textAlign: 'right' }),
      ],
      { margin: { y: 10 } },
    ),
    // Text alignment can be defined for an entire block and is
    // propagated to all children in the block.
    rows(
      [
        text("I'm centered."),
        text("I'm centered."),
        // However, children can override the alignment.
        text("I'm not!", { textAlign: 'left' }),
      ],
      {
        textAlign: 'center',
        margin: { y: 10 },
      },
    ),
    // Text kerning and ligatures
    rows(
      [
        text('AV, Ta with kerning, fi, ffi with ligatures.'),
        text('AV, Ta without kerning, fi, ffi without ligatures.', {
          fontKerning: 'none',
          fontVariantLigatures: 'none',
        }),
        text([text('Cyrillic default: '), text('бгдпт', { fontStyle: 'italic' })]),
        text([text('Serbian: '), text('бгдпт', { fontStyle: 'italic', language: 'sr' })]),
      ],
      { margin: { y: 10 } },
    ),
  ],
};

const pdfMaker = new PdfMaker();

pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed.ttf')));
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed-Bold.ttf')));
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed-Oblique.ttf')));

const pdf = await pdfMaker.makePdf(document);
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, 'text.pdf');
await writeFile(outFile, pdf);
console.log(`PDF written to ${outFile}`);
