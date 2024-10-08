import crypto from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { span } from './text.ts';

global.crypto ??= (crypto as any).webcrypto;

describe('test', () => {
  describe('span', () => {
    it('creates text span with given string', () => {
      const sp = span('foo');

      expect(sp).toEqual({ text: 'foo' });
    });

    it('creates text span with given string and props', () => {
      const sp = span('foo', { fontStyle: 'italic' });

      expect(sp).toEqual({ text: 'foo', fontStyle: 'italic' });
    });

    it('creates text span with given array and props', () => {
      const sp = span(['foo', span('bar', { fontStyle: 'italic' })], { fontSize: 8 });

      expect(sp).toEqual({ text: ['foo', { text: 'bar', fontStyle: 'italic' }], fontSize: 8 });
    });

    it('extracts a single array element in text', () => {
      const sp = span(['foo'], { fontStyle: 'italic' });

      expect(sp).toEqual({ text: 'foo', fontStyle: 'italic' });
    });

    it('merges a single text span in text, inner span takes precedence', () => {
      const sp = span(span('foo', { fontWeight: 'bold' }), {
        fontStyle: 'italic',
        fontWeight: 'normal',
      });

      expect(sp).toEqual({ text: 'foo', fontWeight: 'bold', fontStyle: 'italic' });
    });
  });
});
