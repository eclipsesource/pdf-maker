import type { PDFFont } from '@ralfstx/pdf-core';

import type { Box, Size } from '../box.ts';
import type { LinkObject, RenderObject, TextRowObject, TextSegmentObject } from '../frame.ts';
import { createRowGuides } from '../guides.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import type { TextBlock } from '../read/read-block.ts';
import type { TextSegment } from '../text.ts';
import { breakLine, convertToTextSpan, extractTextSegments, flattenTextSegments } from '../text.ts';
import { omit } from '../util/utils.ts';
import type { LayoutContent } from './layout.ts';

export async function layoutTextContent(
  block: TextBlock,
  box: Box,
  ctx: MakerCtx,
): Promise<LayoutContent> {
  const text = await layoutText(block, box, ctx);
  const objects: RenderObject[] = [];
  if (text.rows.length) objects.push({ type: 'text', rows: text.rows });
  if (text.objects?.length) objects.push(...text.objects);
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
  const rowLinks: LinkObject[][] = [];
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

    rows.push(row);
    rowLinks.push(rowObjects);
    remainingSegments = remainder;
    remainingSpace.height -= row.height;
    remainingSpace.y += row.height;
    size.width = Math.max(size.width, row.width);
    size.height += row.height;
  }

  // align rows and move their links along
  const width = block.autoWidth ? size.width : box.width;
  if (block.textAlign === 'right' || block.textAlign === 'center') {
    rows.forEach((row, idx) => {
      const free = width - row.width;
      const shift = block.textAlign === 'right' ? free : free / 2;
      row.x += shift;
      rowLinks[idx].forEach((link) => (link.x += shift));
    });
  }
  const objects = rowLinks.flat();

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
  const flatSegments = flattenTextSegments(lineSegments);
  // As in CSS, the row must fit the highest part above the baseline and the deepest part
  // below it, which may come from different segments. Both can be negative for line
  // heights below 1, so don't start at zero.
  let baseline = -Infinity;
  let depth = -Infinity;
  flatSegments.forEach(({ height, lineHeight, font, fontSize }) => {
    const halfLeading = (height * lineHeight - height) / 2;
    const descent = getDescent(font, fontSize);
    baseline = Math.max(baseline, height - descent + halfLeading);
    depth = Math.max(depth, descent + halfLeading);
  });
  if (!flatSegments.length) {
    baseline = 0;
    depth = 0;
  }
  let x = 0;
  const links: LinkObject[] = [];
  const segmentObjects: TextSegmentObject[] = [];
  flatSegments.forEach((seg) => {
    const { glyphs, width, height, font, fontSize, link, color, rise, letterSpacing } = seg;
    segmentObjects.push({ glyphs, font, fontSize, color, rise, letterSpacing });
    if (link) {
      const y = box.y + baseline - height + getDescent(font, fontSize);
      links.push({ type: 'link', x: box.x + x, y, width, height, url: link });
    }
    x += width;
  });
  const row: TextRowObject = {
    ...box,
    width: x,
    height: baseline + depth,
    baseline,
    segments: segmentObjects,
  };
  return { row, objects: flattenLinks(links), remainder };
}

function getDescent(font: PDFFont, fontSize: number) {
  return Math.abs((font.descent * fontSize) / 1000);
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
