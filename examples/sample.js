/* eslint-disable import/no-default-export */
import { readFileSync } from 'fs';

import fonts from './generated/fonts.js';

export default {
  info: {
    title: 'PDF Maker sample',
    author: 'John Doe',
    subject: 'Lorem ipsum',
    keywords: ['lorem', 'ipsum'],
    creator: 'PDF Maker',
  },
  dev: { guides: true },
  fonts: {
    'DejaVu-Sans': [
      { data: fonts.DejaVu_Sans_Normal },
      { data: fonts.DejaVu_Sans_Italic, italic: true },
      { data: fonts.DejaVu_Sans_Bold, bold: true },
      { data: fonts.DejaVu_Sans_BoldItalic, italic: true, bold: true },
    ],
  },
  images: {
    liberty: { data: readFileSync('examples/liberty.jpg'), format: 'jpeg' },
    torus: { data: readFileSync('examples/torus.png'), format: 'png' },
  },
  pageSize: 'A4',
  margin: ({ pageNumber }) =>
    pageNumber % 2
      ? { left: '25mm', right: '15mm', y: '0.5cm' }
      : { left: '15mm', right: '25mm', y: '0.5cm' },
  defaultStyle: {
    fontSize: 14,
  },
  header: ({ pageNumber }) => ({
    columns: [{ text: 'PDF Maker' }, { text: 'sample', textAlign: 'right', width: 'auto' }],
    margin:
      pageNumber % 2
        ? { left: '25mm', right: '15mm', top: '1cm' }
        : { left: '15mm', right: '25mm', top: '1cm' },
  }),
  footer: ({ pageNumber, pageCount }) => ({
    text: `${pageNumber}/${pageCount ?? 0}`,
    textAlign: 'right',
    margin:
      pageNumber % 2
        ? { left: '25mm', right: '15mm', bottom: '1cm' }
        : { left: '15mm', right: '25mm', bottom: '1cm' },
  }),
  content: [
    {
      text: 'Lorem ipsum',
      bold: true,
      fontSize: 24,
      margin: { bottom: 10 },
      textAlign: 'center',
    },
    {
      text: [
        'dolor sit amet, consectetur ',
        { text: 'adipiscing elit,', italic: true },
        ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      ],
      lineHeight: 1.5,
      margin: { y: 5 },
    },
    {
      text: [
        'Ut enim ',
        { text: 'ad minim veniam,', italic: true },
        { text: ' quis nostrud', fontSize: 24, letterSpacing: 2.5 },
        ' exercitation ullamco laboris nisi ',
        {
          text: ['ut aliquip ', { text: 'ex ea commodo', italic: true }],
          link: 'https://example.com',
        },
        ' consequat.\n',
        { text: 'Duis aute irure', bold: true },
        ' dolor in reprehenderit in voluptate velit esse ',
        { text: 'cillum dolore', color: 'red' },
        ' eu fugiat nulla pariatur: ',
        {
          text: ['H', { text: '₂', rise: -3 }, 'O  10', { text: '⁻³', rise: 3 }],
          color: '#0066cc',
        },
      ],
      padding: { left: '18mm' },
      margin: { y: 5 },
    },
    {
      text: 'Text and graphics',
      graphics: ({ width, height }) => [
        { type: 'rect', x: 0, y: 0, width: 20, height: 20, fillColor: 'red' },
        { type: 'line', x1: 0, y1: height, x2: width, y2: height, lineWidth: 0.5 },
      ],
      padding: { left: 15, y: 5 },
      margin: { y: 5 },
    },
    {
      columns: [
        {
          graphics: [
            { type: 'line', x1: 10, y1: 10, x2: 80, y2: 10, lineDash: [5, 2, 1, 2] },
            {
              type: 'line',
              x1: 10,
              y1: 17,
              x2: 80,
              y2: 17,
              lineWidth: 2,
              lineCap: 'round',
              lineDash: [0, 4],
              lineColor: '#4488cc',
            },
            { type: 'line', x1: 10, y1: 27, x2: 80, y2: 27, lineWidth: 7 },
            { type: 'line', x1: 10, y1: 39, x2: 80, y2: 39, lineWidth: 7, lineCap: 'round' },
            { type: 'line', x1: 10, y1: 51, x2: 80, y2: 51, lineWidth: 7, lineCap: 'square' },
            { type: 'rect', x: 120, y: 10, width: 22, height: 22 },
            { type: 'rect', x: 130, y: 20, width: 22, height: 22, fillColor: '#cccccc' },
            {
              type: 'rect',
              x: 140,
              y: 30,
              width: 22,
              height: 22,
              lineColor: '#4488cc',
              lineWidth: 2,
              lineJoin: 'round',
            },
            {
              type: 'rect',
              x: 150,
              y: 40,
              width: 22,
              height: 22,
              fillColor: '#cccccc',
              lineColor: '#4488cc',
              lineJoin: 'bevel',
              lineWidth: 2,
            },
            {
              type: 'path',
              d: 'M 10,40 c 20,0 20,-30 40,-30 s 20,30 40,30 s 20,-30 40,-30 s 20,30 40,30',
              lineWidth: 1,
              lineColor: 'red',
              translate: { x: 15, y: 50 },
            },
            {
              type: 'polyline',
              points: [
                { x: 45, y: 0 },
                { x: 15, y: 94 },
                { x: 90, y: 34 },
                { x: 0, y: 34 },
                { x: 75, y: 94 },
              ],
              closePath: true,
              fillColor: '#4488cc',
              translate: { x: 10, y: 76 },
            },
            {
              type: 'polyline',
              points: [
                { x: 45, y: 0 },
                { x: 15, y: 94 },
                { x: 90, y: 34 },
                { x: 0, y: 34 },
                { x: 75, y: 94 },
              ],
              closePath: true,
              fillColor: '#cccccc',
              lineColor: '#4488cc',
              lineJoin: 'round',
              lineDash: [4, 2],
              translate: { x: 110, y: 76 },
            },
          ],
          width: '3in',
          height: '2.5in',
          margin: 7,
        },
        {
          rows: [
            {
              text:
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
                ' incididunt ut labore et dolore magna aliqua.',
              margin: { y: 3 },
            },
            {
              text:
                'Ut enim ad minim veniam, quis nostrud' +
                ' exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
              margin: { y: 3 },
            },
            {
              graphics: [
                {
                  type: 'rect',
                  x: 10,
                  y: 20,
                  width: 30,
                  height: 30,
                  fillColor: '#4488ee',
                  fillOpacity: 0.5,
                },
                {
                  type: 'rect',
                  x: 20,
                  y: 30,
                  width: 30,
                  height: 30,
                  fillColor: '#eecc55',
                  fillOpacity: 0.5,
                },
                {
                  type: 'rect',
                  x: 30,
                  y: 40,
                  width: 30,
                  height: 30,
                  fillColor: '#cc4433',
                  fillOpacity: 0.5,
                },
                {
                  type: 'rect',
                  x: 70,
                  y: 20,
                  width: 30,
                  height: 30,
                  lineWidth: 5,
                  lineColor: '#4488ee',
                  lineOpacity: 0.5,
                },
                {
                  type: 'rect',
                  x: 80,
                  y: 30,
                  width: 30,
                  height: 30,
                  lineWidth: 5,
                  lineColor: '#eecc55',
                  lineOpacity: 0.5,
                },
                {
                  type: 'rect',
                  x: 90,
                  y: 40,
                  width: 30,
                  height: 30,
                  lineWidth: 5,
                  lineColor: '#cc4433',
                  lineOpacity: 0.5,
                },
                {
                  type: 'circle',
                  cx: 142,
                  cy: 32,
                  r: 13,
                  lineWidth: 5,
                  lineColor: '#4488ee',
                  lineOpacity: 0.5,
                },
                {
                  type: 'circle',
                  cx: 155,
                  cy: 45,
                  r: 13,
                  lineWidth: 5,
                  lineColor: '#eecc55',
                  lineOpacity: 0.5,
                },
                {
                  type: 'circle',
                  cx: 168,
                  cy: 58,
                  r: 13,
                  lineWidth: 5,
                  lineColor: '#cc4433',
                  lineOpacity: 0.5,
                },
                {
                  type: 'circle',
                  cx: 135,
                  cy: 65,
                  r: 5,
                  fillColor: '#cc4433',
                  fillOpacity: 0.5,
                },
                {
                  type: 'circle',
                  cx: 155,
                  cy: 45,
                  r: 5,
                  fillColor: '#eecc55',
                  fillOpacity: 0.5,
                },
                {
                  type: 'circle',
                  cx: 175,
                  cy: 25,
                  r: 5,
                  fillColor: '#4488ee',
                  fillOpacity: 0.5,
                },
              ],
              height: 80,
            },
          ],
          padding: 5,
          fontSize: 9,
          margin: 7,
          textAlign: 'right',
        },
      ],
    },
    {
      columns: [
        { image: 'liberty', padding: 5, width: 100, verticalAlign: 'middle' },
        {
          rows: [
            { image: 'liberty', height: 75, imageAlign: 'left' },
            { image: 'liberty', height: 75, imageAlign: 'center' },
            { image: 'torus', height: 75, imageAlign: 'right' },
          ],
          padding: 5,
        },
      ],
    },
    {
      rows: [
        {
          text: 'Contents',
          fontSize: 18,
          margin: { bottom: 5 },
        },
        ...range(10).map((n) => ({
          text: `Paragraph ${n + 1}`,
          link: `#par:${n + 1}`,
        })),
      ],
      margin: { bottom: 10 },
      breakBefore: 'always',
    },
    ...range(10).map((n) => ({
      rows: [
        {
          text: `Paragraph ${n + 1}`,
          breakAfter: 'avoid',
        },
        {
          text: [
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
              ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud' +
              ' exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure' +
              ' dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' +
              ' Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt ',
            { text: 'mollit anim id est laborum.', italic: true },
          ],
        },
      ],
      id: `par:${n + 1}`,
      margin: { top: 5 },
      fontSize: 10,
      insertAfterBreak: () => ({ text: '…continued', fontSize: 8, margin: { bottom: 2 } }),
    })),
  ],
};

function range(n) {
  return [...Array(n).keys()];
}
