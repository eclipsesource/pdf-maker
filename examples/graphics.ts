import type { Block, Color, DocumentDefinition, Shape } from '../src/index.ts';
import { circle, columns, line, path, rect, rows, text } from '../src/index.ts';
import {
  bodyStyle,
  caption,
  colors,
  createPdfMaker,
  pageFooter,
  pageHeader,
  pageMargin,
  title,
  writePdf,
} from './common/style.ts';

const palette = {
  blue: '#1f4e8c',
  red: '#a0302a',
  ochre: '#c9962b',
  sage: '#5b8a72',
  gray: '#888888',
  paper: '#e7e5e0',
} satisfies Record<string, Color>;

type Size = { width: number; height: number };

// A panel with a caption, a short description, and a drawing area of the given height.
// Graphics can be a list of shapes or a function that receives the size of the block.
const panel = (
  name: string,
  description: string,
  content: { height: number; graphics: Shape[] | ((size: Size) => Shape[]) } | Block[],
) =>
  rows(
    [
      caption(name),
      text(description, { fontSize: 10, margin: { top: 1, bottom: 8 } }),
      ...(Array.isArray(content) ? content : [content]),
    ],
    { margin: { x: 15, top: 18, bottom: 6 } },
  );

const grid = (...panels: Block[]) => columns(panels, { margin: { x: -15 } });

// Creates the SVG path data for a star with the given center and radii
function starPath(cx: number, cy: number, outer: number, inner: number, points = 5) {
  const corners = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  });
  return `M${corners.join(' L')} Z`;
}

