import { readFile, writeFile } from 'node:fs/promises';

import { PdfMaker, text } from 'pdfmkr';

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
pdfMaker.registerFont(await readFile('./fonts/DejaVuSansCondensed.ttf'));
const pdf = await pdfMaker.makePdf(document);

// Write the PDF to a file
await writeFile('./out/hello-world.pdf', pdf);
