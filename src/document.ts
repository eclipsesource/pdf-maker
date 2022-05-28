import fontkit from '@pdf-lib/fontkit';
import { PDFDict, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { Size } from './box.js';
import { embedFonts, Font, readFonts } from './fonts.js';
import { embedImages, Image, readImages } from './images.js';
import { applyOrientation, paperSizes, parseOrientation, parsePageSize } from './page-sizes.js';
import { optional, readAs, readObject, readString, types } from './types.js';

export type Document = {
  fonts: Font[];
  images: Image[];
  pageSize: Size;
  pdfDoc: PDFDocument;
};

export async function createDocument(input: unknown): Promise<Document> {
  const def = readObject(input, {
    fonts: optional(readFonts),
    images: optional(readImages),
    pageSize: optional(parsePageSize),
    pageOrientation: optional(parseOrientation),
    info: optional(parseInfo),
  });
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fonts = await embedFonts(def.fonts ?? [], pdfDoc);
  const images = await embedImages(def.images ?? [], pdfDoc);
  const pageSize = applyOrientation(def.pageSize ?? paperSizes.A4, def.pageOrientation);
  setMetadata(def.info, pdfDoc);
  return { fonts, images, pageSize, pdfDoc };
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
      .map(([key, value]) => [key, readAs(value, key, readString)])
  );
  return Object.keys(custom).length ? { ...obj, custom } : obj;
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
