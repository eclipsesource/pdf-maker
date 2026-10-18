/*
 * Line break opportunities, based on the Unicode line breaking algorithm (UAX #14,
 * https://www.unicode.org/reports/tr14/).
 *
 * Only a subset of the classes and rules is implemented: spaces, newlines, hyphens, dashes,
 * soft hyphens, zero-width spaces, and no-break characters. All other characters are treated
 * like letters (class AL), between which lines do not break. Therefore, text without spaces,
 * such as Chinese or Japanese, does not break yet. Supporting it means adding classes and
 * rules here; the rest of the layout only works with the resulting break opportunities.
 */

export type LineBreak = 'mandatory' | 'allowed';

/**
 * Line breaking classes, named as in UAX #14.
 */
export type LineBreakClass =
  | 'BK' // mandatory break (newline)
  | 'SP' // space
  | 'ZW' // zero-width space
  | 'WJ' // word joiner
  | 'GL' // non-breaking ("glue")
  | 'HY' // hyphen-minus
  | 'BA' // break after (soft hyphen, hyphen, en dash)
  | 'B2' // break before and after (em dash)
  | 'NU' // digit
  | 'AL'; // letters and everything else

export function getLineBreakClass(codePoint: number): LineBreakClass {
  switch (codePoint) {
    case 0x000a:
      return 'BK';
    case 0x200b:
      return 'ZW';
    case 0x2060:
    case 0xfeff:
      return 'WJ';
    case 0x00a0: // no-break space
    case 0x2007: // figure space
    case 0x2011: // non-breaking hyphen
    case 0x202f: // narrow no-break space
      return 'GL';
    case 0x002d:
      return 'HY';
    case 0x00ad: // soft hyphen
    case 0x2010: // hyphen
    case 0x2012: // figure dash
    case 0x2013: // en dash
      return 'BA';
    case 0x2014: // em dash
      return 'B2';
  }
  if (codePoint >= 0x30 && codePoint <= 0x39) return 'NU';
  if (isSpace(codePoint)) return 'SP';
  return 'AL';
}

// The characters matched by `\s`, except the ones handled above
function isSpace(codePoint: number): boolean {
  return (
    codePoint === 0x20 ||
    (codePoint >= 0x09 && codePoint <= 0x0d) ||
    (codePoint >= 0x80 &&
      (codePoint === 0x1680 ||
        (codePoint >= 0x2000 && codePoint <= 0x200a) ||
        codePoint === 0x2028 ||
        codePoint === 0x2029 ||
        codePoint === 0x205f ||
        codePoint === 0x3000))
  );
}

/**
 * Finds the line break opportunities in the given text. Returns a map from string index to
 * the kind of break that is possible before the character at this index.
 */
export function findLineBreaks(text: string): Map<number, LineBreak> {
  const breaks = new Map<number, LineBreak>();
  let before: LineBreakClass | undefined; // class of the previous character
  let beforeSpaces: LineBreakClass | undefined; // class of the last character that is no space
  let wordStart = true; // whether the previous character starts a word
  let index = 0;
  for (const char of text) {
    const cls = getLineBreakClass(char.codePointAt(0)!);
    if (before) {
      const lineBreak = getLineBreak(before, beforeSpaces, cls, wordStart);
      if (lineBreak) breaks.set(index, lineBreak);
    }
    wordStart = !before || before === 'BK' || before === 'SP' || before === 'ZW' || before === 'GL';
    before = cls;
    if (cls !== 'SP') beforeSpaces = cls;
    index += char.length;
  }
  return breaks;
}

function getLineBreak(
  before: LineBreakClass,
  beforeSpaces: LineBreakClass | undefined,
  after: LineBreakClass,
  wordStart: boolean,
): LineBreak | undefined {
  // The comments refer to the rules in UAX #14
  if (before === 'BK') return 'mandatory'; // LB4
  if (after === 'BK' || after === 'SP' || after === 'ZW') return; // LB6, LB7
  if (beforeSpaces === 'ZW') return 'allowed'; // LB8
  if (before === 'WJ' || after === 'WJ') return; // LB11
  if (before === 'GL') return; // LB12
  if (after === 'GL' && before !== 'SP' && before !== 'BA' && before !== 'HY') return; // LB12a
  if (beforeSpaces === 'B2' && after === 'B2') return; // LB17
  if (before === 'SP') return 'allowed'; // LB18
  if (after === 'BA' || after === 'HY') return; // LB21
  if (before === 'HY' && wordStart && after === 'AL') return; // LB20a
  if (before === 'HY' && after === 'NU') return; // LB25, partially
  // LB31 allows breaks everywhere else, but without the remaining rules, this is limited
  // to breaks after hyphens and dashes.
  if (before === 'HY' || before === 'BA' || before === 'B2') return 'allowed';
}
