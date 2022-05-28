import { PDFFont } from 'pdf-lib';

import { Box, Pos, Size, ZERO_EDGES } from './box.js';
import { Alignment } from './content.js';
import { Document } from './document.js';
import { Font } from './fonts.js';
import { GraphicsObject, shiftGraphicsObject } from './graphics.js';
import { Frame, LinkObject, TextObject } from './layout.js';
import { Paragraph } from './text.js';
import { breakLine, extractTextSegments, flattenTextSegments, TextSegment } from './text.js';

export function layoutParagraph(paragraph: Paragraph, box: Box, doc: Document): Frame {
  const padding = paragraph.padding ?? ZERO_EDGES;
  const fixedWidth = paragraph.width;
  const fixedHeight = paragraph.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = paragraph.text && layoutText(paragraph, innerBox, doc.fonts);
  const graphics = paragraph.graphics && layoutGraphics(paragraph.graphics, innerBox);
  const contentHeight = text?.size?.height ?? 0;
  const objects = [...(graphics ?? [])];
  return {
    type: 'paragraph',
    ...box,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? (contentHeight ?? 0) + padding.top + padding.bottom,
    ...(text?.rows?.length ? { children: text.rows } : undefined),
    ...(objects.length ? { objects } : undefined),
  };
}

function layoutText(paragraph: Paragraph, box: Box, fonts: Font[]) {
  const { text, textAlign } = paragraph;
  const textSpans = text;
  const segments = extractTextSegments(textSpans, fonts);
  const rows = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size: Size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const { row, remainder } = layoutTextRow(remainingSegments, remainingSpace, textAlign);
    rows.push(row);
    remainingSegments = remainder;
    remainingSpace.height -= row.height;
    remainingSpace.y += row.height;
    size.width = Math.max(size.width, row.width);
    size.height += row.height;
  }
  return { rows, size };
}

function layoutTextRow(segments: TextSegment[], box: Box, textAlign: Alignment) {
  const [lineSegments, remainder] = breakLine(segments, box.width);
  const pos = { x: 0, y: 0 };
  const size = { width: 0, height: 0 };
  let maxLineHeight = 0;
  let maxDescent = 0;
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
    maxDescent = Math.max(maxDescent, getDescent(font, fontSize));
    maxLineHeight = Math.max(maxLineHeight, height * lineHeight);
  });
  objects.forEach((obj) => (obj.y -= maxDescent));
  flattenLinks(links).forEach((link) => objects.push(link));
  const row = {
    type: 'row',
    ...alignRow(box, size, textAlign),
    width: size.width,
    height: maxLineHeight,
    objects,
  };
  return { row, remainder };
}

function getDescent(font: PDFFont, fontSize: number) {
  const fontkitFont = (font as any).embedder.font;
  return Math.abs(((fontkitFont.descent ?? 0) * fontSize) / fontkitFont.unitsPerEm);
}

function layoutGraphics(graphics: GraphicsObject[], pos: Pos): GraphicsObject[] {
  return graphics.map((object) => {
    return shiftGraphicsObject(object, pos);
  });
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
