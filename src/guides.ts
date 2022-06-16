import { rgb } from 'pdf-lib';

import { Frame } from './layout.js';
import { GraphicsObject } from './read-graphics.js';

const lineWidth = 0.5;
const lineOpacity = 0.25;

export function createGuides(frame: Frame): GraphicsObject {
  const { width, height } = frame;
  const lineColor = getColor(frame.type);
  return {
    type: 'graphics',
    shapes: [{ type: 'rect', x: 0, y: 0, width, height, lineColor, lineWidth, lineOpacity }],
  };
}

function getColor(type: string) {
  switch (type) {
    case 'page':
      return rgb(1, 0, 0);
    case 'text':
    case 'image':
      return rgb(0, 0, 1);
    default:
      return rgb(0, 0, 0);
  }
}
