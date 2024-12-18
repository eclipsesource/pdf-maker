import { FontStore } from '../font-store.ts';
import { ImageStore } from '../image-store.ts';
import { layoutPages } from '../layout/layout.ts';
import type { MakerCtx } from '../maker-ctx.ts';
import { readDocumentDefinition } from '../read-document.ts';
import { renderDocument } from '../render/render-document.ts';
import { readAs } from '../types.ts';
import type { DocumentDefinition } from './document.ts';
import type { FontStyle, FontWeight } from './text.ts';

export type FontConfig = {
  family?: string;
  style?: FontStyle;
  weight?: FontWeight;
};

/**
 * Generates PDF documents.
 */
export class PdfMaker {
  #ctx: MakerCtx;

  constructor() {
    const fontStore = new FontStore();
    const imageStore = new ImageStore();
    this.#ctx = { fontStore, imageStore };
  }

  /**
   * Registers a font to be used in generated PDFs.
   *
   * @param data The font data. Must be in OpenType (OTF) or TrueType
   * (TTF) format.
   * @param config Additional configuration of the font, only needed if
   * the meta data cannot be extracted from the font.
   */
  registerFont(data: Uint8Array, config?: FontConfig): void {
    this.#ctx.fontStore.registerFont(data, config);
  }

  /**
   * Sets the root directory to read resources from. This allows using
   * `file:/` URLs with relative paths in the document definition.
   *
   * @param root The root directory to read resources from.
   */
  setResourceRoot(root: string): void {
    this.#ctx.imageStore.setResourceRoot(root);
  }

  /**
   * Generates a PDF from the given document definition.
   *
   * @param definition The definition of the document to generate.
   * @returns The generated PDF document.
   */
  async makePdf(definition: DocumentDefinition): Promise<Uint8Array> {
    const def = readAs(definition, 'definition', readDocumentDefinition);
    const ctx = { ...this.#ctx };
    if (def.fonts) {
      ctx.fontStore = new FontStore(def.fonts);
      console.warn(
        'Registering fonts via document definition is deprecated. Use PdfMaker.registerFont() instead.',
      );
    }
    if (def.images) {
      ctx.imageStore = new ImageStore(def.images);
      console.warn(
        'Registering images via document definition is deprecated. Use URLs to include images instead.',
      );
    }
    if (def.dev?.guides != null) ctx.guides = def.dev.guides;
    const pages = await layoutPages(def, ctx);
    return await renderDocument(def, pages);
  }
}

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
