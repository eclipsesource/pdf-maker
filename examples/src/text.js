import { readFile, writeFile } from 'node:fs/promises';

import { makePdf } from 'pdfmkr';

const fontData = await readFile('./fonts/DejaVuSansCondensed.ttf');
const fontDataBold = await readFile('./fonts/DejaVuSansCondensed-Bold.ttf');
const fontDataOblique = await readFile('./fonts/DejaVuSansCondensed-Oblique.ttf');

const def = {
  fonts: {
    'DejaVu-Sans': [
      { data: fontData },
      { data: fontDataOblique, italic: true },
      { data: fontDataBold, bold: true },
    ],
  },
  defaultStyle: {
    fontSize: 14,
  },
  content: [
    {
      // Text blocks have a "text" property that can be a string ...
      text: 'Text',
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    },
    {
      text: [
        // ... or an array of strings and text spans.
        'Text objects can be used to apply individual styles, like ',
        { text: 'font size', fontSize: 18 },
        ', ',
        { text: 'font weight', fontWeight: 'bold' },
        ', ',
        { text: 'font style', fontStyle: 'italic' },
        ', ',
        { text: 'text color', color: 'red' },
        ' and ',
        { text: 'letter spacing', letterSpacing: 2.5 },
        ' to parts of the text. ',
      ],
      margin: { y: 10 },
    },
    {
      text: [
        // Styles can also be used to embed links in a text block
        'A link: ',
        {
          text: 'https://example.com',
          link: 'https://example.com',
          color: 'blue',
        },
      ],
      margin: { y: 10 },
    },
    {
      text: [
        // Styles can also be applied within a link
        {
          text: [
            { text: 'This', fontWeight: 'bold' },
            ' is another ',
            { text: 'link', fontStyle: 'italic' },
            ' to example.com.',
          ],
          link: 'https://example.com',
        },
      ],
      margin: { y: 10 },
    },
    {
      text: [
        {
          text: [
            'Superscript and subscript: ',
            'H',
            { text: '₂', rise: -3 },
            'O  10',
            { text: '⁻³', rise: 3 },
            '.',
          ],
        },
      ],
      margin: { y: 10 },
    },
    {
      // Line breaks
      text: ['Text is broken at word boundaries. Explicit line\nbreaks are\nsupported.'],
      margin: { y: 10 },
    },
    {
      // Text alignment
      rows: [
        {
          text: 'Text can be left-aligned …',
          textAlign: 'left',
        },
        {
          text: 'centered,',
          textAlign: 'center',
        },
        {
          text: '… or right-aligned',
          textAlign: 'right',
        },
      ],
      margin: { y: 10 },
    },
    {
      // Text alignment can be defined for an entire block and is
      // propagated to all children in the block.
      textAlign: 'center',
      rows: [
        { text: "I'm centered." },
        { text: "I'm centered." },
        // However, children can override the alignment.
        { text: "I'm not!", textAlign: 'left' },
      ],
      margin: { y: 10 },
    },
  ],
};

const pdf = await makePdf(def);
writeFile('./out/text.pdf', pdf);
