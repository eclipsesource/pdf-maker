import fontkit from '@pdf-lib/fontkit';
import { PDFDict, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { Size } from './box.js';
import { embedFonts, Font } from './fonts.js';
import { embedImages, Image } from './images.js';
import { applyOrientation, paperSizes } from './page-sizes.js';
import { DocumentDefinition, Metadata } from './read-document.js';

export type Document = {
  fonts: Font[];
  images: Image[];
  pageSize: Size;
  pdfDoc: PDFDocument;
  guides?: boolean;
};

export async function createDocument(def: DocumentDefinition): Promise<Document> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fonts = await embedFonts(def.fonts ?? [], pdfDoc);
  const images = await embedImages(def.images ?? [], pdfDoc);
  const pageSize = applyOrientation(def.pageSize ?? paperSizes.A4, def.pageOrientation);
  setMetadata(pdfDoc, def.info);
  if (def.customData) {
    setCustomData(def.customData, pdfDoc);
  }
  const guides = !!def.dev?.guides;
  return { fonts, images, pageSize, pdfDoc, guides };
}

export async function finishDocument(def: DocumentDefinition, doc: Document) {
  const idInfo = {
    creator: 'pdfmkr',
    time: new Date().toISOString(),
    info: def.info ?? null,
  };
  const fileId = await sha256Hex(JSON.stringify(idInfo));
  doc.pdfDoc.context.trailerInfo.ID = doc.pdfDoc.context.obj([
    PDFHexString.of(fileId.toUpperCase()),
    PDFHexString.of(fileId.toUpperCase()),
  ]);
  const data = await doc.pdfDoc.save();
  // add trailing newline
  return new Uint8Array([...data, 10]);
}

function setMetadata(doc: PDFDocument, info?: Metadata) {
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

function setCustomData(data: Record<string, string | Uint8Array>, doc: PDFDocument) {
  for (const [key, value] of Object.entries(data)) {
    const stream = doc.context.stream(value);
    const ref = doc.context.register(stream);
    doc.catalog.set(PDFName.of(key), ref);
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
