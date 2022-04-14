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
      graphics: [
        {
          type: 'rect',
          x: -15,
          y: 0,
          width: 10,
          height: 20,
          fillColor: 'red',
        },
        { type: 'line', x1: 0, y1: 30, x2: 150, y2: 30, strokeWidth: 0.5, strokeColor: '#239842' },
      ],
      padding: { left: 15, top: 5, bottom: 15 },
      margin: { y: 5 },
    },
    {
      columns: [
        {
          graphics: [
            {
              type: 'polyline',
              strokeWidth: 2,
              fillColor: '#4488cc',
              strokeColor: 'white',
              points: [
                { x: 100, y: 10 },
                { x: 40, y: 198 },
                { x: 190, y: 78 },
                { x: 10, y: 78 },
                { x: 160, y: 198 },
              ],
              closePath: true,
            },
          ],
          width: '3in',
          height: '3in',
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
