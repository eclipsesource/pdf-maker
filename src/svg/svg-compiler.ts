/*
 * Compiles a parsed SVG document into a PDF form XObject. The content
 * stream is written in SVG user space (y axis pointing down); the form
 * matrix composes the viewBox mapping with the y-axis flip. Unsupported
 * SVG features are ignored silently.
 */
import type { LineCapStyle, LineJoinStyle } from '@ralfstx/pdf-core';
import { ContentStream, ExtGState, PDFFormXObject, PDFShadingPattern } from '@ralfstx/pdf-core';

import type { Box, Size } from '../box.ts';
import type { Color } from '../colors.ts';
import { setFillingColor, setStrokingColor } from '../colors.ts';
import { drawSvgPath, parseSvgPath, type PathCommand } from '../svg-paths.ts';
import { KAPPA, round } from '../util/utils.ts';
import type { XmlElement } from '../util/xml.ts';
import { childElements } from '../util/xml.ts';
import type { Matrix } from './svg-attrs.ts';
import {
  combineMatrices,
  getMergedAttrs,
  identityMatrix,
  parseDashArray,
  parseLength,
  parseNumber,
  parseNumberList,
  parseOpacity,
  parseTransform,
  roundMatrix,
  viewportDiagonal,
} from './svg-attrs.ts';
import { getPathBBox } from './svg-bbox.ts';
import type { SvgPaint } from './svg-colors.ts';
import { black, parseSvgColor, parseSvgPaint } from './svg-colors.ts';
import { buildGradientPattern, isGradientElement } from './svg-gradients.ts';

/**
 * An SVG image compiled into a reusable form XObject, with its
 * intrinsic size in pt.
 */
export type SvgImage = {
  xobject: PDFFormXObject;
  width: number;
  height: number;
};

export type SvgContent = {
  contentStream: ContentStream;
  bbox: [number, number, number, number];
  matrix: Matrix;
  width: number;
  height: number;
};

/**
 * Compiles a parsed SVG document into a form XObject that can be drawn
 * any number of times with `drawXObject()`. When drawn with the
 * identity matrix, the image occupies the rectangle from the origin to
 * its intrinsic `width` and `height`.
 */
export function compileSvg(root: XmlElement): SvgImage {
  const { contentStream, bbox, matrix, width, height } = compileSvgContent(root);
  const xobject = new PDFFormXObject({ bbox, matrix, contentStream });
  return { xobject, width, height };
}

/**
 * Compiles a parsed SVG document into a content stream along with the
 * bounding box and matrix for the enclosing form XObject.
 */
export function compileSvgContent(root: XmlElement): SvgContent {
  if (root.name !== 'svg') {
    throw new Error(`Expected root element 'svg', got '${root.name}'`);
  }

  const viewBoxNumbers = parseNumberList(root.attrs.viewBox);
  const viewBox =
    viewBoxNumbers.length === 4 && viewBoxNumbers[2] > 0 && viewBoxNumbers[3] > 0
      ? viewBoxNumbers
      : undefined;
  const { width, height } = getIntrinsicSize(root, viewBox);
  const [minX, minY, vbWidth, vbHeight] = viewBox ?? [0, 0, width, height];

  // The viewBox is mapped onto the viewport as with
  // `preserveAspectRatio="xMidYMid meet"`: scaled uniformly to fit and
  // centered. The matrix also flips the y axis, so that the content
  // stream can be written in SVG coordinates.
  const scale = Math.min(width / vbWidth, height / vbHeight);
  const offsetX = (width - scale * vbWidth) / 2;
  const offsetY = (height - scale * vbHeight) / 2;
  const matrix = roundMatrix([
    scale,
    0,
    0,
    -scale,
    offsetX - scale * minX,
    height - offsetY + scale * minY,
  ]);
  const bbox: [number, number, number, number] = [minX, minY, minX + vbWidth, minY + vbHeight];

  const contentStream = new ContentStream();
  const viewport = { width: vbWidth, height: vbHeight };
  renderSvg(root, contentStream, viewport);
  contentStream.validate();

  return { contentStream, bbox, matrix, width, height };
}

