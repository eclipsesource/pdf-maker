import { PDFEmbeddedFont, type PDFFont } from '@ralfstx/pdf-core';

import type { FontConfig } from './api/PdfMaker.ts';
import type { FontWeight } from './api/text.ts';
import type { FontDef, FontSelector } from './fonts.ts';
import { weightToNumber } from './fonts.ts';

export class FontStore {
  readonly #fontDefs: FontDef[];
  #fontCache: Record<string, Promise<PDFFont>> = {};

  constructor() {
    this.#fontDefs = [];
  }

  registerFont(data: Uint8Array, config?: FontConfig): void {
    const pdfFont = new PDFEmbeddedFont(data);
    const family = config?.family ?? pdfFont.familyName;
    const style = config?.style ?? pdfFont.style;
    const weight = weightToNumber(config?.weight ?? pdfFont.weight);
    this.#fontDefs.push({ family, style, weight, data, pdfFont });
    this.#fontCache = {}; // Invalidate cache
  }

  async selectFont(selector: FontSelector): Promise<PDFFont> {
    const cacheKey = [
      selector.fontFamily ?? 'any',
      selector.fontStyle ?? 'normal',
      selector.fontWeight ?? 'normal',
    ].join(':');
    try {
      return await (this.#fontCache[cacheKey] ??= this._loadFont(selector));
    } catch (error) {
      const { fontFamily: family, fontStyle: style, fontWeight: weight } = selector;
      const selectorStr = `'${family}', style=${style ?? 'normal'}, weight=${weight ?? 'normal'}`;
      throw new Error(`Could not load font for ${selectorStr}`, { cause: error });
    }
  }

  _loadFont(selector: FontSelector): Promise<PDFFont> {
    const selectedFontDef = selectFontDef(this.#fontDefs, selector);
    return Promise.resolve(selectedFontDef.pdfFont ?? new PDFEmbeddedFont(selectedFontDef.data));
  }
}

function selectFontDef(fontDefs: FontDef[], selector: FontSelector): FontDef {
  if (!fontDefs.length) {
    throw new Error('No fonts defined');
  }
  const fontsWithMatchingFamily = selector.fontFamily
    ? fontDefs.filter((def) => def.family === selector.fontFamily)
    : fontDefs;
  if (!fontsWithMatchingFamily.length) {
    const uniqueFamilies = [...new Set(fontDefs.map((f) => f.family))];
    throw new Error(
      `No matching font found for family '${selector.fontFamily}'. ` +
        `Registered families are: '${uniqueFamilies.join("', '")}'.`,
    );
  }
  let fontsWithMatchingStyle = fontsWithMatchingFamily.filter(
    (def) => def.style === (selector.fontStyle ?? 'normal'),
  );
  if (!fontsWithMatchingStyle.length) {
    fontsWithMatchingStyle = fontsWithMatchingFamily.filter(
      (def) =>
        (def.style === 'italic' && selector.fontStyle === 'oblique') ||
        (def.style === 'oblique' && selector.fontStyle === 'italic'),
    );
  }
  if (!fontsWithMatchingStyle.length) {
    const { fontFamily: family, fontStyle: style } = selector;
    const selectorStr = `'${family}', style=${style ?? 'normal'}`;
    throw new Error(`No matching font found for ${selectorStr}`);
  }
  const selected = selectFontForWeight(fontsWithMatchingStyle, selector.fontWeight ?? 'normal');
  if (!selected) {
    const { fontFamily: family, fontStyle: style, fontWeight: weight } = selector;
    const selectorStr = `'${family}', style=${style ?? 'normal'}, weight=${weight ?? 'normal'}`;
    throw new Error(`No matching font found for ${selectorStr}`);
  }
  return selected;
}

function selectFontForWeight(fonts: FontDef[], weight: FontWeight): FontDef | undefined {
  const weightNum = weightToNumber(weight);
  const font = fonts.find((font) => font.weight === weightNum);
  if (font) return font;

  // Fallback according to
  // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#Fallback_weights
  const ascending = fonts.slice().sort((a, b) => a.weight - b.weight);
  const descending = ascending.slice().reverse();
  if (weightNum >= 400 && weightNum <= 500) {
    const font =
      ascending.find((font) => font.weight > weightNum && font.weight <= 500) ??
      descending.find((font) => font.weight < weightNum) ??
      ascending.find((font) => font.weight > 500);
    if (font) return font;
  }
  if (weightNum < 400) {
    const font =
      descending.find((font) => font.weight < weightNum) ??
      ascending.find((font) => font.weight > weightNum);
    if (font) return font;
  }
  if (weightNum > 500) {
    const font =
      ascending.find((font) => font.weight > weightNum) ??
      descending.find((font) => font.weight < weightNum);
    if (font) return font;
  }
  throw new Error(`Could not find font for weight ${weight}`);
}
