import { parseEdges, parseLength, subtractEdges } from './box.js';
import { DocumentDefinition } from './content.js';
import { createDocument } from './document.js';
import { embedFonts, parseFonts } from './fonts.js';
import { layoutPages } from './layout.js';
import { createPage, renderPage } from './page.js';
import { parseContent } from './text.js';
import { optional, pick } from './types.js';

export * from './content.js';

const pageSize = { width: parseLength('210mm'), height: parseLength('297mm') }; // A4, portrait
const defaultPageMargin = parseEdges('2cm');

export async function makePdf(def: DocumentDefinition) {
  const doc = await createDocument(def);
  const fonts = await embedFonts(parseFonts(def.fonts), doc);
  const pageMargin = pick(def, 'margin', optional(parseEdges)) ?? defaultPageMargin;
  const box = subtractEdges({ x: 0, y: 0, ...pageSize }, pageMargin);
  const frames = layoutPages(parseContent(def), box, fonts);
  frames.forEach((frame) => {
    const page = createPage(doc, pageSize, pageMargin, def);
    renderPage(frame, page);
  });
  const pdf = await doc.save();
  return pdf;
}
