/* eslint-disable no-console */
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import wawoff2 from 'wawoff2';

import { makePdf } from '../dist/index.js';

const fontsOutputFile = 'examples/generated/fonts.js';
const pkgRoot = dirname(fileURLToPath(import.meta.url));
const fontSourceRoot = join(pkgRoot, '../node_modules/@fontsource');

const fonts = {
  DejaVu_Sans_Normal: 'dejavu-sans/files/dejavu-sans-latin-400-normal.woff2',
  DejaVu_Sans_Italic: 'dejavu-sans/files/dejavu-sans-latin-400-italic.woff2',
  DejaVu_Sans_Bold: 'dejavu-sans/files/dejavu-sans-latin-700-normal.woff2',
  DejaVu_Sans_BoldItalic: 'dejavu-sans/files/dejavu-sans-latin-700-italic.woff2',
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const stats = await stat(fontsOutputFile).catch(() => null);
  if (!stats?.isFile()) {
    await makeFonts();
  }
  const files = await readdir('examples', { withFileTypes: true });
  for (const file of files.filter((f) => f.isFile() && f.name.endsWith('.js'))) {
    await makeExample(makePdf, join('examples', file.name));
  }
}

async function makeFonts() {
  await mkdir(dirname(fontsOutputFile), { recursive: true });
  const entries = await Promise.all(
    Object.entries(fonts).map(async ([name, location]) => {
      const input = await readFile(join(fontSourceRoot, location));
      const buffer = Buffer.from(await wawoff2.decompress(input));
      return `  ${name}:\n    '${buffer.toString('base64')}',`;
    })
  );
  const lines = ['// generated file', 'export default {', ...entries, '};'];
  await writeFile(fontsOutputFile, lines.join('\n') + '\n');
}

async function makeExample(makePdf, path) {
  const name = path.replace(/^.*\/(.*)\.[a-z]+$/, '$1');
  const example = await importExample(join('..', path));
  if (example.default) {
    const start = Date.now();
    const result = await makePdf(example.default);
    const duration = Date.now() - start;
    const outfile = join('out', name + '.pdf');
    await mkdir('out', { recursive: true });
    await writeFile(join('out', name + '.pdf'), result);

    console.log(`created ${outfile} with ${result.byteLength} bytes (${duration} ms)`);
  }
}

async function importExample(path) {
  try {
    return await import(join(path));
  } catch (error) {
    console.error('could not import example: ' + path, error);
  }
}
