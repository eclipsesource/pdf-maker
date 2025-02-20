import type { AFRelationship, PDFDict } from 'pdf-lib';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import type { Page } from '../page.ts';
import type { DocumentDefinition, Metadata } from '../read-document.ts';
import { renderPage } from './render-page.ts';

export async function renderDocument(def: DocumentDefinition, pages: Page[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create({ updateMetadata: false });
  setMetadata(pdfDoc, def.info);
  if (def.customData) {
    setCustomData(def.customData, pdfDoc);
  }
  pages.forEach((page) => renderPage(page, pdfDoc));

  for (const file of def.embeddedFiles ?? []) {
    await pdfDoc.attach(file.content, file.fileName, {
      mimeType: file.mimeType,
      description: file.description,
      creationDate: file.creationDate,
      modificationDate: file.modificationDate,
      afRelationship: file.relationship as AFRelationship | undefined,
    });
  }

  await def.onRenderDocument?.(pdfDoc);

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
  return appendNewline(data);
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

function appendNewline(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length + 1);
  result.set(data, 0);
  result[data.length] = 10;
  return result;
}
