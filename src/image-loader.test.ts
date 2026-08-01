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

    await expect(loadImage('foo')).rejects.toThrow(
      expect.objectContaining({
        message: 'Could not load image from foo',
        cause: expect.objectContaining({ message: "Invalid URL: 'foo'" }),
      }),
    );
  });

  it('rejects for unsupported image format', async () => {
    const loadImage = createImageLoader();

    await expect(loadImage(svgDataUrl('GIF89a'))).rejects.toThrow(
      expect.objectContaining({
        cause: expect.objectContaining({ message: 'Unknown image format' }),
      }),
    );
  });

  it('names the image in errors from a failed request', async () => {
    const loadImage = createImageLoader();

    await expect(loadImage('http://example.com/missing.png')).rejects.toThrow(
      expect.objectContaining({
        message: 'Could not load image from http://example.com/missing.png',
        cause: expect.objectContaining({ message: 'Received 404 Not Found' }),
      }),
    );
  });

  it('shortens long data URLs in the error message', async () => {
    const loadImage = createImageLoader();
    // A data URL carries the entire image, printing it in full would
    // bury the message
    const url = svgDataUrl(`<svg viewBox="1e308 0 1e308 1e308">${'<rect/>'.repeat(20)}</svg>`);

    await expect(loadImage(url)).rejects.toThrow(`Could not load image from ${url.slice(0, 80)}…`);
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
        expect.objectContaining({
          cause: expect.objectContaining({
            message: expect.stringMatching(/Mismatched closing tag/),
          }),
        }),
      );
    });

    it('rejects for unexpected root element', async () => {
      const loadImage = createImageLoader();

      await expect(loadImage(svgDataUrl('<html><body/></html>'))).rejects.toThrow(
        expect.objectContaining({
          cause: expect.objectContaining({ message: "Expected root element 'svg', got 'html'" }),
        }),
      );
    });

    it('rejects for numbers that cannot be drawn', async () => {
      const loadImage = createImageLoader();
      const url = svgDataUrl('<svg viewBox="1e308 0 1e308 1e308"/>');

      await expect(loadImage(url)).rejects.toThrow(
        expect.objectContaining({
          message: `Could not load image from ${url}`,
          cause: expect.objectContaining({
            message: expect.stringMatching(/^Invalid transformation matrix/),
            // The reason from pdf-core is kept as the cause of the cause
            cause: expect.objectContaining({ message: 'PDFNumber must be a finite number' }),
          }),
        }),
      );
    });
  });
});

function svgDataUrl(content: string) {
  return `data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}`;
}
