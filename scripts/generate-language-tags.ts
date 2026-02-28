/**
 * Generates src/language-tags.gen.ts from the OpenType language system tag
 * registry and the IANA BCP 47 subtag registry.
 *
 * The approach is based on HarfBuzz's gen-tag-table.py:
 *   https://github.com/harfbuzz/harfbuzz/blob/main/src/gen-tag-table.py
 * We reuse the same strategy of parsing the OT registry HTML, resolving
 * ISO 639-3 codes to 2-letter BCP 47 subtags, inheriting mappings from
 * macrolanguages, ranking by code count to pick the most specific tag,
 * and applying manual overrides for cases where the automated ranking
 * disagrees with HarfBuzz (Norwegian, Chinese, Quechua, Malayalam).
 * Our script is a simplified TypeScript rewrite that only produces the
 * BCP 47 → OpenType direction and only maps primary language subtags.
 *
 * Usage: node scripts/generate-language-tags.ts
 *
 * Input:
 *   vendor.local/languagetags.html — OpenType language system tag registry
 *     downloaded from https://learn.microsoft.com/en-us/typography/opentype/spec/languagetags
 *   vendor.local/language-subtag-registry.txt — IANA BCP 47 subtag registry
 *     downloaded from https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
 *   vendor.local/iso-639-3.tab — ISO 639-3 code table (for 3-letter to 2-letter mapping)
 *     downloaded from https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab
 * Output:
 *   src/language-tags.gen.ts — BCP 47 to OpenType language tag mapping.
 */
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const otRegistryPath = resolve(projectRoot, 'vendor.local/languagetags.html');
const bcp47RegistryPath = resolve(projectRoot, 'vendor.local/language-subtag-registry.txt');
const iso639Path = resolve(projectRoot, 'vendor.local/iso-639-3.tab');
const outputPath = resolve(projectRoot, 'src/language-tags.gen.ts');

// Manual overrides matching HarfBuzz adjustments
const manualOverrides: Record<string, string> = {
  // Norwegian: HTML maps NOR only to 'nob'. HarfBuzz explicitly adds 'no' -> 'NOR'.
  no: 'NOR',
  // Chinese: Without overrides, 'zh' maps to all Chinese variants.
  // HarfBuzz sets ZHS (Simplified) as the default for bare 'zh'.
  zh: 'ZHS',
  // Quechua: HarfBuzz removes QUZ from default and re-adds qu -> QUZ.
  qu: 'QUZ',
  // Malayalam: HarfBuzz increases MLR rank, making MAL (Traditional) preferred.
  ml: 'MAL',
};

const otHtml = readFileSync(otRegistryPath, 'utf-8');
const bcp47Content = readFileSync(bcp47RegistryPath, 'utf-8');
const iso639Content = readFileSync(iso639Path, 'utf-8');

const otEntries = parseOtRegistry(otHtml);
const iso3to1 = parseIso639(iso639Content);
const macrolanguages = parseMacrolanguages(bcp47Content);
const mapping = buildMapping(otEntries, iso3to1, macrolanguages);

const output = generate(mapping);
writeFileSync(outputPath, output);

console.log(`Generated ${outputPath}`);
console.log(`  ${mapping.size} language tag mappings`);

// ---------------------------------------------------------------------------
// Parse OpenType language system tag registry (HTML)
// ---------------------------------------------------------------------------

type OtEntry = { tag: string; isoCodes: string[] };

function parseOtRegistry(html: string): OtEntry[] {
  const entries: OtEntry[] = [];

  // Match <tr> blocks containing 2-3 <td> cells.
  const trRegex =
    /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*(?:<td[^>]*>([\s\S]*?)<\/td>\s*)?<\/tr>/gi;

  let match;
  while ((match = trRegex.exec(html)) !== null) {
    const rawTag = match[2];
    const rawCodes = match[3];

    const tag = parseOtTag(rawTag);
    if (!tag) continue;

    const isoCodes = parseIsoCodes(rawCodes);

    entries.push({ tag, isoCodes });
  }

  if (entries.length < 100) {
    throw new Error(
      `Expected at least 100 OpenType entries, got ${entries.length}. ` +
        'The HTML structure may have changed.',
    );
  }

  return entries;
}

function parseOtTag(raw: string): string | undefined {
  let text = stripHtml(raw).trim();
  // Skip deprecated tags
  if (/\(deprecated\)/i.test(text)) return undefined;
  // Strip surrounding single quotes used in the OT registry HTML (e.g. 'AFK ')
  text = text.replace(/^'|'$/g, '').trim();
  if (!/^[A-Z]{3,4}$/i.test(text)) return undefined;
  return text.toUpperCase();
}

function parseIsoCodes(raw: string | undefined): string[] {
  if (!raw) return [];
  // Take content before <br> (anything after is comments)
  let text = raw.split(/<br\s*\/?>/i)[0];
  text = stripHtml(text).trim();
  if (!text) return [];
  // Split on commas and whitespace, keep only valid ISO 639 codes
  return text
    .split(/[,\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z]{2,3}$/.test(s));
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, '');
}

// ---------------------------------------------------------------------------
// Parse ISO 639-3 table (3-letter Id -> 2-letter Part1)
// ---------------------------------------------------------------------------

