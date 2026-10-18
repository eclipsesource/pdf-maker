import { getTextWidth, type PDFFont, type ShapedGlyph, type ShapeOptions } from '@ralfstx/pdf-core';

import type { FontStyle, FontWeight } from './api/text.ts';
import type { FontStore } from './font-store.ts';
import { languageToOpenTypeTag } from './language-tags.gen.ts';
import type { TextAttrs, TextSpan } from './read/read-block.ts';
import type { Color } from './read/read-color.ts';
import { scriptToOpenTypeTag, segmentByScript } from './script-detection.ts';

const defaultFontSize = 18;
const defaultLineHeight = 1.0;

// Whitespace that allows line breaks. Excludes no-break spaces (U+00A0, U+2007, U+202F).
const breakingSpaces = /[^\S\u00a0\u2007\u202f]+/;

export type TextSegment = {
  type: 'text' | 'whitespace' | 'newline';
  glyphs: ShapedGlyph[];
  width: number;
  height: number;
  lineHeight: number;
  font: PDFFont;
  fontSize: number;
  fontFamily: string;
  fontStyle?: FontStyle;
  fontWeight?: FontWeight;
  color?: Color;
  link?: string;
  rise?: number;
  letterSpacing?: number;
  fontKerning?: 'normal' | 'none';
  fontVariantLigatures?: 'normal' | 'none';
  fontFeatureSettings?: Record<string, boolean>;
  language?: string;
};

/**
 * Shaped glyphs by font, and by shape options and text. Shaping is by far the most expensive
 * step of the text layout, and words repeat a lot within a document.
 */
export type ShapeCache = Map<PDFFont, Map<string, ShapedGlyph[]>>;

export async function extractTextSegments(
  textSpans: TextSpan[],
  fontStore: FontStore,
  shapeCache: ShapeCache = new Map(),
): Promise<TextSegment[]> {
  const segments = await Promise.all(
    textSpans.map(async (span) => {
      const { text, attrs } = span;
      const {
        fontSize = defaultFontSize,
        fontFamily,
        fontStyle,
        fontWeight,
        lineHeight = defaultLineHeight,
        color,
        link,
        rise,
        letterSpacing,
        fontKerning,
        fontVariantLigatures,
        fontFeatureSettings,
        language,
      } = attrs;
      const font = await fontStore.selectFont({ fontFamily, fontStyle, fontWeight });
      const height = getTextHeight(font, fontSize);

      return segmentByScript(text).flatMap((run) => {
        const scriptTag = scriptToOpenTypeTag(run.script);
        const shape = createShaper(font, buildShapeOptions(attrs, scriptTag), shapeCache);
        return splitChunks(run.text).map((chunk) => {
          const type = chunk === '\n' ? 'newline' : isBreakingSpace(chunk) ? 'whitespace' : 'text';
          const glyphs = type === 'newline' ? [] : shape(chunk);
          return {
            type,
            glyphs,
            width: getTextWidth(glyphs, fontSize) + (letterSpacing ?? 0) * glyphs.length,
            height,
            lineHeight,
            font,
            fontFamily,
            fontStyle,
            fontWeight,
            fontSize,
            color,
            link,
            rise,
            letterSpacing,
            fontKerning,
            fontVariantLigatures,
            fontFeatureSettings,
            language,
          } as TextSegment;
        });
      });
    }),
  );
  return segments.flat();
}

function createShaper(font: PDFFont, opts: ShapeOptions | undefined, cache: ShapeCache) {
  const fontCache = cache.get(font) ?? new Map<string, ShapedGlyph[]>();
  cache.set(font, fontCache);
  const optsKey = opts ? JSON.stringify(opts) : '';
  return (text: string): ShapedGlyph[] => {
    const key = `${optsKey}\0${text}`;
    let glyphs = fontCache.get(key);
    if (!glyphs) {
      glyphs = font.shapeText(text, opts);
      fontCache.set(key, glyphs);
    }
    return glyphs;
  };
}

/**
 * Split the given text into chunks of subsequent whitespace and non-whitespace characters.
 * No-break spaces are treated as non-whitespace. For example, the string `foo bar` would be
 * split into `['foo', ' ', 'bar']`. Newlines (`\n`) are preserved, each in a chunk of its own.
 * Any whitespace that surrounds newlines is removed.
 *
 * @param text The input string
 * @returns an array of chunks
 */
export function splitChunks(text: string): string[] {
  const segments: string[] = [];
  let tail = text;
  let match = breakingSpaces.exec(tail);
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
    match = breakingSpaces.exec(tail);
  }
  if (tail) {
    segments.push(tail);
  }
  return segments;
}

function isBreakingSpace(chunk: string): boolean {
  return breakingSpaces.exec(chunk)?.[0] === chunk;
}

/**
 * Finds the line that starts at the given index and fits into the given width. Returns the
 * segments of the line and the index where the next line starts.
 */
