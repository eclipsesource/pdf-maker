import { subtractEdges } from './box.js';
import { DocumentDefinition } from './content.js';
import { createDocument } from './document.js';
import { embedFonts, parseFonts } from './fonts.js';
import { layoutPage } from './layout.js';
import { createPage, renderPage } from './page.js';
import { parseContent } from './text.js';

export * from './content.js';

export async function makePdf(def: DocumentDefinition) {
  const doc = await createDocument(def);
  const fonts = await embedFonts(parseFonts(def.fonts), doc);
  const page = createPage(doc, def);
  const box = subtractEdges({ x: 0, y: 0, ...page.size }, page.margin);
  const frame = layoutPage(parseContent(def), box, fonts);
  renderPage(frame, page);
  const pdf = await doc.save();
  return pdf;
}
