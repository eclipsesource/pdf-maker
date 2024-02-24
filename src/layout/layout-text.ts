import type { Box, Size } from '../box.ts';
import type { Font } from '../fonts.ts';
import type { LinkObject, RenderObject, TextRowObject, TextSegmentObject } from '../frame.ts';
import { createRowGuides } from '../guides.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import type { TextBlock } from '../read-block.ts';
import type { TextSegment } from '../text.ts';
import { breakLine, convertToTextSpan, extractTextSegments, flattenTextSegments } from '../text.ts';
import { omit } from '../utils.ts';
import type { LayoutContent } from './layout.ts';

export async function layoutTextContent(
  block: TextBlock,
  box: Box,
  ctx: MakerCtx,
): Promise<LayoutContent> {
  const text = await layoutText(block, box, ctx);
  const objects: RenderObject[] = [];
  text.rows.length && objects.push({ type: 'text', rows: text.rows });
  text.objects?.length && objects.push(...text.objects);
  if (ctx.guides) objects.push(...text.rows.map((row) => createRowGuides(row)));

  const remainder = text.remainder ? { ...omit(block, 'id'), text: text.remainder } : undefined;

  return {
    frame: {
      ...(objects?.length ? { objects } : undefined),
      width: block.autoWidth ? text.size.width : box.width,
      height: text.size.height,
    },
    remainder,
  };
}

async function layoutText(block: TextBlock, box: Box, ctx: MakerCtx) {
  const { text } = block;
  const segments = await extractTextSegments(text, ctx.fontStore);
  const rows: TextRowObject[] = [];
  const objects: LinkObject[] = [];
  let remainingSegments = segments;
  const remainingSpace = { ...box };
  const size: Size = { width: 0, height: 0 };
  while (remainingSegments?.length) {
    const layoutResult = layoutTextRow(remainingSegments, remainingSpace);
    const { row, objects: rowObjects, remainder } = layoutResult;

    if (row.height > remainingSpace.height) {
      // This row doesn't fit in the remaining space. Break here if
      // possible. Do not break before the first row to avoid returning
      // and empty frame.
      if (block.breakInside !== 'avoid' && rows.length) {
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

  // align rows and link objects
  const width = block.autoWidth ? size.width : box.width;
  if (block.textAlign === 'right') {
    rows.forEach((row) => {
      row.x += width - row.width;
    });
    objects.forEach((obj) => {
      obj.x += width - obj.width;
    });
  } else if (block.textAlign === 'center') {
    rows.forEach((row) => {
      row.x += (width - row.width) / 2;
    });
    objects.forEach((obj) => {
      obj.x += (width - obj.width) / 2;
    });
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
function layoutTextRow(segments: TextSegment[], box: Box) {
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
    ...box,
    width: size.width,
    height: rowHeight,
    baseline: rowHeight - baseline,
    segments: segmentObjects,
  };
  return { row, objects, remainder };
}

function getDescent(font: Font, fontSize: number) {
  return Math.abs(((font.fkFont.descent ?? 0) * fontSize) / font.fkFont.unitsPerEm);
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
