import { DocumentDefinition } from './content.js';
import { createDocument } from './document.js';
import { embedFonts } from './fonts.js';
import { layoutPage } from './layout.js';
import { createPage, renderPage } from './page.js';

export async function makePdf(def: DocumentDefinition) {
  const doc = await createDocument();
  const fonts = await embedFonts(def.fonts, doc);
  const page = createPage(doc);
  const box = { x: 0, y: 0, ...page.size };
  const frame = layoutPage(def.content, box, fonts);
  renderPage(frame, page);
  const pdf = await doc.save();
  return pdf;
}
