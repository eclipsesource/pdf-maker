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

export type TextSpan = {
  text: string;
  attrs: TextAttrs;
};

export type Block = Columns | Rows | Paragraph | ImageBlock;

export type Columns = {
  columns: Block[];
} & BlockAttrs;

export type Rows = {
  rows: Block[];
} & BlockAttrs;

export type ImageBlock = {
  image?: string;
  padding?: BoxEdges;
  imageAlign?: Alignment;
} & BlockAttrs;

export type Paragraph = {
  text?: TextSpan[];
  padding?: BoxEdges;
} & BlockAttrs &
  InheritableAttrs;

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
    return readColumns(obj, defaultAttrs);
  }
  if (obj.rows) {
    return readRows(obj, defaultAttrs);
  }
  if (obj.image) {
    return readImage(obj);
  }
  return readParagraph(obj, defaultAttrs);
}

export function readColumns(input: Obj, defaultAttrs?: InheritableAttrs): Columns {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readColumn = (el) => readBlock(el, mergedAttrs);
  return pickDefined({
    columns: readFrom(input, 'columns', types.array(readColumn)),
    ...readBlockAttrs(input),
  }) as Columns;
}

export function readRows(input: Obj, defaultAttrs?: InheritableAttrs): Columns {
  const mergedAttrs = { ...defaultAttrs, ...readInheritableAttrs(input) };
  const readRow = (el) => readBlock(el, mergedAttrs);
  return pickDefined({
    rows: readFrom(input, 'rows', types.array(readRow)),
    ...readBlockAttrs(input),
  }) as Columns;
}

const tAlignment = types.string({ enum: ['left', 'right', 'center'] }) as TypeDef<Alignment>;

export function readImage(input: Obj): Paragraph {
  return pickDefined({
    image: readFrom(input, 'image', optional(types.string())),
    padding: readFrom(input, 'padding', optional(parseEdges)),
    imageAlign: readFrom(input, 'imageAlign', optional(tAlignment)),
    ...readBlockAttrs(input),
  });
}

export function readParagraph(input: Obj, defaultAttrs?: InheritableAttrs): Paragraph {
  const mergedAttrs = { ...defaultAttrs, ...input };
  const textAttrs = readTextAttrs(mergedAttrs);
  const parseTextWithAttrs = (text) => readText(text, textAttrs);
  return {
    ...readObject(input, {
      text: optional(parseTextWithAttrs),
      padding: optional(parseEdges),
    }),
    textAlign: readFrom(mergedAttrs, 'textAlign', optional(tAlignment)),
    ...readBlockAttrs(input),
  };
}

function readBlockAttrs(input: Obj): BlockAttrs {
  return readObject(input, {
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
