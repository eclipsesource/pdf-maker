import { getTextWidth, type PDFFont, type ShapedGlyph, type ShapeOptions } from '@ralfstx/pdf-core';

import type { FontStyle, FontWeight } from './api/text.ts';
import type { FontStore } from './font-store.ts';
import { languageToOpenTypeTag } from './language-tags.gen.ts';
import type { LineBreak } from './line-break.ts';
import { findLineBreaks, getLineBreakClass } from './line-break.ts';
import type { TextAttrs, TextSpan } from './read/read-block.ts';
import type { Color } from './read/read-color.ts';
import { scriptToOpenTypeTag, segmentByScript } from './script-detection.ts';

const defaultFontSize = 18;
const defaultLineHeight = 1.0;

const softHyphen = '\u00ad';
const zeroWidthSpace = '\u200b';
const invisibleChars = /[\u00ad\u200b]/g;

export type TextSegment = {
  type: 'text' | 'whitespace' | 'newline';
  glyphs: ShapedGlyph[];
  width: number;
  /** Whether a line may break after this segment. */
  breakAfter?: boolean;
  /** The hyphen to show when a line breaks after this segment, which ends in a soft hyphen. */
  hyphen?: { glyphs: ShapedGlyph[]; width: number };
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
  // Break opportunities depend on the characters around them, also across spans.
  const breaks = findLineBreaks(textSpans.map((span) => span.text).join(''));
  let offset = 0;
  const spanRuns = textSpans.map((span) =>
    segmentByScript(span.text).map((run) => {
      const chunks = splitChunks(run.text, breaks, offset);
      offset += run.text.length;
      return { script: run.script, chunks };
    }),
  );
  const segments = await Promise.all(
    textSpans.map(async (span, spanIdx) => {
      const { attrs } = span;
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
      const measure = (glyphs: ShapedGlyph[]) =>
        getTextWidth(glyphs, fontSize) + (letterSpacing ?? 0) * glyphs.length;

      return spanRuns[spanIdx].flatMap(({ script, chunks }) => {
        const scriptTag = scriptToOpenTypeTag(script);
        const shape = createShaper(font, buildShapeOptions(attrs, scriptTag), shapeCache);
        return chunks.map((chunk) => {
          const glyphs = chunk.type === 'newline' ? [] : shape(chunk.text);
          const hyphenGlyphs = chunk.softHyphen ? shape('-') : undefined;
          return {
            type: chunk.type,
            glyphs,
            width: measure(glyphs),
            breakAfter: chunk.breakAfter,
            hyphen: hyphenGlyphs && { glyphs: hyphenGlyphs, width: measure(hyphenGlyphs) },
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

export type TextChunk = {
  text: string;
  type: 'text' | 'whitespace' | 'newline';
  /** Whether a line may break after this chunk. */
  breakAfter?: boolean;
  /** Whether this chunk ends in a soft hyphen, which is removed from the text. */
  softHyphen?: boolean;
};

/**
 * Splits the given text into chunks of whitespace, newlines, and text between them. Text is
 * also split at line break opportunities, e.g. after hyphens. Each newline is a chunk of its
 * own, whitespace that surrounds newlines is removed. Soft hyphens and zero-width spaces are
 * removed from the text, they only mark line break opportunities.
 *
 * @param text The input string.
 * @param breaks The line break opportunities by string index, see `findLineBreaks()`.
 * @param offset The index of the given text in the text that the breaks refer to.
 */
export function splitChunks(
  text: string,
  breaks: Map<number, LineBreak> = findLineBreaks(text),
  offset = 0,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkStart = -1; // start index of the current chunk, -1 if there is none
  let chunkType: TextChunk['type'] = 'text';
  let hasInvisibleChars = false;
  let afterNewline = false;
  const flush = (end: number) => {
    if (chunkStart < 0) return;
    const raw = text.slice(chunkStart, end);
    const chunk: TextChunk = {
      text: hasInvisibleChars ? raw.replace(invisibleChars, '') : raw,
      type: chunkType,
    };
    if (breaks.has(offset + end)) chunk.breakAfter = true;
    if (raw.endsWith(softHyphen)) chunk.softHyphen = true;
    // A chunk can be empty when it only consists of a soft hyphen or zero-width space at the
    // start of a span. It is kept for the line break opportunity it provides.
    chunks.push(chunk);
    chunkStart = -1;
    hasInvisibleChars = false;
  };
  let index = 0;
  for (const char of text) {
    const start = index;
    index += char.length;
    const cls = getLineBreakClass(char.codePointAt(0)!);
    if (cls === 'BK') {
      if (chunkType === 'whitespace') chunkStart = -1; // drop whitespace before newline
      flush(start);
      chunks.push({ text: '\n', type: 'newline' });
      afterNewline = true;
      continue;
    }
    const type = cls === 'SP' ? 'whitespace' : 'text';
    if (type === 'whitespace' && afterNewline) continue;
    afterNewline = false;
    if (chunkStart >= 0 && (chunkType !== type || breaks.has(offset + start))) flush(start);
    if (chunkStart < 0) {
      chunkStart = start;
      chunkType = type;
    }
    if (char === softHyphen || char === zeroWidthSpace) hasInvisibleChars = true;
  }
  flush(index);
  return chunks;
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
  let end = segments.length;
  let next = segments.length;
  if (breakIdx !== undefined) {
    // A newline ends the line but is not part of it.
    end = segments[breakIdx].type === 'newline' ? breakIdx : breakIdx + 1;
    next = breakIdx + 1;
    while (segments[next]?.type === 'whitespace') next++;
  }
  // Whitespace at line ends is not rendered and must not count in the line width.
  while (end > start && segments[end - 1].type === 'whitespace') end--;
  // A line without visible content, such as a blank line between two newlines, still
  // needs the height of its text. Insert an empty segment to keep it.
  if (end === start && start < segments.length) {
    const empty = { ...segments[start], type: 'text' as const, glyphs: [], width: 0 };
    return { line: [{ ...empty, breakAfter: undefined, hyphen: undefined }], next };
  }
  const line = segments.slice(start, end);
  const last = segments[end - 1];
  if (breakIdx !== undefined && end === breakIdx + 1 && last.hyphen) {
    line.push({ ...last, ...last.hyphen, hyphen: undefined });
  }
  return { line, next };
}

/**
 * Returns the index of the segment after which the line that starts at the given index
 * should break, or `undefined` if the remaining segments fit into the line.
 */
function findLinebreak(segments: TextSegment[], start: number, maxWidth: number) {
  let x = 0;
  let lastFit: number | undefined;
  for (let idx = start; idx < segments.length; idx++) {
    const segment = segments[idx];
    if (segment.type === 'newline') {
      return idx;
    }
    x += segment.width;
    if (segment.type === 'whitespace') {
      // Whitespace at the end of a line is not rendered and may exceed the width.
      if (segment.breakAfter) lastFit = idx;
      continue;
    }
    if (x > maxWidth) {
      // If no break fits, break after the overflowing text at the next opportunity.
      return lastFit ?? findNextBreak(segments, idx);
    }
    if (segment.breakAfter && x + (segment.hyphen?.width ?? 0) <= maxWidth) {
      lastFit = idx;
    }
  }
}

function findNextBreak(segments: TextSegment[], start: number) {
  for (let idx = start; idx < segments.length; idx++) {
    if (segments[idx].breakAfter || segments[idx].type === 'newline') return idx;
  }
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
