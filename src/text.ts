import { PDFFont } from 'pdf-lib';

import { BoxEdges, parseEdges, parseLength } from './box.js';
import { Color, parseColor } from './colors.js';
import { Alignment } from './content.js';
import { Font, selectFont } from './fonts.js';
import { GraphicsObject, parseGraphics } from './graphics.js';
import {
  asArray,
  asBoolean,
  asNonNegNumber,
  asObject,
  asString,
  check,
  getFrom,
  Obj,
  optional,
  pickDefined,
} from './types.js';

const defaultFontSize = 18;
const defaultLineHeight = 1.2;

export type TextSegment = {
  text: string;
  width: number;
  height: number;
  lineHeight: number;
  font: PDFFont;
  fontSize: number;
  color?: Color;
  link?: string;
};

/**
 * A range of text with attributes, similar to a `<span>` in HTML.
 */
type TextSpan = {
  text: string;
  attrs: TextAttrs;
};

type TextAttrs = {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  bold?: boolean;
  italic?: boolean;
  color?: Color;
  link?: string;
};

export type Block = Columns | Rows | Paragraph;

export type Columns = {
  columns: Block[];
} & BlockAttrs;

export type Rows = {
  rows: Block[];
} & BlockAttrs;

export type Paragraph = {
  text?: TextSpan[];
  graphics?: GraphicsObject[];
  padding?: BoxEdges;
  textAlign?: Alignment;
} & BlockAttrs &
  TextAttrs;

export type BlockAttrs = {
  margin?: BoxEdges;
  width?: number;
  height?: number;
} & TextAttrs;

export function parseContent(content: unknown[], defaultStyle: TextAttrs): Paragraph[] {
  return content.map((block, idx) =>
    check(block, `content block #${idx + 1}`, () => parseBlock(asObject(block), defaultStyle))
  );
}

export function parseBlock(input: Obj, defaultAttrs?: TextAttrs): Block {
  if (input.columns) {
    return parseColumns(input, defaultAttrs);
  }
  if (input.rows) {
    return parseRows(input, defaultAttrs);
  }
  return parseParagraph(input, defaultAttrs);
}

export function parseColumns(input: Obj, defaultAttrs?: TextAttrs): Columns {
  const textAttrs = { ...defaultAttrs, ...parseTextAttrs(input) };
  const parseColumns = (columns) =>
    asArray(columns).map((col, idx) =>
      check(col, `column #${idx + 1}`, () => parseBlock(col as Obj, textAttrs))
    );
  return pickDefined({
    columns: getFrom(input, 'columns', parseColumns),
    ...parseBlockAttrs(input),
  }) as Columns;
}

export function parseRows(input: Obj, defaultAttrs?: TextAttrs): Columns {
  const textAttrs = { ...defaultAttrs, ...parseTextAttrs(input) };
  const parseRows = (rows) =>
    asArray(rows).map((col, idx) =>
      check(col, `row #${idx + 1}`, () => parseBlock(col as Obj, textAttrs))
    );
  return pickDefined({
    rows: getFrom(input, 'rows', parseRows),
    ...parseBlockAttrs(input),
  }) as Columns;
}

export function parseParagraph(input: Obj, defaultAttrs?: TextAttrs): Paragraph {
  const textAttrs = { ...defaultAttrs, ...parseTextAttrs(input) };
  const parseTextWithAttrs = (text) => parseText(text, textAttrs);
  return pickDefined({
    text: getFrom(input, 'text', optional(parseTextWithAttrs)),
    graphics: getFrom(input, 'graphics', optional(parseGraphics)),
    padding: getFrom(input, 'padding', optional(parseEdges)),
    textAlign: getFrom(input, 'textAlign', optional(asTextAlign)),
    ...parseBlockAttrs(input),
  });
}

function parseBlockAttrs(input: Obj): BlockAttrs {
  return pickDefined({
    margin: getFrom(input, 'margin', optional(parseEdges)),
    width: getFrom(input, 'width', optional(parseLength)),
    height: getFrom(input, 'height', optional(parseLength)),
  });
}

export function parseText(text: unknown, attrs: TextAttrs): TextSpan[] {
  if (Array.isArray(text)) {
    return text.flatMap((text) => parseText(text, attrs));
  }
  if (typeof text === 'string') {
    return [{ text, attrs }];
  }
  if (typeof text === 'object' && 'text' in text) {
    return parseText((text as Obj).text, { ...attrs, ...parseTextAttrs(text as Obj) });
  }
  throw new TypeError(
    `Expected string, object with text attribute, or array of text, got: ${text}`
  );
}

function asTextAlign(input: unknown): Alignment {
  if (input !== 'left' && input !== 'right' && input !== 'center') {
    throw new TypeError(`Expected 'left', 'right', or 'center', got: ${input}`);
  }
  return input;
}

