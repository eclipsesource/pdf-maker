import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';

import { DocumentDefinition } from './content.js';

export async function createDocument(def: DocumentDefinition) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  setMetadata(doc, def);
  return doc;
}

function setMetadata(doc: PDFDocument, def: DocumentDefinition) {
  if (def.info?.title) {
    doc.setTitle(def.info.title);
  }
  if (def.info?.subject) {
    doc.setSubject(def.info.subject);
  }
  if (def.info?.keywords) {
    doc.setKeywords(def.info.keywords);
  }
  if (def.info?.author) {
    doc.setAuthor(def.info.author);
  }
  if (def.info?.creationDate) {
    doc.setCreationDate(def.info.creationDate);
  }
  if (def.info?.creator) {
    doc.setCreator(def.info.creator);
  }
  if (def.info?.producer) {
    doc.setProducer(def.info.producer);
  }
}
