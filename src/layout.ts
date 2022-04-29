import { PDFFont } from 'pdf-lib';

import { Box, parseEdges, parseLength, Pos, Size, subtractEdges, ZERO_EDGES } from './box.js';
import { Color } from './colors.js';
import { Alignment } from './content.js';
import { Font } from './fonts.js';
import { GraphicsObject, ImageObject, shiftGraphicsObject } from './graphics.js';
import { Image } from './images.js';
import { layoutColumns } from './layout-columns.js';
import { layoutRows } from './layout-rows.js';
import { Page } from './page.js';
import {
  Block,
  Columns,
  Paragraph,
  parseBlock,
  parseContent,
  parseInheritableAttrs,
  Rows,
} from './text.js';
import { breakLine, extractTextSegments, flattenTextSegments, TextSegment } from './text.js';
import { asArray, asObject, getFrom, Obj, optional, pickDefined, required } from './types.js';

const pageSize = { width: parseLength('210mm'), height: parseLength('297mm') }; // A4, portrait
const defaultPageMargin = parseEdges('2cm');

/**
 * Frames are created during the layout process. They have a position relative to their parent,
 * a size, and drawable objects to be rendered.
 * Frames can contain children, e.g. for rows within a paragraph or in a column.
 */
export type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  objects?: DrawableObject[];
  children?: Frame[];
};

export type DrawableObject = TextObject | DestObject | LinkObject | GraphicsObject;

export type TextObject = {
  type: 'text';
  x: number;
  y: number;
  text: string;
  font: PDFFont;
  fontSize: number;
  color?: Color;
};

export type LinkObject = {
  type: 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

export type DestObject = {
  type: 'dest';
  name: string;
  x: number;
  y: number;
};

export type Resources = { fonts: Font[]; images: Image[] };

export function layoutPages(def: Obj, resources: Resources): Page[] {
  const content = getFrom(def, 'content', required(asArray));
  const pageMargin = getFrom(def, 'margin', optional(parseEdges)) ?? defaultPageMargin;
  const defaultStyle = getFrom(def, 'defaultStyle', optional(parseInheritableAttrs));
  const guides = getFrom(def, 'dev', optional(asObject))?.guides;
  const contentBox = subtractEdges({ x: 0, y: 0, ...pageSize }, pageMargin);
  const blocks = parseContent(content, defaultStyle);
  const pages = [];
  let remainingBlocks = blocks;
  while (remainingBlocks?.length) {
    const { frame, remainder } = layoutPageContent(remainingBlocks, contentBox, resources);
    remainingBlocks = remainder;
    pages.push({ size: pageSize, content: frame, guides });
  }
  pages.map((page, idx) => {
    const pageInfo = { pageCount: pages.length, pageNumber: idx + 1, pageSize };
    const parse = (block) => parseBlock(asObject(resolveFn(block, pageInfo)), defaultStyle);
    const header = getFrom(def, 'header', optional(parse));
    const footer = getFrom(def, 'footer', optional(parse));
    page.header = header && layoutHeader(header, resources);
    page.footer = header && layoutFooter(footer, resources);
  });
  return pages.map(pickDefined) as Page[];
}

function resolveFn(value, ...args) {
  if (typeof value !== 'function') return value;
  try {
    return value(...args);
  } catch (error) {
    throw new Error(`Function threw: ${error}`);
  }
}

function layoutHeader(header: Block, resources: Resources) {
  const box = subtractEdges({ x: 0, y: 0, ...pageSize }, header.margin);
  return layoutBlock(header, box, resources);
}

function layoutFooter(footer: Block, resources: Resources) {
  const box = subtractEdges({ x: 0, y: 0, ...pageSize }, footer.margin);
  const frame = layoutBlock(footer, box, resources);
  frame.y = pageSize.height - frame.height - footer.margin?.bottom ?? 0;
  return frame;
}

export function layoutPageContent(blocks: Block[], box: Box, resources: Resources) {
  const { x, y, width, height } = box;
  const children = [];
  const pos = { x: 0, y: 0 };
  let lastMargin = 0;
  let remainingHeight = height;
  let remainder;
  for (const [idx, block] of blocks.entries()) {
    const margin = block.margin ?? ZERO_EDGES;
    const topMargin = Math.max(lastMargin, margin.top);
    lastMargin = margin.bottom;
    const nextPos = { x: pos.x + margin.left, y: pos.y + topMargin };
    const maxSize = { width: width - margin.left - margin.right, height: remainingHeight };
    const frame = layoutBlock(block, { ...nextPos, ...maxSize }, resources);
    // If the first paragraph does not fit on the page, render it anyway.
    // It wouldn't fit on the next page as well, ending in an endless loop.
    if (remainingHeight < topMargin + frame.height && idx) {
      remainder = blocks.slice(idx);
      break;
    }
    children.push(frame);
    pos.y += topMargin + frame.height;
    remainingHeight = height - pos.y;
  }
  return { frame: { type: 'page', x, y, width, height, children }, remainder };
}

export function layoutBlock(block: Block, box: Box, resources: Resources): Frame {
  if ((block as Columns).columns) {
    return layoutColumns(block as Columns, box, resources);
  }
  if ((block as Rows).rows) {
    return layoutRows(block as Rows, box, resources);
  }
  return layoutParagraph(block as Paragraph, box, resources);
}

export function layoutParagraph(paragraph: Paragraph, box: Box, resources: Resources): Frame {
  const padding = paragraph.padding ?? ZERO_EDGES;
  const fixedWidth = paragraph.width;
  const fixedHeight = paragraph.height;
  const maxWidth = (fixedWidth ?? box.width) - padding.left - padding.right;
  const maxHeight = (fixedHeight ?? box.height) - padding.top - padding.bottom;
  const innerBox = { x: padding.left, y: padding.top, width: maxWidth, height: maxHeight };
  const text = paragraph.text && layoutText(paragraph, innerBox, resources.fonts);
  const image = paragraph.image && layoutImage(paragraph, innerBox, resources.images);
  const graphics = paragraph.graphics && layoutGraphics(paragraph.graphics, innerBox);
  const contentHeight = Math.max(text?.size?.height ?? 0, image?.height ?? 0);
  const objects = [
    ...(graphics ?? []),
    ...(image ? [image] : []),
    ...(paragraph.id ? [layoutDest(paragraph.id, innerBox)] : []),
  ];
  return {
    type: 'paragraph',
    ...box,
    width: fixedWidth ?? box.width,
    height: fixedHeight ?? (contentHeight ?? 0) + padding.top + padding.bottom,
    ...(text?.rows?.length ? { children: text.rows } : undefined),
    ...(image ? { image } : undefined),
    ...(objects.length ? { objects } : undefined),
  };
}

export function layoutDest(name: string, pos: Pos): DestObject {
  return {
    type: 'dest',
    name,
    x: pos.x,
    y: pos.y,
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

function layoutImage(paragraph: Paragraph, box: Box, images: Image[]): ImageObject {
  const image = images.find((image) => image.name === paragraph.image)?.pdfImage;
  if (!image) throw new Error(`Unknown image: ${paragraph.image}`);
  const fixedWidth = paragraph.width;
  const fixedHeight = paragraph.height;
  const hScale = fixedWidth ? box.width / image.width : 1;
  const vScale = fixedHeight ? box.height / image.height : 1;
  const scale = Math.min(hScale, vScale);
  return {
    type: 'image',
    ...box,
    width: image.width * scale,
    height: image.height * scale,
    image,
  };
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
