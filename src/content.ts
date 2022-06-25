import { namedColors } from './colors.js';
import { paperSizes } from './page-sizes.js';

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
   * The page size of the document. Defaults to A4.
   */
  pageSize?: PaperSize | Size;
  /**
   * The orientation of the pages in the document. When this parameter is set, width and height
   * of the given page size will be reversed if necessary to match the given orientation.
   */
  pageOrientation?: Orientation;
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
   * The images to use in the document. Each image in the document needs to be registered.
   * Once registered, an image can be reused without multiplying its footprint.
   * Only JPEG images are supported.
   */
  images?: ImagesDefinition;
  /**
   * Metadata to include in the PDF's *document information dictionary*.
   */
  info?: InfoAttrs & CustomInfoAttrs;
  dev?: {
    /**
     * Whether to draw a thin colored rectangle around each rendered frame.
     */
    guides?: boolean;
  };
};

/**
 * Standard metadata attributes to include in the PDF's *document information dictionary*.
 */
type InfoAttrs = {
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

/**
 * Custom metadata attributes to include in the PDF's *document information dictionary*.
 */
type CustomInfoAttrs = {
  [name: string]: string;
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

export type ImagesDefinition = { [name: string]: ImageDefinition };
export type ImageDefinition = {
  /**
   * The image data, as a Uint8Array, ArrayBuffer, or a base64-encoded string.
   * Only JPEG images are supported.
   */
  data: string | Uint8Array | ArrayBuffer;
};

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock | EmptyBlock;

export type TextBlock = {
  /**
   * Text to display in this block.
   */
  text: Text;
} & TextAttrs &
  BlockAttrs;

export type ImageBlock = {
  /**
   * The name of the JPG image to display in this block. The image must have been registered with
   * the global `images` attribute.
   *
   * When any of the attributes `width` and `height` are specified, the image will be scaled
   * proportionally to be contained in the given bounds.
   * When neither `width` nor `height` is given, the image is not scaled unless it exceeds the
   * maximum available width. In this case, it is scaled down to fit onto the page.
   */
  image: string;
  /**
   * Align the image in this block. By default, it is center-aligned.
   */
  imageAlign?: Alignment;
} & BlockAttrs;

export type ColumnsBlock = {
  /**
   * Content blocks to arrange horizontally.
   */
  columns: Block[];
} & TextAttrs &
  BlockAttrs;

export type RowsBlock = {
  /**
   * Content blocks to arrange vertically.
   */
  rows: Block[];
} & TextAttrs &
  BlockAttrs;

export type EmptyBlock = BlockAttrs;

export type BlockAttrs = {
  /**
   * Space to leave between the content and the edges of the block.
   */
  padding?: Length | BoxLengths;
  /**
   * Space to surround the block.
   * The `top` and `bottom` margins of adjacent blocks are collapsed into a single margin
   * whose size is the maximum of the two margins. Column margins don't collapse.
   */
  margin?: Length | BoxLengths;
  /**
   * A fixed width for the block. If left out, the block uses the available width.
   */
  width?: Length;
  /**
   * A fixed height for the block. If left out, the height is defined by the included text.
   */
  height?: Length;
  /**
   * Align texts included in this block.
   * Supported values are `left`, `right` and `center`. By default, texts are left-aligned.
   */
  textAlign?: Alignment;
  /**
   * An optional *unique* id for the element. When an `id` is specified, an anchor with this id
   * will be included in the PDF document that can be used to refer to this element using the text
   * attribute `link`.
   */
  id?: string;
  /**
   * Graphic elements to draw in the area covered by the block.
   * The coordinate system for graphics shapes starts at the top left corner of the block.
   * A function can be passed to take the final size of the block into account.
   */
  graphics?: Shape[] | ((info: BlockInfo) => Shape[]);
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

export type BlockInfo = {
  /**
   * The width of the block in pt.
   */
  readonly width: number;
  /**
   * The height of the block in pt.
   */
  readonly height: number;
  /**
   * The padding of the block, all values in pt.
   */
  readonly padding: { left: number; right: number; top: number; bottom: number };
};

export type Shape = Rect | Circle | Line | Polyline;

export type Rect = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineJoin?: LineJoin;
  fillColor?: Color;
  fillOpacity?: number;
};

export type Circle = {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineJoin?: LineJoin;
  fillColor?: Color;
  fillOpacity?: number;
};

export type Line = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
};

export type Polyline = {
  type: 'polyline';
  points: { x: number; y: number }[];
  closePath?: boolean;
  lineWidth?: number;
  lineColor?: Color;
  lineOpacity?: number;
  lineCap?: LineCap;
  lineJoin?: LineJoin;
  fillColor?: Color;
  fillOpacity?: number;
};

type LineCap = 'butt' | 'round' | 'square';
type LineJoin = 'miter' | 'round' | 'bevel';

/**
 * A piece of inline text. A list can be used to apply different styles to individual ranges of a
 * text.
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
   * A link target. When this attribute is present, the corresponding text will be rendered as a
   * link to the given target. The target can either be a URL or a reference to an anchor in the
   * document. An internal reference starts with a hash sign (`#`), followed by the `id` of an
   * element in the document.
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

/**
 * All named paper sizes are in portrait orientation.
 */
export type PaperSize = keyof typeof paperSizes;

export type Orientation = 'portrait' | 'landscape';

export type Size = { width: Length; height: Length };
