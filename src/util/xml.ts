/*
 * A minimal, generic, non-validating XML parser.
 */

/**
 * An XML node, either an element or a text string.
 */
export type XmlNode = XmlElement | string;

/**
 * An XML element with a tag name, attributes, and child nodes.
 */
export type XmlElement = {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
};

/**
 * Returns the child nodes of the given element that are elements,
 * skipping text nodes.
 */
export function childElements(element: XmlElement): XmlElement[] {
  return element.children.filter((child): child is XmlElement => typeof child !== 'string');
}

/**
 * The error thrown when the XML input is malformed.
 */
export class XmlParseError extends Error {
  /** The position of the offending character. */
  readonly position: number;
  /** The line of the offending character. */
  readonly line: number;
  /** The column of the offending character. */
  readonly column: number;

  constructor(message: string, position: number, line: number, column: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'XmlParseError';
    this.position = position;
    this.line = line;
    this.column = column;
  }
}

const predefinedEntities: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  apos: "'",
  quot: '"',
};

/**
 * Parses an XML string and returns the root element.
 *
 * Supports elements, attributes, self-closing tags, and text nodes.
 * Comments, CDATA sections, DOCTYPE declarations, and processing
 * instructions are skipped. Predefined entities and numeric character
 * references are decoded. Namespace prefixes are stripped from element
 * and attribute names (`xlink:href` becomes `href`) and namespace
 * declarations (`xmlns`, `xmlns:*`) are dropped. Whitespace-only text
 * nodes are omitted. Malformed XML results in an `XmlParseError` that
 * carries the position of the offending character.
 */
