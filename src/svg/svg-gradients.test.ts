import { describe, expect, it } from 'vitest';

import { rgb } from '../colors.ts';
import type { XmlElement } from '../util/xml.ts';
import { parseXml } from '../util/xml.ts';
import { collectIds } from './svg-compiler.ts';
import type { GradientParams } from './svg-gradients.ts';
import { buildGradientPaint, isGradientElement } from './svg-gradients.ts';

const redToBlue = '<stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/>';
const redToBlueStops = '[[0,1,0,0],[1,0,0,1]]';

describe('isGradientElement', () => {
  it('detects gradient elements', () => {
    expect(isGradientElement(parseXml('<linearGradient/>'))).toBe(true);
    expect(isGradientElement(parseXml('<radialGradient/>'))).toBe(true);
    expect(isGradientElement(parseXml('<rect/>'))).toBe(false);
  });
});

describe('buildGradientPattern', () => {
  it('builds an axial shading with default coords and a bounding box matrix', () => {
    const pattern = build(`<linearGradient id="g">${redToBlue}</linearGradient>`);

    expect(pattern?.key).toBe(
      `pattern:shading:2:DeviceRGB:[0,0,1,0]:${redToBlueStops}:[true,true]:pad::[100,0,0,50,0,0]`,
    );
  });

  it('supports fractions and percentages for objectBoundingBox coords', () => {
    const pattern = build(
      `<linearGradient id="g" x1="0.1" y1="10%" x2="0.9" y2="90%">${redToBlue}</linearGradient>`,
    );

    expect(pattern?.key).toContain(':[0.1,0.1,0.9,0.9]:');
  });

  it('includes the element bbox offset in the pattern matrix', () => {
    const pattern = build(`<linearGradient id="g">${redToBlue}</linearGradient>`, {
      bbox: { x: 10, y: 20, width: 100, height: 50 },
    });

    expect(pattern?.key).toContain(':[100,0,0,50,10,20]');
  });

  it('resolves userSpaceOnUse coords against the viewport', () => {
    const pattern = build(
      `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="10" y1="20" x2="50%" y2="100%">
        ${redToBlue}
      </linearGradient>`,
    );

    // No pattern matrix since the accumulated transform is the identity
    expect(pattern?.key).toBe(
      `pattern:shading:2:DeviceRGB:[10,20,100,100]:${redToBlueStops}:[true,true]:pad::`,
    );
  });

  it('bakes the accumulated transform into the pattern matrix', () => {
    const pattern = build(
      `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" x2="10">${redToBlue}</linearGradient>`,
      { ctm: [2, 0, 0, 2, 10, 20] },
    );

    expect(pattern?.key).toContain(':[2,0,0,2,10,20]');
  });

  it('applies the gradientTransform before the bounding box mapping', () => {
    const pattern = build(
      `<linearGradient id="g" gradientTransform="translate(0.5)">${redToBlue}</linearGradient>`,
    );

    // translate(0.5) in unit space amounts to half the bbox width
    expect(pattern?.key).toContain(':[100,0,0,50,50,0]');
  });

  it('builds a radial shading with default coords', () => {
    const pattern = build(`<radialGradient id="g">${redToBlue}</radialGradient>`);

    expect(pattern?.key).toBe(
      `pattern:shading:3:DeviceRGB:[0.5,0.5,0,0.5,0.5,0.5]:${redToBlueStops}:[true,true]:pad::[100,0,0,50,0,0]`,
    );
  });

  it('supports focal points in radial gradients', () => {
    const pattern = build(
      `<radialGradient id="g" fx="0.3" fy="0.4" fr="0.1">${redToBlue}</radialGradient>`,
    );

    expect(pattern?.key).toContain(':[0.3,0.4,0.1,0.5,0.5,0.5]:');
  });

  it('returns undefined for a radial gradient without a positive radius', () => {
    expect(build(`<radialGradient id="g" r="0">${redToBlue}</radialGradient>`)).toBeUndefined();
    expect(build(`<radialGradient id="g" r="-1">${redToBlue}</radialGradient>`)).toBeUndefined();
  });

  it('returns undefined for a gradient without stops', () => {
    expect(build('<linearGradient id="g"/>')).toBeUndefined();
  });

  // A shading pattern keeps its matrix unvalidated, like a form XObject
  it('throws when the pattern matrix cannot be applied', () => {
    const svg = `<linearGradient id="g" gradientTransform="rotate(1e308)">${redToBlue}</linearGradient>`;
    expect(() => build(svg)).toThrow('Invalid transformation matrix');
    expect(() =>
      build(`<linearGradient id="g">${redToBlue}</linearGradient>`, {
        ctm: [1e307, 0, 0, 1, 0, 0],
      }),
    ).toThrow('Invalid transformation matrix');
  });

  it('returns undefined for objectBoundingBox units without a usable bbox', () => {
    const svg = `<linearGradient id="g">${redToBlue}</linearGradient>`;
    expect(build(svg, { bbox: undefined })).toBeUndefined();
    expect(build(svg, { bbox: { x: 0, y: 0, width: 0, height: 50 } })).toBeUndefined();
  });

  it('supports a single stop', () => {
    const pattern = build(
      '<linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient>',
    );

    expect(pattern?.key).toContain(':[[0,1,0,0]]:');
  });

  it('parses percentage offsets and clamps offsets to be non-decreasing', () => {
    const pattern = build(
      `<linearGradient id="g">
        <stop offset="80%" stop-color="red"/>
        <stop offset="20%" stop-color="blue"/>
        <stop offset="150%" stop-color="lime"/>
      </linearGradient>`,
    );

    expect(pattern?.key).toContain(':[[0.8,1,0,0],[0.8,0,0,1],[1,0,1,0]]:');
  });

  it('reads stop-color from the style attribute and defaults to black', () => {
    const pattern = build(
      `<linearGradient id="g">
        <stop offset="0" style="stop-color: red"/>
        <stop offset="1"/>
      </linearGradient>`,
    );

    expect(pattern?.key).toContain(':[[0,1,0,0],[1,0,0,0]]:');
  });

  it('resolves currentColor in stops against the inherited color', () => {
    const pattern = build(
      '<linearGradient id="g"><stop offset="0" stop-color="currentColor"/></linearGradient>',
      { color: rgb(0, 1, 0) },
    );

    expect(pattern?.key).toContain(':[[0,0,1,0]]:');
  });

  describe('spreadMethod', () => {
    it('repeats or reflects a gradient over the visible area', () => {
      const repeat = build(
        `<linearGradient id="g" spreadMethod="repeat">${redToBlue}</linearGradient>`,
      );
      const reflect = build(
        `<linearGradient id="g" spreadMethod="reflect">${redToBlue}</linearGradient>`,
      );

      // The area of 200 x 100 mapped back through the bbox of 100 x 50
      expect(repeat?.key).toContain(':[true,true]:repeat:[0,0,2,2]:[100,0,0,50,0,0]');
      expect(reflect?.key).toContain(':[true,true]:reflect:[0,0,2,2]:');
    });

    it('maps the area back through all transforms', () => {
      const pattern = build(
        `<linearGradient id="g" spreadMethod="repeat" gradientTransform="rotate(90)">
          ${redToBlue}
        </linearGradient>`,
        { ctm: [1, 0, 0, 1, 10, 0] },
      );

      // Pattern matrix: rotate(90), then bbox mapping, then translate(10 0)
      expect(pattern?.key).toContain(':repeat:[0,-1.9,2,0.1]:[0,50,-100,0,10,0]');
    });

    it('pads a gradient for missing or invalid values', () => {
      expect(build(`<linearGradient id="g">${redToBlue}</linearGradient>`)?.key).toContain(
        ':pad::',
      );
      expect(
        build(`<linearGradient id="g" spreadMethod="foo">${redToBlue}</linearGradient>`)?.key,
      ).toContain(':pad::');
    });

    it('inherits the spread method via href', () => {
      const pattern = build(
        `<svg>
          <linearGradient id="base" spreadMethod="reflect">${redToBlue}</linearGradient>
          <linearGradient id="g" href="#base"/>
        </svg>`,
      );

      expect(pattern?.key).toContain(':reflect:');
    });

    it('repeats a radial gradient with the focal circle inside the end circle', () => {
      const pattern = build(
        `<radialGradient id="g" spreadMethod="repeat" fx="0.6" fy="0.5">${redToBlue}</radialGradient>`,
      );

      expect(pattern?.key).toContain(':repeat:[0,0,2,2]:');
    });

    it('pads a radial gradient with the focal circle outside the end circle', () => {
      const pattern = build(
        `<radialGradient id="g" spreadMethod="repeat" fx="1.2" fy="0.5">${redToBlue}</radialGradient>`,
      );

      expect(pattern?.key).toContain(':pad:');
    });

    it('pads a radial gradient with circles that touch or coincide', () => {
      const touching = build(
        `<radialGradient id="g" spreadMethod="repeat" fx="1">${redToBlue}</radialGradient>`,
      );
      const coinciding = build(
        `<radialGradient id="g" spreadMethod="repeat" fr="0.5">${redToBlue}</radialGradient>`,
      );

      expect(touching?.key).toContain(':pad:');
      expect(coinciding?.key).toContain(':pad:');
    });

    it('pads a linear gradient of zero length', () => {
      const pattern = build(
        `<linearGradient id="g" spreadMethod="repeat" x2="0">${redToBlue}</linearGradient>`,
      );

      expect(pattern?.key).toContain(':pad:');
    });

    it('pads a gradient that would need too many repetitions', () => {
      const pattern = build(
        `<linearGradient id="g" spreadMethod="repeat" x2="0.0001">${redToBlue}</linearGradient>`,
      );

      expect(pattern?.key).toContain(':pad:');
    });

    it('pads a gradient whose pattern matrix is not invertible', () => {
      const pattern = build(
        `<linearGradient id="g" spreadMethod="repeat">${redToBlue}</linearGradient>`,
        { ctm: [0, 0, 0, 0, 0, 0] },
      );

      expect(pattern?.key).toContain(':pad::');
    });
  });

  describe('stop-opacity', () => {
    it('creates an opacity mask for translucent stops', () => {
      const paint = buildPaint(
        `<linearGradient id="g">
          <stop offset="0" stop-color="red" stop-opacity="0.5"/>
          <stop offset="1" stop-color="blue"/>
        </linearGradient>`,
      );

      expect(paint?.pattern.key).toContain(`:${redToBlueStops}:[true,true]:pad:[0,0,2,2]:`);
      expect(paint?.matrix).toEqual([100, 0, 0, 50, 0, 0]);
      expect(paint?.opacityMask?.key).toContain(':[[0,0.5],[1,1]]:');
    });

    it('reads stop-opacity from the style attribute and supports percentages', () => {
      const paint = buildPaint(
        `<linearGradient id="g">
          <stop offset="0" style="stop-opacity: 25%"/>
          <stop offset="1" stop-opacity="2"/>
        </linearGradient>`,
      );

      expect(paint?.opacityMask?.key).toContain(':[[0,0.25],[1,1]]:');
    });

    it('creates no opacity mask for opaque stops', () => {
      const paint = buildPaint(`<linearGradient id="g">${redToBlue}</linearGradient>`);

      expect(paint?.opacityMask).toBeUndefined();
      expect(paint?.pattern.key).toContain(':pad::');
    });

    it('returns undefined for a translucent gradient whose matrix is not invertible', () => {
      const paint = buildPaint(
        `<linearGradient id="g"><stop offset="0" stop-opacity="0.5"/></linearGradient>`,
        { ctm: [0, 0, 0, 0, 0, 0] },
      );

      expect(paint).toBeUndefined();
    });
  });

  it('inherits stops and attributes via href', () => {
    const pattern = build(
      `<svg>
        <linearGradient id="base" x1="0.2" x2="0.8">${redToBlue}</linearGradient>
        <linearGradient id="g" href="#base" x2="0.5"/>
      </svg>`,
    );

    // x2 from the element wins, x1 and the stops are inherited
    expect(pattern?.key).toContain(':[0.2,0,0.5,0]:');
    expect(pattern?.key).toContain(`:${redToBlueStops}:`);
  });

  it('inherits stops across multiple href levels', () => {
    const pattern = build(
      `<svg>
        <linearGradient id="base">${redToBlue}</linearGradient>
        <linearGradient id="mid" href="#base"/>
        <linearGradient id="g" href="#mid"/>
      </svg>`,
    );

    expect(pattern?.key).toContain(`:${redToBlueStops}:`);
  });

  it('inherits stops from a gradient of a different type', () => {
    const pattern = build(
      `<svg>
        <linearGradient id="base">${redToBlue}</linearGradient>
        <radialGradient id="g" href="#base"/>
      </svg>`,
    );

    expect(pattern?.key).toContain('pattern:shading:3:');
    expect(pattern?.key).toContain(`:${redToBlueStops}:`);
  });

  it('terminates on circular href references', () => {
    const pattern = build(
      `<svg>
        <linearGradient id="a" href="#g">${redToBlue}</linearGradient>
        <linearGradient id="g" href="#a"/>
      </svg>`,
    );

    expect(pattern?.key).toContain(`:${redToBlueStops}:`);
    expect(build('<linearGradient id="g" href="#g"/>')).toBeUndefined();
  });

  it('ignores href references to missing or non-gradient elements', () => {
    expect(
      build(
        `<svg>
          <rect id="r"/>
          <linearGradient id="g" href="#r"/>
        </svg>`,
      ),
    ).toBeUndefined();
    expect(build('<linearGradient id="g" href="#missing"/>')).toBeUndefined();
  });
});

function build(svgSource: string, params?: Partial<GradientParams>, id = 'g') {
  return buildPaint(svgSource, params, id)?.pattern;
}

function buildPaint(svgSource: string, params?: Partial<GradientParams>, id = 'g') {
  const idMap = new Map<string, XmlElement>();
  collectIds(parseXml(svgSource), idMap);
  return buildGradientPaint(idMap.get(id)!, idMap, {
    bbox: { x: 0, y: 0, width: 100, height: 50 },
    ctm: [1, 0, 0, 1, 0, 0],
    viewport: { width: 200, height: 100 },
    color: rgb(0, 0, 0),
    area: { x: 0, y: 0, width: 200, height: 100 },
    ...params,
  });
}
