import fontkit from '@pdf-lib/fontkit';
import { PDFDict, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { embedFonts, Font, parseFonts } from './fonts.js';
import { embedImages, Image, parseImages } from './images.js';
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

export type Document = {
  fonts: Font[];
  images: Image[];
  pdfDoc: PDFDocument;
};

export async function createDocument(def: Obj): Promise<Document> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fonts = await embedFonts(getFrom(def, 'fonts', parseFonts), pdfDoc);
  const images = await embedImages(getFrom(def, 'images', parseImages), pdfDoc);

  setMetadata(getFrom(def, 'info', optional(parseInfo)), pdfDoc);
  return { fonts, images, pdfDoc };
}

type Metadata = {
  title?: string;
  subject?: string;
  keywords?: string[];
  author?: string;
  creationDate?: Date;
  creator?: string;
  producer?: string;
  custom?: Record<string, string>;
};

export function parseInfo(input: unknown): Metadata {
  const obj = asObject(input);
  const { title, subject, keywords, author, creationDate, creator, producer, ...custom } = obj;
  return pickDefined({
    title: check(title, 'title', optional(asString)),
    subject: check(subject, 'subject', optional(asString)),
    keywords: check(keywords, 'keywords', optional(asStringArray)) as string[],
    author: check(author, 'author', optional(asString)),
    creationDate: check(creationDate, 'creationDate', optional(asDate)),
    creator: check(creator, 'creator', optional(asString)),
    producer: check(producer, 'producer', optional(asString)),
    custom: parseCustomAttrs(custom),
  });
}

function parseCustomAttrs(custom: Obj): Record<string, string> {
  if (custom == null || !Object.keys(custom).length) return undefined;
  Object.entries(asObject(custom)).forEach(([key, value]) => check(value, key, asString));
  return custom as Record<string, string>;
}

function asStringArray(input: unknown): string[] {
  return asArray(input).map((el, idx) => check(el, `${idx}`, asString));
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
  if (info?.custom) {
    const dict = (doc as any).getInfoDict() as PDFDict;
    for (const [key, value] of Object.entries(info.custom)) {
      dict.set(PDFName.of(key), PDFHexString.fromText(value));
    }
  }
}