function getIntrinsicSize(root: XmlElement, viewBox?: number[]): Size {
  const width = positive(parseLength(root.attrs.width));
  const height = positive(parseLength(root.attrs.height));
  if (width != null && height != null) return { width, height };
  if (width != null) {
    return { width, height: viewBox ? (width * viewBox[3]) / viewBox[2] : 150 };
  }
  if (height != null) {
    return { width: viewBox ? (height * viewBox[2]) / viewBox[3] : 300, height };
  }
  return { width: viewBox?.[2] ?? 300, height: viewBox?.[3] ?? 150 };
}

/** Returns the given value if it is a number greater than zero. */
function positive(value: number | undefined): number | undefined {
  return value != null && value > 0 ? value : undefined;
}

/** Returns the given value if it is a number that is not negative. */
function nonNegative(value: number | undefined): number | undefined {
  return value != null && value >= 0 ? value : undefined;
}

type GraphicsContext = {
  fill: SvgPaint;
  stroke: SvgPaint;
  color: Color;
  fillRule: 'nonzero' | 'evenodd';
  fillOpacity: number;
  strokeOpacity: number;
  strokeWidth: number;
  lineCap: LineCapStyle;
  lineJoin: LineJoinStyle;
  miterLimit: number;
  dashArray?: number[];
  dashOffset: number;
  /** Accumulated group opacity, multiplied down onto descendants. */
  opacity: number;
  /** Accumulated transform from the SVG root to the current element. */
  ctm: Matrix;
};

type ShapeGeometry = {
  draw: (cs: ContentStream) => void;
  getBBox: () => Box | undefined;
};

type ResolvedPaint = Color | PDFShadingPattern;

const lineCapStyles: Record<string, LineCapStyle> = { butt: 0, round: 1, square: 2 };
const lineJoinStyles: Record<string, LineJoinStyle> = { miter: 0, round: 1, bevel: 2 };
const fillRules: Record<string, GraphicsContext['fillRule']> = {
  nonzero: 'nonzero',
  evenodd: 'evenodd',
};