// Creates the SVG path data for a pie slice, using an arc command
function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const point = (angle: number) =>
    `${cx + r * Math.cos(angle - Math.PI / 2)},${cy + r * Math.sin(angle - Math.PI / 2)}`;
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${point(start)} A${r},${r} 0 ${largeArc} 1 ${point(end)} Z`;
}

const pieSlices = (cx: number, cy: number, r: number, values: number[], fills: Color[]) => {
  const total = values.reduce((sum, value) => sum + value, 0);
  let start = 0;
  return values.map((value, i) => {
    const end = start + (2 * Math.PI * value) / total;
    const slice = path(slicePath(cx, cy, r, start, end), {
      fillColor: fills[i],
      lineColor: 'white',
      lineWidth: 1.5,
      lineJoin: 'round',
    });
    start = end;
    return slice;
  });
};

const monthlyValues = [12, 19, 15, 24, 21, 28, 26, 31];

const barChart = ({ width, height }: Size): Shape[] => {
  const max = 35;
  const gap = 8;
  const inset = 12;
  const barWidth = (width - 2 * inset - gap * (monthlyValues.length - 1)) / monthlyValues.length;
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) =>
    line(0, height - f * height, width, height - f * height, {
      lineColor: colors.rule,
      lineWidth: 0.5,
    }),
  );
  const bars = monthlyValues.map((value, i) => {
    const barHeight = (value / max) * height;
    const isLast = i === monthlyValues.length - 1;
    return rect(inset + i * (barWidth + gap), height - barHeight, barWidth, barHeight, {
      fillColor: isLast ? palette.red : palette.blue,
      fillOpacity: 0.75,
    });
  });
  return [...gridLines, ...bars, line(0, height, width, height, { lineWidth: 0.75 })];
};

const document: DocumentDefinition = {
  margin: pageMargin,
  defaultStyle: bodyStyle,
  header: pageHeader('Graphics'),
  footer: pageFooter,
  content: [
    title('Graphics'),
    text(
      'Any block can carry graphics: lines, rectangles, circles, and paths. Coordinates are ' +
        'relative to the top left corner of the block. When graphics are given as a function, ' +
        'it receives the final size of the block, so that shapes can adapt to it.',
      { margin: { bottom: 4 } },
    ),

    grid(
      panel('Lines and dashes', 'Lines can be solid or follow any dash pattern.', {
        height: 70,
        graphics: [
          line(0, 5, 200, 5),
          line(0, 19, 200, 19, { lineDash: [6, 3] }),
          line(0, 33, 200, 33, { lineDash: [9, 3, 1, 3] }),
          // Zero-length dashes with round caps produce dots
          line(1, 47, 200, 47, { lineWidth: 2.5, lineCap: 'round', lineDash: [0, 6] }),
          line(0, 63, 200, 63, { lineWidth: 4, lineColor: palette.blue }),
        ],
      }),
      panel('Caps and joins', 'The common styles for line caps and corner joins.', {
        height: 70,
        graphics: [
          // Thin guides show how far each cap extends beyond the end points
          line(15, 0, 15, 70, { lineColor: palette.gray, lineWidth: 0.5 }),
          line(85, 0, 85, 70, { lineColor: palette.gray, lineWidth: 0.5 }),
          ...(['butt', 'round', 'square'] as const).map((lineCap, i) =>
            line(15, 12 + i * 23, 85, 12 + i * 23, {
              lineWidth: 10,
              lineCap,
              lineColor: palette.blue,
            }),
          ),
          ...(['miter', 'round', 'bevel'] as const).map((lineJoin, i) =>
            path('M0,45 L13,10 L26,45', {
              lineWidth: 9,
              lineJoin,
              lineColor: palette.red,
              translate: { x: 110 + i * 33, y: 8 },
            }),
          ),
        ],
      }),
    ),

    grid(
      panel('Rectangles and circles', 'Shapes can be filled, outlined, or both.', {
        height: 70,
        graphics: [
          // Later shapes are painted over earlier ones
          rect(0, 8, 46, 30, { fillColor: palette.paper }),
          rect(22, 20, 46, 30, { lineColor: palette.blue, lineWidth: 1.5 }),
          rect(44, 32, 46, 30, {
            fillColor: palette.paper,
            lineColor: palette.blue,
            lineWidth: 1.5,
          }),
          circle(135, 26, 18, { fillColor: palette.paper }),
          circle(158, 38, 18, { lineColor: palette.red, lineWidth: 1.5 }),
          circle(181, 50, 18, { fillColor: palette.paper, lineColor: palette.red, lineWidth: 1.5 }),
        ],
      }),
      panel('Paths', 'SVG path data describes lines, curves, and arcs.', {
        height: 80,
        graphics: [
          path(starPath(38, 42, 38, 15), { fillColor: palette.ochre, lineJoin: 'round' }),
          path('M85,42 c8,0 8,-20 16,-20 s8,20 16,20 s8,-20 16,-20', {
            lineColor: palette.blue,
            lineWidth: 2,
            lineCap: 'round',
          }),
          ...pieSlices(175, 42, 34, [45, 30, 25], [palette.red, palette.sage, palette.blue]),
        ],
      }),
    ),

    grid(
      panel('Opacity', 'Translucent shapes blend where they overlap.', {
        height: 85,
        graphics: [
          circle(26, 30, 26, { fillColor: palette.blue, fillOpacity: 0.55 }),
          circle(56, 30, 26, { fillColor: palette.ochre, fillOpacity: 0.55 }),
          circle(41, 55, 26, { fillColor: palette.red, fillOpacity: 0.55 }),
          ...[palette.blue, palette.ochre, palette.red].map((lineColor, i) =>
            circle(124 + i * 25, 42, 20, { lineColor, lineWidth: 8, lineOpacity: 0.55 }),
          ),
        ],
      }),
      panel('Transformations', 'Shapes can be rotated, skewed, scaled, and moved.', {
        height: 85,
        graphics: [
          ...Array.from({ length: 6 }, (_, i) =>
            rect(12, 15, 40, 40, {
              fillColor: palette.blue,
              fillOpacity: 0.12,
              lineColor: palette.blue,
              lineWidth: 0.75,
              rotate: { angle: i * 15, cx: 32, cy: 35 },
            }),
          ),
          // Each transformed square is shown next to its dashed original
          ...[82, 124, 166].map((x) =>
            rect(0, 0, 25, 25, {
              lineColor: palette.gray,
              lineDash: [2, 2],
              translate: { x, y: 22 },
            }),
          ),
          rect(0, 0, 25, 25, {
            fillColor: palette.sage,
            fillOpacity: 0.8,
            translate: { x: 82, y: 22 },
            skew: { x: -20 },
          }),
          rect(0, 0, 25, 25, {
            fillColor: palette.ochre,
            fillOpacity: 0.8,
            translate: { x: 124, y: 22 },
            scale: { x: 1.4, y: 0.7 },
          }),
          rect(0, 0, 25, 25, {
            fillColor: palette.red,
            fillOpacity: 0.8,
            translate: { x: 166 + 14, y: 22 + 18 },
          }),
        ],
      }),
    ),

    grid(
      panel('Charts from data', 'Graphics are code, so they can be computed from data.', {
        height: 77,
        graphics: barChart,
      }),
      panel('Block decorations', 'Graphics adapt to the size of their block.', [
        text('A text block with a background', {
          padding: { x: 6, y: 3 },
          graphics: ({ width, height }) => [
            rect(0, 0, width, height, { fillColor: palette.paper }),
          ],
        }),
        text('A text block with a frame', {
          padding: { x: 6, y: 3 },
          margin: { top: 6 },
          graphics: ({ width, height }) => [
            rect(0, 0, width, height, { lineColor: palette.blue, lineWidth: 1 }),
          ],
        }),
        text('A quote with a bar on the left', {
          fontStyle: 'italic',
          padding: { left: 10, y: 3 },
          margin: { top: 6 },
          graphics: ({ height }) => [rect(0, 0, 2.5, height, { fillColor: palette.red })],
        }),
      ]),
    ),
  ],
};

const pdfMaker = await createPdfMaker();
await writePdf('graphics', await pdfMaker.makePdf(document));
