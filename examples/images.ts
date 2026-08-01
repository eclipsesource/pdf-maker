import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { columns, image, PdfMaker, rect, text } from '../src/index.ts';

const exampleDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(exampleDir, 'out');

// Draw a frame around a block
const drawFrame = ({ width, height }: { width: number; height: number }) => [
  rect(0, 0, width, height, { lineColor: '#cccccc', lineDash: [2] }),
];

const document = {
  defaultStyle: {
    fontSize: 12,
  },
  content: [
    text('Images', {
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 20 },
      textAlign: 'center',
    }),
    text('JPG, PNG, and SVG images are supported.', {
      margin: { top: 20 },
    }),
    columns(
      [
        image('file:/images/liberty.jpg', {
          height: 120,
          width: 80,
          margin: { x: 5 },
        }),
        image('file:/images/torus.png', {
          width: 160,
          margin: { x: 5 },
        }),
        image('file:/images/chart.svg', {
          width: 180,
          margin: { x: 5 },
        }),
      ],
      { margin: { x: 10, y: 10 } },
    ),
    text('Images are always scaled proportionally to fit into the bounds of the block.', {
      margin: { top: 20 },
    }),
    columns(
      [
        image('file:/images/liberty.jpg', {
          width: 140,
          height: 120,
          margin: { x: 5 },
          graphics: drawFrame,
        }),
        image('file:/images/torus.png', {
          width: 140,
          height: 120,
          margin: { x: 5 },
          graphics: drawFrame,
        }),
        image('file:/images/chart.svg', {
          width: 140,
          height: 120,
          margin: { x: 5 },
          graphics: drawFrame,
        }),
      ],
      { margin: { x: 10, y: 10 } },
    ),
    text('Images can be aligned horizontally using "imageAlign".', { margin: { top: 20 } }),
    columns(
      [
        image('file:/images/liberty.jpg', {
          width: 140,
          height: 120,
          margin: { x: 5 },
          imageAlign: 'left',
          graphics: drawFrame,
        }),
        image('file:/images/liberty.jpg', {
          width: 140,
          height: 120,
          margin: { x: 5 },
          imageAlign: 'center',
          graphics: drawFrame,
        }),
        image('file:/images/liberty.jpg', {
          width: 140,
          height: 120,
          margin: { x: 5 },
          imageAlign: 'right',
          graphics: drawFrame,
        }),
      ],
      { margin: { x: 10, y: 10 } },
    ),
  ],
};

const pdfMaker = new PdfMaker();
pdfMaker.setResourceRoot(exampleDir);

pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed.ttf')));
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed-Bold.ttf')));
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed-Oblique.ttf')));

const pdf = await pdfMaker.makePdf(document);
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, 'images.pdf');
await writeFile(outFile, pdf);
console.log(`PDF written to ${outFile}`);
