import { toUint8Array } from 'pdf-lib';

import { FontDef, FontSelector } from './fonts.js';
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
    const fontDef = fontDefs.find((def) => match(def, selector));
    if (!fontDef) {
      const { fontFamily, italic, bold } = selector;
      const style = italic ? (bold ? 'bold italic' : 'italic') : bold ? 'bold' : 'normal';
      const selectorStr = fontFamily ? `'${fontFamily}', ${style}` : style;
      throw new Error(`No font defined for ${selectorStr}`);
    }
    const data = toUint8Array(fontDef.data);
    return pickDefined({
      name: fontDef.name,
      data,
    });
  }
}

function match(fontDef: FontDef, selector: FontSelector): boolean {
  return (
    (!selector.fontFamily || fontDef.name === selector.fontFamily) &&
    !fontDef.italic === !selector.italic &&
    !fontDef.bold === !selector.bold
  );
}
