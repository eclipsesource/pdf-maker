import { DocumentDefinition } from './content.js';
import { createFontLoader } from './font-loader.js';
import { createFontStore, FontStore } from './fonts.js';
import { createImageLoader } from './image-loader.js';
import { createImageStore, ImageStore } from './images.js';
import { layoutPages } from './layout/layout.js';
import { readDocumentDefinition } from './read-document.js';
import { renderDocument } from './render/render-document.js';
import { readAs } from './types.js';

export type MakerCtx = {
  fontStore: FontStore;
  imageStore: ImageStore;
  guides?: boolean;
};

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