export function breakLine(
  segments: TextSegment[],
  maxWidth: number,
  start = 0,
): { line: TextSegment[]; next: number } {
  const breakIdx = findLinebreak(segments, start, maxWidth);
  if (breakIdx === undefined) {
    return { line: segments.slice(start), next: segments.length };
  }
  // Whitespace around a line break is not rendered and must not count in the line width.
  let end = breakIdx;
  while (end > start && segments[end - 1].type === 'whitespace') end--;
  let next = breakIdx + 1;
  while (segments[next]?.type === 'whitespace') next++;
  // A line without visible content, such as a blank line between two newlines, still
  // needs the height of its text. Insert an empty segment to keep it.
  const line =
    end > start
      ? segments.slice(start, end)
      : [{ ...segments[start], type: 'text' as const, glyphs: [], width: 0 }];
  return { line, next };
}

function findLinebreak(segments: TextSegment[], start: number, maxWidth: number) {
  let x = 0;
  for (let idx = start; idx < segments.length; idx++) {
    const segment = segments[idx];
    if (segment.type === 'newline') {
      return idx;
    }
    x += segment.width;
    if (x > maxWidth) {
      return findLinebreakOpportunity(segments, idx, start);
    }
  }
}

/**
 * Finds the next appropriate segment that allows for a linebreak, starting at the given index, and
 * returns its index.
 *
 * @param segments A list of text segments.
 * @param index The index of the element to start at.
 * @param start The index of the first segment of the line, no earlier segment is considered.
 * @returns The index of the next segment that allows for linebreak if found, `undefined` otherwise.
 */
export function findLinebreakOpportunity(
  segments: TextSegment[],
  index: number,
  start = 0,
): number | undefined {
  // If the segment at the given index does not allow for a linebreak, look for a previous one.
  for (let i = index; i >= start; i--) {
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
  return segment?.type === 'whitespace' || segment?.type === 'newline';
}

/**
 * Flatten a list of text segments by merging subsequent segments that have identical text
 * properties.
 *
 * @param segments a list of text segments
 * @returns a possibly shorter list of text segments
 */
export function flattenTextSegments(segments: TextSegment[]): TextSegment[] {
  const result: TextSegment[] = [];
  let prev: TextSegment;
  segments.forEach((segment) => {
    if (
      segment.type !== 'newline' &&
      prev?.type !== 'newline' &&
      segment.font?.key === prev?.font?.key &&
      segment.fontSize === prev?.fontSize &&
      segment.lineHeight === prev?.lineHeight &&
      equalsColor(segment.color, prev?.color) &&
      segment.link === prev?.link &&
      segment.rise === prev?.rise &&
      segment.letterSpacing === prev?.letterSpacing &&
      segment.fontKerning === prev?.fontKerning &&
      segment.fontVariantLigatures === prev?.fontVariantLigatures &&
      equalsFontFeatureSettings(segment.fontFeatureSettings, prev?.fontFeatureSettings) &&
      segment.language === prev?.language
    ) {
      for (const glyph of segment.glyphs) prev.glyphs.push(glyph);
      prev.width += segment.width;
    } else {
      // Copy the glyphs, they may be shared with other segments through the shape cache.
      prev = { ...segment, glyphs: [...segment.glyphs] };
      result.push(prev);
    }
  });
  return result;
}

function equalsColor(a: Color | undefined, b: Color | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.red === b.red && a.green === b.green && a.blue === b.blue;
}

function equalsFontFeatureSettings(
  a: Record<string, boolean> | undefined,
  b: Record<string, boolean> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((key) => a[key] === b[key]);
}

export function getGlyphRunText(glyphs: ShapedGlyph[]): string {
  return glyphs
    .flatMap((g) => g.codePoints)
    .map((cp) => String.fromCodePoint(cp))
    .join('');
}

function getTextHeight(font: PDFFont, fontSize: number): number {
  const height = font.ascent - font.descent + font.lineGap;
  return (height * fontSize) / 1000;
}

export function buildShapeOptions(
  attrs: TextAttrs,
  scriptTag?: string,
): { scriptTag?: string; langSysTag?: string; features?: Record<string, boolean> } | undefined {
  const { fontKerning, fontVariantLigatures, fontFeatureSettings, language } = attrs;
  const features: Record<string, boolean> = { ...fontFeatureSettings };
  if (fontVariantLigatures === 'none') {
    features.liga = false;
    features.clig = false;
    features.calt = false;
  }
  if (fontKerning === 'none') {
    features.kern = false;
  }
  const langSysTag = language ? languageToOpenTypeTag(language) : undefined;
  const hasFeatures = Object.keys(features).length > 0;
  const hasScriptTag = scriptTag != null && scriptTag !== 'DFLT';
  const hasLangSysTag = langSysTag != null;
  if (!hasFeatures && !hasScriptTag && !hasLangSysTag) return undefined;
  return {
    // TODO: workaround for pdf-core expecting 4-character tags. Remove padding once that is fixed.
    ...(hasScriptTag ? { scriptTag: scriptTag.padEnd(4, ' ') } : undefined),
    ...(hasLangSysTag ? { langSysTag: langSysTag.padEnd(4, ' ') } : undefined),
    ...(hasFeatures ? { features } : undefined),
  };
}
