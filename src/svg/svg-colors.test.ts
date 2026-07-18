import { describe, expect, it } from 'vitest';

import { rgb } from '../colors.ts';
import { parseSvgColor, parseSvgPaint } from './svg-colors.ts';

describe('parseSvgColor', () => {
  it('parses 6-digit hex colors', () => {
    expect(parseSvgColor('#ff0000')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('#000000')).toEqual(rgb(0, 0, 0));
    expect(parseSvgColor('#808080')).toEqual(rgb(128 / 255, 128 / 255, 128 / 255));
  });

  it('parses 3-digit hex colors', () => {
    expect(parseSvgColor('#f00')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('#abc')).toEqual(rgb(0xaa / 255, 0xbb / 255, 0xcc / 255));
  });

  it('ignores the case of hex digits', () => {
    expect(parseSvgColor('#FF0000')).toEqual(rgb(1, 0, 0));
  });

  it('parses rgb() colors', () => {
    expect(parseSvgColor('rgb(255, 0, 0)')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('rgb(0,128,255)')).toEqual(rgb(0, 128 / 255, 1));
    expect(parseSvgColor('RGB( 255 , 255 , 255 )')).toEqual(rgb(1, 1, 1));
  });

  it('parses space-separated rgb() colors', () => {
    expect(parseSvgColor('rgb(255 0 0)')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('rgb(0  128   255)')).toEqual(rgb(0, 128 / 255, 1));
    expect(parseSvgColor('rgb(100% 50% 0%)')).toEqual(rgb(1, 0.5, 0));
  });

  it('parses rgb()/rgba() colors with an ignored alpha', () => {
    expect(parseSvgColor('rgba(255, 0, 0, 0.5)')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('rgb(255 0 0 / 50%)')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('rgb(255 0 0 / 0.5)')).toEqual(rgb(1, 0, 0));
  });

  it('parses rgb() colors with percentages', () => {
    expect(parseSvgColor('rgb(100%, 50%, 0%)')).toEqual(rgb(1, 0.5, 0));
  });

  it('clamps rgb() components', () => {
    expect(parseSvgColor('rgb(300, -10, 0)')).toEqual(rgb(1, 0, 0));
  });

  it('parses CSS color keywords', () => {
    expect(parseSvgColor('red')).toEqual(rgb(1, 0, 0));
    expect(parseSvgColor('white')).toEqual(rgb(1, 1, 1));
    expect(parseSvgColor('rebeccapurple')).toEqual(rgb(0x66 / 255, 0x33 / 255, 0x99 / 255));
    expect(parseSvgColor('Lime')).toEqual(rgb(0, 1, 0));
  });

  it('parses none and transparent', () => {
    expect(parseSvgColor('none')).toBe('none');
    expect(parseSvgColor('transparent')).toBe('none');
  });

  it('parses currentColor', () => {
    expect(parseSvgColor('currentColor')).toBe('currentColor');
    expect(parseSvgColor('currentcolor')).toBe('currentColor');
  });

  it('accepts surrounding whitespace', () => {
    expect(parseSvgColor(' red ')).toEqual(rgb(1, 0, 0));
  });

  it('returns undefined for invalid input', () => {
    expect(parseSvgColor(undefined)).toBeUndefined();
    expect(parseSvgColor('')).toBeUndefined();
    expect(parseSvgColor('#12345')).toBeUndefined();
    expect(parseSvgColor('#ff0000ff')).toBeUndefined();
    expect(parseSvgColor('rgb(1, 2)')).toBeUndefined();
    expect(parseSvgColor('rgb(a, b, c)')).toBeUndefined();
    expect(parseSvgColor('sparkly')).toBeUndefined();
  });
});

describe('parseSvgPaint', () => {
  it('parses colors, none, and currentColor', () => {
    expect(parseSvgPaint('red')).toEqual(rgb(1, 0, 0));
    expect(parseSvgPaint('none')).toBe('none');
    expect(parseSvgPaint('currentColor')).toBe('currentColor');
  });

  it('parses url references', () => {
    expect(parseSvgPaint('url(#grad)')).toEqual({ id: 'grad', fallback: undefined });
    expect(parseSvgPaint('url( #grad )')).toEqual({ id: 'grad', fallback: undefined });
    expect(parseSvgPaint('url("#grad")')).toEqual({ id: 'grad', fallback: undefined });
    expect(parseSvgPaint("url('#grad')")).toEqual({ id: 'grad', fallback: undefined });
  });

  it('parses url references with a fallback', () => {
    expect(parseSvgPaint('url(#grad) red')).toEqual({ id: 'grad', fallback: rgb(1, 0, 0) });
    expect(parseSvgPaint('url(#grad) none')).toEqual({ id: 'grad', fallback: 'none' });
  });

  it('returns undefined for invalid input', () => {
    expect(parseSvgPaint(undefined)).toBeUndefined();
    expect(parseSvgPaint('')).toBeUndefined();
    expect(parseSvgPaint('sparkly')).toBeUndefined();
  });
});
