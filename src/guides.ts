import { rgb } from 'pdf-lib';

import { ZERO_EDGES } from './box.js';
import { Frame, TextRowObject } from './layout/layout.js';
import { Block } from './read-block.js';
import { CircleObject, GraphicsObject, LineObject, RectObject } from './read-graphics.js';
import { compact } from './utils.js';

export function createFrameGuides(
  frame: Frame,
  block: Block & { isPage?: boolean }
): GraphicsObject {
  const { width: w, height: h } = frame;
  const { left: ml, right: mr, top: mt, bottom: mb } = block.margin ?? ZERO_EDGES;
  const { left: pl, right: pr, top: pt, bottom: pb } = block.padding ?? ZERO_EDGES;
  const { breakBefore: bb, breakAfter: ba, isPage: page } = block;
  const stroke = { lineColor: rgb(0, 0, 0), lineWidth: 0.5, lineOpacity: 0.25 };
  const fill = { fillColor: rgb(0, 0, 0), fillOpacity: 0.25 };
  const mFill = { fillColor: rgb(0.9, 0.8, 0.3), fillOpacity: 0.15 };
  const pFill = { fillColor: rgb(0.2, 0.2, 0.7), fillOpacity: 0.15 };
  const shapes = compact([
    rect({ x: 0, y: 0, width: w, height: h, ...stroke }),
    // margin
    !!mt && rect({ x: -ml, y: -mt, width: w + ml + mr, height: mt, ...mFill }),
    !!ml && rect({ x: -ml, y: 0, width: ml, height: h, ...mFill }),
    !!mr && rect({ x: w, y: 0, width: mr, height: h, ...mFill }),
    !!mb && rect({ x: -ml, y: h, width: w + ml + mr, height: mb, ...mFill }),
    // padding
    !!pt && rect({ x: 0, y: 0, width: w, height: pt, ...pFill }),
    !!pl && rect({ x: 0, y: pt, width: pl, height: h - pt - pb, ...pFill }),
    !!pr && rect({ x: w - pr, y: pt, width: pr, height: h - pt - pb, ...pFill }),
    !!pb && rect({ x: 0, y: h - pb, width: w, height: pb, ...pFill }),
    // indicators for breakBefore and breakAfter
    bb === 'avoid' && circle({ cx: 5, cy: 0, r: 3, ...fill }),
    bb === 'always' && rect({ x: 0, y: -3, width: 30, height: 3, ...fill }),
    ba === 'avoid' && circle({ cx: w - 5, cy: h, r: 3, ...fill }),
    ba === 'always' && rect({ x: w - 30, y: h, width: 30, height: 3, ...fill }),
    // for pages, separator lines for header and footer
    page && line({ x1: -ml, y1: -mt, x2: w + mr + ml, y2: -mt, ...stroke }),
    page && line({ x1: -ml, y1: h + mb, x2: w + mr + ml, y2: h + mb, ...stroke }),
  ]);
  return { type: 'graphics', shapes };
}

export function createRowGuides({ x, y, width, height, baseline }: TextRowObject): GraphicsObject {
  const stroke = { lineColor: rgb(0, 0.5, 0), lineWidth: 0.5, lineOpacity: 0.25 };
  const fill = { fillColor: rgb(0, 0.5, 0), fillOpacity: 0.25 };
  const by = y + baseline;
  const shapes = [
    rect({ x, y, width: 3, height: 3, ...fill }),
    rect({ x, y, width, height, ...stroke }),
    line({ x1: x, y1: by, x2: x + width, y2: by, ...stroke }),
  ];
  return { type: 'graphics', shapes };
}

function rect(args: Omit<RectObject, 'type'>): RectObject {
  return { type: 'rect', ...args };
}

function circle(args: Omit<CircleObject, 'type'>): CircleObject {
  return { type: 'circle', ...args };
}

function line(args: Omit<LineObject, 'type'>): LineObject {
  return { type: 'line', ...args };
}
