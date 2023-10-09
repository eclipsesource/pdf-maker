import { beforeEach, describe, expect, it } from '@jest/globals';

import { createFontLoader, FontLoader } from './font-loader.js';
import { Font } from './fonts.js';
import { fakeFont } from './test/test-utils.js';

describe('font-loader', () => {
  let normalFont: Font;
  let italicFont: Font;
  let boldFont: Font;
  let italicBoldFont: Font;
  let otherFont: Font;
  let fontLoader: FontLoader;

  beforeEach(() => {
    normalFont = fakeFont('Test');
    italicFont = fakeFont('Test', { italic: true });
    boldFont = fakeFont('Test', { bold: true });
    italicBoldFont = fakeFont('Test', { italic: true, bold: true });
    otherFont = fakeFont('Other');
    fontLoader = createFontLoader([normalFont, italicFont, boldFont, italicBoldFont, otherFont]);
  });

  it('rejects for unknown font', async () => {
    const loader = createFontLoader([]);

    expect(loader.loadFont({})).rejects.toThrowError('No font defined for normal');
  });

  it('rejects for unknown font name', async () => {
    await expect(fontLoader.loadFont({ fontFamily: 'foo' })).rejects.toThrowError(
      "No font defined for 'foo', normal"
    );
  });

  it('selects different font variants', async () => {
    const fontFamily = 'Test';

    expect(await fontLoader.loadFont({ fontFamily })).toEqual({
      name: 'Test',
      data: normalFont.data,
    });
    expect(await fontLoader.loadFont({ fontFamily, bold: true })).toEqual({
      name: 'Test',
      data: boldFont.data,
    });
    expect(await fontLoader.loadFont({ fontFamily, italic: true })).toEqual({
      name: 'Test',
      data: italicFont.data,
    });
    expect(await fontLoader.loadFont({ fontFamily, italic: true, bold: true })).toEqual({
      name: 'Test',
      data: italicBoldFont.data,
    });
  });

  it('selects first matching font if no family specified', async () => {
    await expect(fontLoader.loadFont({})).resolves.toEqual({
      name: 'Test',
      data: normalFont.data,
    });
    await expect(fontLoader.loadFont({ bold: true })).resolves.toEqual({
      name: 'Test',
      data: boldFont.data,
    });
    await expect(fontLoader.loadFont({ italic: true })).resolves.toEqual({
      name: 'Test',
      data: italicFont.data,
    });
    await expect(fontLoader.loadFont({ italic: true, bold: true })).resolves.toEqual({
      name: 'Test',
      data: italicBoldFont.data,
    });
  });

  it('selects font with matching font family', async () => {
    await expect(fontLoader.loadFont({ fontFamily: 'Other' })).resolves.toEqual({
      name: 'Other',
      data: otherFont.data,
    });
  });

  it('rejects when no matching font can be found', async () => {
    await expect(() =>
      fontLoader.loadFont({ fontFamily: 'Other', italic: true })
    ).rejects.toThrowError("No font defined for 'Other', italic");
    await expect(() =>
      fontLoader.loadFont({ fontFamily: 'Other', bold: true })
    ).rejects.toThrowError("No font defined for 'Other', bold");
    await expect(() =>
      fontLoader.loadFont({ fontFamily: 'Other', italic: true, bold: true })
    ).rejects.toThrowError("No font defined for 'Other', bold italic");
  });
});
