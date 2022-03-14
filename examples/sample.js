/* eslint-disable import/no-default-export */
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
  margin: { x: '2.5cm', top: '2cm', bottom: '1.5cm' },
  content: [
    { text: 'Lorem ipsum', bold: true, fontSize: 24, lineHeight: 1.5 },
    { text: ['dolor sit amet, consectetur ', { text: 'adipiscing elit,', italic: true }] },
    { text: 'sed do eiusmod tempor incididunt ut labore' },
    { text: ['et ', { text: 'dolore magna', bold: true, italic: true }, ' aliqua.'] },
  ],
};
