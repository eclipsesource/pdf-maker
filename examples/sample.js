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
    liberty: { data: readFileSync('examples/liberty.jpg') },
  },
  pageSize: 'A4',
  margin: { x: '2.5cm', top: '2.5cm', bottom: '2cm' },
  defaultStyle: {
    fontSize: 14,
  },
  header: {
    columns: [{ text: 'PDF Maker' }, { text: 'sample', textAlign: 'right' }],
    margin: { x: '2.5cm', top: '1cm' },
  },
  footer: ({ pageNumber, pageCount }) => ({
    text: `${pageNumber}/${pageCount}`,
    textAlign: 'right',
    margin: { x: '2.5cm', bottom: '1cm' },
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
        { text: ' quis nostrud', fontSize: 28 },
        ' exercitation ullamco laboris nisi ',
        {
          text: ['ut aliquip ', { text: 'ex ea commodo', italic: true }],
          link: 'https://example.com',
        },
        ' consequat.\n',
        { text: 'Duis aute irure', bold: true },
        ' dolor in reprehenderit in voluptate velit esse ',
        { text: 'cillum dolore', color: 'red' },
        ' eu fugiat nulla pariatur.',
      ],
      padding: { left: '18mm' },
      margin: { y: 5 },
    },
    {
      text: 'Text and graphics',
      graphics: ({ width, height }) => [
        { type: 'rect', x: 0, y: 0, width: 10, height: 20, fillColor: 'red' },
        { type: 'line', x1: 0, y1: height, x2: width, y2: height, lineWidth: 0.5 },
      ],
      padding: { left: 15, y: 5 },
      margin: { y: 5 },
    },
    {
      columns: [
        {
          graphics: [
            { type: 'line', x1: 10, y1: 10, x2: 80, y2: 10 },
            { type: 'line', x1: 10, y1: 17, x2: 80, y2: 17, lineColor: '#4488cc' },
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
              type: 'polyline',
              points: [
                { x: 50, y: 76 },
                { x: 20, y: 170 },
                { x: 95, y: 110 },
                { x: 5, y: 110 },
                { x: 80, y: 170 },
              ],
              closePath: true,
              fillColor: '#4488cc',
            },
            {
              type: 'polyline',
              points: [
                { x: 150, y: 76 },
                { x: 120, y: 170 },
                { x: 195, y: 110 },
                { x: 105, y: 110 },
                { x: 180, y: 170 },
              ],
              closePath: true,
              fillColor: '#cccccc',
              lineColor: '#4488cc',
              lineWidth: 2,
              lineJoin: 'round',
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
          ],
          fontSize: 9,
          margin: 7,
          textAlign: 'right',
        },
      ],
    },
    {
      image: 'liberty',
      height: 200,
      imageAlign: 'right',
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
    },
    ...range(10).map((n) => ({
      text:
        `(${n + 1})` +
        ' Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
        ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud' +
        ' exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure' +
        ' dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' +
        ' Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt' +
        ' mollit anim id est laborum.',
      id: `par:${n + 1}`,
    })),
  ],
};

function range(n) {
  return [...Array(n).keys()];
}
