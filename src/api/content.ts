import type { Color } from './colors.ts';
import type { Length } from './sizes.ts';
import type { Orientation, PaperSize } from './sizes.ts';

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
  pageSize?: PaperSize;

  /**
   * The orientation of the pages in the document. When this parameter is set, width and height
   * of the given page size will be reversed if necessary to match the given orientation.
   */
  pageOrientation?: Orientation;

  /**
   * The margin to leave around the page content area, relative to header and footer.
   * That is, if a header is specified, the top margin defines the vertical distance from the
   * header, otherwise from the top of the page.
   * The bottom margin defines the vertical distance from the footer or, if there is no footer,
   * from the bottom of the page.
   * A function can be passed to create page-specific margins.
   *
   * Defaults to `50pt` on each side.
   */
  margin?: Length | BoxLengths | ((info: PageInfo) => Length | BoxLengths);

  /**
   * The fonts to use in the document. There is no default. Each font that is used in the document
   * must be registered. Not needed for documents that contain only graphics.
   */
  fonts?: FontsDefinition;

  /**
   * Pre-defined image data. These images can be used by their name in
   * the document. This is only needed if images cannot be loaded
   * directly from the file system.
   */
  images?: ImagesDefinition;

  /**
   * Metadata to include in the PDF's *document information dictionary*.
   */
  info?: InfoAttrs & CustomInfoAttrs;

  /**
   * Custom data to be added to the PDF *document catalog*. This attribute should only be used by
   * PDF applications that need to include custom data in a PDF document.
   * To avoid name collisions, keys should be prefixed with `XX`.
   *
   * See [PDF 1.7, Appendix E - PDF Name Registry](https://archive.org/details/pdf1.7/page/n1017/mode/2up)
   */
  customData?: Record<string, string | Uint8Array>;

  dev?: {
    /**
     * When set to true, additional guides are drawn to help analyzing the layout.
     * A thin rectangle is drawn around each rendered frame. Margins are given a semi-transparent
     * yellow background and padding areas are shown in blue.
     */
    guides?: boolean;
  };
};

/**
 * Standard metadata attributes to include in the PDF's *document information dictionary*.
 */
