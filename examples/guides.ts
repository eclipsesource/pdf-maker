import type { DocumentDefinition } from '../src/index.ts';
import { text } from '../src/index.ts';
import {
  bodyStyle,
  createPdfMaker,
  pageFooter,
  pageHeader,
  pageMargin,
  title,
  writePdf,
} from './common/style.ts';

const document: DocumentDefinition = {
  // Enable guides to render indicators for blocks, paddings, and margins
  dev: { guides: true },
  margin: pageMargin,
  defaultStyle: bodyStyle,
  header: pageHeader('Guides'),
  footer: pageFooter,
  content: [
    title('Guides'),
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

const pdfMaker = await createPdfMaker();
await writePdf('guides', await pdfMaker.makePdf(document));
