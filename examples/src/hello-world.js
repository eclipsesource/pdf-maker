import { readFile, writeFile } from 'node:fs/promises';

import { makePdf } from 'pdfmkr';

// Read the font file
const fontData = await readFile('./fonts/DejaVuSansCondensed.ttf');

// The PDF definition
const def = {
  // Define the fonts to be used. The first font will be used as the default font.
  fonts: { 'DejaVu-Sans': [{ data: fontData }] },

  // The content is an array of blocks
  content: [
    // A single text block
    { text: 'Hello world!', fontSize: 24 },
  ],
};

// Generate a PDF from the definition
const pdf = await makePdf(def);

// Write the PDF to a file
writeFile('./out/hello-world.pdf', pdf);
