import { PDFArray, PDFDict, PDFName, PDFPage, PDFString } from 'pdf-lib';

import { Box, Pos } from '../box.js';
import { AnchorObject, LinkObject } from '../layout/layout.js';
import { Page } from '../page.js';

export function renderAnchor(obj: AnchorObject, page: Page, base: Pos) {
  const x = base.x + obj.x;
  const y = page.size.height - base.y - obj.y;
  if (!page.pdfPage) throw new Error('Page not initialized');
  createNamedDest(page.pdfPage, obj.name, { x, y });
}

export function renderLink(obj: LinkObject, page: Page, base: Pos) {
  const { width, height, url } = obj;
  const x = base.x + obj.x;
  const y = page.size.height - base.y - obj.y - height;
  if (!page.pdfPage) throw new Error('Page not initialized');
  createLinkAnnotation(page.pdfPage, { x, y, width, height }, url);
}

function createLinkAnnotation(page: PDFPage, box: Box, uri: string) {
  const annots = getOrCreate(page.node, 'Annots', () => []) as PDFArray;
  const annot = page.doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [box.x, box.y, box.x + box.width, box.y + box.height],
    ...(uri.startsWith('#')
      ? { A: { Type: 'Action', S: 'GoTo', D: PDFString.of(uri.slice(1)) } }
      : { A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) } }),
    C: page.doc.context.obj([]),
    F: 4, // required for PDF/A
  });
  annots.push(page.doc.context.register(annot));
}

function createNamedDest(page: PDFPage, name: string, pos: Pos) {
  const names = getOrCreate(page.doc.catalog, 'Names', () => ({})) as PDFDict;
  const dests = getOrCreate(names, 'Dests', () => ({})) as PDFDict;
  const destNames = getOrCreate(dests, 'Names', () => []) as PDFArray;
  for (let i = 0; i < destNames.size(); i += 2) {
    if ((destNames.get(i) as PDFString).asString() === name) {
      throw new Error(`Duplicate id ${name}`);
    }
  }
  destNames.push(PDFString.of(name));
  destNames.push(page.doc.context.obj([page.ref, 'XYZ', pos.x, pos.y, null]));
}

function getOrCreate(dict: PDFDict, name: string, creatorFn: () => any): unknown {
  if (!dict.has(PDFName.of(name))) {
    dict.set(PDFName.of(name), dict.context.obj(creatorFn()));
  }
  return dict.get(PDFName.of(name));
}
