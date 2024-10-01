import type { Shape } from './graphics.ts';
import type { BoxLengths, Length } from './sizes.ts';
import type { Text, TextProps } from './text.ts';

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock | EmptyBlock;

/**
 * A block that contains text.
 */
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
} & TextProps &
  BlockProps;

/**
 * A block that contains an image.
 */
export type ImageBlock = {
  /**
   * The name of an image to display in this block. If the given image
   * name has been registered with the global `images` property, the
   * registered image will be used. Otherwise, the image name is
   * interpreted as a file name and the image is loaded from the file
   * system. Relative paths are resolved relative to the current working
   * directory.
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
} & BlockProps;

/**
 * A block that contains other blocks arranged horizontally.
 */
export type ColumnsBlock = {
  /**
   * Content blocks to arrange horizontally.
   */
  columns: Block[];
} & TextProps &
  BlockProps;

/**
 * A block that contains other blocks arranged vertically.
 */
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
} & TextProps &
  BlockProps;

/**
 * A block that doesn't contain any content. It can be used to include
 * graphics.
 */
export type EmptyBlock = BlockProps;

/**
 * @deprecated Use `BlockProps` instead.
 */
export type BlockAttrs = BlockProps;

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
