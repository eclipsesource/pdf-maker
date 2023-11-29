import { PDFDict, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { createFontLoader } from './font-loader.js';
import { createFontStore, FontStore } from './fonts.js';
import { createImageLoader } from './image-loader.js';
import { createImageStore, ImageStore } from './images.js';
import { Page } from './page.js';
import { DocumentDefinition, Metadata } from './read-document.js';
import { renderPage } from './render-page.js';

export type Document = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};

export async function createDocument(def: DocumentDefinition): Promise<Document> {
  const guides = !!def.dev?.guides;
  const fontLoader = createFontLoader(def.fonts ?? []);
  const imageLoader = createImageLoader(def.images ?? []);
  const fontStore = createFontStore(fontLoader);
  const imageStore = createImageStore(imageLoader);
  return { fontStore, imageStore, guides };
}

export async function renderDocument(def: DocumentDefinition, pages: Page[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create({ updateMetadata: false });
  setMetadata(pdfDoc, def.info);
  if (def.customData) {
    setCustomData(def.customData, pdfDoc);
  }
  pages.forEach((page) => renderPage(page, pdfDoc));
  const idInfo = {
    creator: 'pdfmkr',
    time: new Date().toISOString(),
    info: def.info ?? null,
  };
  const fileId = await sha256Hex(JSON.stringify(idInfo));
  pdfDoc.context.trailerInfo.ID = pdfDoc.context.obj([
    PDFHexString.of(fileId.toUpperCase()),
    PDFHexString.of(fileId.toUpperCase()),
  ]);
  const data = await pdfDoc.save();
  // add trailing newline
  return new Uint8Array([...data, 10]);
}

function setMetadata(doc: PDFDocument, info?: Metadata) {
  const now = new Date();
  doc.setCreationDate(now);
  doc.setModificationDate(now);
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
