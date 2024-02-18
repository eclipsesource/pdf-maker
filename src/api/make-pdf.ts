import { createFontLoader, createFontStore } from '../font-loader.ts';
import { createImageLoader, createImageStore } from '../image-loader.ts';
import { layoutPages } from '../layout/layout.ts';
import { readDocumentDefinition } from '../read-document.ts';
import { renderDocument } from '../render/render-document.ts';
import { readAs } from '../types.ts';
import { DocumentDefinition } from './content.ts';

/**
 * Generates a PDF from the given document definition.
 *
 * @param definition The definition of the document to generate.
 * @returns The generated PDF document.
 */
export async function makePdf(definition: DocumentDefinition): Promise<Uint8Array> {
  const def = readAs(definition, 'definition', readDocumentDefinition);
  const fontLoader = createFontLoader(def.fonts ?? []);
  const imageLoader = createImageLoader(def.images ?? []);
  const fontStore = createFontStore(fontLoader);
  const imageStore = createImageStore(imageLoader);
  const guides = !!def.dev?.guides;
  const ctx = { fontStore, imageStore, guides };
  const pages = await layoutPages(def, ctx);
  return await renderDocument(def, pages);
}
