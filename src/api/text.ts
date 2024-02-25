import type { Color } from './colors.ts';

/**
 * A piece of inline text. A list can be used to apply different styles
 * to individual ranges of a text.
 */
export type Text = string | ({ text: Text } & TextAttrs) | Text[];

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
 * Text attributes that can be applied to a text.
 */
export type TextAttrs = {
  /**
   * The name of the font to use. If not specified, the first font
   * registered in the document definition that matches the other font
   * attributes will be used.
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
   * A link target. When this attribute is present, the corresponding text will be rendered as a
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
