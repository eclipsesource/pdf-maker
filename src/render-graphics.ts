import {
  asPDFNumber,
  closePath,
  fill,
  fillAndStroke,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  PDFOperator,
  popGraphicsState,
  pushGraphicsState,
  setFillingColor,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  stroke,
  translate,
} from 'pdf-lib';

import { Pos } from './box.js';
import { Page } from './page.js';
import { GraphicsObject, LineObject, PolylineObject, RectObject } from './read-graphics.js';

export function renderGraphics(objects: GraphicsObject[], page: Page, base: Pos) {
  const pos = tr(base, page);
  const operators = [];
  operators.push(pushGraphicsState(), translate(pos.x, pos.y));
  objects?.forEach((object) => {
    operators.push(pushGraphicsState(), ...setStyleAttrs(object));
    if (object.type === 'line') {
      operators.push(...drawLine(object));
    }
    if (object.type === 'rect') {
      operators.push(...drawRect(object));
    }
    if (object.type === 'polyline') {
      operators.push(...drawPolyLine(object));
    }
    operators.push(popGraphicsState());
  });
  operators.push(popGraphicsState());
  (page.pdfPage as any).getContentStream().push(...operators);
}

function drawLine(obj: LineObject): PDFOperator[] {
  return [moveTo(obj.x1, -obj.y1), lineTo(obj.x2, -obj.y2), stroke()].filter(Boolean);
}

function drawRect(obj: RectObject): PDFOperator[] {
  return [
    createRect(obj.x, -obj.y, obj.width, -obj.height),
    drawPath(!!obj.fillColor, !!obj.strokeColor),
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

function drawPolyLine(obj: PolylineObject): PDFOperator[] {
  return [
    ...pathOperations(obj.points),
    obj.closePath && closePath(),
    drawPath(!!obj.fillColor, !!obj.strokeColor),
  ].filter(Boolean);
}

function pathOperations(points: { x: number; y: number }[]): any[] {
  return points.reduce((a, p) => [...a, (a.length ? lineTo : moveTo)(p.x, -p.y)], []);
}

function drawPath(hasFillColor: boolean, hasStrokeColor: boolean) {
  if (hasFillColor && hasStrokeColor) return fillAndStroke();
  if (hasStrokeColor) return stroke();
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

function setStyleAttrs(obj: GraphicsObject): PDFOperator[] {
  return [
    'fillColor' in obj && setFillingColor(obj.fillColor),
    'strokeColor' in obj && setStrokingColor(obj.strokeColor),
    'strokeWidth' in obj && setLineWidth(obj.strokeWidth),
    'lineCap' in obj && setLineCap(trLineCap(obj.lineCap)),
    'lineJoin' in obj && setLineJoin(trLineJoin(obj.lineJoin)),
  ].filter(Boolean);
}

function tr(pos: Pos, page: Page): Pos {
  return { x: pos.x, y: page.size.height - pos.y };
}
