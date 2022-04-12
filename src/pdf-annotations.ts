import { PDFArray, PDFName, PDFPage, PDFString } from 'pdf-lib';

import { Box } from './box.js';

export function createLinkAnnotation(page: PDFPage, box: Box, uri: string) {
  if (!page.node.has(PDFName.of('Annots'))) {
    page.node.set(PDFName.of('Annots'), page.doc.context.obj([]));
  }
  const annots = page.node.get(PDFName.of('Annots')) as PDFArray;
  const annot = page.doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [box.x, box.y, box.x + box.width, box.y + box.height],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(uri),
    },
    F: 0, // required for PDF/A
  });
  annots.push(page.doc.context.register(annot));
}
