import { rgb } from 'pdf-lib';

import { Frame } from './layout.js';
import { GraphicsObject } from './read-graphics.js';

const lineWidth = 0.5;
const lineOpacity = 0.25;

export function createRowGuides(width: number, height: number, baseline: number): GraphicsObject {
  const lineColor = rgb(0, 0.5, 0);
  const yb = height - baseline;
  return {
    type: 'graphics',
    shapes: [
      { type: 'rect', x: 0, y: 0, width, height, lineColor, lineWidth, lineOpacity },
      { type: 'line', x1: 0, y1: yb, x2: width, y2: yb, lineColor, lineWidth, lineOpacity },
    ],
  };
}

export function createFrameGuides(frame: Frame): GraphicsObject {
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
