/* eslint-disable import/no-default-export */
import fonts from './generated/fonts.js';

export default {
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
    {
      text: [
        'dolor sit amet, consectetur ',
        { text: 'adipiscing elit,', italic: true },
        ' sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      ],
    },
    {
      text: [
        'Ut enim ',
        { text: 'ad minim veniam,', italic: true },
        { text: ' quis nostrud', fontSize: 28 },
        ' exercitation ullamco laboris nisi ',
        {
          text: ['ut aliquip', { text: ' ex ea commodo', italic: true }],
        },
        ' consequat.\n',
        { text: 'Duis aute irure', bold: true },
        ' dolor in reprehenderit in voluptate velit esse ',
        'cillum dolore eu fugiat nulla pariatur.',
      ],
    },
  ],
};
