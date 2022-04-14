import { DocumentDefinition } from './content.js';
import { createDocument } from './document.js';
import { embedFonts, parseFonts } from './fonts.js';
import { embedImages, parseImages } from './images.js';
import { layoutPages } from './layout.js';
import { renderPage } from './page.js';

export * from './content.js';

export async function makePdf(def: DocumentDefinition) {
  const doc = await createDocument(def);
  const fonts = await embedFonts(parseFonts(def.fonts), doc);
  const images = await embedImages(parseImages(def.images), doc);
  const pages = layoutPages(def, { fonts, images });
  pages.forEach((page) => renderPage(page, doc));
  const pdf = await doc.save();
  return pdf;
}
