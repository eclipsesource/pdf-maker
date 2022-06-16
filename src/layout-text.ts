import { PDFFont } from 'pdf-lib';

import { Box, Pos, Size, ZERO_EDGES } from './box.js';
import { Alignment } from './content.js';
import { Document } from './document.js';
import { createRowGuides } from './guides.js';
import { Frame, LinkObject, TextObject } from './layout.js';
import { Paragraph } from './read-block.js';
import { breakLine, extractTextSegments, flattenTextSegments, TextSegment } from './text.js';

export function layoutParagraph(paragraph: Paragraph, box: Box, doc: Document): Frame {
  const padding = paragraph.padding ?? ZERO_EDGES;
  const fixedWidth = paragraph.width;
  const fixedHeight = paragraph.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = paragraph.text && layoutText(paragraph, innerBox, doc);
  const contentHeight = text?.size?.height ?? 0;
  return {
    type: 'text',
    ...box,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? (contentHeight ?? 0) + padding.top + padding.bottom,
    ...(text?.rows?.length ? { children: text.rows } : undefined),
  };
}

function layoutText(paragraph: Paragraph, box: Box, doc: Document) {
  const { text, textAlign } = paragraph;
  const textSpans = text;
  const segments = extractTextSegments(textSpans, doc.fonts);
  const rows = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size: Size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const { row, remainder } = layoutTextRow(remainingSegments, remainingSpace, textAlign, doc);
    rows.push(row);
    remainingSegments = remainder;
    remainingSpace.height -= row.height;
    remainingSpace.y += row.height;
    size.width = Math.max(size.width, row.width);
    size.height += row.height;
  }
  return { rows, size };
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
function layoutTextRow(segments: TextSegment[], box: Box, textAlign: Alignment, doc: Document) {
  const [lineSegments, remainder] = breakLine(segments, box.width);
  const pos = { x: 0, y: 0 };
  const size = { width: 0, height: 0 };
  let baseline = 0;
  let rowHeight = 0;
  const links = [];
  const objects = [];
  flattenTextSegments(lineSegments).forEach((seg) => {
    const { text, width, height, lineHeight, font, fontSize, link, color } = seg;
    const object: TextObject = { type: 'text', ...pos, text, font, fontSize, color };
    objects.push(object);
    if (link) {
      links.push({ type: 'link', ...pos, width, height, url: link });
    }
    pos.x += width;
    size.width += width;
    size.height = Math.max(size.height, height);
    const offset = (height * (lineHeight - 1)) / 2;
    baseline = Math.max(baseline, getDescent(font, fontSize) + offset);
    rowHeight = Math.max(rowHeight, height * lineHeight);
  });
  objects.forEach((obj) => (obj.y -= baseline));
  flattenLinks(links).forEach((link) => objects.push(link));
  doc.guides && objects.push(createRowGuides(size.width, rowHeight, baseline));
  const row = {
    type: 'row',
    ...alignRow(box, size, textAlign),
    width: size.width,
    height: rowHeight,
    objects,
  };
  return { row, remainder };
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
function flattenLinks(links: LinkObject[]) {
  const result = [];
  let prev;
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
