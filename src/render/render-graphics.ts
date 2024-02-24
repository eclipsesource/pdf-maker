import type { PDFName } from 'pdf-lib';
import {
  appendBezierCurve,
  asPDFNumber,
  closePath,
  concatTransformationMatrix,
  fill,
  fillAndStroke,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  PDFOperator,
  popGraphicsState,
  pushGraphicsState,
  setDashPattern,
  setFillingColor,
  setGraphicsState,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  stroke,
} from 'pdf-lib';

import type { LineCap, LineJoin } from '../api/content.ts';
import type { Pos } from '../box.ts';
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
import { getExtGraphicsState } from '../page.ts';
import { svgPathToPdfOps } from '../svg-paths.ts';
import { compact, multiplyMatrices, round } from '../utils.ts';

// See https://stackoverflow.com/a/27863181/247159
const KAPPA = (4 * (Math.sqrt(2) - 1)) / 3;

export function renderGraphics(object: GraphicsObject, page: Page, base: Pos) {
  const pos = tr(base, page);
  const contentStream = (page.pdfPage as any).getContentStream();
  contentStream.push(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, -1, pos.x, pos.y));
  object.shapes.forEach((shape) => {
    contentStream.push(pushGraphicsState(), ...setStyleAttrs(shape, page));
    if (shape.type === 'rect') {
      contentStream.push(...drawRect(shape));
    }
    if (shape.type === 'circle') {
      contentStream.push(...drawCircle(shape));
    }
    if (shape.type === 'line') {
      contentStream.push(...drawLine(shape));
    }
    if (shape.type === 'polyline') {
      contentStream.push(...drawPolyLine(shape));
    }
    if (shape.type === 'path') {
      contentStream.push(...drawPath(shape));
    }
    contentStream.push(popGraphicsState());
  });
  contentStream.push(popGraphicsState());
}

function drawRect(obj: RectObject): PDFOperator[] {
  return compact([createRect(obj.x, obj.y, obj.width, obj.height), fillAndStrokePath(obj)]);
}

function createRect(x: number, y: number, width: number, height: number) {
  return PDFOperator.of('re' as any, [
    asPDFNumber(x),
    asPDFNumber(y),
    asPDFNumber(width),
    asPDFNumber(height),
  ]);
}

function drawCircle(obj: CircleObject): PDFOperator[] {
  const { cx, cy, r } = obj;
  const o = r * KAPPA;
  return compact([
    moveTo(cx - r, cy),
    appendBezierCurve(cx - r, cy - o, cx - o, cy - r, cx, cy - r),
    appendBezierCurve(cx + o, cy - r, cx + r, cy - o, cx + r, cy),
    appendBezierCurve(cx + r, cy + o, cx + o, cy + r, cx, cy + r),
    appendBezierCurve(cx - o, cy + r, cx - r, cy + o, cx - r, cy),
    fillAndStrokePath(obj),
  ]);
}

function drawLine(obj: LineObject): PDFOperator[] {
  return compact([moveTo(obj.x1, obj.y1), lineTo(obj.x2, obj.y2), stroke()]);
}

function drawPolyLine(obj: PolylineObject): PDFOperator[] {
  return compact([
    ...pathOperations(obj.points),
    obj.closePath && closePath(),
    fillAndStrokePath(obj),
  ]);
}

function drawPath(obj: PathObject): PDFOperator[] {
  return compact([...svgPathToPdfOps(obj.commands), fillAndStrokePath(obj)]);
}

function pathOperations(points: { x: number; y: number }[]): PDFOperator[] {
  return points.reduce((a: PDFOperator[], p) => [...a, (a.length ? lineTo : moveTo)(p.x, p.y)], []);
}

function fillAndStrokePath(obj: LineAttrs & FillAttrs): PDFOperator {
  const hasFill = !!obj.fillColor;
  const hasStroke = !!obj.lineColor || !!obj.lineWidth;
  if (hasFill && hasStroke) return fillAndStroke();
  if (hasFill) return fill();
  return stroke(); // fall back to stroke to avoid invisible shapes
}

const lineCapTr = {
  butt: LineCapStyle.Butt,
  round: LineCapStyle.Round,
  square: LineCapStyle.Projecting,
};
const trLineCap = (lineCap: LineCap) => lineCapTr[lineCap];

const lineJoinTr = {
  miter: LineJoinStyle.Miter,
  round: LineJoinStyle.Round,
  bevel: LineJoinStyle.Bevel,
};
const trLineJoin = (lineJoin: LineJoin) => lineJoinTr[lineJoin];

function setStyleAttrs(shape: Shape, page: Page): PDFOperator[] {
  const extGraphicsState = getExtGraphicsStateForShape(page, shape);
  const attrs = shape as LineAttrs & FillAttrs;
  return compact([
    createMatrix(shape),
    extGraphicsState && setGraphicsState(extGraphicsState),
    attrs.fillColor !== undefined && setFillingColor(attrs.fillColor),
    attrs.lineColor !== undefined && setStrokingColor(attrs.lineColor),
    attrs.lineWidth !== undefined && setLineWidth(attrs.lineWidth),
    attrs.lineCap !== undefined && setLineCap(trLineCap(attrs.lineCap)),
    attrs.lineJoin !== undefined && setLineJoin(trLineJoin(attrs.lineJoin)),
    attrs.lineDash !== undefined && setDashPattern(attrs.lineDash, 0),
  ]);
}

function createMatrix(shape: Shape) {
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
    return concatTransformationMatrix(round(a), round(b), round(c), round(d), round(e), round(f));
  }
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}

function getExtGraphicsStateForShape(
  page: Page,
  shape: { lineOpacity?: number; fillOpacity?: number },
): PDFName | undefined {
  const { lineOpacity, fillOpacity } = shape;
  if (lineOpacity != null || fillOpacity != null) {
    const graphicsParams = {
      CA: lineOpacity ?? 1,
      ca: fillOpacity ?? 1,
    };
    return getExtGraphicsState(page, graphicsParams);
  }
}