function renderSvg(root: XmlElement, cs: ContentStream, viewport: Size): void {
  const idMap = new Map<string, XmlElement>();
  collectIds(root, idMap);
  // Elements currently being rendered, to break `use` cycles
  const activeElements = new Set<XmlElement>();
  const diagonal = viewportDiagonal(viewport);

  const initialContext: GraphicsContext = {
    fill: black,
    stroke: 'none',
    color: black,
    fillRule: 'nonzero',
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: 1,
    lineCap: 0,
    lineJoin: 0,
    miterLimit: 4,
    dashOffset: 0,
    opacity: 1,
    ctm: identityMatrix,
  };

  // Derives the context for an element from the inherited context, its
  // merged presentation attributes, and its parsed transform.
  const deriveContext = (
    ctx: GraphicsContext,
    attrs: Record<string, string>,
    matrix?: Matrix,
  ): GraphicsContext => {
    const derived = { ...ctx };
    // Inherits the value from the parent context when the attribute is
    // missing or invalid
    const set = <K extends keyof GraphicsContext>(
      key: K,
      value: GraphicsContext[K] | undefined,
    ) => {
      if (value !== undefined) derived[key] = value;
    };
    set('fill', parseSvgPaint(attrs.fill));
    set('stroke', parseSvgPaint(attrs.stroke));
    set('fillRule', fillRules[attrs['fill-rule']]);
    set('fillOpacity', parseOpacity(attrs['fill-opacity']));
    set('strokeOpacity', parseOpacity(attrs['stroke-opacity']));
    set('strokeWidth', nonNegative(parseLength(attrs['stroke-width'], diagonal)));
    set('lineCap', lineCapStyles[attrs['stroke-linecap']]);
    set('lineJoin', lineJoinStyles[attrs['stroke-linejoin']]);
    set('dashOffset', parseLength(attrs['stroke-dashoffset'], diagonal));

    const color = parseSvgColor(attrs.color);
    if (color !== undefined && typeof color !== 'string') derived.color = color;
    const miterLimit = parseNumber(attrs['stroke-miterlimit']);
    if (miterLimit !== undefined && miterLimit >= 1) derived.miterLimit = miterLimit;
    const dashArray = parseDashArray(attrs['stroke-dasharray'], diagonal);
    if (dashArray !== undefined) derived.dashArray = dashArray.length ? dashArray : undefined;
    const opacity = parseOpacity(attrs.opacity);
    if (opacity !== undefined) derived.opacity = ctx.opacity * opacity;
    if (matrix) derived.ctm = combineMatrices(matrix, ctx.ctm);
    return derived;
  };

  // Emits the given transform around the enclosed drawing operations
  const withMatrix = (matrix: Matrix | undefined, draw: () => void) => {
    if (!matrix) return draw();
    cs.saveGraphicsState();
    applyMatrix(cs, matrix);
    draw();
    cs.restoreGraphicsState();
  };

  const renderChildren = (element: XmlElement, ctx: GraphicsContext) => {
    for (const child of childElements(element)) {
      renderElement(child, ctx);
    }
  };

  const renderElement = (element: XmlElement, ctx: GraphicsContext) => {
    switch (element.name) {
      case 'g':
        renderGroup(element, ctx);
        break;
      case 'use':
        renderUse(element, ctx);
        break;
      case 'rect':
      case 'circle':
      case 'ellipse':
      case 'line':
      case 'polyline':
      case 'polygon':
      case 'path':
        renderShape(element, ctx);
        break;
      default:
        // defs, gradients, unsupported and unknown elements
        break;
    }
  };

  const renderGroup = (element: XmlElement, ctx: GraphicsContext) => {
    const attrs = getMergedAttrs(element);
    if (attrs.display?.trim() === 'none') return;
    const matrix = parseTransform(element.attrs.transform);
    const childContext = deriveContext(ctx, attrs, matrix);
    activeElements.add(element);
    withMatrix(matrix, () => renderChildren(element, childContext));
    activeElements.delete(element);
  };

  const renderUse = (element: XmlElement, ctx: GraphicsContext) => {
    const attrs = getMergedAttrs(element);
    if (attrs.display?.trim() === 'none') return;
    const href = element.attrs.href;
    if (!href?.startsWith('#')) return;
    const target = idMap.get(href.slice(1));
    if (!target || activeElements.has(target)) return;
    const x = parseLength(element.attrs.x, viewport.width) ?? 0;
    const y = parseLength(element.attrs.y, viewport.height) ?? 0;
    // The referenced element is rendered as if it were a deep clone
    // inside a group, with the translation applied after the
    // transform attribute
    let matrix: Matrix | undefined = x || y ? [1, 0, 0, 1, x, y] : undefined;
    const transform = parseTransform(element.attrs.transform);
    if (transform) matrix = matrix ? combineMatrices(matrix, transform) : transform;
    const childContext = deriveContext(ctx, attrs, matrix);
    activeElements.add(target);
    withMatrix(matrix, () => renderElement(target, childContext));
    activeElements.delete(target);
  };

  const resolvePaint = (
    paint: SvgPaint,
    ctx: GraphicsContext,
    getBBox: () => Box | undefined,
  ): ResolvedPaint | undefined => {
    if (paint === 'none') return undefined;
    if (paint === 'currentColor') return ctx.color;
    if ('id' in paint) {
      const target = idMap.get(paint.id);
      if (target && isGradientElement(target)) {
        const pattern = buildGradientPattern(target, idMap, {
          bbox: getBBox(),
          ctm: ctx.ctm,
          viewport,
          color: ctx.color,
        });
        if (pattern) return pattern;
      }
      const fallback = paint.fallback;
      if (fallback === 'currentColor') return ctx.color;
      if (fallback === 'none' || fallback == null) return undefined;
      return fallback;
    }
    return paint;
  };

  const renderShape = (element: XmlElement, ctx: GraphicsContext) => {
    const attrs = getMergedAttrs(element);
    if (attrs.display?.trim() === 'none') return;
    const geometry = getShapeGeometry(element, viewport, diagonal);
    if (!geometry) return;
    const matrix = parseTransform(element.attrs.transform);
    const shapeContext = deriveContext(ctx, attrs, matrix);
    // The bounding box is needed only by objectBoundingBox gradients,
    // so it is computed on demand, and at most once per shape
    let bboxHolder: { bbox: Box | undefined } | undefined;
    const getBBox = () => (bboxHolder ??= { bbox: geometry.getBBox() }).bbox;
    // SVG paints fill-black/no-stroke by default; paint is set
    // explicitly and shapes without any paint are skipped entirely
    const fillsAndStrokes = element.name !== 'line';
    const fill = fillsAndStrokes
      ? resolvePaint(shapeContext.fill, shapeContext, getBBox)
      : undefined;
    const stroke =
      shapeContext.strokeWidth > 0
        ? resolvePaint(shapeContext.stroke, shapeContext, getBBox)
        : undefined;
    if (!fill && !stroke) return;

    cs.saveGraphicsState();
    if (matrix) applyMatrix(cs, matrix);
    const fillAlpha = round(shapeContext.opacity * shapeContext.fillOpacity);
    const strokeAlpha = round(shapeContext.opacity * shapeContext.strokeOpacity);
    if (fillAlpha !== 1 || strokeAlpha !== 1) {
      cs.setGraphicsState(new ExtGState({ strokeOpacity: strokeAlpha, fillOpacity: fillAlpha }));
    }
    if (fill) {
      if (fill instanceof PDFShadingPattern) cs.setFillPattern(fill);
      else setFillingColor(cs, fill);
    }
    if (stroke) {
      if (stroke instanceof PDFShadingPattern) cs.setStrokePattern(stroke);
      else setStrokingColor(cs, stroke);
      if (shapeContext.strokeWidth !== 1) cs.setLineWidth(shapeContext.strokeWidth);
      if (shapeContext.lineCap !== 0) cs.setLineCap(shapeContext.lineCap);
      if (shapeContext.lineJoin !== 0) cs.setLineJoin(shapeContext.lineJoin);
      // The PDF default miter limit is 10, the SVG default is 4
      if (shapeContext.miterLimit !== 10) cs.setMiterLimit(shapeContext.miterLimit);
      if (shapeContext.dashArray)
        cs.setDashPattern(shapeContext.dashArray, shapeContext.dashOffset);
    }
    geometry.draw(cs);
    const evenOdd = shapeContext.fillRule === 'evenodd';
    if (fill && stroke) {
      if (evenOdd) cs.fillAndStrokeEvenOdd();
      else cs.fillAndStroke();
    } else if (fill) {
      if (evenOdd) cs.fillEvenOdd();
      else cs.fill();
    } else {
      cs.stroke();
    }
    cs.restoreGraphicsState();
  };

  const rootContext = deriveContext(initialContext, getMergedAttrs(root));
  renderChildren(root, rootContext);
}

