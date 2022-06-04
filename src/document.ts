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
};

export async function createDocument(def: DocumentDefinition): Promise<Document> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fonts = await embedFonts(def.fonts ?? [], pdfDoc);
  const images = await embedImages(def.images ?? [], pdfDoc);
  const pageSize = applyOrientation(def.pageSize ?? paperSizes.A4, def.pageOrientation);
  setMetadata(def.info, pdfDoc);
  return { fonts, images, pageSize, pdfDoc };
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
