import { describe, expect, it } from 'vitest';

import { columns, image, rows, text } from './layout.ts';

describe('text', () => {
  it('creates text block with type', () => {
    expect(text('foo', { fontSize: 8 })).toEqual({ type: 'text', text: 'foo', fontSize: 8 });
  });
});

describe('image', () => {
  it('creates image block with type', () => {
    expect(image('foo.png', { width: 8 })).toEqual({ type: 'image', image: 'foo.png', width: 8 });
  });
});

describe('columns', () => {
  it('creates columns block with type', () => {
    expect(columns([text('foo')], { margin: 8 })).toEqual({
      type: 'columns',
      columns: [{ type: 'text', text: 'foo' }],
      margin: 8,
    });
  });
});

describe('rows', () => {
  it('creates rows block with type', () => {
    expect(rows([text('foo')], { margin: 8 })).toEqual({
      type: 'rows',
      rows: [{ type: 'text', text: 'foo' }],
      margin: 8,
    });
  });
});
