import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createImageLoader } from './image-loader.ts';

const baseDir = import.meta.dirname;
// The SVG tests use the logo from the examples as sample document
const examplesDir = join(baseDir, '../examples');

describe('createImageLoader', () => {
  let torusPng: Uint8Array;

  beforeAll(async () => {
    torusPng = new Uint8Array(await readFile(join(baseDir, './test/resources/torus.png')));
    vi.spyOn(globalThis, 'fetch').mockImplementation((req: RequestInfo | URL) => {
      const url = req instanceof URL ? req.href : (req as string);
      if (url.endsWith('/torus.png')) {
        return Promise.resolve(new Response(Buffer.from(torusPng)));
      }
      return Promise.resolve(new Response('Not found', { status: 404, statusText: 'Not Found' }));
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('loads image from file URL', async () => {
    const loadImage = createImageLoader(baseDir);

    const image = await loadImage('file:/test/resources/torus.png');

    expect(image.width).toBe(256);
    expect(image.height).toBe(192);
  });

  it('loads image from data URL', async () => {
    const loadImage = createImageLoader();
    const dataUrl = `data:image/png;base64,${Buffer.from(torusPng).toString('base64')}`;

    const image = await loadImage(dataUrl);

    expect(image.width).toBe(256);
    expect(image.height).toBe(192);
  });

  it('loads image from http URL', async () => {
    const loadImage = createImageLoader();

    const image = await loadImage('http://example.com/torus.png');

    expect(image.width).toBe(256);
    expect(image.height).toBe(192);
  });

  it('reads width and height from JPEG image', async () => {
    const loadImage = createImageLoader(baseDir);

    const image = await loadImage('file:/test/resources/liberty.jpg');

    expect(image.width).toBe(160);
    expect(image.height).toBe(240);
  });

  it('reads width and height from PNG image', async () => {
    const loadImage = createImageLoader(baseDir);

    const image = await loadImage('file:/test/resources/torus.png');

    expect(image.width).toBe(256);
    expect(image.height).toBe(192);
  });

  it('returns same image for same URL', async () => {
    const loadImage = createImageLoader(baseDir);
    const url = 'file:/test/resources/liberty.jpg';

    const [image1, image2] = await Promise.all([loadImage(url), loadImage(url)]);

    expect(image1).toBe(image2);
  });

  it('rejects for unsupported URL', async () => {
    const loadImage = createImageLoader();

    await expect(loadImage('foo')).rejects.toThrow("Invalid URL: 'foo'");
  });

  it('rejects for unsupported image format', async () => {
    const loadImage = createImageLoader();

    await expect(loadImage(svgDataUrl('GIF89a'))).rejects.toThrow('Unknown image format');
  });

  describe('SVG images', () => {
    it('loads SVG image from file URL', async () => {
      const loadImage = createImageLoader(examplesDir);

      const image = await loadImage('file:/images/chart.svg');

      expect(image).toEqual(expect.objectContaining({ width: 260, height: 140 }));
    });

    it('loads SVG image from data URL', async () => {
      const loadImage = createImageLoader();

      const image = await loadImage(svgDataUrl('<svg width="10" height="20"/>'));

      expect(image).toEqual(expect.objectContaining({ width: 10, height: 20 }));
    });

    it('accepts leading BOM, whitespace, and XML declaration', async () => {
      const loadImage = createImageLoader();
      const svg = '﻿\n <?xml version="1.0"?>\n<svg width="10" height="20"/>';

      const image = await loadImage(svgDataUrl(svg));

      expect(image).toEqual(expect.objectContaining({ width: 10, height: 20 }));
    });

    it('converts units in width and height', async () => {
      const loadImage = createImageLoader();

      const image = await loadImage(svgDataUrl('<svg width="1in" height="1cm"/>'));

      expect(image).toEqual(
        expect.objectContaining({ width: 72, height: expect.closeTo(28.35, 2) }),
      );
    });

    it('falls back to viewBox size', async () => {
      const loadImage = createImageLoader();

      const image = await loadImage(svgDataUrl('<svg viewBox="5 5 30 40"/>'));

      expect(image).toEqual(expect.objectContaining({ width: 30, height: 40 }));
    });

    it('falls back to default size', async () => {
      const loadImage = createImageLoader();

      const image = await loadImage(svgDataUrl('<svg/>'));

      expect(image).toEqual(expect.objectContaining({ width: 300, height: 150 }));
    });

    it('returns same image for same URL', async () => {
      const loadImage = createImageLoader(examplesDir);
      const url = 'file:/images/chart.svg';

      const [image1, image2] = await Promise.all([loadImage(url), loadImage(url)]);

      expect(image1).toBe(image2);
    });

    it('rejects for malformed XML', async () => {
      const loadImage = createImageLoader();

      await expect(loadImage(svgDataUrl('<svg><rect/></rekt></svg>'))).rejects.toThrow(
        /Mismatched closing tag/,
      );
    });

    it('rejects for unexpected root element', async () => {
      const loadImage = createImageLoader();

      await expect(loadImage(svgDataUrl('<html><body/></html>'))).rejects.toThrow(
        "Expected root element 'svg', got 'html'",
      );
    });
  });
});

function svgDataUrl(content: string) {
  return `data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}`;
}
