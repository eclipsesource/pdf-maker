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
  TypeDef,
  typeError,
  types,
} from './types.js';

export type Block = TextBlock | ImageBlock | ColumnsBlock | RowsBlock;

export type TextBlock = {
  text?: TextSpan[];
} & BlockAttrs &
  InheritableAttrs;

export type ImageBlock = {
  image?: string;
  imageAlign?: Alignment;
} & BlockAttrs;

export type ColumnsBlock = {
  columns: Block[];
} & BlockAttrs;

export type RowsBlock = {
  rows: Block[];
} & BlockAttrs;

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
};

type BlockAttrs = {
  padding?: BoxEdges;
  margin?: BoxEdges;
  width?: number;
  height?: number;
  id?: string;
  graphics?: (info: BlockInfo) => Shape[];
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
  if (obj.columns) {
    return readColumnsBlock(obj, defaultAttrs);
  }
  if (obj.rows) {
    return readRowsBlock(obj, defaultAttrs);
  }
  if (obj.image) {
    return readImageBlock(obj);
  }
  return readTextBlock(obj, defaultAttrs);
}

export function readColumnsBlock(input: Obj, defaultAttrs?: InheritableAttrs): ColumnsBlock {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readColumn = (el) => readBlock(el, mergedAttrs);
  return pickDefined({
    columns: readFrom(input, 'columns', types.array(readColumn)),
    ...readBlockAttrs(input),
  }) as ColumnsBlock;
}

export function readRowsBlock(input: Obj, defaultAttrs?: InheritableAttrs): ColumnsBlock {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readRow = (el) => readBlock(el, mergedAttrs);
  return pickDefined({
    rows: readFrom(input, 'rows', types.array(readRow)),
    ...readBlockAttrs(input),
  }) as ColumnsBlock;
}

const tAlignment = types.string({ enum: ['left', 'right', 'center'] }) as TypeDef<Alignment>;

export function readImageBlock(input: Obj): TextBlock {
  return pickDefined({
    image: readFrom(input, 'image', optional(types.string())),
    imageAlign: readFrom(input, 'imageAlign', optional(tAlignment)),
    ...readBlockAttrs(input),
  });
}

export function readTextBlock(input: Obj, defaultAttrs?: InheritableAttrs): TextBlock {
  const mergedAttrs = { ...defaultAttrs, ...input };
  const textAttrs = readTextAttrs(mergedAttrs);
  const parseTextWithAttrs = (text) => readText(text, textAttrs);
  return {
    ...readObject(input, {
      text: optional(parseTextWithAttrs),
    }),
    textAlign: readFrom(mergedAttrs, 'textAlign', optional(tAlignment)),
    ...readBlockAttrs(input),
  };
}

function readBlockAttrs(input: Obj): BlockAttrs {
  return readObject(input, {
    padding: optional(parseEdges),
    margin: optional(parseEdges),
    width: optional(parseLength),
    height: optional(parseLength),
    id: optional(types.string()),
    graphics: optional(dynamic(types.array(readShape), 'graphics')),
  });
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
  });
}

export function readInheritableAttrs(input: Obj): TextAttrs {
  return pickDefined({
    ...readTextAttrs(input),
    textAlign: readFrom(input, 'textAlign', optional(tAlignment)),
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
