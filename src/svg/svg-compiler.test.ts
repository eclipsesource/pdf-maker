import { PDFFormXObject } from '@ralfstx/pdf-core';
import { describe, expect, it } from 'vitest';

import { formatContentStream } from '../test/test-utils.ts';
import { parseXml } from '../util/xml.ts';
import { compileSvg, compileSvgContent } from './svg-compiler.ts';

function compile(svg: string) {
  return compileSvgContent(parseXml(svg));
}

function instructions(svg: string) {
  return formatContentStream(compile(svg).contentStream);
}

function svg(content: string, attrs = 'width="100" height="100"') {
  return `<svg ${attrs}>${content}</svg>`;
}

describe('compileSvg', () => {
  it('returns a form XObject with the intrinsic size', () => {
    const image = compileSvg(
      parseXml('<svg width="100" height="50"><rect width="1" height="1"/></svg>'),
    );

    expect(image.xobject).toBeInstanceOf(PDFFormXObject);
    expect(image.width).toBe(100);
    expect(image.height).toBe(50);
  });
});

describe('compileSvgContent', () => {
  it('throws for a non-svg root element', () => {
    expect(() => compile('<div/>')).toThrow("Expected root element 'svg', got 'div'");
  });

  describe('intrinsic size', () => {
    it('reads the size from width and height attrs', () => {
      const { width, height } = compile('<svg width="100" height="50"/>');
      expect({ width, height }).toEqual({ width: 100, height: 50 });
    });

    it('converts absolute units', () => {
      const { width, height } = compile('<svg width="1in" height="1pc"/>');
      expect({ width, height }).toEqual({ width: 72, height: 12 });
    });

    it('falls back to the viewBox size', () => {
      const { width, height } = compile('<svg viewBox="0 0 200 100"/>');
      expect({ width, height }).toEqual({ width: 200, height: 100 });
    });

    it('falls back to 300x150', () => {
      const { width, height } = compile('<svg/>');
      expect({ width, height }).toEqual({ width: 300, height: 150 });
    });

    it('ignores percentages and non-positive sizes', () => {
      const { width, height } = compile('<svg width="100%" height="0" viewBox="0 0 40 30"/>');
      expect({ width, height }).toEqual({ width: 40, height: 30 });
    });

    it('derives a missing width or height from the viewBox aspect ratio', () => {
      const { width, height } = compile('<svg height="50" viewBox="0 0 200 100"/>');
      expect({ width, height }).toEqual({ width: 100, height: 50 });
    });
  });

  describe('form bbox and matrix', () => {
    it('flips the y axis', () => {
      const { bbox, matrix } = compile('<svg width="100" height="50"/>');
      expect(bbox).toEqual([0, 0, 100, 50]);
      expect(matrix).toEqual([1, 0, 0, -1, 0, 50]);
    });

    it('scales and centers the viewBox as with xMidYMid meet', () => {
      const { bbox, matrix } = compile('<svg width="100" height="100" viewBox="0 0 200 100"/>');
      expect(bbox).toEqual([0, 0, 200, 100]);
      expect(matrix).toEqual([0.5, 0, 0, -0.5, 0, 75]);
    });

    it('supports a viewBox with an offset', () => {
      const { bbox, matrix } = compile('<svg viewBox="10 20 100 100"/>');
      expect(bbox).toEqual([10, 20, 110, 120]);
      expect(matrix).toEqual([1, 0, 0, -1, -10, 120]);
    });

    it('ignores an invalid viewBox', () => {
      const { bbox, matrix } = compile('<svg width="100" height="50" viewBox="0 0 -1 1"/>');
      expect(bbox).toEqual([0, 0, 100, 50]);
      expect(matrix).toEqual([1, 0, 0, -1, 0, 50]);
    });

    // A form XObject keeps its bbox and matrix unvalidated, so without
    // these checks the numbers would be rejected only when the document
    // is written, with nothing left to point at the image
    it('throws when the viewport matrix exceeds the range of a PDF number', () => {
      expect(() => compile('<svg width="1e307" viewBox="0 0 1 1e-5"/>')).toThrow(
        'Invalid transformation matrix',
      );
    });

    it('throws when the bbox exceeds the range of a PDF number', () => {
      // The matrix stays valid here, only the bbox overflows
      expect(() => compile('<svg width="1" height="1" viewBox="1e308 0 1e308 1e308"/>')).toThrow(
        'Invalid bounding box: [1e+308, 0, Infinity, 1e+308]',
      );
    });
  });

  describe('shapes', () => {
    it('renders a rect filled with black by default', () => {
      expect(instructions(svg('<rect x="10" y="10" width="30" height="20"/>'))).toBe(
        ['q', '0 0 0 rg', '10 10 30 20 re', 'f', 'Q'].join('\n'),
      );
    });

    it('skips a rect without a positive size', () => {
      expect(instructions(svg('<rect width="30"/>'))).toBe('');
      expect(instructions(svg('<rect width="0" height="10"/>'))).toBe('');
      expect(instructions(svg('<rect width="-5" height="10"/>'))).toBe('');
    });

    it('resolves percentages against the viewport', () => {
      expect(instructions(svg('<rect width="50%" height="100%"/>', 'viewBox="0 0 200 100"'))).toBe(
        ['q', '0 0 0 rg', '0 0 100 100 re', 'f', 'Q'].join('\n'),
      );
    });

    it('renders a rounded rect with bezier corners', () => {
      expect(instructions(svg('<rect width="100" height="100" rx="10"/>'))).toBe(
        [
          'q',
          '0 0 0 rg',
          '10 0 m',
          '90 0 l',
          '95.522847 0 100 4.477153 100 10 c',
          '100 90 l',
          '100 95.522847 95.522847 100 90 100 c',
          '10 100 l',
          '4.477153 100 0 95.522847 0 90 c',
          '0 10 l',
          '0 4.477153 4.477153 0 10 0 c',
          'h',
          'f',
          'Q',
        ].join('\n'),
      );
    });

    it('defaults a missing corner radius to the other axis', () => {
      const onlyRy = instructions(svg('<rect width="100" height="100" ry="10"/>'));
      expect(onlyRy).toContain('10 0 m');
      expect(onlyRy).toContain('95.522847 0 100 4.477153 100 10 c');
    });

    it('clamps corner radii to half the side length', () => {
      const result = instructions(svg('<rect width="40" height="40" rx="100"/>'));
      // rx and ry are clamped to 20, producing an ellipse-like shape
      expect(result).toContain('20 0 m');
      expect(result).toContain('40 20 l');
    });

    it('ignores non-positive corner radii', () => {
      expect(instructions(svg('<rect width="30" height="20" rx="0"/>'))).toBe(
        ['q', '0 0 0 rg', '0 0 30 20 re', 'f', 'Q'].join('\n'),
      );
      expect(instructions(svg('<rect width="30" height="20" rx="-5"/>'))).toBe(
        ['q', '0 0 0 rg', '0 0 30 20 re', 'f', 'Q'].join('\n'),
      );
    });

    // Numbers this large cannot be drawn, so the SVG is rejected rather
    // than rendered without the attribute, which would place the shape
    // at a nonsensical size or position. pdf-core rejects content stream
    // operands as they are written, which makes it the check here.
    it('throws for lengths that cannot be drawn', () => {
      expect(() => instructions(svg('<rect width="1e999" height="20"/>'))).toThrow(
        'PDFNumber must be a finite number',
      );
      expect(() => instructions(svg('<rect width="30" height="20" x="1e999"/>'))).toThrow(
        'PDFNumber must be a finite number',
      );
      expect(() => instructions(svg('<rect width="30" height="20" x="3e9"/>'))).toThrow(
        'PDFNumber out of range',
      );
      // Finite geometry that overflows in the coordinate calculation
      expect(() => instructions(svg('<circle cx="1e308" r="1e308"/>'))).toThrow(
        'PDFNumber must be a finite number',
      );
    });

    it('renders a circle as four bezier curves', () => {
      expect(instructions(svg('<circle cx="50" cy="50" r="40"/>'))).toBe(
        [
          'q',
          '0 0 0 rg',
          '10 50 m',
          '10 27.90861 27.90861 10 50 10 c',
          '72.09139 10 90 27.90861 90 50 c',
          '90 72.09139 72.09139 90 50 90 c',
          '27.90861 90 10 72.09139 10 50 c',
          'f',
          'Q',
        ].join('\n'),
      );
    });

    it('renders an ellipse', () => {
      const result = instructions(svg('<ellipse cx="50" cy="50" rx="40" ry="20"/>'));
      expect(result).toContain('10 50 m');
      expect(result).toContain('10 38.954305 27.90861 30 50 30 c');
    });

    it('skips circles and ellipses without positive radii', () => {
      expect(instructions(svg('<circle cx="50" cy="50"/>'))).toBe('');
      expect(instructions(svg('<circle cx="50" cy="50" r="0"/>'))).toBe('');
      expect(instructions(svg('<ellipse cx="50" cy="50"/>'))).toBe('');
    });

    it('renders a line with a stroke and ignores fill', () => {
      expect(
        instructions(svg('<line x1="1" y1="2" x2="3" y2="4" stroke="red" fill="blue"/>')),
      ).toBe(['q', '1 0 0 RG', '4 M', '1 2 m', '3 4 l', 'S', 'Q'].join('\n'));
    });

    it('skips a line without a stroke', () => {
      expect(instructions(svg('<line x1="1" y1="2" x2="3" y2="4"/>'))).toBe('');
    });

    it('renders a polyline without closing the path', () => {
      expect(instructions(svg('<polyline points="0,0 10,0 10,10"/>'))).toBe(
        ['q', '0 0 0 rg', '0 0 m', '10 0 l', '10 10 l', 'f', 'Q'].join('\n'),
      );
    });

    it('renders a polygon with a closed path', () => {
      expect(instructions(svg('<polygon points="0,0 10,0 10,10"/>'))).toBe(
        ['q', '0 0 0 rg', '0 0 m', '10 0 l', '10 10 l', 'h', 'f', 'Q'].join('\n'),
      );
    });

    it('truncates polygon points at the first invalid entry', () => {
      expect(instructions(svg('<polyline points="0 0 10 0 x 10"/>'))).toBe(
        ['q', '0 0 0 rg', '0 0 m', '10 0 l', 'f', 'Q'].join('\n'),
      );
      expect(instructions(svg('<polyline points="0 0 10"/>'))).toBe('');
    });

    it('renders a path', () => {
      expect(instructions(svg('<path d="M 0 0 L 10 0 l 0 10 Z"/>'))).toBe(
        ['q', '0 0 0 rg', '0 0 m', '10 0 l', '10 10 l', 'h', 'f', 'Q'].join('\n'),
      );
    });

    it('skips a path with missing or invalid path data', () => {
      expect(instructions(svg('<path/>'))).toBe('');
      expect(instructions(svg('<path d=" "/>'))).toBe('');
      expect(instructions(svg('<path d="X 1 2"/>'))).toBe('');
    });
  });

  describe('paint', () => {
    it('fills and strokes a shape', () => {
      expect(instructions(svg('<rect width="10" height="10" fill="blue" stroke="red"/>'))).toBe(
        ['q', '0 0 1 rg', '1 0 0 RG', '4 M', '0 0 10 10 re', 'B', 'Q'].join('\n'),
      );
    });

    it('skips shapes without fill and stroke', () => {
      expect(instructions(svg('<rect width="10" height="10" fill="none"/>'))).toBe('');
    });

    it('applies the even-odd fill rule', () => {
      expect(instructions(svg('<rect width="10" height="10" fill-rule="evenodd"/>'))).toContain(
        'f*',
      );
      expect(
        instructions(svg('<rect width="10" height="10" stroke="red" fill-rule="evenodd"/>')),
      ).toContain('B*');
    });

    it('resolves currentColor against the inherited color', () => {
      expect(
        instructions(svg('<g color="red"><rect width="10" height="10" fill="currentColor"/></g>')),
      ).toContain('1 0 0 rg');
    });

    it('supports style declarations over presentation attributes', () => {
      expect(
        instructions(svg('<rect width="10" height="10" fill="red" style="fill: lime"/>')),
      ).toContain('0 1 0 rg');
    });

    it('inherits presentation attributes from groups and the root', () => {
      expect(instructions(svg('<g fill="lime"><rect width="10" height="10"/></g>'))).toContain(
        '0 1 0 rg',
      );
      expect(
        instructions(
          '<svg width="100" height="100" fill="lime"><rect width="10" height="10"/></svg>',
        ),
      ).toContain('0 1 0 rg');
    });

    it('ignores invalid paint values', () => {
      expect(instructions(svg('<rect width="10" height="10" fill="sparkly"/>'))).toContain(
        '0 0 0 rg',
      );
    });
  });

  describe('stroke parameters', () => {
    it('emits stroke parameters that differ from the PDF defaults', () => {
      expect(
        instructions(
          svg(
            `<line x1="0" y1="0" x2="10" y2="0" stroke="black" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="bevel" stroke-miterlimit="10"
              stroke-dasharray="1 2" stroke-dashoffset="0.5"/>`,
          ),
        ),
      ).toBe(
        ['q', '0 0 0 RG', '2 w', '1 J', '2 j', '[1 2] 0.5 d', '0 0 m', '10 0 l', 'S', 'Q'].join(
          '\n',
        ),
      );
    });

    it('emits the SVG default miter limit of 4', () => {
      // The PDF default miter limit is 10
      expect(instructions(svg('<line x2="10" stroke="black"/>'))).toContain('4 M');
    });

    it('skips the stroke for a zero stroke width', () => {
      expect(instructions(svg('<line x2="10" stroke="black" stroke-width="0"/>'))).toBe('');
    });

    it('resets an inherited dash array with none', () => {
      expect(
        instructions(
          svg(
            `<g stroke-dasharray="1 2">
              <line x2="10" stroke="black" stroke-dasharray="none"/>
            </g>`,
          ),
        ),
      ).not.toContain(' d');
    });
  });

  describe('opacity', () => {
    it('sets the opacity via ExtGState', () => {
      expect(
        instructions(svg('<rect width="10" height="10" fill-opacity="0.5" stroke-opacity="0.6"/>')),
      ).toContain('/gs:CA:0.6,ca:0.5 gs');
    });

    it('multiplies group opacity down onto shapes', () => {
      expect(
        instructions(
          svg(
            '<g opacity="0.5"><rect width="10" height="10" opacity="0.5" fill-opacity="0.5"/></g>',
          ),
        ),
      ).toContain('/gs:CA:0.25,ca:0.125 gs');
    });

    it('does not inherit element opacity to siblings', () => {
      const result = instructions(
        svg('<rect width="10" height="10" opacity="0.5"/><rect y="20" width="10" height="10"/>'),
      );
      expect(result).toContain('/gs:CA:0.5,ca:0.5 gs');
      expect(result.match(/ gs/g)).toHaveLength(1);
    });
  });

  describe('transforms', () => {
    it('applies a transform on a shape', () => {
      expect(instructions(svg('<rect width="10" height="10" transform="translate(5 6)"/>'))).toBe(
        ['q', '1 0 0 1 5 6 cm', '0 0 0 rg', '0 0 10 10 re', 'f', 'Q'].join('\n'),
      );
    });

    it('wraps transformed groups in a graphics state', () => {
      expect(instructions(svg('<g transform="scale(2)"><rect width="10" height="10"/></g>'))).toBe(
        ['q', '2 0 0 2 0 0 cm', 'q', '0 0 0 rg', '0 0 10 10 re', 'f', 'Q', 'Q'].join('\n'),
      );
    });

    it('does not wrap groups without a transform', () => {
      expect(instructions(svg('<g><rect width="10" height="10"/></g>'))).toBe(
        ['q', '0 0 0 rg', '0 0 10 10 re', 'f', 'Q'].join('\n'),
      );
    });

    it('throws for a transform that cannot be applied', () => {
      const shape = (transform: string) =>
        instructions(svg(`<rect width="10" height="10" transform="${transform}"/>`));
      expect(() => shape('rotate(1e308)')).toThrow('Invalid transformation matrix');
      expect(() => shape('scale(1e200) scale(1e200)')).toThrow('Invalid transformation matrix');
      // Finite matrix, overflows in the rounding
      expect(() => shape('scale(1e307)')).toThrow('Invalid transformation matrix');
      // Finite and in range, but beyond what a PDF number can hold
      expect(() => shape('translate(1e30)')).toThrow('Invalid transformation matrix');
    });

    it('throws for a transform on a group or use element', () => {
      expect(() =>
        instructions(svg('<g transform="rotate(1e308)"><rect width="10" height="10"/></g>')),
      ).toThrow('Invalid transformation matrix');
      expect(() =>
        instructions(
          svg(
            '<defs><rect id="r" width="5" height="5"/></defs><use href="#r" transform="rotate(1e308)"/>',
          ),
        ),
      ).toThrow('Invalid transformation matrix');
    });
  });

  describe('structure', () => {
    it('skips elements with display none', () => {
      expect(instructions(svg('<rect width="10" height="10" display="none"/>'))).toBe('');
      expect(instructions(svg('<g display="none"><rect width="10" height="10"/></g>'))).toBe('');
      expect(instructions(svg('<rect width="10" height="10" style="display: none"/>'))).toBe('');
    });

    it('skips defs, text, unknown, and nested svg elements', () => {
      expect(instructions(svg('<defs><rect width="10" height="10"/></defs>'))).toBe('');
      expect(instructions(svg('<text>Hi</text>'))).toBe('');
      expect(instructions(svg('<foo><rect width="10" height="10"/></foo>'))).toBe('');
      expect(instructions(svg('<svg><rect width="10" height="10"/></svg>'))).toBe('');
    });
  });

  describe('use', () => {
    it('renders the referenced element with a translation', () => {
      expect(
        instructions(
          svg('<defs><rect id="r" width="5" height="5"/></defs><use href="#r" x="10" y="20"/>'),
        ),
      ).toBe(['q', '1 0 0 1 10 20 cm', 'q', '0 0 0 rg', '0 0 5 5 re', 'f', 'Q', 'Q'].join('\n'));
    });

    it('applies the translation before the transform attribute', () => {
      expect(
        instructions(
          svg(
            '<defs><rect id="r" width="5" height="5"/></defs><use href="#r" x="10" transform="scale(2)"/>',
          ),
        ),
      ).toContain('2 0 0 2 20 0 cm');
    });

    it('inherits presentation attributes from the use element', () => {
      expect(
        instructions(
          svg('<defs><rect id="r" width="5" height="5"/></defs><use href="#r" fill="red"/>'),
        ),
      ).toBe(['q', '1 0 0 rg', '0 0 5 5 re', 'f', 'Q'].join('\n'));
    });

    it('does not override attributes of the referenced element', () => {
      expect(
        instructions(
          svg(
            '<defs><rect id="r" width="5" height="5" fill="lime"/></defs><use href="#r" fill="red"/>',
          ),
        ),
      ).toContain('0 1 0 rg');
    });

    it('skips use elements with missing or invalid references', () => {
      expect(instructions(svg('<use href="#missing"/>'))).toBe('');
      expect(instructions(svg('<use/>'))).toBe('');
    });

    it('breaks reference cycles', () => {
      const result = instructions(
        svg('<g id="a"><use href="#a"/><rect width="5" height="5"/></g>'),
      );
      expect(result.match(/re/g)).toHaveLength(1);
      expect(instructions(svg('<use id="u" href="#u"/>'))).toBe('');
    });

    it('supports use referencing another use', () => {
      const result = instructions(
        svg(
          `<defs><rect id="r" width="5" height="5"/><use id="u" href="#r" x="1"/></defs>
          <use href="#u" x="2"/>`,
        ),
      );
      expect(result).toContain('1 0 0 1 2 0 cm');
      expect(result).toContain('1 0 0 1 1 0 cm');
      expect(result).toContain('0 0 5 5 re');
    });
  });

  describe('gradients', () => {
    const gradientDef = `<linearGradient id="g">
      <stop offset="0" stop-color="red"/>
      <stop offset="1" stop-color="blue"/>
    </linearGradient>`;
    const patternKey =
      'pattern:shading:2:DeviceRGB:[0,0,1,0]:[[0,1,0,0],[1,0,0,1]]:[true,true]:[100,0,0,50,0,0]';

    it('fills a shape with a gradient defined in defs', () => {
      expect(
        instructions(
          svg(`<defs>${gradientDef}</defs><rect width="100" height="50" fill="url(#g)"/>`),
        ),
      ).toBe(['q', '/Pattern cs', `/${patternKey} scn`, '0 0 100 50 re', 'f', 'Q'].join('\n'));
    });

    it('strokes a shape with a gradient', () => {
      expect(
        instructions(
          svg(`${gradientDef}<rect width="100" height="50" fill="none" stroke="url(#g)"/>`),
        ),
      ).toBe(
        ['q', '/Pattern CS', `/${patternKey} SCN`, '4 M', '0 0 100 50 re', 'S', 'Q'].join('\n'),
      );
    });

    it('bakes the accumulated transform into the pattern matrix', () => {
      const result = instructions(
        svg(
          `${gradientDef}
          <g transform="translate(10 20)">
            <rect width="100" height="50" fill="url(#g)" transform="scale(2)"/>
          </g>`,
        ),
      );
      // bbox mapping [100 0 0 50 0 0], then scale(2), then translate(10 20)
      expect(result).toContain(':[200,0,0,100,10,20] scn');
    });

    it('falls back to the fallback color for invalid references', () => {
      expect(
        instructions(svg('<rect width="10" height="10" fill="url(#missing) red"/>')),
      ).toContain('1 0 0 rg');
      expect(
        instructions(svg('<rect width="10" height="10" fill="url(#missing)" stroke="red"/>')),
      ).toBe(['q', '1 0 0 RG', '4 M', '0 0 10 10 re', 'S', 'Q'].join('\n'));
    });

    it('skips shapes whose gradient cannot be built', () => {
      expect(
        instructions(svg('<linearGradient id="g"/><rect width="10" height="10" fill="url(#g)"/>')),
      ).toBe('');
    });
  });
});
