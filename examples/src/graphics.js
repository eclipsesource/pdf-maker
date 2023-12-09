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
      text: 'Graphics',
      bold: true,
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    },
    // Graphics can be drawn in any block by setting the `graphics`
    // property to an array of graphics objects. When a block contains
    // only graphics, the `height` property must be set to the desired
    // height of the block.
    {
      text: 'Lines',
      graphics: [
        // A straight line
        { type: 'line', x1: 100, y1: 10, x2: 250, y2: 10 },
        // A colored line
        { type: 'line', x1: 100, y1: 20, x2: 250, y2: 20, lineColor: '#4488cc' },
        // A dashed line
        { type: 'line', x1: 100, y1: 30, x2: 250, y2: 30, lineDash: [5] },
        // A dashed line with a dash pattern
        { type: 'line', x1: 100, y1: 40, x2: 250, y2: 40, lineDash: [5, 2, 1, 2] },
        // A dotted line (segments with zero length and round line caps)
        {
          type: 'line',
          x1: 100,
          y1: 50,
          x2: 250,
          y2: 50,
          lineWidth: 3,
          lineCap: 'round',
          lineDash: [0, 8],
        },
        // line cap = butt (default)
        { type: 'line', x1: 300, y1: 15, x2: 450, y2: 15, lineWidth: 7, lineCap: 'butt' },
        // line cap = round
        { type: 'line', x1: 300, y1: 30, x2: 450, y2: 30, lineWidth: 7, lineCap: 'round' },
        // line cap = square
        { type: 'line', x1: 300, y1: 45, x2: 450, y2: 45, lineWidth: 7, lineCap: 'square' },
      ],
      height: 60,
      margin: { y: 10 },
    },
    // Rectangles and circles support a line color and stroke color. If
    // neither line nor stroke attributes are set, a black stroke and
    // line width of 1 is assumed.
    {
      text: 'Rectangles\nand circles',
      graphics: [
        { type: 'rect', x: 100, y: 0, width: 50, height: 25 },
        { type: 'rect', x: 120, y: 10, width: 50, height: 25, fillColor: '#cccccc' },
        {
          type: 'rect',
          x: 140,
          y: 20,
          width: 50,
          height: 25,
          lineColor: '#4488cc',
          lineWidth: 2,
          lineJoin: 'round',
        },
        {
          type: 'rect',
          x: 160,
          y: 30,
          width: 50,
          height: 25,
          fillColor: '#cccccc',
          lineColor: '#4488cc',
          lineJoin: 'bevel',
          lineWidth: 2,
        },
        { type: 'circle', cx: 315, cy: 27, r: 20, lineWidth: 2 },
        { type: 'circle', cx: 340, cy: 27, r: 20, fillColor: '#cccccc' },
        {
          type: 'circle',
          cx: 365,
          cy: 27,
          r: 20,

          lineColor: '#4488cc',
          lineWidth: 2,
        },
        {
          type: 'circle',
          cx: 390,
          cy: 27,
          r: 20,
          fillColor: '#cccccc',
          lineColor: '#4488cc',
          lineWidth: 2,
        },
      ],
      height: 55,
      margin: { y: 10 },
    },
    // Path are supported using the SVG syntax.
    // See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
    {
      text: 'Paths',
      graphics: [
        {
          type: 'path',
          d: 'M45,0 L15,94 L90,34 L0,34 L75,94 Z',
          fillColor: '#4488cc',
          translate: { x: 100 },
        },
        {
          type: 'path',
          d: 'M45,0 L15,94 L90,34 L0,34 L75,94 Z',
          fillColor: '#cccccc',
          lineColor: '#4488cc',
          lineJoin: 'round',
          lineDash: [4, 2],
          translate: { x: 200 },
        },
        {
          type: 'path',
          d: 'M 0,30 c 20,0 20,-30 40,-30 s 20,30 40,30 s 20,-30 40,-30 s 20,30 40,30',
          lineWidth: 1,
          lineColor: 'red',
          translate: { x: 300, y: 30 },
        },
      ],
      height: 95,
      margin: { y: 10 },
    },
    // Opacity can be set on strokes (`lineOpacity`) and fills
    // (`fillOpacity`) as a number between 0 and 1.
    {
      text: 'Opacity',
      graphics: [
        {
          type: 'rect',
          x: 110,
          y: 0,
          width: 40,
          height: 40,
          fillColor: '#4488ee',
          fillOpacity: 0.5,
        },
        {
          type: 'rect',
          x: 120,
          y: 10,
          width: 40,
          height: 40,
          fillColor: '#eecc55',
          fillOpacity: 0.5,
        },
        {
          type: 'rect',
          x: 130,
          y: 20,
          width: 40,
          height: 40,
          fillColor: '#cc4433',
          fillOpacity: 0.5,
        },
        {
          type: 'circle',
          cx: 250,
          cy: 30,
          r: 25,
          lineWidth: 10,
          lineColor: '#4488ee',
          lineOpacity: 0.5,
        },
        {
          type: 'circle',
          cx: 275,
          cy: 30,
          r: 25,
          lineWidth: 10,
          lineColor: '#eecc55',
          lineOpacity: 0.5,
        },
        {
          type: 'circle',
          cx: 300,
          cy: 30,
          r: 25,
          lineWidth: 10,
          lineColor: '#cc4433',
          lineOpacity: 0.5,
        },
      ],
      height: 60,
      margin: { y: 10 },
    },
    // When a function is supplied to the `graphics` property, it will
    // be called with the actual width and height of the block. This
    // allows for aligning graphics with the block bounds, e.g. drawing
    // a border.
    {
      text: 'A text block with a frame',
      graphics: ({ width, height }) => [
        { type: 'rect', x: 0, y: 0, width, height, lineColor: '#4488cc', lineWidth: 2 },
      ],
      padding: { x: 10, y: 5 },
      margin: { y: 10 },
    },
    // Graphics are rendered below the text. This allows for setting a
    // background color.
    {
      text: 'A text block with a background color',
      graphics: ({ width, height }) => [
        { type: 'rect', x: 0, y: 0, width, height, fillColor: '#eecc55' },
      ],
      padding: { x: 10, y: 5 },
      margin: { y: 10 },
    },
  ],
};

const pdf = await makePdf(def);
writeFile('./out/graphics.pdf', pdf);
