import { BoxEdges, parseEdges, Size } from './box.js';
import { FontDef, readFonts } from './fonts.js';
import { ImageDef, readImages } from './images.js';
import { Block, readBlock, readInheritableAttrs, TextAttrs } from './read-block.js';
import { parseOrientation, readPageSize } from './read-page-size.js';
import { dynamic, Obj, optional, readAs, readObject, required, typeError, types } from './types.js';

export type DocumentDefinition = {
  fonts?: FontDef[];
  images?: ImageDef[];
  pageSize?: Size;
  pageOrientation?: 'portrait' | 'landscape';
  info?: Metadata;
  defaultStyle?: TextAttrs;
  dev?: { guides?: boolean };
  margin?: (info: PageInfo) => BoxEdges;
  header?: (info: PageInfo) => Block;
  footer?: (info: PageInfo) => Block;
  content: Block[];
  customData?: Record<string, string | Uint8Array>;
};

export type Metadata = {
  title?: string;
  subject?: string;
  keywords?: string[];
  author?: string;
  creationDate?: Date;
  creator?: string;
  producer?: string;
  custom?: Record<string, string>;
};

export type PageInfo = {
  pageSize: { width: number; height: number };
  pageNumber: number;
  pageCount?: number;
};

export function readDocumentDefinition(input: unknown): DocumentDefinition {
  const def1 = readObject(input, {
    fonts: optional(readFonts),
    images: optional(readImages),
    pageSize: optional(readPageSize),
    pageOrientation: optional(parseOrientation),
    info: optional(readInfo),
    defaultStyle: optional(readInheritableAttrs),
    dev: optional(types.object({ guides: optional(types.boolean()) })),
    customData: optional(readCustomData),
  });
  const tBlock = (block: unknown) => readBlock(block, def1.defaultStyle);
  const def2 = readObject(input, {
    margin: optional(dynamic(parseEdges)),
    header: optional(dynamic(tBlock)),
    footer: optional(dynamic(tBlock)),
    content: required(types.array(tBlock)),
  });
  return { ...def1, ...def2 } as DocumentDefinition;
}

function readInfo(input: unknown): Metadata {
  const properties = {
    title: optional(types.string()),
    subject: optional(types.string()),
    keywords: optional(types.array(types.string())),
    author: optional(types.string()),
    creationDate: optional(types.date()),
    creator: optional(types.string()),
    producer: optional(types.string()),
  };
  const obj = readObject(input, properties);
  const custom = Object.fromEntries(
    Object.entries(input as Obj)
      .filter(([key]) => !(key in properties))
      .map(([key, value]) => [key, readAs(value, key, types.string())])
  );
  return Object.keys(custom).length ? { ...obj, custom } : obj;
}

function readCustomData(input: unknown) {
  const readValue = (input: unknown) => {
    if (typeof input === 'string') return input;
    if (typeof input === 'object' && input instanceof Uint8Array) return input;
    throw typeError('string or Uint8Array', input);
  };
  return Object.fromEntries(
    Object.entries(readObject(input)).map(([key, value]) => [key, readAs(value, key, readValue)])
  );
}
