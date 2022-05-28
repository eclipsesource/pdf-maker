import { DocumentDefinition } from './content.js';
import { createDocument } from './document.js';
import { layoutPages } from './layout.js';
import { renderPage } from './page.js';
import { readAs, required, types } from './types.js';

export * from './content.js';

export async function makePdf(def: DocumentDefinition) {
  readAs(def, 'document definition', required(types.object()));
  const doc = await createDocument(def);
  const pages = layoutPages(def, doc);
  pages.forEach((page) => renderPage(page, doc));
  const pdf = await doc.pdfDoc.save();
  return pdf;
}