export function parseXml(input: string): XmlElement {
  let pos = input.startsWith('\uFEFF') ? 1 : 0;

  skipMisc(true);
  if (pos >= input.length || input[pos] !== '<') fail('Expected root element');
  const root = parseElement();
  skipMisc(false);
  if (pos < input.length) fail('Unexpected content after root element');
  return root;

  function skipMisc(allowDoctype: boolean) {
    while (pos < input.length) {
      if (isWhitespace(input[pos])) pos++;
      else if (input.startsWith('<!--', pos)) skipComment();
      else if (input.startsWith('<?', pos)) skipProcessingInstruction();
      else if (allowDoctype && input.startsWith('<!DOCTYPE', pos)) skipDoctype();
      else break;
    }
  }

  // Parses the element starting at `pos` (which must point at '<').
  function parseElement(): XmlElement {
    pos++;
    const rawName = readName();
    const attrs: Record<string, string> = {};
    while (true) {
      skipWhitespace();
      if (pos >= input.length) fail('Unexpected end of input');
      const c = input[pos];
      if (c === '/') {
        pos++;
        if (input[pos] !== '>') fail("Expected '>'");
        pos++;
        return { name: localName(rawName), attrs, children: [] };
      }
      if (c === '>') {
        pos++;
        break;
      }
      const attrStart = pos;
      const rawAttrName = readName();
      skipWhitespace();
      if (input[pos] !== '=') fail("Expected '='");
      pos++;
      skipWhitespace();
      const value = readAttrValue();
      if (rawAttrName === 'xmlns' || rawAttrName.startsWith('xmlns:')) continue;
      const attrName = localName(rawAttrName);
      if (attrName in attrs) fail(`Duplicate attribute '${attrName}'`, attrStart);
      attrs[attrName] = value;
    }
    const children = parseChildren(rawName);
    return { name: localName(rawName), attrs, children };
  }

  function parseChildren(rawName: string): XmlNode[] {
    const children: XmlNode[] = [];
    while (true) {
      const text = readText();
      if (text.trim()) children.push(text);
      if (pos >= input.length) fail(`Expected closing tag '</${rawName}>'`);
      if (input.startsWith('</', pos)) {
        const closeStart = pos;
        pos += 2;
        const closeName = readName();
        if (closeName !== rawName) {
          fail(`Mismatched closing tag '</${closeName}>', expected '</${rawName}>'`, closeStart);
        }
        skipWhitespace();
        if (input[pos] !== '>') fail("Expected '>'");
        pos++;
        return children;
      }
      if (input.startsWith('<!--', pos)) skipComment();
      else if (input.startsWith('<![CDATA[', pos)) skipCdata();
      else if (input.startsWith('<?', pos)) skipProcessingInstruction();
      else if (input.startsWith('<!', pos)) fail('Unexpected markup');
      else children.push(parseElement());
    }
  }

  function readAttrValue(): string {
    const start = pos;
    const quote = input[pos];
    if (quote !== '"' && quote !== "'") fail('Expected quoted attribute value');
    pos++;
    let value = '';
    while (true) {
      if (pos >= input.length) fail('Unterminated attribute value', start);
      const c = input[pos];
      if (c === quote) {
        pos++;
        return value;
      }
      if (c === '<') fail("Unexpected '<' in attribute value");
      if (c === '&') {
        value += readReference();
      } else {
        value += c;
        pos++;
      }
    }
  }

  // Reads text content up to the next '<' or the end of input.
  function readText(): string {
    let text = '';
    while (pos < input.length) {
      const c = input[pos];
      if (c === '<') break;
      if (c === '&') {
        text += readReference();
      } else {
        text += c;
        pos++;
      }
    }
    return text;
  }

  // Decodes the entity or character reference at `pos` (which must point at '&').
  function readReference(): string {
    const start = pos;
    const end = input.indexOf(';', pos + 1);
    if (end < 0) fail('Unterminated entity reference', start);
    const name = input.slice(pos + 1, end);
    if (!name || /[\s&<]/.test(name)) fail('Invalid entity reference', start);
    pos = end + 1;
    if (name.startsWith('#')) {
      const isHex = name[1] === 'x' || name[1] === 'X';
      const digits = isHex ? name.slice(2) : name.slice(1);
      if (!(isHex ? /^[0-9a-fA-F]+$/ : /^[0-9]+$/).test(digits)) {
        fail(`Invalid character reference '&${name};'`, start);
      }
      const code = parseInt(digits, isHex ? 16 : 10);
      const isSurrogate = code >= 0xd800 && code <= 0xdfff;
      if (code > 0x10ffff || isSurrogate) fail(`Invalid character reference '&${name};'`, start);
      return String.fromCodePoint(code);
    }
    const value = predefinedEntities[name];
    if (value === undefined) fail(`Unknown entity '&${name};'`, start);
    return value;
  }

  function readName(): string {
    const start = pos;
    if (pos >= input.length || !isNameStartChar(input[pos])) fail('Expected name');
    pos++;
    while (pos < input.length && isNameChar(input[pos])) pos++;
    return input.slice(start, pos);
  }

  function skipComment() {
    const start = pos;
    const end = input.indexOf('-->', pos + 4);
    if (end < 0) fail('Unterminated comment', start);
    pos = end + 3;
  }

  function skipCdata() {
    const start = pos;
    const end = input.indexOf(']]>', pos + 9);
    if (end < 0) fail('Unterminated CDATA section', start);
    pos = end + 3;
  }

  function skipProcessingInstruction() {
    const start = pos;
    const end = input.indexOf('?>', pos + 2);
    if (end < 0) fail('Unterminated processing instruction', start);
    pos = end + 2;
  }

  function skipDoctype() {
    const start = pos;
    pos += 9;
    let inSubset = false;
    while (pos < input.length) {
      const c = input[pos++];
      if (c === '"' || c === "'") {
        const end = input.indexOf(c, pos);
        if (end < 0) break;
        pos = end + 1;
      } else if (c === '[') inSubset = true;
      else if (c === ']') inSubset = false;
      else if (c === '>' && !inSubset) return;
    }
    fail('Unterminated DOCTYPE declaration', start);
  }

  function skipWhitespace() {
    while (pos < input.length && isWhitespace(input[pos])) pos++;
  }

  function fail(message: string, at = pos): never {
    let line = 1;
    let lineStart = 0;
    for (let i = 0; i < at && i < input.length; i++) {
      if (input[i] === '\n') {
        line++;
        lineStart = i + 1;
      }
    }
    throw new XmlParseError(message, at, line, at - lineStart + 1);
  }
}

function localName(name: string) {
  const idx = name.indexOf(':');
  return idx >= 0 ? name.slice(idx + 1) : name;
}

function isWhitespace(c: string) {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

function isNameChar(c: string) {
  return isNameStartChar(c) || (c >= '0' && c <= '9') || c === '-' || c === '.';
}

function isNameStartChar(c: string) {
  return (
    (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || c === ':' || c >= '\u0080'
  );
}