function applyMatrix(cs: ContentStream, matrix: Matrix): void {
  const [a, b, c, d, e, f] = roundMatrix(matrix);
  cs.applyTransformMatrix(a, b, c, d, e, f);
}

/**
 * Collects all elements that carry an `id` attribute into a map. When
 * an id occurs more than once, the first element wins.
 */
export function collectIds(element: XmlElement, idMap: Map<string, XmlElement>): void {
  const id = element.attrs.id;
  if (id && !idMap.has(id)) idMap.set(id, element);
  for (const child of childElements(element)) {
    collectIds(child, idMap);
  }
}

function getShapeGeometry(
  element: XmlElement,
  viewport: Size,
  diagonal: number,
): ShapeGeometry | undefined {
  const { attrs } = element;
  switch (element.name) {
    case 'rect': {
      const x = parseLength(attrs.x, viewport.width) ?? 0;
      const y = parseLength(attrs.y, viewport.height) ?? 0;
      const width = parseLength(attrs.width, viewport.width);
      const height = parseLength(attrs.height, viewport.height);
      if (!width || !height || width < 0 || height < 0) return undefined;
      const [rx, ry] = rectCornerRadii(attrs, width, height, viewport);
      return {
        draw: (cs) =>
          rx > 0 && ry > 0
            ? drawRoundedRect(cs, x, y, width, height, rx, ry)
            : cs.rect(x, y, width, height),
        getBBox: () => ({ x, y, width, height }),
      };
    }
    case 'circle': {
      const cx = parseLength(attrs.cx, viewport.width) ?? 0;
      const cy = parseLength(attrs.cy, viewport.height) ?? 0;
      const r = parseLength(attrs.r, diagonal);
      if (!r || r < 0) return undefined;
      return ellipseGeometry(cx, cy, r, r);
    }
    case 'ellipse': {
      const cx = parseLength(attrs.cx, viewport.width) ?? 0;
      const cy = parseLength(attrs.cy, viewport.height) ?? 0;
      let rx = parseLength(attrs.rx, viewport.width);
      let ry = parseLength(attrs.ry, viewport.height);
      rx ??= ry;
      ry ??= rx;
      if (!rx || !ry || rx < 0 || ry < 0) return undefined;
      return ellipseGeometry(cx, cy, rx, ry);
    }
    case 'line': {
      const x1 = parseLength(attrs.x1, viewport.width) ?? 0;
      const y1 = parseLength(attrs.y1, viewport.height) ?? 0;
      const x2 = parseLength(attrs.x2, viewport.width) ?? 0;
      const y2 = parseLength(attrs.y2, viewport.height) ?? 0;
      return {
        draw: (cs) => {
          cs.moveTo(x1, y1);
          cs.lineTo(x2, y2);
        },
        getBBox: () => ({
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        }),
      };
    }
    case 'polyline':
    case 'polygon': {
      const numbers = parseNumberList(attrs.points);
      const pointCount = Math.floor(numbers.length / 2);
      if (pointCount < 2) return undefined;
      const close = element.name === 'polygon';
      return {
        draw: (cs) => {
          cs.moveTo(numbers[0], numbers[1]);
          for (let i = 1; i < pointCount; i++) {
            cs.lineTo(numbers[2 * i], numbers[2 * i + 1]);
          }
          if (close) cs.closePath();
        },
        getBBox: () => {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (let i = 0; i < pointCount; i++) {
            minX = Math.min(minX, numbers[2 * i]);
            maxX = Math.max(maxX, numbers[2 * i]);
            minY = Math.min(minY, numbers[2 * i + 1]);
            maxY = Math.max(maxY, numbers[2 * i + 1]);
          }
          return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        },
      };
    }
    case 'path': {
      if (!attrs.d?.trim()) return undefined;
      let commands: PathCommand[];
      try {
        commands = parseSvgPath(attrs.d);
      } catch {
        return undefined;
      }
      if (!commands.length) return undefined;
      return {
        draw: (cs) => drawSvgPath(cs, commands),
        getBBox: () => getPathBBox(commands),
      };
    }
    default:
      return undefined;
  }
}

