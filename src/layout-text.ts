import { PDFFont } from 'pdf-lib';

import { Box, Pos, Size, ZERO_EDGES } from './box.js';
import { Alignment } from './content.js';
import { Document } from './document.js';
import { createRowGuides } from './guides.js';
import { Frame, LinkObject, RenderObject, TextRowObject } from './layout.js';
import { TextBlock } from './read-block.js';
import { breakLine, extractTextSegments, flattenTextSegments, TextSegment } from './text.js';

export function layoutTextBlock(block: TextBlock, box: Box, doc: Document): Frame {
  const padding = block.padding ?? ZERO_EDGES;
  const fixedWidth = block.width;
  const fixedHeight = block.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = layoutText(block, innerBox, doc);
  const contentHeight = text.size?.height ?? 0;
  const objects: RenderObject[] = [];
  text.rows.length && objects.push({ type: 'text', rows: text.rows });
  text.objects?.length && objects.push(...text.objects);
  if (doc.guides) objects.push(...text.rows.map((row) => createRowGuides(row)));
  return {
    type: 'text',
    ...box,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? (contentHeight ?? 0) + padding.top + padding.bottom,
    ...(objects?.length ? { objects } : undefined),
  };
}

function layoutText(block: TextBlock, box: Box, doc: Document) {
  const { text, textAlign } = block;
  const textSpans = text;
  const segments = extractTextSegments(textSpans, doc.fonts);
  const rows: TextRowObject[] = [];
  const objects: RenderObject[] = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size: Size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const line = layoutTextRow(remainingSegments, remainingSpace, textAlign);
    objects.push(...(line.objects ?? []));
    rows.push(line.row);
    remainingSegments = line.remainder;
    remainingSpace.height -= line.row.height;
    remainingSpace.y += line.row.height;
    size.width = Math.max(size.width, line.row.width);
    size.height += line.row.height;
  }
  return { rows, objects, size };
}

/*
 * ---------------------------------------------------------------------
 *                                                                    ˄
 * ---------------------------------------------------------------    |
 *                                                              ˄     |
 *       /\     |                                               |     |
 *      /  \    |       ___                                     |     |
 *     /----\   |---,  /   \  \  /                             row   line
 *    /      \  |   |  \___/   \/                               |     |
 * ----------------------------/------baseline--------˅---------|     |
 *                            /                    descent      ˅     |
 * ---------------------------------------------------˄-----------    |
 *                                                                    ˅
 * ---------------------------------------------------------------------
 */
function layoutTextRow(segments: TextSegment[], box: Box, textAlign: Alignment) {
  const [lineSegments, remainder] = breakLine(segments, box.width);
  const pos = { x: 0, y: 0 };
  const size = { width: 0, height: 0 };
  let baseline = 0;
  let rowHeight = 0;
  const links = [];
  const segmentObjects = [];
  flattenTextSegments(lineSegments).forEach((seg) => {
    const { text, width, height, lineHeight, font, fontSize, link, color } = seg;
    segmentObjects.push({ text, font, fontSize, color });
    const offset = (height * lineHeight - height) / 2;
    if (link) {
      const linkPos = { x: box.x + pos.x, y: box.y - pos.y + offset };
      links.push({ type: 'link', ...linkPos, width, height, url: link });
    }
    pos.x += width;
    size.width += width;
    size.height = Math.max(size.height, height);
    baseline = Math.max(baseline, getDescent(font, fontSize) + offset);
    rowHeight = Math.max(rowHeight, height * lineHeight);
  });
  const objects = flattenLinks(links);
  const row: TextRowObject = {
    ...alignRow(box, size, textAlign),
    width: size.width,
    height: rowHeight,
    baseline: rowHeight - baseline,
    segments: segmentObjects,
  };
  return { row, objects, remainder };
}

function getDescent(font: PDFFont, fontSize: number) {
  const fontkitFont = (font as any).embedder.font;
  return Math.abs(((fontkitFont.descent ?? 0) * fontSize) / fontkitFont.unitsPerEm);
}

/**
 * Merge adjacent link objects that point to the same target. Without this step, a link that
 * consists of multiple text segments, e.g. because it includes normal and italic text, would be
 * rendered as multiple independent links in the PDF. Example:
 * ```js
 * {text: ['foo', {text: 'bar', italic: true}], link: 'https://www.example.com'}
 * ```
 */
function flattenLinks(links: LinkObject[]): LinkObject[] {
  const result: LinkObject[] = [];
  let prev: LinkObject;
  links.forEach((link) => {
    if (prev?.url === link.url && prev?.x + prev?.width === link.x && prev?.y === link.y) {
      prev.width += link.width;
      prev.height = Math.max(prev.height, link.height);
    } else {
      prev = link;
      result.push(prev);
    }
  });
  return result;
}

function alignRow(box: Box, textSize: Size, textAlign?: Alignment): Pos {
  if (textAlign === 'right') {
    return {
      x: box.x + box.width - textSize.width,
      y: box.y,
    };
  }
  if (textAlign === 'center') {
    return {
      x: box.x + (box.width - textSize.width) / 2,
      y: box.y,
    };
  }
  return { x: box.x, y: box.y };
}
