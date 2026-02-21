import type { ContentStream } from '@ralfstx/pdf-core';
import { ExtGState } from '@ralfstx/pdf-core';

import type { LineCap, LineJoin } from '../api/graphics.ts';
import type { Pos } from '../box.ts';
import { setFillingColor, setStrokingColor } from '../colors.ts';
import type {
  CircleObject,
  FillAttrs,
  GraphicsObject,
  LineAttrs,
  LineObject,
  PathObject,
  PolylineObject,
  RectObject,
  Shape,
} from '../frame.ts';
import type { Page } from '../page.ts';
import { drawSvgPath } from '../svg-paths.ts';
import { multiplyMatrices, round } from '../util/utils.ts';

// See https://stackoverflow.com/a/27863181/247159
const KAPPA = (4 * (Math.sqrt(2) - 1)) / 3;

export function renderGraphics(object: GraphicsObject, page: Page, base: Pos) {
  const pos = tr(base, page);
  const cs = page.pdfPage.contentStream;
  cs.saveGraphicsState().applyTransformMatrix(1, 0, 0, -1, pos.x, pos.y);
  object.shapes.forEach((shape) => {
    cs.saveGraphicsState();
    setStyleAttrs(cs, shape);
    if (shape.type === 'rect') {
      drawRect(cs, shape);
    }
    if (shape.type === 'circle') {
      drawCircle(cs, shape);
    }
    if (shape.type === 'line') {
      drawLine(cs, shape);
    }
    if (shape.type === 'polyline') {
      drawPolyLine(cs, shape);
    }
    if (shape.type === 'path') {
      drawPath(cs, shape);
    }
    cs.restoreGraphicsState();
  });
  cs.restoreGraphicsState();
}

function drawRect(cs: ContentStream, obj: RectObject): void {
  cs.rect(obj.x, obj.y, obj.width, obj.height);
  fillAndStrokePath(cs, obj);
}

function drawCircle(cs: ContentStream, obj: CircleObject): void {
  const { cx, cy, r } = obj;
  const o = r * KAPPA;

  cs.moveTo(cx - r, cy);
  cs.curveTo(cx - r, cy - o, cx - o, cy - r, cx, cy - r);
  cs.curveTo(cx + o, cy - r, cx + r, cy - o, cx + r, cy);
  cs.curveTo(cx + r, cy + o, cx + o, cy + r, cx, cy + r);
  cs.curveTo(cx - o, cy + r, cx - r, cy + o, cx - r, cy);
  fillAndStrokePath(cs, obj);
}

function drawLine(cs: ContentStream, obj: LineObject): void {
  cs.moveTo(obj.x1, obj.y1);
  cs.lineTo(obj.x2, obj.y2);
  cs.stroke();
}

function drawPolyLine(cs: ContentStream, obj: PolylineObject): void {
  pathOperations(cs, obj.points);
  if (obj.closePath) cs.closePath();
  fillAndStrokePath(cs, obj);
}

function drawPath(cs: ContentStream, obj: PathObject) {
  drawSvgPath(cs, obj.commands);
  fillAndStrokePath(cs, obj);
}

function pathOperations(cs: ContentStream, points: { x: number; y: number }[]): void {
  let started = false;
  for (const p of points) {
    if (!started) {
      cs.moveTo(p.x, p.y);
      started = true;
    } else {
      cs.lineTo(p.x, p.y);
    }
  }
}

function fillAndStrokePath(cs: ContentStream, obj: LineAttrs & FillAttrs) {
  const hasFill = !!obj.fillColor;
  const hasStroke = !!obj.lineColor || !!obj.lineWidth;
  if (hasFill && hasStroke) return cs.fillAndStroke();
  if (hasFill) return cs.fill();
  return cs.stroke(); // fall back to stroke to avoid invisible shapes
}

export const LineCapStyle = {
  butt: 0,
  round: 1,
  square: 2,
} as const;

const trLineCap = (lineCap: LineCap) => LineCapStyle[lineCap];

export const LineJoinStyle = {
  miter: 0,
  round: 1,
  bevel: 2,
} as const;

const trLineJoin = (lineJoin: LineJoin) => LineJoinStyle[lineJoin];

function setStyleAttrs(cs: ContentStream, shape: Shape): void {
  const extGraphicsState = getExtGraphicsStateForShape(shape);
  const attrs = shape as LineAttrs & FillAttrs;

  createMatrix(cs, shape);

  if (extGraphicsState !== undefined) cs.setGraphicsState(extGraphicsState);
  if (attrs.fillColor !== undefined) setFillingColor(cs, attrs.fillColor);
  if (attrs.lineColor !== undefined) setStrokingColor(cs, attrs.lineColor);
  if (attrs.lineWidth !== undefined) cs.setLineWidth(attrs.lineWidth);
  if (attrs.lineCap !== undefined) cs.setLineCap(trLineCap(attrs.lineCap));
  if (attrs.lineJoin !== undefined) cs.setLineJoin(trLineJoin(attrs.lineJoin));
  if (attrs.lineDash !== undefined) cs.setDashPattern(attrs.lineDash, 0);
}

function createMatrix(cs: ContentStream, shape: Shape) {
  const matrices = [];
  if ('translate' in shape && (shape.translate?.x || shape.translate?.y)) {
    const x = shape.translate.x ?? 0;
    const y = shape.translate.y ?? 0;
    matrices.push([1, 0, 0, 1, x, y]);
  }
  if ('scale' in shape && (shape.scale?.x || shape.scale?.y)) {
    const x = shape.scale.x ?? 1;
    const y = shape.scale.y ?? 1;
    matrices.push([x, 0, 0, y, 0, 0]);
  }
  if ('rotate' in shape && shape.rotate) {
    const cx = shape.rotate.cx ?? 0;
    const cy = shape.rotate.cy ?? 0;
    const angle = shape.rotate.angle * (Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = cx - cx * cos + cy * sin;
    const dy = cy - cx * sin - cy * cos;
    matrices.push([cos, sin, -sin, cos, dx, dy]);
  }
  if ('skew' in shape && (shape.skew?.x || shape.skew?.y)) {
    const angleX = (shape.skew.x ?? 0) * (Math.PI / 180);
    const angleY = (shape.skew.y ?? 0) * (Math.PI / 180);
    const tanX = Math.tan(angleX);
    const tanY = Math.tan(angleY);
    matrices.push([1, tanY, tanX, 1, 0, 0]);
  }
  if ('matrix' in shape && shape.matrix) {
    matrices.push(shape.matrix);
  }
  if (matrices.length) {
    const [a, b, c, d, e, f] = matrices.reduce(multiplyMatrices, [1, 0, 0, 1, 0, 0]);
    cs.applyTransformMatrix(round(a), round(b), round(c), round(d), round(e), round(f));
  }
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}

function getExtGraphicsStateForShape(shape: {
  lineOpacity?: number;
  fillOpacity?: number;
}): ExtGState | undefined {
  const { lineOpacity, fillOpacity } = shape;
  if (lineOpacity != null || fillOpacity != null) {
    const graphicsParams = {
      strokeOpacity: lineOpacity ?? 1,
      fillOpacity: fillOpacity ?? 1,
    };
    return new ExtGState(graphicsParams);
  }
}
