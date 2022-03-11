import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';

export async function createDocument() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  return doc;
}
