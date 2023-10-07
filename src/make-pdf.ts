import { DocumentDefinition } from './content.js';
import { createDocument, renderDocument } from './document.js';
import { layoutPages } from './layout.js';
import { readDocumentDefinition } from './read-document.js';
import { readAs } from './types.js';

export * from './content.js';

/**
 * Generates a PDF from the given document definition.
 *
 * @param definition The definition of the document to generate.
 * @returns The generated PDF document.
 */
export async function makePdf(definition: DocumentDefinition): Promise<Uint8Array> {
  const def = readAs(definition, 'definition', readDocumentDefinition);
  const doc = await createDocument(def);
  const pages = await layoutPages(def, doc);
  return await renderDocument(def, pages);
}