export function parseTextAttrs(input: Obj): TextAttrs {
  return pickDefined({
    fontFamily: getFrom(input, 'fontFamily', optional(asString)),
    fontSize: getFrom(input, 'fontSize', optional(asNonNegNumber)),
    lineHeight: getFrom(input, 'lineHeight', optional(asNonNegNumber)),
    bold: getFrom(input, 'bold', optional(asBoolean)),
    italic: getFrom(input, 'italic', optional(asBoolean)),
    color: getFrom(input, 'color', optional(parseColor)),
    link: getFrom(input, 'link', optional(asString)),
  });
}

export function extractTextSegments(textSpans: TextSpan[], fonts: Font[]): TextSegment[] {
  return textSpans.flatMap((span) => {
    const { text, attrs } = span;
    const { fontSize = defaultFontSize, lineHeight = defaultLineHeight, color, link } = attrs;
    const font = selectFont(fonts, attrs);
    const height = font.heightAtSize(fontSize);
    return splitChunks(text).map(
      (text) =>
        ({
          text,
          width: font.widthOfTextAtSize(text, fontSize),
          height,
          lineHeight,
          font,
          fontSize,
          color,
          link,
        } as TextSegment)
    );
  });
}

/**
 * Split the given text into chunks of subsequent whitespace (`\s`) and non-whitespace (`\S`)
 * characters. For example, the string `foo bar` would be split into `['foo', ' ', 'bar']`.
 * Newlines (`\n`) are preserved, each in a chunk of its own. Any whitespace that surrounds
 * newlines is removed.
 *
 * @param text The input string
 * @returns an array of chunks
 */
export function splitChunks(text: string): string[] {
  const segments: string[] = [];
  let tail = text;
  let match = /\s+/.exec(tail);
  while (match) {
    if (match.index) {
      segments.push(tail.slice(0, match.index));
    }
    const wsSegment = tail.slice(match.index, match.index + match[0].length);
    const newlineCount = wsSegment.match(/\n/g)?.length;
    if (newlineCount) {
      segments.push(...'\n'.repeat(newlineCount).split(''));
    } else {
      segments.push(wsSegment);
    }
    tail = tail.slice(match.index + match[0].length);
    match = /\s+/.exec(tail);
  }
  if (tail) {
    segments.push(tail);
  }
  return segments;
}

export function breakLine(segments: TextSegment[], maxWidth: number) {
  const breakIdx = findLinebreak(segments, maxWidth);
  if (breakIdx >= 0) {
    const head = segments.slice(0, breakIdx);
    const tail = segments.slice(breakIdx + 1);
    return tail.length ? [head, tail] : [head];
  }
  return [segments];
}

function findLinebreak(segments, maxWidth): number {
  let x = 0;
  for (const [idx, segment] of segments.entries()) {
    const { text, width } = segment;
    if (text === '\n') {
      return idx;
    }
    x += width;
    if (x > maxWidth) {
      return findLinebreakOpportunity(segments, idx);
    }
  }
}

/**
 * Finds the next appropriate segment that allows for a linebreak, starting at the given index, and
 * returns its index.
 *
 * @param segments A list of text segments.
 * @param index The index of the element to start at.
 * @returns The index of the next segment that allows for linebreak if found, `undefined` otherwise.
 */
export function findLinebreakOpportunity(
  segments: TextSegment[],
  index: number
): number | undefined {
  // If the segment at the given index does not allow for a linebreak, look for a previous one.
  for (let i = index; i >= 0; i--) {
    if (isLineBreakOpportunity(segments[i])) {
      return i;
    }
  }
  // If no previous segment allows for a linebreak, find the next one after the index.
  for (let i = index + 1; i < segments.length; i++) {
    if (isLineBreakOpportunity(segments[i])) {
      return i;
    }
  }
}

function isLineBreakOpportunity(segment: TextSegment): boolean {
  return segment && /^\s+$/.test(segment.text);
}

/**
 * Flatten a list of text segments by merging subsequent segments that have identical text
 * attributes.
 *
 * @param segments a list of text segments
 * @returns a possibly shorter list of text segments
 */
export function flattenTextSegments(segments: TextSegment[]): TextSegment[] {
  const result: TextSegment[] = [];
  let prev;
  segments.forEach((segment) => {
    if (
      segment.font === prev?.font &&
      segment.fontSize === prev?.fontSize &&
      segment.lineHeight === prev?.lineHeight &&
      segment.color === prev?.color &&
      segment.link === prev?.link
    ) {
      prev.text += segment.text;
      prev.width += segment.width;
    } else {
      prev = { ...segment };
      result.push(prev);
    }
  });
  return result;
}
