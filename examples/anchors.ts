import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DocumentDefinition } from '../src/index.ts';
import { columns, PdfMaker, rows, text } from '../src/index.ts';

const exampleDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(exampleDir, 'out');

const loremIpsum =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor' +
  ' incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud' +
  ' exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure' +
  ' dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.' +
  ' Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt ' +
  'mollit anim id est laborum.';

const def: DocumentDefinition = {
  margin: { x: '20mm', y: '0.5cm' },
  defaultStyle: {
    fontSize: 12,
  },
  header: columns([text('PDF Maker'), text('Anchors', { textAlign: 'right', width: 'auto' })], {
    margin: { x: '20mm', top: '1cm' },
  }),
  footer: ({ pageNumber, pageCount }) =>
    text(`${pageNumber}/${pageCount ?? 0}`, {
      textAlign: 'right',
      margin: { x: '20mm', bottom: '1cm' },
    }),
  content: [
    rows(
      [
        text('Contents', {
          fontSize: 18,
          margin: { bottom: 5 },
        }),
        ...range(10).map((n) =>
          text(`Paragraph ${n + 1}`, {
            // Link to the paragraph with given id
            link: `#par:${n + 1}`,
          }),
        ),
      ],
      { margin: { bottom: 10 } },
    ),
    ...range(10).map((n) =>
      rows([text(`Paragraph ${n + 1}`, { breakAfter: 'avoid' }), text(loremIpsum)], {
        // Create an anchor with given id
        id: `par:${n + 1}`,
        margin: { top: 5 },
        fontSize: 10,
      }),
    ),
  ],
};

function range(n: number) {
  return [...Array(n).keys()];
}

const pdfMaker = new PdfMaker();

pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed.ttf')));
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed-Bold.ttf')));
pdfMaker.registerFont(await readFile(join(exampleDir, 'fonts/DejaVuSansCondensed-Oblique.ttf')));

const pdf = await pdfMaker.makePdf(def);
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, 'anchors.pdf');
await writeFile(outFile, pdf);
console.log(`PDF written to ${outFile}`);
