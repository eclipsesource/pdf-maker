import {
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
import { GraphicsObject, LineObject, PolylineObject, RectObject, Shape } from './read-graphics.js';

export function renderGraphics(object: GraphicsObject, page: Page, base: Pos) {
  const pos = tr(base, page);
  const contentStream = (page.pdfPage as any).getContentStream();
  contentStream.push(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, -1, pos.x, pos.y));
  object.shapes.forEach((shape) => {
    contentStream.push(pushGraphicsState(), ...setStyleAttrs(shape, page));
    if (shape.type === 'line') {
      contentStream.push(...drawLine(shape));
    }
    if (shape.type === 'rect') {
      contentStream.push(...drawRect(shape));
    }
    if (shape.type === 'polyline') {
      contentStream.push(...drawPolyLine(shape));
    }
    contentStream.push(popGraphicsState());
  });
  contentStream.push(popGraphicsState());
}

function drawLine(obj: LineObject): PDFOperator[] {
  return [moveTo(obj.x1, obj.y1), lineTo(obj.x2, obj.y2), stroke()].filter(Boolean);
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
