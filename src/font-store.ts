import fontkit from '@pdf-lib/fontkit';
import { toUint8Array } from 'pdf-lib';

import type { FontWeight } from './api/text.ts';
import type { Font, FontDef, FontSelector } from './fonts.ts';
import { weightToNumber } from './fonts.ts';
import { pickDefined } from './types.ts';

export class FontStore {
  readonly #fontDefs: FontDef[];
  readonly #fontCache: Record<string, Promise<Font>> = {};

  constructor(fontDefs: FontDef[]) {
    this.#fontDefs = fontDefs;
  }

  async selectFont(selector: FontSelector): Promise<Font> {
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

  _loadFont(selector: FontSelector): Promise<Font> {
    const selectedFont = selectFont(this.#fontDefs, selector);
    const data = toUint8Array(selectedFont.data);
    const fkFont = fontkit.create(data);
    return Promise.resolve(
      pickDefined({
        name: fkFont.fullName ?? fkFont.postscriptName ?? selectedFont.family,
        data,
        style: selector.fontStyle ?? 'normal',
        weight: weightToNumber(selector.fontWeight ?? 400),
        fkFont,
      }),
    );
  }
}

function selectFont(fontDefs: FontDef[], selector: FontSelector): FontDef {
  if (!fontDefs.length) {
    throw new Error('No fonts defined');
  }
  const fontsWithMatchingFamily = selector.fontFamily
    ? fontDefs.filter((def) => def.family === selector.fontFamily)
    : fontDefs;
  if (!fontsWithMatchingFamily.length) {
    throw new Error(`No font defined for '${selector.fontFamily}'`);
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
    throw new Error(`No font defined for ${selectorStr}`);
  }
  const selected = selectFontForWeight(fontsWithMatchingStyle, selector.fontWeight ?? 'normal');
  if (!selected) {
    const { fontFamily: family, fontStyle: style, fontWeight: weight } = selector;
    const selectorStr = `'${family}', style=${style ?? 'normal'}, weight=${weight ?? 'normal'}`;
    throw new Error(`No font defined for ${selectorStr}`);
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
