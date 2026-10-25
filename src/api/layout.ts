import type { Shape } from './graphics.ts';
import type { BoxLengths, Length } from './sizes.ts';
import type { Text, TextProps, TextSpan } from './text.ts';

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock | EmptyBlock;

/**
 * The names of the block types. Each block type has a content property
 * of the same name, except `empty`, which has no content.
 */
export type BlockType = 'text' | 'image' | 'columns' | 'rows' | 'empty';

type ContentKey = Exclude<BlockType, 'empty'>;

// Marks the content properties of all other block types as `never`.
// Without this, TypeScript accepts `{ text: 'a', rows: [] }` as a
// `Block`, since excess property checks on a union only reject
// properties that exist in no member of the union.
type Only<K extends ContentKey> = { [P in Exclude<ContentKey, K>]?: never };

/**
 * A block that contains text.
 */
export type TextBlock = {
  /**
   * The type of this block. Optional, as it follows from the `text`
   * property.
   */
  type?: 'text';

  /**
   * Text to display in this block. Nested text spans can be used to
   * apply different text properties to different parts of the text.
   */
  text: string | TextSpan | (string | TextSpan)[] | Text;

  /**
   * Controls whether a page break may occur inside the block.
   * - `auto` (default): Insert a page break when needed.
   * - `avoid`: Do not insert a page break inside this block if it can be avoided.
   */
  breakInside?: 'auto' | 'avoid';
} & Only<'text'> &
  TextProps &
  BlockProps;

/**
 * Creates a text block. The text can contain nested text spans to apply
 * different text properties to different parts of the text. Use
 * `span()` to create text spans.
 *
 * @param text The text to display in this block.
 * @param props Optional properties for the block.
 */
export function text(
  text: string | TextSpan | (string | TextSpan)[],
  props?: Omit<TextBlock, 'type' | 'text'>,
): TextBlock {
  return { ...props, type: 'text', text };
}

/**
 * A block that contains an image.
 */
export type ImageBlock = {
  /**
   * The type of this block. Optional, as it follows from the `image`
   * property.
   */
  type?: 'image';

  /**
   * The URL of the image to display in this block. Supported URL schemes
   * are `data:`, `http:`, `https:`, and `file:`. Paths in `file:` URLs
   * are resolved relative to the resource root. Images are supported in
   * JPG, PNG, and SVG format.
   *
   * When any of the properties `width` and `height` are specified, the
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
} & Only<'image'> &
  BlockProps;

/**
 * Creates a block that contains an image.
 *
 * @param image The URL of the image to display in this block.
 * @param props Optional properties for the block.
 */
export function image(image: string, props?: Omit<ImageBlock, 'type' | 'image'>): ImageBlock {
  return { ...props, type: 'image', image };
}

/**
 * A block that contains other blocks arranged horizontally.
 */
export type ColumnsBlock = {
  /**
   * The type of this block. Optional, as it follows from the `columns`
   * property.
   */
  type?: 'columns';

  /**
   * Content blocks to arrange horizontally.
   */
  columns: Block[];
} & Only<'columns'> &
  TextProps &
  BlockProps;

/**
 * Creates a block that contains other blocks arranged horizontally.
 *
 * @param columns Content blocks to arrange horizontally.
 * @param props Optional properties for the block.
 */
export function columns(
  columns: Block[],
  props?: Omit<ColumnsBlock, 'type' | 'columns'>,
): ColumnsBlock {
  return { ...props, type: 'columns', columns };
}

/**
 * A block that contains other blocks arranged vertically.
 */
export type RowsBlock = {
  /**
   * The type of this block. Optional, as it follows from the `rows`
   * property.
   */
  type?: 'rows';

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
} & Only<'rows'> &
  TextProps &
  BlockProps;

/**
 * Creates a block that contains other blocks arranged vertically.
 *
 * @param rows Content blocks to arrange vertically.
 * @param props Optional properties for the block.
 */
export function rows(rows: Block[], props?: Omit<RowsBlock, 'type' | 'rows'>): RowsBlock {
  return { ...props, type: 'rows', rows };
}

/**
 * A block that doesn't contain any content. It can be used to add space
 * or to draw graphics. Since it has no content, its `height` should be
 * set.
 */
export type EmptyBlock = {
  /**
   * The type of this block. Optional, as it follows from the absence of
   * a content property.
   */
  type?: 'empty';
} & Only<never> &
  BlockProps;

/**
 * Properties that can be applied to a block.
 */
export type BlockProps = {
  /**
   * Space to leave between the content and the edges of the block.
   */
  padding?: Length | BoxLengths;

  /**
   * Space to surround the block.
   * The `top` and `bottom` margins of adjacent blocks are collapsed into a single margin
   * whose size is the maximum of the two margins. Column margins don't collapse.
   * The margins of a rows block also collapse with those of its first and last row,
   * unless the block has a padding on that side, graphics, or a fixed height.
   * Margins next to a page break are dropped, except the top margin after a forced break.
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
   * property `link`.
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
   * - `always`: Always insert a page break before this block, unless it is inside
   *   a block that avoids page breaks, such as a column, header, or footer.
   * - `avoid`: Do not insert a page break before this block if it can be avoided.
   */
  breakBefore?: 'auto' | 'always' | 'avoid';

  /**
   * Controls whether a page break may occur after the block.
   * - `auto` (default): Insert a page break when needed.
   * - `always`: Always insert a page break after this block, unless it is inside
   *   a block that avoids page breaks, such as a column, header, or footer.
   * - `avoid`: Do not insert a page break after this block if it can be avoided.
   */
  breakAfter?: 'auto' | 'always' | 'avoid';
};

/**
 * Information about the current block, provided to functions that
 * create graphics in the block area.
 */
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

export type Alignment = 'left' | 'right' | 'center';
