/**
 * Generates src/script-ranges.gen.ts from Unicode Scripts.txt.
 *
 * Usage: node scripts/generate-script-ranges.ts
 *
 * Input:  vendor.local/unicode/UCD/Scripts.txt (Unicode Character Database) in the project root.
 * Output: src/script-ranges.gen.ts — sorted, merged script range table.
 */
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(projectRoot, 'vendor.local/unicode/UCD/Scripts.txt');
const outputPath = resolve(projectRoot, 'src/script-ranges.gen.ts');

/**
 * Scripts to include in the generated table. These are the scripts that
 * have OpenType tag mappings (used for text shaping) plus Common and
 * Inherited (needed for script resolution in segmentByScript).
 */
const includedScripts = new Set([
  'Common',
  'Inherited',
  'Latin',
  'Greek',
  'Cyrillic',
  'Armenian',
  'Hebrew',
  'Arabic',
  'Devanagari',
  'Bengali',
  'Gurmukhi',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Thai',
  'Georgian',
  'Hangul',
  'Hiragana',
  'Katakana',
  'Han',
]);

type Range = { start: number; end: number; script: string };

// --- Parse ---

const input = readFileSync(inputPath, 'utf-8');
const ranges: Range[] = [];

for (const line of input.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  // Lines have the format:
  // 0000..001F    ; Common # Cc (...more comments)
  // 0020          ; Common # Zs (...more comments)
  const match = trimmed.match(/^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*(\w+)/);
  if (!match) continue;

  const start = parseInt(match[1], 16);
  const end = match[2] ? parseInt(match[2], 16) : start;
  const script = match[3];

  if (includedScripts.has(script)) {
    ranges.push({ start, end, script });
  }
}

// --- Sort ---

ranges.sort((a, b) => a.start - b.start);

// --- Merge adjacent ranges for the same script ---

const merged: Range[] = [];
for (const range of ranges) {
  const prev = merged[merged.length - 1];
  if (prev && prev.script === range.script && prev.end + 1 >= range.start) {
    prev.end = Math.max(prev.end, range.end);
  } else {
    merged.push({ ...range });
  }
}

// --- Validate ---

for (let i = 1; i < merged.length; i++) {
  if (merged[i].start <= merged[i - 1].end) {
    throw new Error(
      `Overlapping ranges: ${formatRange(merged[i - 1])} and ${formatRange(merged[i])}`,
    );
  }
}

// --- Generate ---

const lines: string[] = [
  '/**',
  ' * This file is generated from Unicode Scripts.txt (Unicode 15.1).',
  ' *',
  ' * Source: https://www.unicode.org/Public/UCD/latest/ucd/Scripts.txt',
  ' * Licensed under the Unicode License: https://www.unicode.org/license.html',
  ' *',
  ' * Do not edit manually. Regenerate with: scripts/generate-script-ranges.ts',
  ' */',
  '',
  '/** A Unicode code point range with an associated script. */',
  'export type ScriptRange = {',
  '  start: number;',
  '  end: number;',
  '  script: string;',
  '};',
  '',

  `/** A list of sorted, non-overlapping Unicode code point ranges covering ${includedScripts.size} scripts. */`,
  'export const scriptRanges: ScriptRange[] = [',
];

for (const range of merged) {
  const s = `0x${range.start.toString(16).padStart(4, '0')}`;
  const e = `0x${range.end.toString(16).padStart(4, '0')}`;
  lines.push(`  { start: ${s}, end: ${e}, script: '${range.script}' },`);
}

lines.push('] as const;', '');

writeFileSync(outputPath, lines.join('\n'));

console.log(`Generated ${outputPath}`);
console.log(`  ${merged.length} ranges (merged from ${ranges.length} entries)`);

function formatRange(r: Range): string {
  return `${r.start.toString(16).toUpperCase()}..${r.end.toString(16).toUpperCase()} ${r.script}`;
}
