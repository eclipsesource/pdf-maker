import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createImageLoader } from './image-loader.ts';

const baseDir = import.meta.dirname;

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

    expect(image).toEqual(
      expect.objectContaining({ url: 'file:/test/resources/torus.png', format: 'png' }),
    );
  });

  it('loads image from data URL', async () => {
    const loadImage = createImageLoader();
    const dataUrl = `data:image/png;base64,${Buffer.from(torusPng).toString('base64')}`;

    const image = await loadImage(dataUrl);

    expect(image).toEqual(expect.objectContaining({ url: dataUrl, format: 'png' }));
  });

  it('loads image from http URL', async () => {
    const loadImage = createImageLoader();

    const image = await loadImage('http://example.com/torus.png');

    expect(image).toEqual(
      expect.objectContaining({ url: 'http://example.com/torus.png', format: 'png' }),
    );
  });

  it('reads format, width and height from JPEG image', async () => {
    const loadImage = createImageLoader(baseDir);

    const image = await loadImage('file:/test/resources/liberty.jpg');

    expect(image).toEqual(expect.objectContaining({ format: 'jpeg', width: 160, height: 240 }));
  });

  it('reads format, width and height from PNG image', async () => {
    const loadImage = createImageLoader(baseDir);

    const image = await loadImage('file:/test/resources/torus.png');

    expect(image).toEqual(expect.objectContaining({ format: 'png', width: 256, height: 192 }));
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
});
