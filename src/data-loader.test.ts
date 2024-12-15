import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDataLoader } from './data-loader.ts';

const baseDir = import.meta.dirname;
const libertyJpg = await readFile(join(baseDir, 'test/resources/liberty.jpg'));

describe('createDataLoader', () => {
  const loader = createDataLoader();

  it('throws for invalid URLs', async () => {
    await expect(loader('')).rejects.toThrow("Invalid URL: ''");
    await expect(loader('http://')).rejects.toThrow("Invalid URL: 'http://'");
  });

  it('throws for unsupported URL scheme', async () => {
    await expect(loader('foo:bar')).rejects.toThrow("URL not supported: 'foo:bar'");
  });

  describe('http:', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockImplementation((req: RequestInfo | URL) => {
        const url = req instanceof URL ? req.href : (req as string);
        if (url.endsWith('image.jpg')) {
          return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
        }
        return Promise.resolve(new Response('Not found', { status: 404, statusText: 'Not Found' }));
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('loads http: URL', async () => {
      await expect(loader('http://example.com/image.jpg')).resolves.toEqual({
        data: new Uint8Array([1, 2, 3]),
      });
    });

    it('loads https: URL', async () => {
      await expect(loader('https://example.com/image.jpg')).resolves.toEqual({
        data: new Uint8Array([1, 2, 3]),
      });
    });

    it('throws if 404 received', async () => {
      await expect(loader('https://example.com/not-there')).rejects.toThrow(
        'Received 404 Not Found',
      );
    });
  });

  describe('data:', () => {
    it('loads data: URL', async () => {
      await expect(loader('data:image/jpeg;base64,Abc=')).resolves.toEqual({
        data: new Uint8Array([1, 183]),
      });
    });

    it('throws for invalid data: URLs', async () => {
      await expect(loader('data:foo')).rejects.toThrow("Invalid data URL: 'data:foo'");
    });

    it('throws for unsupported encoding in data: URLs', async () => {
      await expect(loader('data:foo,bar')).rejects.toThrow(
        "Unsupported encoding in data URL: 'data:foo,bar'",
      );
    });
  });

  describe('file:', () => {
    it('loads relative file: URL', async () => {
      const loader = createDataLoader({ resourceRoot: baseDir });

      const result = await loader(`file:test/resources/liberty.jpg`);

      expect(result).toEqual({ data: new Uint8Array(libertyJpg) });
    });

    it('loads file: URL without authority', async () => {
      const loader = createDataLoader({ resourceRoot: baseDir });

      const result = await loader(`file:/test/resources/liberty.jpg`);

      expect(result).toEqual({ data: new Uint8Array(libertyJpg) });
    });

    it('loads absolute file: URL with empty authority', async () => {
      const loader = createDataLoader({ resourceRoot: baseDir });

      const result = await loader(`file:///test/resources/liberty.jpg`);

      expect(result).toEqual({ data: new Uint8Array(libertyJpg) });
    });

    it('loads absolute file: URL with authority', async () => {
      const loader = createDataLoader({ resourceRoot: baseDir });

      const result = await loader(`file://localhost/test/resources/liberty.jpg`);

      expect(result).toEqual({ data: new Uint8Array(libertyJpg) });
    });

    it('rejects when no resource root directory defined', async () => {
      const url = `file:/test/resources/liberty.jpg`;

      await expect(loader(url)).rejects.toThrow('No resource root defined');
    });
  });
});