function ellipseGeometry(cx: number, cy: number, rx: number, ry: number): ShapeGeometry {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  const r = round;
  return {
    draw: (cs) => {
      cs.moveTo(r(cx - rx), r(cy));
      cs.curveTo(r(cx - rx), r(cy - oy), r(cx - ox), r(cy - ry), r(cx), r(cy - ry));
      cs.curveTo(r(cx + ox), r(cy - ry), r(cx + rx), r(cy - oy), r(cx + rx), r(cy));
      cs.curveTo(r(cx + rx), r(cy + oy), r(cx + ox), r(cy + ry), r(cx), r(cy + ry));
      cs.curveTo(r(cx - ox), r(cy + ry), r(cx - rx), r(cy + oy), r(cx - rx), r(cy));
    },
    getBBox: () => ({ x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry }),
  };
}

/**
 * Resolves the corner radii of a `rect`. A missing or `auto` radius on
 * one axis defaults to the other axis's value; each radius is clamped
 * to half the respective side. Negative values are treated as unset.
 */
function rectCornerRadii(
  attrs: Record<string, string>,
  width: number,
  height: number,
  viewport: Size,
): [number, number] {
  let rx = nonNegative(parseLength(attrs.rx, viewport.width));
  let ry = nonNegative(parseLength(attrs.ry, viewport.height));
  rx ??= ry;
  ry ??= rx;
  return [Math.min(rx ?? 0, width / 2), Math.min(ry ?? 0, height / 2)];
}

/**
 * Draws a rectangle with rounded corners, approximating each corner
 * with a bezier quarter-arc.
 */
function drawRoundedRect(
  cs: ContentStream,
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  ry: number,
): void {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  const r = round;
  const x2 = x + width;
  const y2 = y + height;
  cs.moveTo(r(x + rx), r(y));
  cs.lineTo(r(x2 - rx), r(y));
  cs.curveTo(r(x2 - rx + ox), r(y), r(x2), r(y + ry - oy), r(x2), r(y + ry));
  cs.lineTo(r(x2), r(y2 - ry));
  cs.curveTo(r(x2), r(y2 - ry + oy), r(x2 - rx + ox), r(y2), r(x2 - rx), r(y2));
  cs.lineTo(r(x + rx), r(y2));
  cs.curveTo(r(x + rx - ox), r(y2), r(x), r(y2 - ry + oy), r(x), r(y2 - ry));
  cs.lineTo(r(x), r(y + ry));
  cs.curveTo(r(x), r(y + ry - oy), r(x + rx - ox), r(y), r(x + rx), r(y));
  cs.closePath();
}
