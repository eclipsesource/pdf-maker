import { BoxEdges, parseEdges, Size } from './box.js';
import { FontDef, readFonts } from './fonts.js';
import { ImageDef, readImages } from './images.js';
import { parseOrientation, parsePageSize } from './page-sizes.js';
import { Block, parseInheritableAttrs, readBlock, TextAttrs } from './text.js';
import { dynamic, optional, readAs, readObject, required, types } from './types.js';

export type DocumentDefinition = {
  fonts?: FontDef[];
  images?: ImageDef[];
  pageSize?: Size;
  pageOrientation?: 'portrait' | 'landscape';
  info?: Metadata;
  defaultStyle?: TextAttrs;
  margin?: BoxEdges;
  dev?: { guides?: boolean };
  header?: (info: PageInfo) => Block;
  footer?: (info: PageInfo) => Block;
  content: Block[];
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
  pageNumber: number;
  pageCount: number;
  pageSize: { width: number; height: number };
};

export function readDocumentDefinition(input: unknown): DocumentDefinition {
  const def1 = readObject(input, {
    fonts: optional(readFonts),
    images: optional(readImages),
    pageSize: optional(parsePageSize),
    pageOrientation: optional(parseOrientation),
    info: optional(readInfo),
    defaultStyle: optional(parseInheritableAttrs),
    margin: optional(parseEdges),
    dev: optional(types.object({ guides: optional(types.boolean()) })),
  });
  const tBlock = (block) => readBlock(block, def1.defaultStyle);
  const def2 = readObject(input, {
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
    Object.entries(input)
      .filter(([key]) => !(key in properties))
      .map(([key, value]) => [key, readAs(value, key, types.string())])
  );
  return Object.keys(custom).length ? { ...obj, custom } : obj;
}
