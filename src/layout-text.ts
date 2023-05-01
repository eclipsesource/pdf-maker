import { PDFFont } from 'pdf-lib';

import { Box, Pos, Size } from './box.js';
import { Alignment } from './content.js';
import { Document } from './document.js';
import { createRowGuides } from './guides.js';
import {
  LayoutContent,
  LinkObject,
  RenderObject,
  TextRowObject,
  TextSegmentObject,
} from './layout.js';
import { TextBlock } from './read-block.js';
import {
  breakLine,
  convertToTextSpan,
  extractTextSegments,
  flattenTextSegments,
  TextSegment,
} from './text.js';
import { omit } from './utils.js';

export function layoutTextContent(block: TextBlock, box: Box, doc: Document): LayoutContent {
  const text = layoutText(block, box, doc);
  const objects: RenderObject[] = [];
  text.rows.length && objects.push({ type: 'text', rows: text.rows });
  text.objects?.length && objects.push(...text.objects);
  if (doc.guides) objects.push(...text.rows.map((row) => createRowGuides(row)));

  const remainder = text.remainder ? { ...omit(block, 'id'), text: text.remainder } : undefined;

  return {
    frame: {
      ...(objects?.length ? { objects } : undefined),
      height: text.size.height,
    },
    remainder,
  };
}

function layoutText(block: TextBlock, box: Box, doc: Document) {
  const { text, textAlign } = block;
  const segments = extractTextSegments(text, doc.fonts);
  const rows: TextRowObject[] = [];
  const objects: RenderObject[] = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size: Size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const layoutResult = layoutTextRow(remainingSegments, remainingSpace, textAlign);
    const { row, objects: rowObjects, remainder } = layoutResult;

    if (row.height > remainingSpace.height) {
      // This row doesn't fit in the remaining space. Break here if possible.
      if (block.breakInside !== 'avoid') {
        break;
      }
    }

    if (rowObjects.length) objects.push(...rowObjects);
    rows.push(row);
    remainingSegments = remainder;
    remainingSpace.height -= row.height;
    remainingSpace.y += row.height;
    size.width = Math.max(size.width, row.width);
    size.height += row.height;
  }

  const remainder = remainingSegments?.length
    ? flattenTextSegments(remainingSegments).map((s) => convertToTextSpan(s))
    : undefined;

  return { rows, objects, size, remainder };
}

/*
 * ---------------------------------------------------------------------
 *                                                                    ˄
 * ---------------------------------------------------------------    |
 *                                                              ˄     |
 *       /\     |                                               |     |
 *      /  \    |___    ___                                     |     |
 *     /----\   |   |  /   \  \  /                             row   line
 *    /      \  |   |  \___/   \/                               |     |
 * ----------------------------/------baseline--------˅---------|     |
 *                            /                    descent      ˅     |
 * ---------------------------------------------------˄-----------    |
 *                                                                    ˅
 * ---------------------------------------------------------------------
 */
function layoutTextRow(segments: TextSegment[], box: Box, textAlign?: Alignment) {
  const [lineSegments, remainder] = breakLine(segments, box.width);
  const pos = { x: 0, y: 0 };
  const size = { width: 0, height: 0 };
  let baseline = 0;
  let rowHeight = 0;
  const links: LinkObject[] = [];
  const segmentObjects: TextSegmentObject[] = [];
  flattenTextSegments(lineSegments).forEach((seg) => {
    const { text, width, height, lineHeight, font, fontSize, link, color, rise, letterSpacing } =
      seg;
    segmentObjects.push({ text, font, fontSize, color, rise, letterSpacing });
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