function parseIso639(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split('\n').slice(1)) {
    const cols = line.split('\t');
    const id = cols[0]; // 3-letter code
    const part1 = cols[3]; // 2-letter code (may be empty)
    if (id && part1) {
      map.set(id, part1);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Parse IANA BCP 47 subtag registry (macrolanguage relationships only)
// ---------------------------------------------------------------------------

function parseMacrolanguages(content: string): Map<string, Set<string>> {
  const macrolanguages = new Map<string, Set<string>>();

  for (const record of content.split('%%')) {
    const fields = new Map<string, string>();
    let currentKey = '';
    for (const line of record.split('\n')) {
      if (line.startsWith('  ')) {
        if (currentKey) {
          fields.set(currentKey, (fields.get(currentKey) ?? '') + ' ' + line.trim());
        }
        continue;
      }
      const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
      if (m) {
        currentKey = m[1];
        fields.set(currentKey, m[2].trim());
      }
    }

    const type = fields.get('Type');
    const subtag = fields.get('Subtag');
    const macro = fields.get('Macrolanguage');

    if (type === 'language' && subtag && macro) {
      if (!macrolanguages.has(macro)) {
        macrolanguages.set(macro, new Set());
      }
      macrolanguages.get(macro)!.add(subtag);
    }
  }

  return macrolanguages;
}

// ---------------------------------------------------------------------------
// Build BCP 47 (2-letter) -> OpenType tag mapping
// ---------------------------------------------------------------------------

function buildMapping(
  otEntries: OtEntry[],
  iso3to1: Map<string, string>,
  macrolanguages: Map<string, Set<string>>,
): Map<string, string> {
  // Rank per OT tag: 2 × number of associated ISO codes.
  // Lower rank = more specific = preferred.
  const otTagRank = new Map<string, number>();
  // BCP 47 2-letter code -> set of OT tags
  const bcp47ToOt = new Map<string, Set<string>>();

  for (const entry of otEntries) {
    const bcp47Codes = new Set<string>();
    for (const iso of entry.isoCodes) {
      const twoLetter = iso3to1.get(iso) ?? (iso.length === 2 ? iso : undefined);
      if (twoLetter && twoLetter.length === 2) {
        bcp47Codes.add(twoLetter);
      }
    }
    if (bcp47Codes.size === 0) continue;

    // Rank based on the number of associated ISO codes.
    // Lower rank = more specific = preferred when multiple OT tags compete.
    otTagRank.set(entry.tag, 2 * entry.isoCodes.length);

    for (const code of bcp47Codes) {
      if (!bcp47ToOt.has(code)) {
        bcp47ToOt.set(code, new Set());
      }
      bcp47ToOt.get(code)!.add(entry.tag);
    }
  }

  // Macrolanguage inheritance: if a 2-letter macrolanguage code has no OT
  // mapping, inherit from its member languages.
  for (const [macro, members] of macrolanguages) {
    const macro2 = iso3to1.get(macro) ?? (macro.length === 2 ? macro : undefined);
    if (!macro2 || macro2.length !== 2) continue;
    if (bcp47ToOt.has(macro2)) continue;

    const inherited = new Set<string>();
    for (const member of members) {
      const m2 = iso3to1.get(member) ?? (member.length === 2 ? member : undefined);
      if (m2 && bcp47ToOt.has(m2)) {
        for (const tag of bcp47ToOt.get(m2)!) {
          inherited.add(tag);
        }
      }
    }
    if (inherited.size > 0) {
      bcp47ToOt.set(macro2, inherited);
    }
  }

  // For each 2-letter code, pick the best OT tag (lowest rank, then alphabetical).
  const result = new Map<string, string>();
  for (const [bcp47, tags] of bcp47ToOt) {
    if (bcp47.length !== 2) continue;

    const sorted = [...tags].sort((a, b) => {
      const rankA = otTagRank.get(a) ?? 0;
      const rankB = otTagRank.get(b) ?? 0;
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b);
    });
    result.set(bcp47, sorted[0]);
  }

  // Apply manual overrides
  for (const [bcp47, otTag] of Object.entries(manualOverrides)) {
    result.set(bcp47, otTag);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Generate output
// ---------------------------------------------------------------------------

function generate(mapping: Map<string, string>): string {
  const sorted = [...mapping.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const lines: string[] = [
    '/**',
    ' * Mapping from BCP 47 primary language subtags to OpenType language system tags.',
    ' *',
    ' * Generated from:',
    ' *   - OpenType language system tag registry (Microsoft)',
    ' *   - IANA BCP 47 subtag registry',
    ' *',
    ' * Source: https://learn.microsoft.com/en-us/typography/opentype/spec/languagetags',
    ' *',
    ' * Do not edit manually. Regenerate with: node scripts/generate-language-tags.ts',
    ' */',
    '',
    'const langSysTagMap = {',
  ];

  for (const [bcp47, otTag] of sorted) {
    lines.push(`  ${bcp47}: '${otTag}',`);
  }

  lines.push('} as const;', '');
  lines.push('type LangKey = keyof typeof langSysTagMap;', '');
  lines.push('/**');
  lines.push(' * Map a BCP 47 language tag to an OpenType language system tag.');
  lines.push(' * Only the primary language subtag (the part before the first hyphen)');
  lines.push(' * is used for the lookup.');
  lines.push(' * Returns `undefined` for unmapped languages.');
  lines.push(' */');
  lines.push('export function languageToOpenTypeTag(language: string): string | undefined {');
  lines.push("  const primary = language.split('-')[0].toLowerCase() as LangKey;");
  lines.push('  return langSysTagMap[primary];');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
