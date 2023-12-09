import { readFile, writeFile } from 'node:fs/promises';

import { makePdf } from 'pdfmkr';

const fontData = await readFile('./fonts/DejaVuSansCondensed.ttf');
const fontDataBold = await readFile('./fonts/DejaVuSansCondensed-Bold.ttf');
const fontDataOblique = await readFile('./fonts/DejaVuSansCondensed-Oblique.ttf');

const loremIpsum =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
  ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud' +
  ' exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure' +
  ' dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' +
  ' Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt ' +
  'mollit anim id est laborum.';

const def = {
  fonts: {
    'DejaVu-Sans': [
      { data: fontData },
      { data: fontDataOblique, italic: true },
      { data: fontDataBold, bold: true },
    ],
  },
  margin: { x: '20mm', y: '0.5cm' },
  defaultStyle: {
    fontSize: 12,
  },
  header: {
    columns: [{ text: 'PDF Maker' }, { text: 'Anchors', textAlign: 'right', width: 'auto' }],
    margin: { x: '20mm', top: '1cm' },
  },
  footer: ({ pageNumber, pageCount }) => ({
    text: `${pageNumber}/${pageCount ?? 0}`,
    textAlign: 'right',
    margin: { x: '20mm', bottom: '1cm' },
  }),
  content: [
    {
      rows: [
        {
          text: 'Contents',
          fontSize: 18,
          margin: { bottom: 5 },
        },
        ...range(10).map((n) => ({
          text: `Paragraph ${n + 1}`,
          // Link to the paragraph with given id
          link: `#par:${n + 1}`,
        })),
      ],
      margin: { bottom: 10 },
    },
    ...range(10).map((n) => ({
      rows: [
        {
          text: `Paragraph ${n + 1}`,
          breakAfter: 'avoid',
        },
        { text: loremIpsum },
      ],
      // Create an anchor with given id
      id: `par:${n + 1}`,
      margin: { top: 5 },
      fontSize: 10,
    })),
  ],
};

function range(n) {
  return [...Array(n).keys()];
}

const pdf = await makePdf(def);
writeFile('./out/anchors.pdf', pdf);
