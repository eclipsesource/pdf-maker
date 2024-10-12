import { FontStore } from '../font-store.ts';
import { ImageLoader, ImageStore } from '../image-loader.ts';
import { layoutPages } from '../layout/layout.ts';
import { readDocumentDefinition } from '../read-document.ts';
import { renderDocument } from '../render/render-document.ts';
import { readAs } from '../types.ts';
import type { DocumentDefinition } from './document.ts';

/**
 * Generates a PDF from the given document definition.
 *
 * @param definition The definition of the document to generate.
 * @returns The generated PDF document.
 */
export async function makePdf(definition: DocumentDefinition): Promise<Uint8Array> {
  const def = readAs(definition, 'definition', readDocumentDefinition);
  const fontStore = new FontStore(def.fonts ?? []);
  const imageLoader = new ImageLoader(def.images ?? []);
  const imageStore = new ImageStore(imageLoader);
  const guides = !!def.dev?.guides;
  const ctx = { fontStore, imageStore, guides };
  const pages = await layoutPages(def, ctx);
  return await renderDocument(def, pages);
}
