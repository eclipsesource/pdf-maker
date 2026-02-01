import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PdfMaker, text } from '../src/index.ts';

const exampleDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(exampleDir, 'out');

// The PDF definition
const document = {
  // The content is an array of blocks
  content: [
    // A single text block
    text('Hello world!', { fontSize: 24 }),
  ],
};

// Generate a PDF from the definition
const pdfMaker = new PdfMaker();
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed.ttf')));
const pdf = await pdfMaker.makePdf(document);

// Write the PDF to a file
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, 'hello-world.pdf');
await writeFile(outFile, pdf);
console.log(`PDF written to ${outFile}`);
