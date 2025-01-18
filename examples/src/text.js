import { readFile, writeFile } from 'node:fs/promises';

import { PdfMaker, rows, span, text } from 'pdfmkr';

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
    text('Text is broken at word boundaries. Explicit line\nbreaks are\nsupported.', {
      margin: { y: 10 },
    }),
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
  ],
};

const pdfMaker = new PdfMaker();

pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed.ttf'));
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed-Bold.ttf'));
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed-Oblique.ttf'));

const pdf = await pdfMaker.makePdf(document);
await writeFile('./out/text.pdf', pdf);
