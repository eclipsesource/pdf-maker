import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { columns, image, PdfMaker, rect, rows, text } from '../src/index.ts';

const exampleDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(exampleDir, 'out');

// Draw a frame around a block
const drawFrame = ({ width, height }: { width: number; height: number }) => [
  rect(0, 0, width, height, { lineColor: 'gray', lineDash: [2] }),
];

const document = {
  defaultStyle: {
    fontSize: 14,
  },
  content: [
    text('Images', {
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    }),
    text('JPG and PNG images are supported. They render in 72 DPI by default.', {
      margin: { y: 10 },
    }),
    columns([image('file:/images/liberty.jpg'), image('file:/images/torus.png')], {
      margin: { y: 10 },
    }),
    text('Images are scaled proportionally to fit into the bounds of the block.', {
      margin: { y: 10 },
    }),
    columns(
      [
        image('file:/images/liberty.jpg', { height: 120, margin: { x: 5 }, graphics: drawFrame }),
        image('file:/images/torus.png', {
          height: 120,
          width: 100,
          margin: { x: 5 },
          graphics: drawFrame,
        }),
      ],
      { margin: { x: 75, y: 10 } },
    ),
    text('Images can be aligned horizontally using "imageAlign".', { margin: { y: 10 } }),
    rows(
      [
        image('file:/images/liberty.jpg', { height: 55, imageAlign: 'left', graphics: drawFrame }),
        image('file:/images/liberty.jpg', {
          height: 55,
          imageAlign: 'center',
          graphics: drawFrame,
        }),
        image('file:/images/liberty.jpg', { height: 55, imageAlign: 'right', graphics: drawFrame }),
      ],
      { margin: { x: 75, y: 10 } },
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
