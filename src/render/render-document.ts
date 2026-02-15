import type { PDFContext, PDFDict, WriteOptions } from '@ralfstx/pdf-core';
import { PDFDocument, PDFStream } from '@ralfstx/pdf-core';

import type { Page } from '../page.ts';
import type { DocumentDefinition, Metadata } from '../read-document.ts';
import { renderPage } from './render-page.ts';

export async function renderDocument(
  def: DocumentDefinition,
  pages: Page[],
  writeOptions?: WriteOptions,
): Promise<Uint8Array> {
  const pdfDoc = new PDFDocument();
  setMetadata(pdfDoc, def.info);
  if (def.customData) {
    setCustomData(def.customData, pdfDoc);
  }
  pages.forEach((page) => renderPage(page, pdfDoc));

  for (const file of def.embeddedFiles ?? []) {
    pdfDoc.addEmbeddedFile({
      content: file.content,
      fileName: file.fileName,
      mimeType: file.mimeType,
      description: file.description,
      creationDate: file.creationDate,
      modDate: file.modificationDate,
      afRelationship: file.relationship,
    });
  }

  await def.onRenderDocument?.(pdfDoc);

  return pdfDoc.write(writeOptions);
}

function setMetadata(doc: PDFDocument, info?: Metadata) {
  const now = new Date();
  doc.setInfo({
    creationDate: info?.creationDate ?? now,
    modDate: now,
    title: info?.title,
    subject: info?.subject,
    keywords: info?.keywords?.join(', '),
    author: info?.author,
    creator: info?.creator,
    producer: info?.producer,
    ...info?.custom,
  });
}

function setCustomData(data: Record<string, string | Uint8Array>, doc: PDFDocument) {
  for (const [key, value] of Object.entries(data)) {
    doc.unsafeOnRender((renderContext) => {
      const stream = PDFStream.of(
        typeof value === 'string' ? new TextEncoder().encode(value) : value,
      );
      const context = renderContext.context as PDFContext;
      const catalog = renderContext.catalog as PDFDict;
      const ref = context.addObject(stream);
      catalog.set(key, ref);
    });
  }
}
