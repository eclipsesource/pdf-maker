import { DocumentDefinition } from './content.js';
import { createDocument } from './document.js';
import { layoutPages } from './layout.js';
import { renderPage } from './page.js';
import { asObject, check, required } from './types.js';

export * from './content.js';

export async function makePdf(def: DocumentDefinition) {
  check(def, 'document definition', required(asObject));
  const doc = await createDocument(def);
  const pages = layoutPages(def, doc);
  pages.forEach((page) => renderPage(page, doc));
  const pdf = await doc.pdfDoc.save();
  return pdf;
}
