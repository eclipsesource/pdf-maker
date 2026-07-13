import { describe, expect, it } from 'vitest';

import { parseXml, XmlParseError } from './xml.ts';

describe('parseXml', () => {
  it('parses a self-closing root element', () => {
    expect(parseXml('<svg/>')).toEqual({ name: 'svg', attrs: {}, children: [] });
    expect(parseXml('<svg />')).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it('parses an empty element with a closing tag', () => {
    expect(parseXml('<svg></svg>')).toEqual({ name: 'svg', attrs: {}, children: [] });
    expect(parseXml('<svg></svg >')).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it('ignores a leading byte order mark', () => {
    expect(parseXml('\uFEFF<svg/>')).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it('parses attributes', () => {
    expect(parseXml('<rect x="1" y=\'2\'/>')).toEqual({
      name: 'rect',
      attrs: { x: '1', y: '2' },
      children: [],
    });
  });

  it('parses attributes with whitespace around the equals sign', () => {
    expect(parseXml('<rect x = "1"\n\ty= "2"/>')).toEqual({
      name: 'rect',
      attrs: { x: '1', y: '2' },
      children: [],
    });
  });

  it('parses attribute values with angle-bracket-free special characters', () => {
    expect(parseXml('<t d="M 0,0 L \'1\' 2 &gt; 3"/>')).toEqual({
      name: 't',
      attrs: { d: "M 0,0 L '1' 2 > 3" },
      children: [],
    });
  });

  it('parses nested elements', () => {
    expect(parseXml('<svg><g><rect/><circle/></g></svg>')).toEqual({
      name: 'svg',
      attrs: {},
      children: [
        {
          name: 'g',
          attrs: {},
          children: [
            { name: 'rect', attrs: {}, children: [] },
            { name: 'circle', attrs: {}, children: [] },
          ],
        },
      ],
    });
  });

  it('parses text content', () => {
    expect(parseXml('<t>foo bar</t>')).toEqual({ name: 't', attrs: {}, children: ['foo bar'] });
  });

  it('parses mixed content', () => {
    expect(parseXml('<p>Hello <b>world</b>!</p>')).toEqual({
      name: 'p',
      attrs: {},
      children: ['Hello ', { name: 'b', attrs: {}, children: ['world'] }, '!'],
    });
  });

  it('omits whitespace-only text nodes', () => {
    expect(parseXml('<svg>\n  <rect/>\n</svg>')).toEqual({
      name: 'svg',
      attrs: {},
      children: [{ name: 'rect', attrs: {}, children: [] }],
    });
  });

  it('decodes predefined entities in text', () => {
    expect(parseXml('<t>&lt;&gt;&amp;&apos;&quot;</t>')).toEqual({
      name: 't',
      attrs: {},
      children: ['<>&\'"'],
    });
  });

  it('decodes numeric character references in text', () => {
    expect(parseXml('<t>&#65;&#x42;&#X43;&#x1F600;</t>')).toEqual({
      name: 't',
      attrs: {},
      children: ['ABC\u{1F600}'],
    });
  });

  it('decodes entities in attribute values', () => {
    expect(parseXml('<t a="&quot;x&quot;" b="&#x20AC;"/>')).toEqual({
      name: 't',
      attrs: { a: '"x"', b: '€' },
      children: [],
    });
  });

  it('skips the XML declaration and DOCTYPE', () => {
    const input = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg>\n<svg/>';
    expect(parseXml(input)).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it('skips a DOCTYPE with an internal subset', () => {
    const input = '<!DOCTYPE svg [ <!ENTITY foo "bar"> ]><svg/>';
    expect(parseXml(input)).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it("skips a DOCTYPE with '>' in quoted identifiers", () => {
    const input = '<!DOCTYPE svg PUBLIC "-//X//DTD > SVG//EN" \'a>b\'><svg/>';
    expect(parseXml(input)).toEqual({ name: 'svg', attrs: {}, children: [] });
    const subset = '<!DOCTYPE svg [ <!ENTITY gt2 ">"> ]><svg/>';
    expect(parseXml(subset)).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it('skips comments', () => {
    const input = '<!-- a --><svg><!-- <b> --><rect/></svg><!-- c -->';
    expect(parseXml(input)).toEqual({
      name: 'svg',
      attrs: {},
      children: [{ name: 'rect', attrs: {}, children: [] }],
    });
  });

  it('skips processing instructions', () => {
    expect(parseXml('<svg><?foo bar?></svg>')).toEqual({ name: 'svg', attrs: {}, children: [] });
  });

  it('skips CDATA sections', () => {
    expect(parseXml('<t>a<![CDATA[ <x> & ]]>b</t>')).toEqual({
      name: 't',
      attrs: {},
      children: ['a', 'b'],
    });
  });

  it('strips namespace prefixes from element and attribute names', () => {
    expect(parseXml('<svg:svg><svg:use xlink:href="#a"/></svg:svg>')).toEqual({
      name: 'svg',
      attrs: {},
      children: [{ name: 'use', attrs: { href: '#a' }, children: [] }],
    });
  });

  it('drops namespace declarations', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="10"/>';
    expect(parseXml(input)).toEqual({ name: 'svg', attrs: { width: '10' }, children: [] });
  });

  it('throws on empty input', () => {
    expect(() => parseXml('')).toThrow('Expected root element at line 1, column 1');
    expect(() => parseXml(' \n ')).toThrow('Expected root element');
  });

  it('throws on text before the root element', () => {
    expect(() => parseXml('foo <svg/>')).toThrow('Expected root element at line 1, column 1');
  });

  it('throws on content after the root element', () => {
    expect(() => parseXml('<a/><b/>')).toThrow(
      'Unexpected content after root element at line 1, column 5',
    );
    expect(() => parseXml('<a/>foo')).toThrow('Unexpected content after root element');
  });

  it('throws on a missing closing tag', () => {
    expect(() => parseXml('<a><b></b>')).toThrow(
      "Expected closing tag '</a>' at line 1, column 11",
    );
  });

  it('throws on a mismatched closing tag', () => {
    expect(() => parseXml('<a></b>')).toThrow(
      "Mismatched closing tag '</b>', expected '</a>' at line 1, column 4",
    );
  });

  it('throws on unexpected end of input in a tag', () => {
    expect(() => parseXml('<')).toThrow('Expected name at line 1, column 2');
    expect(() => parseXml('<a')).toThrow('Unexpected end of input at line 1, column 3');
    expect(() => parseXml('<a x="1"')).toThrow('Unexpected end of input');
  });

  it('throws on an unquoted attribute value', () => {
    expect(() => parseXml('<a x=1/>')).toThrow(
      'Expected quoted attribute value at line 1, column 6',
    );
  });

  it('throws on an attribute without a value', () => {
    expect(() => parseXml('<a x/>')).toThrow("Expected '=' at line 1, column 5");
  });

  it('throws on an unterminated attribute value', () => {
    expect(() => parseXml('<a x="1')).toThrow('Unterminated attribute value at line 1, column 6');
  });

  it("throws on '<' in an attribute value", () => {
    expect(() => parseXml('<a x="<b>"/>')).toThrow(
      "Unexpected '<' in attribute value at line 1, column 7",
    );
  });

  it('throws on duplicate attributes', () => {
    expect(() => parseXml('<a x="1" x="2"/>')).toThrow(
      "Duplicate attribute 'x' at line 1, column 10",
    );
    expect(() => parseXml('<a x="1" b:x="2"/>')).toThrow("Duplicate attribute 'x'");
  });

  it('throws on an unknown entity', () => {
    expect(() => parseXml('<t>&nbsp;</t>')).toThrow("Unknown entity '&nbsp;' at line 1, column 4");
  });

  it('throws on an invalid character reference', () => {
    expect(() => parseXml('<t>&#xZZ;</t>')).toThrow("Invalid character reference '&#xZZ;'");
    expect(() => parseXml('<t>&#;</t>')).toThrow("Invalid character reference '&#;'");
    expect(() => parseXml('<t>&#x110000;</t>')).toThrow("Invalid character reference '&#x110000;'");
  });

  it('throws on character references to surrogate code points', () => {
    expect(() => parseXml('<t>&#xD800;</t>')).toThrow("Invalid character reference '&#xD800;'");
    expect(() => parseXml('<t>&#xDFFF;</t>')).toThrow("Invalid character reference '&#xDFFF;'");
    expect(() => parseXml('<t>&#55296;</t>')).toThrow("Invalid character reference '&#55296;'");
  });

  it('throws on a stray ampersand', () => {
    expect(() => parseXml('<t>a & b</t>')).toThrow(
      'Unterminated entity reference at line 1, column 6',
    );
    expect(() => parseXml('<t>a & b; c</t>')).toThrow(
      'Invalid entity reference at line 1, column 6',
    );
  });

  it('throws on unterminated comments, CDATA sections, and processing instructions', () => {
    expect(() => parseXml('<!-- foo')).toThrow('Unterminated comment at line 1, column 1');
    expect(() => parseXml('<t><![CDATA[x</t>')).toThrow(
      'Unterminated CDATA section at line 1, column 4',
    );
    expect(() => parseXml('<?xml version="1.0"')).toThrow(
      'Unterminated processing instruction at line 1, column 1',
    );
  });

  it('throws on unexpected markup in content', () => {
    expect(() => parseXml('<a><!DOCTYPE x></a>')).toThrow('Unexpected markup at line 1, column 4');
  });

  it('throws an XmlParseError with position info', () => {
    let error: unknown;
    try {
      parseXml('<a>\n  <b></c>\n</a>');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(XmlParseError);
    expect(error).toMatchObject({
      name: 'XmlParseError',
      message: "Mismatched closing tag '</c>', expected '</b>' at line 2, column 6",
      position: 9,
      line: 2,
      column: 6,
    });
  });
});
