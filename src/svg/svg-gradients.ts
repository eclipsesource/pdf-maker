/*
 * Compiles SVG `linearGradient` and `radialGradient` definitions into
 * PDF shading patterns.
 *
 * PDF shading patterns ignore the transformation matrix in effect when
 * they are painted; their coordinates are relative to the default
 * coordinate space of the surrounding content stream. The accumulated
 * transform from the SVG root to the element that references the
 * gradient must therefore be baked into the pattern matrix.
 */
import type { ColorStop } from '@ralfstx/pdf-core';
import { PDFShading, PDFShadingPattern } from '@ralfstx/pdf-core';

import type { Box, Size } from '../box.ts';
import type { Color } from '../colors.ts';
import type { XmlElement } from '../util/xml.ts';
import { childElements } from '../util/xml.ts';
import type { Matrix } from './svg-attrs.ts';
import {
  combineMatrices,
  getMergedAttrs,
  isIdentityMatrix,
  parseLength,
  parseTransform,
  roundMatrix,
  viewportDiagonal,
} from './svg-attrs.ts';
import { black, parseSvgColor } from './svg-colors.ts';

export type GradientParams = {
  /** The bounding box of the element that references the gradient. */
  bbox: Box | undefined;
  /** The transform from the element's user space to form space. */
  ctm: Matrix;
  /** The viewport that percentages resolve against. */
  viewport: Size;
  /** The inherited `color` property, to resolve `currentColor`. */
  color: Color;
};

export function isGradientElement(element: XmlElement): boolean {
  return element.name === 'linearGradient' || element.name === 'radialGradient';
}

/**
 * Builds a PDF shading pattern from the given gradient element.
 * Returns `undefined` when the gradient cannot be rendered, e.g. when
 * it has no stops; the referencing element should then fall back to no
 * paint.
 */
export function buildGradientPattern(
  element: XmlElement,
  idMap: Map<string, XmlElement>,
  params: GradientParams,
): PDFShadingPattern | undefined {
  const chain = resolveHrefChain(element, idMap);
  const chainAttrs = chain.map(getMergedAttrs);
  const attr = (name: string) => chainAttrs.find((attrs) => name in attrs)?.[name];

  const stops = readStops(chain, params.color);
  if (!stops.length) return undefined;

  const objectUnits = attr('gradientUnits') !== 'userSpaceOnUse';
  const { bbox, ctm, viewport } = params;
  if (objectUnits && (!bbox || bbox.width <= 0 || bbox.height <= 0)) return undefined;

  const lengthRef = (axis: 'x' | 'y' | 'r'): number => {
    if (objectUnits) return 1;
    if (axis === 'x') return viewport.width;
    if (axis === 'y') return viewport.height;
    return viewportDiagonal(viewport);
  };
  // Defaults are given as a fraction of the reference length, matching
  // the percentages in the SVG spec
  const coord = (name: string, def: number, axis: 'x' | 'y' | 'r'): number => {
    const ref = lengthRef(axis);
    return parseLength(attr(name), ref) ?? def * ref;
  };

  let shading: PDFShading;
  if (element.name === 'linearGradient') {
    const x1 = coord('x1', 0, 'x');
    const y1 = coord('y1', 0, 'y');
    const x2 = coord('x2', 1, 'x');
    const y2 = coord('y2', 0, 'y');
    shading = PDFShading.axial({ coords: [x1, y1, x2, y2], stops });
  } else {
    const cx = coord('cx', 0.5, 'x');
    const cy = coord('cy', 0.5, 'y');
    const r = coord('r', 0.5, 'r');
    if (r <= 0) return undefined;
    const fx = parseLength(attr('fx'), lengthRef('x')) ?? cx;
    const fy = parseLength(attr('fy'), lengthRef('y')) ?? cy;
    const fr = Math.max(0, parseLength(attr('fr'), lengthRef('r')) ?? 0);
    shading = PDFShading.radial({ coords: [fx, fy, fr, cx, cy, r], stops });
  }

  // The pattern matrix maps gradient space to form space: the
  // gradientTransform applies to gradient coordinates first, then the
  // bounding box mapping (for objectBoundingBox units), then the
  // accumulated transform from the SVG root
  const gradientTransform = parseTransform(attr('gradientTransform'));
  let matrix = ctm;
  if (objectUnits && bbox) {
    matrix = combineMatrices([bbox.width, 0, 0, bbox.height, bbox.x, bbox.y], matrix);
  }
  if (gradientTransform) matrix = combineMatrices(gradientTransform, matrix);
  matrix = roundMatrix(matrix);

  return new PDFShadingPattern({
    shading,
    matrix: isIdentityMatrix(matrix) ? undefined : matrix,
  });
}

/**
 * Resolves the `href` inheritance chain of a gradient element,
 * starting with the element itself. Cycles terminate the chain.
 */
function resolveHrefChain(element: XmlElement, idMap: Map<string, XmlElement>): XmlElement[] {
  const chain = [element];
  const visited = new Set([element]);
  let current = element;
  while (true) {
    const href = current.attrs.href;
    if (!href?.startsWith('#')) break;
    const target = idMap.get(href.slice(1));
    if (!target || !isGradientElement(target) || visited.has(target)) break;
    chain.push(target);
    visited.add(target);
    current = target;
  }
  return chain;
}

/**
 * Reads the color stops from the first element in the href chain that
 * has any. Offsets are clamped to [0, 1] and forced to be
 * non-decreasing, following SVG semantics. `stop-opacity` is not
 * supported, as PDF shadings carry no alpha channel.
 */
function readStops(chain: XmlElement[], currentColor: Color): ColorStop[] {
  const stopElements = chain
    .map((element) => childElements(element).filter((child) => child.name === 'stop'))
    .find((elements) => elements.length);
  const stops: ColorStop[] = [];
  if (!stopElements) return stops;
  let prevOffset = 0;
  for (const child of stopElements) {
    const attrs = getMergedAttrs(child);
    let offset = parseLength(attrs.offset, 1) ?? 0;
    offset = Math.min(1, Math.max(prevOffset, offset));
    prevOffset = offset;
    const parsed = parseSvgColor(attrs['stop-color']);
    const color =
      parsed === 'currentColor' ? currentColor : parsed === 'none' ? black : (parsed ?? black);
    stops.push({
      offset,
      color: { colorSpace: 'DeviceRGB', components: [color.red, color.green, color.blue] },
    });
  }
  return stops;
}
