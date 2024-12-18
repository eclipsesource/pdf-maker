import { readFile, writeFile } from 'node:fs/promises';

import { circle, line, path, PdfMaker, rect, text } from 'pdfmkr';

const document = {
  defaultStyle: {
    fontSize: 14,
  },
  content: [
    text('Graphics', {
      fontWeight: 'bold',
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    }),
    // Graphics can be drawn in any block by setting the `graphics`
    // property to an array of graphics objects. When a block contains
    // only graphics, the `height` property must be set to the desired
    // height of the block.
    text('Lines', {
      graphics: [
        // A straight line
        line(100, 10, 250, 10),
        // A colored line
        line(100, 20, 250, 20, { lineColor: '#4488cc' }),
        // A dashed line
        line(100, 30, 250, 30, { lineDash: [5] }),
        // A dashed line with a dash pattern
        line(100, 40, 250, 40, { lineDash: [5, 2, 1, 2] }),
        // A dotted line (segments with zero length and round line caps)
        line(100, 50, 250, 50, { lineWidth: 3, lineCap: 'round', lineDash: [0, 8] }),
        // line cap = butt (default)
        line(300, 15, 450, 15, { lineWidth: 7, lineCap: 'butt' }),
        // line cap = round
        line(300, 30, 450, 30, { lineWidth: 7, lineCap: 'round' }),
        // line cap = square
        line(300, 45, 450, 45, { lineWidth: 7, lineCap: 'square' }),
      ],
      height: 60,
      margin: { y: 10 },
    }),
    // Rectangles and circles support a line color and stroke color. If
    // neither line nor stroke properties are set, a black stroke and
    // line width of 1 is assumed.
    text('Rectangles\nand circles', {
      graphics: [
        rect(100, 0, 50, 25),
        rect(120, 10, 50, 25, { fillColor: '#cccccc' }),
        rect(140, 20, 50, 25, { lineColor: '#4488cc', lineWidth: 2, lineJoin: 'round' }),
        rect(160, 30, 50, 25, {
          fillColor: '#cccccc',
          lineColor: '#4488cc',
          lineJoin: 'bevel',
          lineWidth: 2,
        }),
        circle(315, 27, 20, { lineWidth: 2 }),
        circle(340, 27, 20, { fillColor: '#cccccc' }),
        circle(365, 27, 20, { lineColor: '#4488cc', lineWidth: 2 }),
        circle(390, 27, 20, { fillColor: '#cccccc', lineColor: '#4488cc', lineWidth: 2 }),
      ],
      height: 55,
      margin: { y: 10 },
    }),
    // Path are supported using the SVG syntax.
    // See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
    text('Paths', {
      graphics: [
        path('M45,0 L15,94 L90,34 L0,34 L75,94 Z', {
          fillColor: '#4488cc',
          translate: { x: 100 },
        }),
        path('M45,0 L15,94 L90,34 L0,34 L75,94 Z', {
          fillColor: '#cccccc',
          lineColor: '#4488cc',
          lineJoin: 'round',
          lineDash: [4, 2],
          translate: { x: 200 },
        }),
        path('M 0,30 c 20,0 20,-30 40,-30 s 20,30 40,30 s 20,-30 40,-30 s 20,30 40,30', {
          lineWidth: 1,
          lineColor: 'red',
          translate: { x: 300, y: 30 },
        }),
      ],
      height: 95,
      margin: { y: 10 },
    }),
    // Opacity can be set on strokes (`lineOpacity`) and fills
    // (`fillOpacity`) as a number between 0 and 1.
    text('Opacity', {
      graphics: [
        rect(110, 0, 40, 40, {
          fillColor: '#4488ee',
          fillOpacity: 0.5,
        }),
        rect(120, 10, 40, 40, {
          fillColor: '#eecc55',
          fillOpacity: 0.5,
        }),
        rect(130, 20, 40, 40, {
          fillColor: '#cc4433',
          fillOpacity: 0.5,
        }),
        circle(250, 30, 25, {
          lineWidth: 10,
          lineColor: '#4488ee',
          lineOpacity: 0.5,
        }),
        circle(275, 30, 25, {
          lineWidth: 10,
          lineColor: '#eecc55',
          lineOpacity: 0.5,
        }),
        circle(300, 30, 25, {
          lineWidth: 10,
          lineColor: '#cc4433',
          lineOpacity: 0.5,
        }),
      ],
      height: 60,
      margin: { y: 10 },
    }),
    // When a function is supplied to the `graphics` property, it will
    // be called with the actual width and height of the block. This
    // allows for aligning graphics with the block bounds, e.g. drawing
    // a border.
    text('A text block with a frame', {
      graphics: ({ width, height }) => [
        rect(0, 0, width, height, { lineColor: '#4488cc', lineWidth: 2 }),
      ],
      padding: { x: 10, y: 5 },
      margin: { y: 10 },
    }),
    // Graphics are rendered below the text. This allows for setting a
    // background color.
    text('A text block with a background color', {
      graphics: ({ width, height }) => [rect(0, 0, width, height, { fillColor: '#eecc55' })],
      padding: { x: 10, y: 5 },
      margin: { y: 10 },
    }),
  ],
};

const pdfMaker = new PdfMaker();

pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed.ttf'));
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed-Bold.ttf'));
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed-Oblique.ttf'));

const pdf = await pdfMaker.makePdf(document);
await writeFile('./out/graphics.pdf', pdf);
