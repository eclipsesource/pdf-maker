import { BoxEdges, parseEdges, parseLength } from './box.js';
import { Color, parseColor } from './colors.js';
import { Alignment } from './content.js';
import { readShape, Shape } from './read-graphics.js';
import {
  dynamic,
  isObject,
  Obj,
  optional,
  pickDefined,
  readFrom,
  readObject,
  required,
  TypeDef,
  typeError,
  types,
} from './types.js';

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock | EmptyBlock;

export type TextBlock = {
  text: TextSpan[];
} & BlockAttrs &
  InheritableAttrs;

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
} & BlockAttrs;

export type EmptyBlock = BlockAttrs;

export type TextSpan = {
  text: string;
  attrs: TextAttrs;
};

export type TextAttrs = {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  bold?: boolean;
  italic?: boolean;
  color?: Color;
  link?: string;
  rise?: number;
  letterSpacing?: number;
};

type BlockAttrs = {
  padding?: BoxEdges;
  margin?: BoxEdges;
  width?: number;
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

export function readBlock(input: unknown, defaultAttrs?: InheritableAttrs): Block {
  const obj = readObject(input);
  if ('text' in obj) {
    return readTextBlock(obj, defaultAttrs);
  }
  if ('image' in obj) {
    return readImageBlock(obj);
  }
  if ('columns' in obj) {
    return readColumnsBlock(obj, defaultAttrs);
  }
  if ('rows' in obj) {
    return readRowsBlock(obj, defaultAttrs);
  }
  return readEmptyBlock(obj);
}

const tAlignment = types.string({ enum: ['left', 'right', 'center'] }) as TypeDef<Alignment>;

export function readTextBlock(input: Obj, defaultAttrs?: InheritableAttrs): TextBlock {
  const mergedAttrs = { ...defaultAttrs, ...input };
  const textAttrs = readTextAttrs(mergedAttrs);
  const parseTextWithAttrs = (text: unknown) => readText(text, textAttrs);
  return pickDefined({
    ...readObject(input, {
      text: required(parseTextWithAttrs),
    }),
    textAlign: readFrom(mergedAttrs, 'textAlign', optional(tAlignment)),
    ...readBlockAttrs(input),
  }) as TextBlock;
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
      columns: types.array(readColumn),
    }),
    ...readBlockAttrs(input),
  }) as ColumnsBlock;
}

export function readRowsBlock(input: Obj, defaultAttrs?: InheritableAttrs): RowsBlock {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readRow = (el: unknown) => readBlock(el, mergedAttrs);
  return pickDefined({
    ...readObject(input, {
      rows: types.array(readRow),
      breakInside: optional(types.string({ enum: ['auto', 'avoid'] })),
    }),
    ...readBlockAttrs(input),
  }) as RowsBlock;
}

export function readEmptyBlock(input: Obj): EmptyBlock {
  return pickDefined(readBlockAttrs(input));
}

function readBlockAttrs(input: Obj): BlockAttrs {
  return readObject(input, {
    padding: optional(parseEdges),
    margin: optional(parseEdges),
    width: optional(parseLength),
    height: optional(parseLength),
    id: optional(types.string()),
    graphics: optional(dynamic(types.array(readShape), 'graphics')),
    verticalAlign: optional(types.string({ enum: ['top', 'middle', 'bottom'] })),
    breakBefore: optional(types.string({ enum: ['auto', 'always', 'avoid'] })),
    breakAfter: optional(types.string({ enum: ['auto', 'always', 'avoid'] })),
  }) as BlockAttrs;
}

export function readTextAttrs(input: Obj): TextAttrs {
  return readObject(input, {
    fontFamily: optional(types.string()),
    fontSize: optional(types.number({ minimum: 0 })),
    lineHeight: optional(types.number({ minimum: 0 })),
    bold: optional(types.boolean()),
    italic: optional(types.boolean()),
    color: optional(parseColor),
    link: optional(types.string()),
    rise: optional(types.number()),
    letterSpacing: optional(types.number()),
  });
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
    return readText((text as Obj).text, { ...attrs, ...readTextAttrs(text as Obj) });
  }
  throw typeError('string, object with text attribute, or array of text', text);
}
