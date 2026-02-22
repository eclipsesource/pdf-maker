import { scriptRanges } from './script-ranges.gen.ts';

/**
 * A run of text identified as belonging to a single Unicode script.
 */
export type ScriptRun = {
  /** The substring of the original text. */
  text: string;
  /** The resolved Unicode script name (e.g. 'Latin', 'Arabic'). */
  script: string;
};

/**
 * Mapping from Unicode script names to OpenType script tags.
 */
const scriptTagMap: Record<string, string> = {
  Latin: 'latn',
  Greek: 'grek',
  Cyrillic: 'cyrl',
  Armenian: 'armn',
  Hebrew: 'hebr',
  Arabic: 'arab',
  Devanagari: 'dev2',
  Bengali: 'bng2',
  Gurmukhi: 'gur2',
  Gujarati: 'gjr2',
  Tamil: 'tml2',
  Telugu: 'tel2',
  Kannada: 'knd2',
  Malayalam: 'mlm2',
  Thai: 'thai',
  Georgian: 'geor',
  Hangul: 'hang',
  Hiragana: 'kana',
  Katakana: 'kana',
  Han: 'hani',
};

/**
 * Detect the Unicode script of a single code point.
 * Uses a binary search on the script range table.
 * Returns 'Common' for code points not covered by the table.
 */
export function detectScript(codePoint: number): string {
  let lo = 0;
  let hi = scriptRanges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const range = scriptRanges[mid];
    if (codePoint < range.start) {
      hi = mid - 1;
    } else if (codePoint > range.end) {
      lo = mid + 1;
    } else {
      return range.script;
    }
  }
  return 'Common';
}

/**
 * Segment a string into runs of the same resolved script.
 * Common and Inherited characters are resolved to neighboring scripts.
 * Returns an empty array for an empty string.
 */
export function segmentByScript(text: string): ScriptRun[] {
  if (!text) return [];

  // First pass: detect raw scripts and find the first concrete script.
  const rawScripts: string[] = [];
  let initialScript: string | undefined;
  for (const ch of text) {
    const script = detectScript(ch.codePointAt(0)!);
    rawScripts.push(script);
    if (!initialScript && script !== 'Common' && script !== 'Inherited') {
      initialScript = script;
    }
  }

  // Forward pass: resolve Common and Inherited, and build runs in one go.
  const runs: ScriptRun[] = [];
  let current = initialScript ?? 'Common';
  let runScript = '';
  let runStart = 0;
  let charIdx = 0;
  for (const raw of rawScripts) {
    const resolved = raw === 'Common' || raw === 'Inherited' ? current : (current = raw);
    if (resolved !== runScript) {
      if (runScript) {
        runs.push({ text: text.slice(runStart, charIdx), script: runScript });
      }
      runStart = charIdx;
      runScript = resolved;
    }
    charIdx += text.codePointAt(charIdx)! > 0xffff ? 2 : 1;
  }
  runs.push({ text: text.slice(runStart), script: runScript });

  return runs;
}

/**
 * Map a Unicode script name to an OpenType script tag.
 * Returns 'DFLT' for unmapped scripts.
 */
export function scriptToOpenTypeTag(script: string): string {
  return scriptTagMap[script] ?? 'DFLT';
}
