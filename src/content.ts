/**
 * The complete definition of a document to create.
 */
export type DocumentDefinition = {
  /**
   * The sequence of content elements to render.
   */
  content: Paragraph[];
  /**
   * The page margins. Defaults to 50pt on each side.
   */
  margin?: Length | BoxLengths;
  /**
   * The fonts to use in the document. There is no default. Each font that is used in the document
   * must be registered. Not needed for documents that contain only graphics.
   */
  fonts?: FontsDefinition;
};

export type FontsDefinition = { [name: string]: FontDefinition[] };

export type FontDefinition = {
  /**
   * The font data, as a Uint8Array, ArrayBuffer, or a base64-encoded string.
   *
   * Supports TrueType (`.ttf`), OpenType (`.otf`), WOFF, WOFF2, TrueType Collection (`.ttc`),
   * and Datafork TrueType (`.dfont`) font files (see https://github.com/Hopding/fontkit).
   */
  data: string | Uint8Array | ArrayBuffer;
  /**
   * Whether this is a bold font.
   */
  bold?: boolean;
  /**
   * Whether this is an italic font.
   */
  italic?: boolean;
};

export type Paragraph = {
  /**
   * Text to display in this paragraph.
   */
  text?: Text;
} & TextAttrs;

/**
 * A piece of inline text. A list can be used to apply styles to parts of a paragraph.
 */
export type Text = string | ({ text: Text } & TextAttrs) | Text[];
export type TextAttrs = {
  /**
   * The name of the font to use.
   */
  fontFamily?: string;
  /**
   * The font size in pt.
   */
  fontSize?: number;
  /**
   * Whether to use a bold variant of the selected font.
   */
  bold?: boolean;
  /**
   * Whether to use an italic variant of the selected font.
   */
  italic?: boolean;
};

/**
 * A definition of space around the edges of a box.
 * Undefined edges default to zero.
 */
export type BoxLengths = {
  /** Space on the left edge, overrides `x`. */
  left?: Length;
  /** Space on the right edge, overrides `x`. */
  right?: Length;
  /** Space on the upper edge, overrides `y`. */
  top?: Length;
  /** Space on the lower edge, overrides `y`. */
  bottom?: Length;
  /** Space on the left and right edge. */
  x?: Length;
  /** Space on the upper and lower edge. */
  y?: Length;
};

/**
 * A length definition as a number, optionally followed by a unit.
 * Supported units are `pt` (point), `in` (inch), `mm` (millimeter), and `cm` (centimeter).
 * If the unit is left out, the number is interpreted as point (`pt`).
 * One point is defined as `1/72` of an inch (`72pt = 1in`).
 */
export type Length = number | `${number}${LengthUnit}`;

export type LengthUnit = 'pt' | 'in' | 'mm' | 'cm';
