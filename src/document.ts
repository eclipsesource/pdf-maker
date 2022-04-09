import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';

import {
  asArray,
  asDate,
  asObject,
  asString,
  check,
  getFrom,
  Obj,
  optional,
  pickDefined,
} from './types.js';

export async function createDocument(def: Obj) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  setMetadata(parseInfo(def.info), doc);
  return doc;
}

type Metadata = {
  title?: string;
  subject?: string;
  keywords?: string[];
  author?: string;
  creationDate?: Date;
  creator?: string;
  producer?: string;
};

export function parseInfo(input: unknown): Metadata {
  const obj = check(input, 'info', optional(asObject));
  if (!obj) return undefined;
  return pickDefined({
    title: getFrom(obj, 'title', optional(asString)),
    subject: getFrom(obj, 'subject', optional(asString)),
    keywords: getFrom(obj, 'keywords', optional(asStringArray)) as string[],
    author: getFrom(obj, 'author', optional(asString)),
    creationDate: getFrom(obj, 'creationDate', optional(asDate)),
    creator: getFrom(obj, 'creator', optional(asString)),
    producer: getFrom(obj, 'producer', optional(asString)),
  });
}

function asStringArray(input: unknown): string[] {
  asArray(input).forEach((el) => {
    if (typeof el !== 'string') throw new TypeError(`Element is not a string: ${el}`);
  });
  return input as string[];
}

function setMetadata(info: Metadata, doc: PDFDocument) {
  if (info?.title) {
    doc.setTitle(info.title);
  }
  if (info?.subject) {
    doc.setSubject(info.subject);
  }
  if (info?.keywords) {
    doc.setKeywords(info.keywords);
  }
  if (info?.author) {
    doc.setAuthor(info.author);
  }
  if (info?.creationDate) {
    doc.setCreationDate(info.creationDate);
  }
  if (info?.creator) {
    doc.setCreator(info.creator);
  }
  if (info?.producer) {
    doc.setProducer(info.producer);
  }
}
