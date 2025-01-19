import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ImageStore } from './image-store.ts';

const baseDir = import.meta.dirname;

describe('ImageStore', () => {
  let libertyJpg: Uint8Array;
  let torusPng: Uint8Array;
  let store: ImageStore;

  beforeAll(async () => {
    [libertyJpg, torusPng] = await Promise.all([
      readFile(join(baseDir, './test/resources/liberty.jpg')),
      readFile(join(baseDir, './test/resources/torus.png')),
    ]);
    vi.spyOn(globalThis, 'fetch').mockImplementation((req: RequestInfo | URL) => {
      const url = req instanceof URL ? req.href : (req as string);
      if (url.endsWith('/liberty.jpg')) {
        return Promise.resolve(new Response(libertyJpg));
      }
      if (url.endsWith('/torus.png')) {
        return Promise.resolve(new Response(torusPng));
      }
      return Promise.resolve(new Response('Not found', { status: 404, statusText: 'Not Found' }));
    });
    store = new ImageStore();
    store.setResourceRoot(baseDir);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('rejects if image could not be loaded', async () => {
    await expect(store.selectImage('foo')).rejects.toThrow(new Error("Could not load image 'foo'"));
  });

  it('loads registered images (deprecated)', async () => {
    const store = new ImageStore([
      { name: 'liberty', data: libertyJpg, format: 'jpeg' },
      { name: 'torus', data: torusPng, format: 'png' },
    ]);

    const torus = await store.selectImage('torus');
    const liberty = await store.selectImage('liberty');

    expect(torus).toEqual(expect.objectContaining({ url: 'torus', data: torusPng }));
    expect(liberty).toEqual(expect.objectContaining({ url: 'liberty', data: libertyJpg }));
  });

  it('loads image from file system (deprecated)', async () => {
    const torusPath = join(baseDir, './test/resources/torus.png');

    const image = await store.selectImage(torusPath);

    expect(image).toEqual(expect.objectContaining({ url: torusPath, data: torusPng }));
  });

  it('loads image from file URL', async () => {
    const fileUrl = 'file:/test/resources/torus.png';

    const image = await store.selectImage(fileUrl);

    expect(image).toEqual(expect.objectContaining({ url: fileUrl, data: torusPng }));
  });

  it('loads image from data URL', async () => {
    const dataUrl = `data:image/png;base64,${Buffer.from(torusPng).toString('base64')}`;

    const image = await store.selectImage(dataUrl);

    expect(image).toEqual(expect.objectContaining({ url: dataUrl, data: torusPng }));
  });

  it('loads image from http URL', async () => {
    const httpUrl = 'http://example.com/torus.png';

    const image = await store.selectImage(httpUrl);

    expect(image).toEqual(expect.objectContaining({ url: httpUrl, data: torusPng }));
  });

  it('reads format, width and height from JPEG image', async () => {
    const libertyUrl = 'file:/test/resources/liberty.jpg';

    const image = await store.selectImage(libertyUrl);

    expect(image).toEqual(expect.objectContaining({ format: 'jpeg', width: 160, height: 240 }));
  });

  it('reads format, width and height from PNG image', async () => {
    const torusUrl = 'file:/test/resources/torus.png';

    const image = await store.selectImage(torusUrl);

    expect(image).toEqual(expect.objectContaining({ format: 'png', width: 256, height: 192 }));
  });

  it('loads image only once for one URL', async () => {
    const torusUrl = 'file:/test/resources/torus.png';

    await Promise.all([store.selectImage(torusUrl), store.selectImage(torusUrl)]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns same image object for concurrent calls', async () => {
    const libertyUrl = 'file:/test/resources/liberty.jpg';

    const [image1, image2] = await Promise.all([
      store.selectImage(libertyUrl),
      store.selectImage(libertyUrl),
    ]);

    expect(image1).toBe(image2);
  });
});
