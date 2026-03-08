/**
 * Verifies that all module references in dist/index.d.ts resolve to
 * existing files. Catches packaging bugs where declaration files are
 * missing from the dist/ directory.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const indexDts = 'dist/index.d.ts';
const content = readFileSync(indexDts, 'utf-8');
const dir = dirname(indexDts);

// Match all from/import specifiers that are relative paths
const pattern = /from\s+['"](\.[^'"]+)['"]/g;
const errors: string[] = [];

for (const match of content.matchAll(pattern)) {
  const specifier = match[1];
  // TypeScript resolves ./foo.ts to ./foo.d.ts in declaration files
  const resolved = specifier.replace(/\.ts$/, '.d.ts');
  const fullPath = resolve(dir, resolved);
  if (!existsSync(fullPath)) {
    errors.push(`${indexDts}: unresolved reference '${specifier}' (expected ${fullPath})`);
  }
}

if (errors.length > 0) {
  console.error('dist check failed:');
  for (const error of errors) {
    console.error(`  ${error}`);
  }
  process.exit(1);
}
