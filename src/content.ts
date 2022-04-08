import { namedColors } from './colors.js';

/**
 * The complete definition of a document to create.
 */
export type DocumentDefinition = {
  /**
   * A content block that is printed at the top of each page.
   * A function can be passed to create page-specific headers.
   */
  header?: Block | ((info: PageInfo) => Block);
  /**
   * A content block that is printed at the bottom of each page.
   * A function can be passed to create page-specific footers.
   */
  footer?: Block | ((info: PageInfo) => Block);
  /**
   * The sequence of blocks that contain the document's content.
   */
  content: Block[];
  /**
   * The default style attributes to use in the document.
   */
  defaultStyle?: TextAttrs;
  /**
   * The page margins. Defaults to 50pt on each side.
   */
  margin?: Length | BoxLengths;
  /**
   * The fonts to use in the document. There is no default. Each font that is used in the document
   * must be registered. Not needed for documents that contain only graphics.
   */
  fonts?: FontsDefinition;
  /**
   * Metadata to include in the document.
   */
  info?: {
    /**
     * The document’s title.
     */
    title?: string;
    /**
     * The name of the person who created the document.
     */
    author?: string;
    /**
     * The subject of the document.
     */
    subject?: string;
    /**
     * Keywords associated with the document.
     */
    keywords?: string[];
    /**
     * The date and time the document was created (defaults to current time).
     */
    creationDate?: Date;
    /**
     * The name of the application that created the original content.
     */
    creator?: string;
    /**
     * The name of the application that created the PDF.
     */
    producer?: string;
  };
  dev?: {
    /**
     * Whether to draw a thin colored rectangle around each rendered frame.
     */
    guides?: boolean;
  };
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

export type Block = Columns | Rows | Paragraph;

export type Columns = {
  /**
   * Content blocks to arrange horizontally.
   */
  columns: Block[];
} & BlockAttrs;

export type Rows = {
  /**
   * Blocks to arrange vertically.
   */
  rows: Block[];
} & BlockAttrs;

export type Paragraph = {
  /**
   * Text to display in this paragraph.
   */
  text?: Text;
  /**
   * Graphic elements to draw in the area covered by the paragraph.
   * The coordinate system for graphics shapes starts at the top left corner of the paragraph's
   * padding.
   */
  graphics?: Shape[];
  /**
   * Space to leave between the contents of a paragraph and its edges.
   */
  padding?: Length | BoxLengths;
  /**
   * Align texts in paragraphs.
   * Support `left`, `right` and `center`. By default texts are aligned to the `left`;
   */
  textAlign?: Alignment;
} & TextAttrs &
  BlockAttrs;

export type BlockAttrs = {
  /**
   * Space to surround the block.
   * The `top` and `bottom` margins of adjacent blocks are collapsed into a single margin
   * whose size is the maximum of the two margins. Column margins don't collapse.
   */
  margin?: Length | BoxLengths;
  /**
   * A fixed width for the paragraph. If left out, the paragraph uses the available width.
   */
  width?: Length;
  /**
   * A fixed height for the paragraph. If left out, the height is defined by the included text.
   */
  height?: Length;
};

export type PageInfo = {
  /**
   * The number of the current page, starting at 1.
   */
  readonly pageNumber: number;
  /**
   * The total number of pages.
   */
  readonly pageCount: number;
  /**
   * The size of the current page in pt.
   */
  readonly pageSize: { width: number; height: number };
};

export type Shape = Rect | Line | Polyline;

export type Rect = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth?: number;
  strokeColor?: Color;
  fillColor?: Color;
};

export type Line = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
  strokeColor?: Color;
};

export type Polyline = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
  strokeWidth?: number;
  strokeColor?: Color;
  fillColor?: Color;
};

/**
 * A piece of inline text. A list can be used to apply styles to parts of a paragraph.
 */
export type Text = string | ({ text: Text } & TextAttrs) | Text[];
export type TextAttrs = {
  /**
   * The name of the font to use.
   * If not specified, the first font registered in the document definition that matches the other
   * font attributes will be used.
   */
  fontFamily?: string;
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
   */
  bold?: boolean;
  /**
   * Whether to use an italic variant of the selected font.
   */
  italic?: boolean;
  /**
   * The text color.
   */
  color?: Color;
  /**
   * A URL to point to. When this property is given, the corresponding text will be rendered
   * as a link to this URL.
   */
  link?: string;
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

export type Color = NamedColor | HTMLColor;

export type NamedColor = keyof typeof namedColors;

/**
 * A color specified in the hexadecimal format `#xxxxxx` that is usual in HTML.
 */
export type HTMLColor = `#${string}`;

export type Alignment = 'left' | 'right' | 'center';
