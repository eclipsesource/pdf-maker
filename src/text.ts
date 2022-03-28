import { PDFFont } from 'pdf-lib';

import { BoxEdges, parseEdges } from './box.js';
import { Color, parseColor } from './colors.js';
import { Font, selectFont } from './fonts.js';
import { GraphicsObject, parseGraphics } from './graphics.js';
import {
  asArray,
  asBoolean,
  asNumber,
  asObject,
  asString,
  check,
  Obj,
  optional,
  pick,
  pickDefined,
  required,
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
};

export type Paragraph = {
  text?: TextSpan[];
  graphics?: GraphicsObject[];
  padding?: BoxEdges;
  margin?: BoxEdges;
} & TextAttrs;

export function parseContent(input: unknown): Paragraph[] {
  const paragraphs = check(input, 'content', required(asArray));
  return paragraphs.map((el) => parseParagraph(el));
}

export function parseParagraph(input: unknown): Paragraph {
  if (typeof input !== 'object') throw new TypeError(`Invalid type for paragraph: ${input}`);
  const obj = input as Obj;
  const { text, graphics, margin, padding, ...attrs } = obj;
  return pickDefined({
    text: text && parseText(text, attrs),
    graphics: graphics && parseGraphics(graphics),
    margin: check(margin, 'margin', optional(parseEdges)),
    padding: check(padding, 'padding', optional(parseEdges)),
  });
}

export function parseText(text: unknown, attrs: Obj): TextSpan[] {
  if (Array.isArray(text)) {
    return text.flatMap((text) => parseText(text, attrs));
  }
  if (typeof text === 'string') {
    return [{ text, attrs }];
  }
  if (typeof text === 'object' && 'text' in text) {
    return parseText((text as Obj).text, { ...attrs, ...parseTextAttrs(text) });
  }
  throw new TypeError(`Invalid text: ${text}`);
}

export function parseTextAttrs(input: unknown): TextAttrs {
  const obj = check(input, 'text', optional(asObject)) ?? {};
  return pickDefined({
    fontFamily: pick(obj, 'fontFamily', optional(asString)),
    fontSize: pick(obj, 'fontSize', optional(asNumber)),
    lineHeight: pick(obj, 'lineHeight', optional(asNumber)),
    bold: pick(obj, 'bold', optional(asBoolean)),
    italic: pick(obj, 'italic', optional(asBoolean)),
    color: pick(obj, 'color', optional(parseColor)),
  });
}

export function extractTextSegments(textSpans: TextSpan[], fonts: Font[]): TextSegment[] {
  return textSpans.flatMap((span) => {
    const { text, attrs } = span;
    const { fontSize = defaultFontSize, lineHeight = defaultLineHeight, color } = attrs;
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
      segment.color === prev?.color
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
