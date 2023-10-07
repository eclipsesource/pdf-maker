import { Color } from './colors.js';
import { getTextHeight, getTextWidth } from './font-metrics.js';
import { Font, FontStore } from './fonts.js';
import { TextSpan } from './read-block.js';

const defaultFontSize = 18;
const defaultLineHeight = 1.2;

export type TextSegment = {
  text: string;
  width: number;
  height: number;
  lineHeight: number;
  font: Font;
  fontSize: number;
  fontFamily: string;
  italic?: boolean;
  bold?: boolean;
  color?: Color;
  link?: string;
  rise?: number;
  letterSpacing?: number;
};

export async function extractTextSegments(
  textSpans: TextSpan[],
  fontStore: FontStore
): Promise<TextSegment[]> {
  const segments = await Promise.all(
    textSpans.map(async (span) => {
      const { text, attrs } = span;
      const {
        fontSize = defaultFontSize,
        fontFamily,
        italic,
        bold,
        lineHeight = defaultLineHeight,
        color,
        link,
        rise,
        letterSpacing,
      } = attrs;
      const font = await fontStore.selectFont(attrs);
      const height = getTextHeight(font.fkFont, fontSize);

      return splitChunks(text).map(
        (text) =>
          ({
            text,
            width: getTextWidth(text, font.fkFont, fontSize) + text.length * (letterSpacing ?? 0),
            height,
            lineHeight,
            font,
            fontFamily,
            italic,
            bold,
            fontSize,
            color,
            link,
            rise,
            letterSpacing,
          } as TextSegment)
      );
    })
  );
  return segments.flat();
}

export function convertToTextSpan(segment: TextSegment): TextSpan {
  const { text, fontSize, fontFamily, italic, bold, lineHeight, color, link, rise, letterSpacing } =
    segment;
  return {
    text,
    attrs: { fontSize, fontFamily, italic, bold, lineHeight, color, link, rise, letterSpacing },
  };
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

export function breakLine(segments: TextSegment[], maxWidth: number): TextSegment[][] {
  const breakIdx = findLinebreak(segments, maxWidth);
  if (breakIdx === 0) {
    // A line break is required before the first segment. Insert an
    // empty segment with the text height of the first segment to
    // represent a blank line and prevent collapsing of newlines.
    const head = [{ ...segments[0], text: '', width: 0 }];
    const tail = segments.slice(breakIdx + 1);
    return tail.length ? [head, tail] : [head];
  } else if (breakIdx !== undefined) {
    const head = segments.slice(0, breakIdx);
    const tail = segments.slice(breakIdx + 1);
    return tail.length ? [head, tail] : [head];
  }
  return [segments];
}

function findLinebreak(segments: TextSegment[], maxWidth: number): number | undefined {
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
  let prev: TextSegment;
  segments.forEach((segment) => {
    if (
      segment.font === prev?.font &&
      segment.fontSize === prev?.fontSize &&
      segment.lineHeight === prev?.lineHeight &&
      segment.color === prev?.color &&
      segment.link === prev?.link &&
      segment.rise === prev?.rise &&
      segment.letterSpacing === prev?.letterSpacing
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
