import type { Color } from './colors.ts';

/**
 * Deprecated. Use `TextSpan` instead.
 */
export type Text = string | TextSpan | TextSpan[];

/**
 * A span of text with optional text properties. Nested spans can be
 * used to apply different text properties to different parts of a
 * text.
 */
export type TextSpan = { text: string | TextSpan | (string | TextSpan)[] } & TextProps;

/**
 * Creates a span of text with the given text and properties.
 *
 * @param text The text to display in this span.
 * @param props Optional properties for the span.
 */
export function span(text: string | TextSpan | (string | TextSpan)[], props?: TextProps): TextSpan {
  const unwrappedText = Array.isArray(text) && text.length === 1 ? text[0] : text;
  if (typeof unwrappedText === 'string' || Array.isArray(unwrappedText)) {
    return { ...props, text: unwrappedText };
  }
  return { ...props, ...unwrappedText };
}

/**
 * Creates a span of text with the given text and a bold font weight.
 *
 * @param text The text to display in bold.
 */
export function bold(text: string | TextSpan | (string | TextSpan)[]): TextSpan {
  return span(text, { fontWeight: 'bold' });
}

/**
 * Creates a span of text with the given text and an italic font style.
 *
 * @param text The text to display in italics.
 */
export function italic(text: string | TextSpan | (string | TextSpan)[]): TextSpan {
  return span(text, { fontStyle: 'italic' });
}

/**
 * The font weight is an integer between 0 and 1000. The keywords
 * `normal` (400) and `bold` (700) are also supported.
 */
export type FontWeight = number | 'normal' | 'bold';

/**
 * The font style selects a normal, italic, or oblique font face from
 * the font family. Italic fonts are usually cursive in nature and
 * oblique fonts are usually sloped versions of the regular font.
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

/**
 * @deprecated Use `TextProps` instead.
 */
export type TextAttrs = TextProps;

/**
 * Text properties that can be applied to a text.
 */
export type TextProps = {
  /**
   * The name of the font to use. If not specified, the first registered
   * font that matches the other font properties will be used.
   */
  fontFamily?: string;

  /**
   * The font style to use.
   */
  fontStyle?: FontStyle;

  /**
   * The font weight to use.
   */
  fontWeight?: FontWeight;

  /**
   * The font size in pt.
   */
  fontSize?: number;

  /**
   * The line height as a multiple of the font size. Defaults to `1.2`.
   */
  lineHeight?: number;

  /**
   * Whether to use a bold variant of the selected font.
   * @deprecated Use `fontWeight: 'bold'` instead.
   */
  bold?: boolean;

  /**
   * Whether to use an italic variant of the selected font.
   * @deprecated Use `fontStyle: 'italic'` instead.
   */
  italic?: boolean;

  /**
   * The text color.
   */
  color?: Color;

  /**
   * A link target. When this property is present, the corresponding text will be rendered as a
   * link to the given target. The target can either be a URL or a reference to an anchor in the
   * document. An internal reference starts with a hash sign (`#`), followed by the `id` of an
   * element in the document.
   */
  link?: string;

  /**
   * A vertical offset in pt that shifts the text baseline up (if the value is positive) or down
   * (if negative). Shifting the baseline can be useful for superscripts and subscripts.
   * This setting does not affect the line height.
   */
  rise?: number;

  /**
   * The character spacing in pt. Positive values increase the space between characters, negative
   * values decrease it.
   */
  letterSpacing?: number;
};
