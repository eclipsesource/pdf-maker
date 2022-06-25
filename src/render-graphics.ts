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
  setFillingColor,
  setGraphicsState,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  stroke,
} from 'pdf-lib';

import { Pos } from './box.js';
import { getPageGraphicsState, Page } from './page.js';
import {
  CircleObject,
  GraphicsObject,
  LineObject,
  PolylineObject,
  RectObject,
  Shape,
} from './read-graphics.js';

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
    contentStream.push(popGraphicsState());
  });
  contentStream.push(popGraphicsState());
}

function drawRect(obj: RectObject): PDFOperator[] {
  return [
    createRect(obj.x, obj.y, obj.width, obj.height),
    drawPath(!!obj.fillColor, !!obj.lineColor),
  ].filter(Boolean);
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
  return [
    moveTo(cx - r, cy),
    appendBezierCurve(cx - r, cy - o, cx - o, cy - r, cx, cy - r),
    appendBezierCurve(cx + o, cy - r, cx + r, cy - o, cx + r, cy),
    appendBezierCurve(cx + r, cy + o, cx + o, cy + r, cx, cy + r),
    appendBezierCurve(cx - o, cy + r, cx - r, cy + o, cx - r, cy),
    drawPath(!!obj.fillColor, !!obj.lineColor),
  ].filter(Boolean);
}

function drawLine(obj: LineObject): PDFOperator[] {
  return [moveTo(obj.x1, obj.y1), lineTo(obj.x2, obj.y2), stroke()].filter(Boolean);
}

function drawPolyLine(obj: PolylineObject): PDFOperator[] {
  return [
    ...pathOperations(obj.points),
    obj.closePath && closePath(),
    drawPath(!!obj.fillColor, !!obj.lineColor),
  ].filter(Boolean);
}

function pathOperations(points: { x: number; y: number }[]): any[] {
  return points.reduce((a, p) => [...a, (a.length ? lineTo : moveTo)(p.x, p.y)], []);
}

function drawPath(hasFillColor: boolean, haslineColor: boolean) {
  if (hasFillColor && haslineColor) return fillAndStroke();
  if (haslineColor) return stroke();
  return fill(); // fall back to a black shape
}

const lineCapTr = {
  butt: LineCapStyle.Butt,
  round: LineCapStyle.Round,
  square: LineCapStyle.Projecting,
};
const trLineCap = (lineCap: string) => lineCapTr[lineCap];

const lineJoinTr = {
  miter: LineJoinStyle.Miter,
  round: LineJoinStyle.Round,
  bevel: LineJoinStyle.Bevel,
};
const trLineJoin = (lineJoin: string) => lineJoinTr[lineJoin];

function setStyleAttrs(shape: Shape, page: Page): PDFOperator[] {
  const graphicsState = getGraphicsState(shape, page);
  return [
    graphicsState && setGraphicsState(graphicsState),
    'fillColor' in shape && setFillingColor(shape.fillColor),
    'lineColor' in shape && setStrokingColor(shape.lineColor),
    'lineWidth' in shape && setLineWidth(shape.lineWidth),
    'lineCap' in shape && setLineCap(trLineCap(shape.lineCap)),
    'lineJoin' in shape && setLineJoin(trLineJoin(shape.lineJoin)),
  ].filter(Boolean);
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}

function getGraphicsState(shape: Shape, page: Page): PDFName {
  const { lineOpacity, fillOpacity } = shape as { lineOpacity: number; fillOpacity: number };
  if (lineOpacity != null || fillOpacity != null) {
    const graphicsState = {
      CA: lineOpacity ?? 1,
      ca: fillOpacity ?? 1,
    };
    return getPageGraphicsState(page, graphicsState);
  }
}
