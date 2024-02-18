import { Font } from './fonts.ts';
import { Image } from './images.ts';
import { Color } from './read-color.ts';
import { PathCommand } from './svg-paths.ts';

/**
 * Frames are created during the layout process. They have a position
 * relative to their parent, a size, and render objects to be rendered.
 * Frames can contain children that represent nested blocks, e.g. in a
 * row or column layout.
 */
export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  objects?: RenderObject[];
  children?: Frame[];
};

export type RenderObject = TextObject | LinkObject | AnchorObject | ImageObject | GraphicsObject;

export type TextObject = {
  type: 'text';
  rows: TextRowObject[];
};

export type TextRowObject = {
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  segments: TextSegmentObject[];
};

export type TextSegmentObject = {
  text: string;
  font: Font;
  fontSize: number;
  color?: Color;
  rise?: number;
  letterSpacing?: number;
};

export type LinkObject = {
  type: 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

export type AnchorObject = {
  type: 'anchor';
  name: string;
  x: number;
  y: number;
};

export type ImageObject = {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  image: Image;
};

export type GraphicsObject = {
  type: 'graphics';
  shapes: Shape[];
};

export type Shape = RectObject | CircleObject | LineObject | PolylineObject | PathObject;

type LineCap = 'butt' | 'round' | 'square';
type LineJoin = 'miter' | 'round' | 'bevel';

export type LineAttrs = {
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  lineDash?: number[];
};

export type FillAttrs = {
  fillColor?: Color;
  fillOpacity?: number;
};

type TransformAttrs = {
  translate?: { x?: number; y?: number };
  scale?: { x?: number; y?: number };
  rotate?: { angle: number; cx?: number; cy?: number };
  skew?: { x?: number; y?: number };
  matrix?: number[];
};

export type RectObject = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
} & Omit<LineAttrs, 'lineCap'> &
  FillAttrs &
  TransformAttrs;

export type CircleObject = {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
} & Omit<LineAttrs, 'lineCap' | 'lineJoin'> &
  FillAttrs &
  TransformAttrs;

export type LineObject = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} & Omit<LineAttrs, 'lineJoin'> &
  TransformAttrs;

export type PolylineObject = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
} & LineAttrs &
  FillAttrs &
  TransformAttrs;

export type PathObject = {
  type: 'path';
  commands: PathCommand[];
} & LineAttrs &
  FillAttrs &
  TransformAttrs;
