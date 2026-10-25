import type { Alignment } from '../api/layout.ts';
import type { FontStyle, FontWeight } from '../api/text.ts';
import type { BoxEdges } from '../box.ts';
import { parseEdges, parseLength } from '../box.ts';
import type { Shape } from '../frame.ts';
import type { TextSegment } from '../text.ts';
import type { Obj, TypeDef } from '../util/types.ts';
import {
  dynamic,
  isObject,
  optional,
  pickDefined,
  readFrom,
  readObject,
  required,
  typeError,
  types,
} from '../util/types.ts';
import type { Color } from './read-color.ts';
import { readColor } from './read-color.ts';
import { readShape } from './read-graphics.ts';

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock | EmptyBlock;

export type TextBlock = RawTextBlock | ShapedTextBlock;

export type RawTextBlock = { text: TextSpan[] } & TextBlockAttrs;

// Text already split into segments and shaped, used to continue a text block after a page
// break without shaping the text again.
export type ShapedTextBlock = { shapedText: TextSegment[] } & TextBlockAttrs;

type TextBlockAttrs = { breakInside?: 'auto' | 'avoid' } & BlockAttrs & InheritableAttrs;

export type ImageBlock = {
  image: string;
  imageAlign?: Alignment;
} & BlockAttrs;

export type ColumnsBlock = {
  columns: Block[];
} & BlockAttrs;

export type RowsBlock = {
  rows: Block[];
  breakInside?: 'auto' | 'avoid';
  insertAfterBreak?: () => Block;
  /** Set on a remainder whose first row is the block inserted after the break. */
  continued?: boolean;
} & BlockAttrs;

export type EmptyBlock = BlockAttrs;

export type TextSpan = {
  text: string;
  attrs: TextAttrs;
};

export type TextAttrs = {
  fontFamily?: string;
  fontStyle?: FontStyle;
  fontWeight?: FontWeight;
  fontSize?: number;
  lineHeight?: number;
  color?: Color;
  link?: string;
  rise?: number;
  letterSpacing?: number;
  fontKerning?: 'normal' | 'none';
  fontVariantLigatures?: 'normal' | 'none';
  fontFeatureSettings?: Record<string, boolean>;
  language?: string;
};

type BlockAttrs = {
  padding?: BoxEdges;
  margin?: BoxEdges;
  width?: number;
  autoWidth?: boolean;
  height?: number;
  id?: string;
  graphics?: (info: BlockInfo) => Shape[];
  verticalAlign?: 'top' | 'middle' | 'bottom';
  breakBefore?: 'auto' | 'always' | 'avoid';
  breakAfter?: 'auto' | 'always' | 'avoid';
};

export type BlockInfo = {
  readonly width: number;
  readonly height: number;
  readonly padding: { left: number; right: number; top: number; bottom: number };
};

type InheritableAttrs = TextAttrs & {
  textAlign?: Alignment;
};

const contentKeys = ['text', 'image', 'columns', 'rows'];
const blockTypes = [...contentKeys, 'empty'];

export function readBlock(input: unknown, defaultAttrs?: InheritableAttrs): Block {
  const obj = readObject(input);
  const type = readFrom(obj, 'type', optional(types.string({ enum: blockTypes })));
  const keys = contentKeys.filter((key) => key in obj);
  if (keys.length > 1) {
    const expected = contentKeys.map((key) => `'${key}'`).join(', ');
    const actual = keys.map((key) => `'${key}'`).join(', ');
    throw new TypeError(`Expected only one of (${expected}), got: (${actual})`);
  }
  if (type && keys.length && keys[0] !== type) {
    const expected = type === 'empty' ? 'no content property' : `property '${type}'`;
    throw new TypeError(`Expected ${expected} for block type '${type}', got: '${keys[0]}'`);
  }
  // The type is only used to select the reader. A missing content
  // property is then reported by that reader.
  switch (type ?? keys[0]) {
    case 'text':
      return readTextBlock(obj, defaultAttrs);
    case 'image':
      return readImageBlock(obj);
    case 'columns':
      return readColumnsBlock(obj, defaultAttrs);
    case 'rows':
      return readRowsBlock(obj, defaultAttrs);
    default:
      return readEmptyBlock(obj);
  }
}

const tAlignment = types.string({ enum: ['left', 'right', 'center'] }) as TypeDef<Alignment>;

export function readTextBlock(input: Obj, defaultAttrs?: InheritableAttrs): RawTextBlock {
  const mergedAttrs = { ...defaultAttrs, ...input };
  const textAttrs = readTextAttrs(mergedAttrs);
  const parseTextWithAttrs = (text: unknown) => readText(text, textAttrs);
  return pickDefined({
    ...readObject(input, {
      text: required(parseTextWithAttrs),
      breakInside: optional(types.string({ enum: ['auto', 'avoid'] })),
    }),
    textAlign: readFrom(mergedAttrs, 'textAlign', optional(tAlignment)),
    ...readBlockAttrs(input),
  }) as RawTextBlock;
}