export type InfoAttrs = {
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
export type CustomInfoAttrs = {
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
   * Supported image formats are PNG and JPEG.
   */
  data: string | Uint8Array | ArrayBuffer;
};

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock | EmptyBlock;

export type TextBlock = {
  /**
   * Text to display in this block.
   */
  text: Text;

  /**
   * Controls whether a page break may occur inside the block.
   * - `auto` (default): Insert a page break when needed.
   * - `avoid`: Do not insert a page break inside this block if it can be avoided.
   */
  breakInside?: 'auto' | 'avoid';
} & TextAttrs &
  BlockAttrs;

export type ImageBlock = {
  /**
   * The name of an image to display in this block. If the given image
   * name has been registered with the global `images` attribute, the
   * registered image will be used. Otherwise, the image name is
   * interpreted as a file name and the image is loaded from the file
   * system. Relative paths are resolved relative to the current working
   * directory.
   *
   * When any of the attributes `width` and `height` are specified, the
   * image will be scaled proportionally to be contained in the given
   * bounds. When neither `width` nor `height` is given, the image is
   * not scaled unless it exceeds the maximum available width. In this
   * case, it is scaled down to fit onto the page.
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

  /**
   * Controls whether a page break may occur inside the block.
   * - `auto` (default): Insert a page break when needed.
   * - `avoid`: Do not insert a page break inside this block if it can be avoided.
   */
  breakInside?: 'auto' | 'avoid';

  /**
   * Allows to insert an extra block after a page break.
   */
  insertAfterBreak?: Block | (() => Block);
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
   * The width of the block. If this property is set to `auto`, the
   * block will use the width of the widest element in the block. In
   * this case, all children that don't have a fixed width will inherit
   * the `auto` width. If this property is not set, the block uses the
   * available width.
   */
  width?: Length | 'auto';

  /**
   * The height of the block. If this property is not set, the block
   * uses the height of its content.
   */
  height?: Length;

  /**
   * Align texts included in this block.
   * Supported values are `left`, `right` and `center`. By default, texts are left-aligned.
   */
  textAlign?: Alignment;

  /**
   * Aligns this block vertically within a columns block.
   */
  verticalAlign?: 'top' | 'middle' | 'bottom';

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

  /**
   * Controls whether a page break may occur before the block.
   * - `auto` (default): Insert a page break when needed.
   * - `always`: Always insert a page break before this block.
   * - `avoid`: Do not insert a page break before this block if it can be avoided.
   */
  breakBefore?: 'auto' | 'always' | 'avoid';

  /**
   * Controls whether a page break may occur after the block.
   * - `auto` (default): Insert a page break when needed.
   * - `always`: Always insert a page break after this block.
   * - `avoid`: Do not insert a page break after this block if it can be avoided.
   */
  breakAfter?: 'auto' | 'always' | 'avoid';
};

export type PageInfo = {
  /**
   * The size of the current page in pt.
   */
  readonly pageSize: { width: number; height: number };

  /**
   * The number of the current page, starting at 1.
   */
  readonly pageNumber: number;

  /**
   * The total number of pages.
   * This value is only available after the layout of the entire document has finished.
   * Before that, it is `undefined`.
   */
  readonly pageCount?: number;
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

export type Shape = Rect | Circle | Line | Polyline | Path;

/**
 * A rectangle.
 */
export type Rect = {
  type: 'rect';

  /**
   * The x coordinate of the top left corner of the rectangle.
   */
  x: number;

  /**
   * The y coordinate of the top left corner of the rectangle.
   */
  y: number;

  /**
   * The width of the rectangle.
   */
  width: number;

  /**
   * The height of the rectangle.
   */
  height: number;
} & Omit<LineAttrs, 'lineCap'> &
  FillAttrs &
  TransformAttrs;

/**
 * A circle.
 */
export type Circle = {
  type: 'circle';

  /**
   * The x coordinate of the center of the circle.
   */
  cx: number;

  /**
   * The y coordinate of the center of the circle.
   */
  cy: number;

  /**
   * The radius of the circle.
   */
  r: number;
} & Omit<LineAttrs, 'lineCap' | 'lineJoin'> &
  FillAttrs &
  TransformAttrs;

/**
 * A straight line.
 */
export type Line = {
  type: 'line';

  /**
   * The x coordinate of the start point of the line.
   */
  x1: number;

  /**
   * The y coordinate of the start point of the line.
   */
  y1: number;

  /**
   * The x coordinate of the end point of the line.
   */
  x2: number;

  /**
   * The y coordinate of the end point of the line.
   */
  y2: number;
} & Omit<LineAttrs, 'lineJoin'> &
  TransformAttrs;

/**
 * A polyline, i.e. a line consisting of multiple segments.
 */
export type Polyline = {
  type: 'polyline';

  /**
   * The points of the polyline, each point as an object with `x` and `y` coordinates.
   */
  points: { x: number; y: number }[];

  /**
   * Whether to close the path by drawing a line from the last point to the first point.
   */
  closePath?: boolean;
} & LineAttrs &
  FillAttrs &
  TransformAttrs;

/**
 * An SVG path element.
 */
export type Path = {
  type: 'path';

  /**
   * An SVG path. See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d for details.
   */
  d: string;
} & LineAttrs &
  FillAttrs &
  TransformAttrs;

export type LineCap = 'butt' | 'round' | 'square';
export type LineJoin = 'miter' | 'round' | 'bevel';

type LineAttrs = {
  /**
   * The width of stroked lines in pt.
   */
  lineWidth?: number;

  /**
   * The color of stroked lines in pt.
   */
  lineColor?: Color;

  /**
   * The opacity of stroked lines as a number between `0` and `1`.
   */
  lineOpacity?: number;

  /**
   * The shape at the end of open paths when they are stroked.
   * * `butt`: indicates that the stroke for each subpath does not extend beyond its two endpoints.
   *   On a zero length subpath, the path will not be rendered at all.
   * * `round`: indicates that at the end of each subpath the stroke will be extended by a half circle
   *   with a diameter equal to the stroke width.
   *   On a zero length subpath, the stroke consists of a full circle centered at the subpath's point.
   * * `square`: indicates that at the end of each subpath the stroke will be extended by a rectangle
   *   with a width equal to half the width of the stroke and a height equal to the width of the stroke.
   *   On a zero length subpath, the stroke consists of a square with its width equal to the stroke
   *   width, centered at the subpath's point.
   */
  lineCap?: LineCap;

  /**
   * The shape to be used at the corners of paths or basic shapes when they are stroked.
   * * `miter`: indicates that the outer edges of the strokes for the two segments should be extended
   *   until they meet at an angle, as in a picture frame.
   * * `round`: indicates that the outer edges of the strokes for the two segments should be rounded off
   *   by a circular arc with a radius equal to half the line width.
   * * `bevel`: indicates that the two segments should be finished with butt caps and the resulting
   *   notch should be filled with a triangle.
   */
  lineJoin?: LineJoin;

  /**
   * The dash pattern to use for drawing paths, expressed as array of numbers. Each element defines
   * the length of a dash or a gap, in pt, starting with the first dash. If the array contains an odd
   * number of elements, then the elements are repeated to yield an even number of elements.
   * An empty array stands for no dash pattern, i.e. a continuous line.
   */
  lineDash?: number[];
};

type FillAttrs = {
  /**
   * The color to use for filling the shape.
   */
  fillColor?: Color;

  /**
   * The opacity to use for filling the shape.
   */
  fillOpacity?: number;
};

type TransformAttrs = {
  /**
   * Moves the element by `x` and `y`.
   */
  translate?: { x?: number; y?: number };

  /**
   * Stretches the element by `x` and `y`.
   */
  scale?: { x?: number; y?: number };

  /**
   * Rotates the element by `angle` degrees clockwise about the point
   * `[cx,cy]`. If `cx` and `cy` are omitted, the rotation is about the
   * origin of the coordinate system.
   */
  rotate?: { angle: number; cx?: number; cy?: number };

  /**
   * Skews the element by `x` degrees along the x axis and by `y`
   * degrees along the y axis.
   */
  skew?: { x?: number; y?: number };

  /**
   * A custom transformation matrix to apply to the element. The matrix
   * is given as an array of six values `[a, b, c, d, e, f]` that
   * represent the transformation matrix:
   * ```
   * | a c e |
   * | b d f |
   * | 0 0 1 |
   * ```
   */
  matrix?: number[];
};

/**
 * A piece of inline text. A list can be used to apply different styles to individual ranges of a
 * text.
 */
export type Text = string | ({ text: Text } & TextAttrs) | Text[];

/**
 * The font weight is an integer between 0 and 1000.
 * The keywords `normal` (400) and `bold` (700) are also supported.
 */
export type FontWeight = number | 'normal' | 'bold';

/**
 * The font style selects a normal, italic, or oblique font face from
 * the font family. Italic fonts are usually cursive in nature and
 * oblique fonts are usually sloped versions of the regular font.
 */
export type FontStyle = 'normal' | 'italic' | 'oblique';

export type TextAttrs = {
  /**
   * The name of the font to use.
   * If not specified, the first font registered in the document definition that matches the other
   * font attributes will be used.
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

export type Alignment = 'left' | 'right' | 'center';
