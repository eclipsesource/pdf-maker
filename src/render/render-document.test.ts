import type { PDFDocument } from '@ralfstx/pdf-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderDocument } from './render-document.ts';

const noObjectStreams = { useObjectStreams: false } as const;

describe('renderDocument', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'UTC');
    vi.useFakeTimers();
    vi.setSystemTime('2025-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('renders all info properties', async () => {
    const def = {
      content: [],
      info: {
        title: 'test-title',
        subject: 'test-subject',
        keywords: ['foo', 'bar'],
        author: 'test-author',
        creationDate: new Date('2000-01-01T00:00:00.000Z'),
        creator: 'test-creator',
        producer: 'test-producer',
        custom: {
          foo: 'foo-value',
          bar: 'bar-value',
        },
      },
    };

    const pdfData = await renderDocument(def, [], noObjectStreams);
    const dataString = new TextDecoder().decode(pdfData);

    expect(dataString).toMatch(/\/Title <FEFF0074006500730074002D007400690074006C0065>/);
    expect(dataString).toMatch(/\/Author <FEFF0074006500730074002D0061007500740068006F0072>/);
    expect(dataString).toMatch(/\/Subject <FEFF0074006500730074002D007300750062006A006500630074>/);
    expect(dataString).toMatch(/\/Keywords <FEFF0066006F006F002C0020006200610072>/);
    expect(dataString).toMatch(/\/Creator <FEFF0074006500730074002D00630072006500610074006F0072>/);
    expect(dataString).toMatch(
      /\/Producer <FEFF0074006500730074002D00700072006F00640075006300650072>/,
    );
    expect(dataString).toMatch(/\/CreationDate \(D:20000101000000Z\)/);
    expect(dataString).toMatch(/\/ModDate \(D:20250101000000Z\)/);
    expect(dataString).toMatch(/\/foo <FEFF0066006F006F002D00760061006C00750065>/);
    expect(dataString).toMatch(/\/bar <FEFF006200610072002D00760061006C00750065>/);
  });

  it('sets dates even without info', async () => {
    const def = { content: [] };

    const pdfData = await renderDocument(def, [], noObjectStreams);
    const dataString = new TextDecoder().decode(pdfData);

    expect(dataString).toMatch(/\/CreationDate \(D:20250101000000Z\)/);
    expect(dataString).toMatch(/\/ModDate \(D:20250101000000Z\)/);
  });

  it('renders custom data', async () => {
    const def = {
      content: [],
      customData: {
        XXFoo: 'Foo',
        XXBar: Uint8Array.of(1, 2, 3),
      },
    };

    const pdfData = await renderDocument(def, [], noObjectStreams);
    const dataString = new TextDecoder().decode(pdfData);

    expect(dataString).toMatch(/\/XXFoo \d+ \d+ R/);
    expect(dataString).toMatch(/\/XXBar \d+ \d+ R/);
    const fooObject = dataString.match(/\/XXFoo (\d+ \d+) R/)![1];
    const barObject = dataString.match(/\/XXBar (\d+ \d+) R/)![1];
    const streamRegex = (obj: string) =>
      new RegExp(`${obj} obj\\n<<\\n\\s*/Length\\s+\\d+\\n>>\\nstream\\n(.*?)\\nendstream`, 'm');
    const fooStreamMatch = dataString.match(streamRegex(fooObject));
    const barStreamMatch = dataString.match(streamRegex(barObject));
    expect(fooStreamMatch![1]).toBe('Foo');
    expect(barStreamMatch![1]).toBe('\x01\x02\x03');
  });

  it('calls custom render hook', async () => {
    const def = {
      content: [],
      onRenderDocument: (pdfDoc: PDFDocument) => {
        pdfDoc.setInfo({ title: 'test-title' });
      },
    };

    const pdfData = await renderDocument(def, [], noObjectStreams);
    const dataString = new TextDecoder().decode(pdfData);

    expect(dataString).toMatch(/\/Title <FEFF0074006500730074002D007400690074006C0065>/);
  });
});
