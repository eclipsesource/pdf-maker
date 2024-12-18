import { readFile, writeFile } from 'node:fs/promises';

import { columns, PdfMaker, text } from 'pdfmkr';

const document = {
  // Enable guides to render indicators for blocks, paddings, and margins
  dev: { guides: true },
  defaultStyle: {
    fontSize: 12,
  },
  margin: { x: '20mm', top: '10mm', bottom: '5mm' },
  header: columns([text('PDF Maker'), text('Guides', { textAlign: 'right', width: 'auto' })], {
    margin: { x: '20mm', top: '10mm' },
  }),
  footer: text('Footer', {
    margin: { x: '20mm', bottom: '10mm' },
  }),
  content: [
    text('Guides', {
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    }),
    text(
      [
        'Guides can be a helpful tool for pinpointing problems in your layout. ',
        'When guides are enabled, each block renders with a gray border to indicate its bounds. ',
        ' Page headers and footers are separated from the content by a horizontal line.',
      ],
      {
        margin: { y: 5 },
      },
    ),
    text(
      [
        'Margins are shown in yellow, padding in purple. ',
        'All guides are semi-transparent. ',
        'Therefore, overlapping margins will result in a darker shade of yellow.',
      ],
      {
        padding: 5,
        margin: { y: 5 },
      },
    ),
    text(
      [
        'Each line of text is surrounded by a thin green border. ',
        'Another thin green line indicates the text baseline.',
      ],
      {
        lineHeight: 1.5,
        fontSize: 16,
        margin: { y: 5 },
      },
    ),
    text(
      'This block has "breakAfter" set to "avoid", indicated by a gray dot at the bottom right.',
      {
        breakAfter: 'avoid',
        margin: { y: 5 },
      },
    ),
    text('This block has "breakBefore" set to "avoid", indicated by a gray dot at the top left.', {
      breakBefore: 'avoid',
      margin: { y: 5 },
    }),
    text(
      'This block has "breakAfter" set to "always", indicated by a gray bar at the bottom right.',
      {
        breakAfter: 'always',
        margin: { y: 5 },
      },
    ),
    text(
      ['This block has "breakBefore" set to "always", indicated by a gray bar at the top left.'],
      {
        breakBefore: 'always',
        margin: { y: 5 },
      },
    ),
  ],
};

const pdfMaker = new PdfMaker();
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed.ttf'));
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed-Bold.ttf'));

const pdf = await pdfMaker.makePdf(document);
await writeFile('./out/guides.pdf', pdf);
