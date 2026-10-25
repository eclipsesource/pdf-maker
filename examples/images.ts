import type { DocumentDefinition } from '../src/index.ts';
import { columns, image, rect, text } from '../src/index.ts';
import {
  bodyStyle,
  colors,
  createPdfMaker,
  exampleDir,
  pageFooter,
  pageHeader,
  pageMargin,
  title,
  writePdf,
} from './common/style.ts';

// Draw a frame around a block
const drawFrame = ({ width, height }: { width: number; height: number }) => [
  rect(0, 0, width, height, { lineColor: colors.rule, lineDash: [2] }),
];

const document: DocumentDefinition = {
  margin: pageMargin,
  defaultStyle: bodyStyle,
  header: pageHeader('Images'),
  footer: pageFooter,
  content: [
    title('Images'),
    text('JPG, PNG, and SVG images are supported.'),
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
      { margin: { y: 10 } },
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
      { margin: { y: 10 } },
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
      { margin: { y: 10 } },
    ),
  ],
};

const pdfMaker = await createPdfMaker();
pdfMaker.setResourceRoot(exampleDir);
await writePdf('images', await pdfMaker.makePdf(document));
