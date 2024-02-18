import fontkit from '@pdf-lib/fontkit';
import { toUint8Array } from 'pdf-lib';

import { FontWeight } from './api/content.ts';
import { Font, FontDef, FontSelector, weightToNumber } from './fonts.ts';
import { pickDefined } from './types.ts';

export type LoadedFont = {
  name: string;
  data: Uint8Array;
};

export class FontLoader {
  readonly #fontDefs: FontDef[];

  constructor(fontDefs: FontDef[]) {
    this.#fontDefs = fontDefs;
  }

  async loadFont(selector: FontSelector): Promise<LoadedFont> {
    if (!this.#fontDefs.length) {
      throw new Error('No fonts defined');
    }
    const fontsWithMatchingFamily = selector.fontFamily
      ? this.#fontDefs.filter((def) => def.family === selector.fontFamily)
      : this.#fontDefs;
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
    return pickDefined({
      name: selected.family,
      data: toUint8Array(selected.data),
    });
  }
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

export class FontStore {
  readonly #fontLoader: FontLoader;
  readonly #fontCache: Record<string, Promise<Font>> = {};

  constructor(fontLoader: FontLoader) {
    this.#fontLoader = fontLoader;
  }

  selectFont(selector: FontSelector): Promise<Font> {
    const cacheKey = [
      selector.fontFamily ?? 'any',
      selector.fontStyle ?? 'normal',
      selector.fontWeight ?? 'normal',
    ].join(':');
    return (this.#fontCache[cacheKey] ??= this.loadFont(selector));
  }

  async loadFont(selector: FontSelector): Promise<Font> {
    let loadedFont: LoadedFont;
    try {
      loadedFont = await this.#fontLoader.loadFont(selector);
    } catch (error) {
      const { fontFamily: family, fontStyle: style, fontWeight: weight } = selector;
      const selectorStr = `'${family}', style=${style ?? 'normal'}, weight=${weight ?? 'normal'}`;
      throw new Error(
        `Could not load font for ${selectorStr}: ${(error as Error)?.message ?? error}`,
      );
    }
    const fkFont = fontkit.create(loadedFont.data);
    return pickDefined({
      name: loadedFont.name,
      data: loadedFont.data,
      style: selector.fontStyle ?? 'normal',
      weight: weightToNumber(selector.fontWeight ?? 400),
      fkFont,
    });
  }
}
