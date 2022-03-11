/**
 * The complete definition of a document to create.
 */
export type DocumentDefinition = {
  /**
   * The sequence of content elements to render.
   */
  content: Paragraph[];
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
