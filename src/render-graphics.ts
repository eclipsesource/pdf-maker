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
  PDFName,
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

import { Pos } from './box.js';
import { LineCap, LineJoin } from './content.js';
import { getExtGraphicsState, Page } from './page.js';
import {
  CircleObject,
  GraphicsObject,
  LineObject,
  PathObject,
  PolylineObject,
  RectObject,
  Shape,
} from './read-graphics.js';
import { svgPathToPdfOps } from './svg-paths.js';
import { compact } from './utils.js';

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
  return compact([
    createRect(obj.x, obj.y, obj.width, obj.height),
    fillAndStrokePath(!!obj.fillColor, !!obj.lineColor),
  ]);
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
    fillAndStrokePath(!!obj.fillColor, !!obj.lineColor),
  ]);
}

function drawLine(obj: LineObject): PDFOperator[] {
  return compact([moveTo(obj.x1, obj.y1), lineTo(obj.x2, obj.y2), stroke()]);
}

function drawPolyLine(obj: PolylineObject): PDFOperator[] {
  return compact([
    ...pathOperations(obj.points),
    obj.closePath && closePath(),
    fillAndStrokePath(!!obj.fillColor, !!obj.lineColor),
  ]);
}

function drawPath(obj: PathObject): PDFOperator[] {
  return compact([
    ...svgPathToPdfOps(obj.commands),
    fillAndStrokePath(!!obj.fillColor, !!obj.lineColor),
  ]);
}

function pathOperations(points: { x: number; y: number }[]): PDFOperator[] {
  return points.reduce((a: PDFOperator[], p) => [...a, (a.length ? lineTo : moveTo)(p.x, p.y)], []);
}

function fillAndStrokePath(hasFillColor: boolean, hasLineColor: boolean) {
  if (hasFillColor && hasLineColor) return fillAndStroke();
  if (hasLineColor) return stroke();
  return fill(); // fall back to a black shape
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
  return compact([
    extGraphicsState && setGraphicsState(extGraphicsState),
    'fillColor' in shape && setFillingColor(shape.fillColor as any),
    'lineColor' in shape && setStrokingColor(shape.lineColor as any),
    'lineWidth' in shape && setLineWidth(shape.lineWidth as any),
    'lineCap' in shape && setLineCap(trLineCap(shape.lineCap as any)),
    'lineJoin' in shape && setLineJoin(trLineJoin(shape.lineJoin as any)),
    'lineDash' in shape && setDashPattern(shape.lineDash as any, 0),
  ]);
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}

function getExtGraphicsStateForShape(page: Page, shape: Shape): PDFName | undefined {
  const { lineOpacity, fillOpacity } = shape as { lineOpacity: number; fillOpacity: number };
  if (lineOpacity != null || fillOpacity != null) {
    const graphicsParams = {
      CA: lineOpacity ?? 1,
      ca: fillOpacity ?? 1,
    };
    return getExtGraphicsState(page, graphicsParams);
  }
}
