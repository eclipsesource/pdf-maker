import type { Block, DocumentDefinition, ImageBlock } from '../src/index.ts';
import { columns, image, rect, rows, text } from '../src/index.ts';
import {
  bodyStyle,
  caption,
  colors,
  createPdfMaker,
  exampleDir,
  heading,
  label,
  pageFooter,
  pageHeader,
  pageMargin,
  title,
  writePdf,
} from './common/style.ts';

const paper = '#e7e5e0';

// A dashed frame that shows the bounds of a block
const dashedFrame = ({ width, height }: { width: number; height: number }) => [
  rect(0, 0, width, height, { lineColor: colors.rule, lineDash: [2, 2] }),
];

// A figure with a caption and a short description above the image
const figure = (img: ImageBlock, name: string, description: string) =>
  rows([caption(name), text(description, { fontSize: 10, margin: { top: 1, bottom: 6 } }), img], {
    margin: { x: 15 },
  });

const figures = (...items: Block[]) => columns(items, { margin: { x: -15, y: 8 } });

const paragraph = (content: string) => text(content, { margin: { y: 6 } });

const document: DocumentDefinition = {
  margin: pageMargin,
  defaultStyle: bodyStyle,
  header: pageHeader('Images'),
  footer: pageFooter,
  content: [
    title('Images'),
    paragraph(
      'Images are blocks like any other. They can be loaded from file:, data:, and http(s): ' +
        'URLs. Paths in file: URLs are resolved against the resource root of the PdfMaker.',
    ),

    heading('Formats'),
    figures(
      figure(
        image('file:/images/liberty.jpg', { height: 80, imageAlign: 'left' }),
        'JPEG',
        'Photos are embedded as they are.',
      ),
      // The background shows through the transparent parts of the image
      figure(
        image('file:/images/torus.png', {
          height: 80,
          graphics: ({ width, height }) => [rect(0, 0, width, height, { fillColor: paper })],
        }),
        'PNG',
        'Transparency is preserved.',
      ),
      figure(image('file:/images/chart.svg', { height: 80 }), 'SVG', 'Vector graphics stay sharp.'),
    ),

    heading('Scaling'),
    paragraph('Images scale proportionally to fit their block, shown by the dashed frames.'),
    figures(
      figure(
        image('file:/images/torus.png', { width: 88, graphics: dashedFrame }),
        'Width only',
        'The height follows the image.',
      ),
      figure(
        image('file:/images/torus.png', { height: 50, graphics: dashedFrame }),
        'Height only',
        'The block keeps the full width.',
      ),
      figure(
        image('file:/images/torus.png', { width: 50, height: 66, graphics: dashedFrame }),
        'Width and height',
        'The image fits into both.',
      ),
    ),

    heading('Alignment'),
    paragraph('Within its block, an image can be aligned to the left, center, or right.'),
    figures(
      ...(
        [
          ['Left', 'left'],
          ['Centered', 'center'],
          ['Right', 'right'],
        ] as const
      ).map(([name, imageAlign]) =>
        figure(
          image('file:/images/liberty.jpg', { height: 60, imageAlign, graphics: dashedFrame }),
          name,
          `imageAlign: '${imageAlign}'`,
        ),
      ),
    ),

    heading('Images next to text'),
    columns(
      [
        rows(
          [
            image('file:/images/liberty.jpg', { width: 60, imageAlign: 'left' }),
            label('Photo: George Hodan, CC0', { margin: { top: 4 } }),
          ],
          { width: 'auto', margin: { right: 20 } },
        ),
        rows([
          text(
            'Placed in columns, images and text can share a line. This works like any other ' +
              'columns layout: blocks with a fixed or automatic width are laid out first, and ' +
              'the text takes the remaining space.',
            { margin: { bottom: 6 } },
          ),
          paragraph(
            'The photo shows the Statue of Liberty in New York. It was taken by George Hodan ' +
              'and released into the public domain.',
          ),
        ]),
      ],
      { margin: { y: 8 } },
    ),
  ],
};

const pdfMaker = await createPdfMaker();
pdfMaker.setResourceRoot(exampleDir);
await writePdf('images', await pdfMaker.makePdf(document));
