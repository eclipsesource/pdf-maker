import { rgb } from 'pdf-lib';

import { Box } from './box.js';
import { Page } from './page.js';

export function renderGuide(page: Page, box: Box, type: string) {
  if (page.guides) {
    const { x, y, width, height } = box;
    const color = getColor(type);
    page.pdfPage.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: color,
      borderWidth: 0.5,
      borderOpacity: 0.25,
    });
  }
}

function getColor(type: string) {
  switch (type) {
    case 'page':
      return rgb(1, 0, 0);
    case 'text':
    case 'image':
      return rgb(0, 0, 1);
    case 'row':
      return rgb(0, 0.5, 0);
    default:
      return rgb(0, 0, 0);
  }
}
