import type { DocumentDefinition } from './document.ts';
import { PdfMaker } from './PdfMaker.ts';

/**
 * Generates a PDF from the given document definition.
 *
 * @param definition The definition of the document to generate.
 * @returns The generated PDF document.
 *
 * @deprecated Create an instance of `PdfMaker` and call `makePdf` on
 * that instance.
 */
export async function makePdf(definition: DocumentDefinition): Promise<Uint8Array> {
  console.warn(
    'makePdf is deprecated. Create an instance of `PdfMaker` and call `makePdf` on that instance.',
  );
  const pdfMaker = new PdfMaker();
  return await pdfMaker.makePdf(definition);
}
