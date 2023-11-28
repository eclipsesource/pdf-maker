import { readFile, writeFile } from 'node:fs/promises';

import { makePdf } from 'pdfmkr';

const fontData = await readFile('./fonts/DejaVuSansCondensed.ttf');
const fontDataBold = await readFile('./fonts/DejaVuSansCondensed-Bold.ttf');
const fontDataOblique = await readFile('./fonts/DejaVuSansCondensed-Oblique.ttf');

const liberty = await readFile('./images/liberty.jpg');
const torus = await readFile('./images/torus.png');

// Draw a frame around a block
const drawFrame = ({ width, height }) => [
  { type: 'rect', x: 0, y: 0, width, height, lineColor: 'gray', lineDash: [2] },
];

const def = {
  fonts: {
    'DejaVu-Sans': [
      { data: fontData },
      { data: fontDataOblique, italic: true },
      { data: fontDataBold, bold: true },
    ],
  },
  // Define the images to be used in the document. Even if an image is
  // used multiple times, its data is only included once in the PDF.
  images: {
    liberty: { data: liberty, format: 'jpeg' },
    torus: { data: torus, format: 'png' },
  },
  defaultStyle: {
    fontSize: 14,
  },
  content: [
    {
      text: 'Images',
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    },
    {
      text: ['JPG and PNG images are supported. ', 'They render in 72 DPI by default. '],
      margin: { y: 10 },
    },
    {
      columns: [{ image: 'liberty' }, { image: 'torus' }],
      margin: { y: 10 },
    },
    {
      text: ['Images are scaled proportionally to fit into the bounds of the block.'],
      margin: { y: 10 },
    },
    {
      columns: [
        { image: 'liberty', height: 120, margin: { x: 5 }, graphics: drawFrame },
        { image: 'torus', height: 120, width: 100, margin: { x: 5 }, graphics: drawFrame },
      ],
      margin: { x: 75, y: 10 },
    },
    {
      text: 'Images can be aligned horizontally using "imageAlign".',
      margin: { y: 10 },
    },
    {
      rows: [
        { image: 'liberty', height: 55, imageAlign: 'left', graphics: drawFrame },
        { image: 'liberty', height: 55, imageAlign: 'center', graphics: drawFrame },
        { image: 'liberty', height: 55, imageAlign: 'right', graphics: drawFrame },
      ],
      margin: { x: 75, y: 10 },
    },
  ],
};

const pdf = await makePdf(def);
writeFile('./out/images.pdf', pdf);