export function readImageBlock(input: Obj): ImageBlock {
  return pickDefined({
    ...readObject(input, {
      image: required(types.string()),
      imageAlign: optional(tAlignment),
    }),
    ...readBlockAttrs(input),
  }) as ImageBlock;
}

export function readColumnsBlock(input: Obj, defaultAttrs?: InheritableAttrs): ColumnsBlock {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readColumn = (el: unknown) => readBlock(el, mergedAttrs);
  return pickDefined({
    ...readObject(input, {
      columns: required(types.array(readColumn)),
    }),
    ...readBlockAttrs(input),
  }) as ColumnsBlock;
}

export function readRowsBlock(input: Obj, defaultAttrs?: InheritableAttrs): RowsBlock {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readRow = (el: unknown) => readBlock(el, mergedAttrs);
  return pickDefined({
    ...readObject(input, {
      rows: required(types.array(readRow)),
      breakInside: optional(types.string({ enum: ['auto', 'avoid'] })),
      insertAfterBreak: optional(dynamic(readBlock, 'insertAfterBreak')),
    }),
    ...readBlockAttrs(input),
  }) as RowsBlock;
}

export function readEmptyBlock(input: Obj): EmptyBlock {
  return pickDefined(readBlockAttrs(input));
}

function readBlockAttrs(input: Obj): BlockAttrs {
  const result = readObject(input, {
    padding: optional(parseEdges),
    margin: optional(parseEdges),
    width: optional(parseWidth),
    height: optional(parseLength),
    id: optional(types.string()),
    graphics: optional(dynamic(types.array(readShape), 'graphics')),
    verticalAlign: optional(types.string({ enum: ['top', 'middle', 'bottom'] })),
    breakBefore: optional(types.string({ enum: ['auto', 'always', 'avoid'] })),
    breakAfter: optional(types.string({ enum: ['auto', 'always', 'avoid'] })),
  });
  const autoWidth = result.width === 'auto';
  if (autoWidth) {
    delete result.width;
    return { ...result, autoWidth } as BlockAttrs;
  }
  return result as BlockAttrs;
}

function parseWidth(input: unknown): number | 'auto' {
  if (input === 'auto') {
    return input;
  }
  return parseLength(input);
}

export function readTextAttrs(input: Obj): TextAttrs {
  const obj = readObject(input, {
    fontFamily: optional(types.string()),
    fontStyle: optional(types.string({ enum: ['normal', 'italic', 'oblique'] })),
    fontWeight: optional(readFontWeight),
    fontSize: optional(types.number({ minimum: 0 })),
    lineHeight: optional(types.number({ minimum: 0 })),
    bold: optional(types.boolean()),
    italic: optional(types.boolean()),
    color: optional(readColor),
    link: optional(types.string()),
    rise: optional(types.number()),
    letterSpacing: optional(types.number()),
    fontKerning: optional(types.string({ enum: ['normal', 'none'] })),
    fontVariantLigatures: optional(types.string({ enum: ['normal', 'none'] })),
    fontFeatureSettings: optional(readFontFeatureSettings),
    language: optional(types.string({ pattern: /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/ })),
  });
  if (!obj.fontWeight && obj.bold) {
    obj.fontWeight = 700;
  }
  if (!obj.fontStyle && obj.italic) {
    obj.fontStyle = 'italic';
  }
  delete obj.bold;
  delete obj.italic;
  return obj as TextAttrs;
}

function readFontWeight(input: unknown): number {
  if (input === 'normal') return 400;
  if (input === 'bold') return 700;
  if (typeof input === 'number' && Number.isInteger(input) && input >= 0 && input <= 1000) {
    return input;
  }
  throw typeError("'normal', 'bold', or integer between 0 and 1000", input);
}

function readFontFeatureSettings(input: unknown): Record<string, boolean> {
  if (!isObject(input)) {
    throw typeError('object with boolean values', input);
  }
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== 'boolean') {
      throw typeError(`boolean for feature "${key}"`, value);
    }
  }
  return input as Record<string, boolean>;
}

export function readInheritableAttrs(input: unknown): TextAttrs {
  const obj = readObject(input);
  return pickDefined({
    ...readTextAttrs(obj),
    textAlign: readFrom(obj, 'textAlign', optional(tAlignment)),
  });
}

export function readText(text: unknown, attrs: TextAttrs): TextSpan[] {
  if (Array.isArray(text)) {
    return text.flatMap((text) => readText(text, attrs));
  }
  if (typeof text === 'string') {
    return [{ text, attrs }];
  }
  if (isObject(text) && 'text' in text) {
    return readText(text.text, { ...attrs, ...readTextAttrs(text) });
  }
  throw typeError('string, object with text property, or array of text', text);
}
