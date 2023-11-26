import { toUint8Array } from 'pdf-lib';

import { FontWeight } from './content.js';
import { FontDef, FontSelector, weightToNumber } from './fonts.js';
import { pickDefined } from './types.js';

export type LoadedFont = {
  name: string;
  data: Uint8Array;
};

export type FontLoader = {
  loadFont(selector: FontSelector): Promise<LoadedFont>;
};

export function createFontLoader(fontDefs: FontDef[]): FontLoader {
  return {
    loadFont,
  };

  async function loadFont(selector: FontSelector) {
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
      (def) => def.style === (selector.fontStyle ?? 'normal')
    );
    if (!fontsWithMatchingStyle.length) {
      fontsWithMatchingStyle = fontsWithMatchingFamily.filter(
        (def) =>
          (def.style === 'italic' && selector.fontStyle === 'oblique') ||
          (def.style === 'oblique' && selector.fontStyle === 'italic')
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
