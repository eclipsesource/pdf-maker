import type { Block } from './layout.ts';
import type { BoxLengths, Length, Orientation, PaperSize } from './sizes.ts';
import type { TextProps } from './text.ts';

/**
 * The complete definition of a PDF document to create.
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
   * The default style properties to use in the document.
   */
  defaultStyle?: TextProps;

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
   *
   * @deprecated Register fonts with `PdfMaker` instead.
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
  info?: InfoProps & CustomInfoProps;

  /**
   * Custom data to be added to the PDF *document catalog*. This property should only be used by
   * PDF applications that need to include custom data in a PDF document.
   * To avoid name collisions, keys should be prefixed with `XX`.
   *
   * See [PDF 1.7, Appendix E - PDF Name Registry](https://archive.org/details/pdf1.7/page/n1017/mode/2up)
   */
  customData?: Record<string, string | Uint8Array>;

  dev?: {
    /**
     * When set to true, additional guides are drawn to help analyzing
     * the layout. A thin rectangle is drawn around each rendered frame.
     * Margins are given a semi-transparent yellow background and
     * padding areas are shown in blue.
     */
    guides?: boolean;
  };
};

/**
 * @deprecated Use `InfoProps` instead.
 */
export type InfoAttrs = InfoProps;

/**
 * Standard metadata properties to include in the PDF's *document
 * information dictionary*. These properties are usually displayed by
 * PDF viewers.
 */
export type InfoProps = {
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
   * The date and time the document was created (defaults to current
   * time).
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
 * @deprecated Use `CustomInfoProps` instead.
 */
export type CustomInfoAttrs = CustomInfoProps;

/**
 * Custom metadata properties to include in the PDF's *document
 * information dictionary*. These properties should be prefixed with
 * `XX` to avoid name collisions.
 */
export type CustomInfoProps = {
  [name: string]: string;
};

/**
 * An object that defines the fonts to use in the document.
 *
 * @deprecated Register fonts with `PdfMaker` instead.
 */
export type FontsDefinition = { [name: string]: FontDefinition[] };

/**
 * The definition of a single font.
 *
 * @deprecated Register fonts with `PdfMaker` instead.
 */
export type FontDefinition = {
  /**
   * The font data, as a Uint8Array, ArrayBuffer, or a base64-encoded
   * string.
   *
   * Supports TrueType (`.ttf`), OpenType (`.otf`), WOFF, WOFF2,
   * TrueType Collection (`.ttc`), and Datafork TrueType (`.dfont`) font
   * files (see https://github.com/Hopding/fontkit).
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

/**
 * Pre-defined image data. These images can be used by their name in the
 * document. This is only needed if images cannot be loaded directly
 * from the file system.
 */
export type ImagesDefinition = { [name: string]: ImageDefinition };

/**
 * The definition of a single image.
 */
export type ImageDefinition = {
  /**
   * The image data, as a Uint8Array, ArrayBuffer, or a base64-encoded string.
   * Supported image formats are PNG and JPEG.
   */
  data: string | Uint8Array | ArrayBuffer;
};

/**
 * Information about the current page, provided to functions that create
 * page-specific headers, footers, and margins.
 */
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
