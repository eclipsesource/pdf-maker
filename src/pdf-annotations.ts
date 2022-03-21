import { PDFName, PDFPage, PDFRef, PDFString } from 'pdf-lib';

import { Box } from './box.js';

export function createLinkAnnotation(page: PDFPage, box: Box, uri: string): PDFRef {
  return page.doc.context.register(
    page.doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [box.x, box.y, box.x + box.width, box.y + box.height],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(uri),
      },
      F: 0, // required for PDF/A
    })
  );
}

export function addPageAnnotations(page: PDFPage, refs: PDFRef[]) {
  page.node.set(PDFName.of('Annots'), page.doc.context.obj(refs));
}
